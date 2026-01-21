from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import tomllib
import os
import logging
from typing import Dict, Any, Optional

# Assuming these are imported correctly in main.py
from logging_config import config, PROJECT_ROOT, SRC_DIR

router = APIRouter(prefix="/api/config", tags=["config"])
logger = logging.getLogger("proxy_insight")


class ConfigUpdate(BaseModel):
    db_type: Optional[str] = None
    app_host: Optional[str] = None
    app_port: Optional[int] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    mysql: Optional[Dict[str, Any]] = None


import asyncio


def _read_config(path: str) -> bytes:
    """Sync helper to read file safely."""
    with open(path, "rb") as f:
        return f.read()


def _write_config(path: str, cfg: Dict[str, Any]):
    """Sync helper to write TOML config."""
    lines = []
    if "app_host" in cfg:
        lines.append(f'app_host = "{cfg["app_host"]}"')
    if "app_port" in cfg:
        lines.append(f'app_port = {cfg["app_port"]}')
    if "proxy_host" in cfg:
        lines.append(f'proxy_host = "{cfg["proxy_host"]}"')
    if "proxy_port" in cfg:
        lines.append(f'proxy_port = {cfg["proxy_port"]}')
    if "db_type" in cfg:
        lines.append(f'db_type = "{cfg["db_type"]}"')

    if "mysql" in cfg:
        lines.append("\n[mysql]")
        for k, v in cfg["mysql"].items():
            if isinstance(v, str):
                lines.append(f'{k} = "{v}"')
            else:
                lines.append(f"{k} = {v}")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


@router.get("")
async def get_current_config():
    """Get the current configuration from config.toml."""
    config_path = os.path.join(SRC_DIR, "config.toml")
    logger.info(f"Fetching config from {config_path}")
    if os.path.exists(config_path):
        try:
            content = await asyncio.to_thread(_read_config, config_path)
            return tomllib.loads(
                content.decode("utf-8") if isinstance(content, bytes) else content
            )
        except Exception as e:
            logger.error(f"Failed to load TOML: {e}")
            raise HTTPException(status_code=500, detail="Malformed config.toml")
    return config


@router.post("/update")
async def update_config(update: ConfigUpdate):
    """Update configuration and save to config.toml."""
    config_path = os.path.join(SRC_DIR, "config.toml")

    # Load current to merge
    current_cfg = {}
    if os.path.exists(config_path):
        try:
            content = await asyncio.to_thread(_read_config, config_path)
            current_cfg = tomllib.loads(
                content.decode("utf-8") if isinstance(content, bytes) else content
            )
        except Exception as e:
            logger.warning(f"Failed to load current config for merge: {e}")

    # Merge updates
    _merge_updates(current_cfg, update)

    try:
        # Save to file asynchronously
        await asyncio.to_thread(_write_config, config_path, current_cfg)

        # Apply to in-memory config object
        _apply_in_memory_config(update)

        # Trigger DB Refresh
        from db import db_manager

        db_manager.refresh_config()
        await db_manager.init_db()

        # Notify
        await _notify_update(db_manager.db_type)

        logger.info("Configuration updated and applied successfully")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _merge_updates(current: Dict[str, Any], update: ConfigUpdate):
    """Helper to merge update model into dict."""
    if update.db_type:
        current["db_type"] = update.db_type
    if update.app_host:
        current["app_host"] = update.app_host
    if update.app_port:
        current["app_port"] = update.app_port
    if update.proxy_host:
        current["proxy_host"] = update.proxy_host
    if update.proxy_port:
        current["proxy_port"] = update.proxy_port
    if update.mysql:
        if "mysql" not in current:
            current["mysql"] = {}
        current["mysql"].update(update.mysql)


def _apply_in_memory_config(update: ConfigUpdate):
    """Helper to update the global mutable config dict."""
    if update.db_type:
        config["db_type"] = update.db_type
    if update.app_host:
        config["app_host"] = update.app_host
    if update.app_port:
        config["app_port"] = update.app_port
    if update.proxy_host:
        config["proxy_host"] = update.proxy_host
    if update.proxy_port:
        config["proxy_port"] = update.proxy_port
    if update.mysql:
        if "mysql" not in config:
            config["mysql"] = {}
        config["mysql"].update(update.mysql)


async def _notify_update(db_type: str):
    """Helper to send WebSocket notification."""
    try:
        from main import send_notification

        await send_notification("success", "配置热更新", f"数据库已切换至 {db_type}")
    except Exception as ne:
        logger.warning(f"Failed to send hot-reload notification: {ne}")
