import asyncio
from mitmproxy import http
from mitmproxy.options import Options
from mitmproxy.tools.dump import DumpMaster
import threading
import os
from logging_config import logger, config


class TrafficAddon:
    def __init__(self, broadcast_callback):
        self.broadcast_callback = broadcast_callback
        self.loop = asyncio.get_event_loop()

    def request(self, flow: http.HTTPFlow):
        logger.info(f"[Request] {flow.request.method} {flow.request.pretty_url}")

    def response(self, flow: http.HTTPFlow):
        # 提取关键信息
        data = {
            "method": flow.request.method,
            "url": flow.request.pretty_url,
            "status": f"{flow.response.status_code} {flow.response.reason}",
            "time": f"{int((flow.response.timestamp_end - flow.request.timestamp_start) * 1000)}ms",
            "request": {
                "headers": dict(flow.request.headers),
                "body": flow.request.get_text() if flow.request.text else "",
                "cookies": dict(flow.request.cookies),
            },
            "response": {
                "headers": dict(flow.response.headers),
                "body": flow.response.get_text() if flow.response.text else "",
                "cookies": dict(flow.response.cookies),
            },
        }

        # Log to console/file immediately
        logger.info(
            f"[Captured] {data['method']} {data['url']} - Status: {data['status']}"
        )

        # Save to database
        try:
            from db import db_manager

            asyncio.run_coroutine_threadsafe(db_manager.save_request(data), self.loop)
            logger.debug(f"Queued DB save for {data['url']}")
        except Exception as e:
            logger.error(f"Failed to save to database: {e}")

        # 回调给 FastAPI 广播
        if self.broadcast_callback:
            try:
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_callback(data), self.loop
                )
                logger.debug(f"Queued broadcast for {data['url']}")
            except Exception as e:
                logger.error(f"Failed to queue broadcast: {e}")

    def error(self, flow: http.HTTPFlow):
        # 记录错误信息
        logger.error(
            f"[Error] {flow.request.method} {flow.request.pretty_url}: {flow.error}"
        )


class ProxyManager:
    def __init__(self):
        self.master = None
        self.thread = None

    def start_proxy(self, broadcast_callback=None, host=None, port=None):
        if self.master:
            return

        host = host or config.get("proxy_host", "0.0.0.0")
        port = int(port or config.get("proxy_port", 8080))

        opts = Options(listen_host=host, listen_port=port)
        # Enable termlog to see mitmproxy's own internal errors
        self.master = DumpMaster(opts, with_termlog=True, with_dumper=False)
        self.master.addons.add(TrafficAddon(broadcast_callback))

        def run():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.master.run())

        self.thread = threading.Thread(target=run, daemon=True)
        self.thread.start()
        logger.info(f"Mitmproxy started on {host}:{port}")

    def stop_proxy(self):
        if self.master:
            self.master.shutdown()
            self.master = None
            self.thread = None
            logger.info("Mitmproxy stopped")

    def is_running(self):
        return self.master is not None


# 全局管理器实例
proxy_manager = ProxyManager()
