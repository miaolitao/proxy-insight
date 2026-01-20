import asyncio
from mitmproxy import http
from mitmproxy.options import Options
from mitmproxy.tools.dump import DumpMaster
import threading
import os
import time
from datetime import datetime
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
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "request": {
                "headers": dict(flow.request.headers),
                "body": flow.request.get_text() if flow.request.text else "",
                "cookies": {k: str(v) for k, v in flow.request.cookies.items()},
            },
            "response": {
                "headers": dict(flow.response.headers),
                "body": flow.response.get_text() if flow.response.text else "",
                "cookies": {k: str(v) for k, v in flow.response.cookies.items()},
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
        if self.thread and self.thread.is_alive():
            return

        host = host or config.get("proxy_host", "0.0.0.0")
        port = int(port or config.get("proxy_port", 8080))

        # Use an event to notify when the master is ready
        startup_event = threading.Event()

        def run():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            nonlocal broadcast_callback

            for attempt in range(3):
                try:
                    opts = Options(listen_host=host, listen_port=port)
                    # Create DumpMaster inside the thread so it attaches to the fresh loop
                    # Pass loop explicitly to avoid "no running event loop" error
                    self.master = DumpMaster(
                        opts, with_termlog=True, with_dumper=False, loop=loop
                    )
                    self.master.addons.add(TrafficAddon(broadcast_callback))

                    if attempt == 0:
                        startup_event.set()

                    start_time = datetime.now()
                    loop.run_until_complete(self.master.run())

                    # Calculate run duration
                    duration = (datetime.now() - start_time).total_seconds()

                    if duration < 1.0:
                        logger.warning(
                            f"Mitmproxy exited quickly ({duration:.2f}s). Port might be busy. Retrying in 1s... (Attempt {attempt+1}/3)"
                        )
                        time.sleep(1.0)
                        continue
                    else:
                        break

                except Exception as e:
                    logger.error(f"Mitmproxy run error: {e}")
                    time.sleep(1.0)

            try:
                loop.close()
                logger.info("Mitmproxy loop closed")
            except:
                pass

        self.thread = threading.Thread(target=run, daemon=True)
        self.thread.start()

        # Wait for initialization
        startup_event.wait(timeout=5.0)
        logger.info(f"Mitmproxy started on {host}:{port}")

    def stop_proxy(self):
        if self.master:
            try:
                self.master.shutdown()
            except:
                pass

        if self.thread and self.thread.is_alive():
            # Wait for the thread to exit (which happens after loop.close)
            self.thread.join(timeout=2.0)

        self.master = None
        self.thread = None
        logger.info("Mitmproxy stopped")

    def is_running(self):
        return self.thread is not None and self.thread.is_alive()


# 全局管理器实例
proxy_manager = ProxyManager()
