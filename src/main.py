from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import os
from contextlib import asynccontextmanager

# Import from local modules
from utils import set_mac_proxy
from db import db_manager
from logging_config import logger, config
from proxy_mgr import proxy_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Backend starting...")
    try:
        await db_manager.init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    yield

    # Shutdown logic
    logger.info("Backend stopping...")
    proxy_manager.stop_proxy()
    set_mac_proxy(False)
    logger.info("Backend stopped.")


app = FastAPI(title="ProxyInsight API", lifespan=lifespan)

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active connections
active_connections = []

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def read_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/api/status")
async def get_status():
    return {
        "proxy_running": proxy_manager.is_running(),
        "proxy_host": config.get("proxy_host", "127.0.0.1"),
        "proxy_port": config.get("proxy_port", 8080),
    }


@app.get("/api/requests")
async def get_requests(limit: int = 50, offset: int = 0, q: str = None):
    return await db_manager.get_requests(limit, offset, q)


@app.get("/api/stats")
async def get_stats():
    return await db_manager.get_stats()


@app.post("/api/proxy/toggle")
async def toggle_proxy(enable: bool):
    try:
        if enable:
            proxy_manager.start_proxy(broadcast_traffic)
            proxy_host = config.get("proxy_host", "127.0.0.1")
            proxy_port = config.get("proxy_port", 8080)
            set_mac_proxy(True, host=proxy_host, port=proxy_port)
        else:
            proxy_manager.stop_proxy()
            set_mac_proxy(False)
        return {"success": True, "proxy_running": proxy_manager.is_running()}
    except Exception as e:
        logger.error(f"Failed to toggle proxy: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/clear")
async def clear_requests():
    await db_manager.clear_all()
    # Notify clients
    for client in active_connections:
        try:
            await client.send_json({"type": "clear"})
        except Exception as e:
            logger.error(f"Failed to send clear message: {e}")
    return {"success": True}


@app.get("/api/cert/download")
async def download_cert():
    cert_path = os.path.expanduser("~/.mitmproxy/mitmproxy-ca-cert.pem")
    if os.path.exists(cert_path):
        return FileResponse(
            cert_path,
            filename="mitmproxy-ca-cert.pem",
            media_type="application/x-x509-ca-cert",
        )
    return Response(
        status_code=404, content="Certificate not found. Please start the proxy first."
    )


@app.websocket("/ws/traffic")
async def traffic_websocket(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)


async def broadcast_traffic(data: dict):
    if not active_connections:
        return
    message = json.dumps(data)
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception as e:
            logger.error(f"Broadcast failed: {e}")


if __name__ == "__main__":
    import uvicorn

    port = config.get("app_port", 8000)
    host = config.get("app_host", "0.0.0.0")
    logger.info(f"Startup successful. Backend running on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
