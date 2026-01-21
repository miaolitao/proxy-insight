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


@router.get("")
async def get_current_config():
    """Get the current configuration from config.toml."""
    config_path = os.path.join(SRC_DIR, "config.toml")
    logger.info(f"Fetching config from {config_path}")
    if os.path.exists(config_path):
        try:
            with open(config_path, "rb") as f:
                return tomllib.load(f)
        except Exception as e:
            logger.error(f"Failed to load TOML: {e}")
            raise HTTPException(status_code=500, detail="Malformed config.toml")
    return config


@router.post("/update")
async def update_config(update: ConfigUpdate):
    """Update configuration and save to config.toml."""
    config_path = os.path.join(SRC_DIR, "config.toml")

    # Reload current to preserve comments if possible,
    # but tomllib is read-only. We'll overwrite for now.
    # In a real app, we might use a TOML writer that preserves comments.

    current_cfg = {}
    if os.path.exists(config_path):
        with open(config_path, "rb") as f:
            current_cfg = tomllib.load(f)

    # Simple manual merge
    if update.db_type:
        current_cfg["db_type"] = update.db_type
    if update.app_host:
        current_cfg["app_host"] = update.app_host
    if update.app_port:
        current_cfg["app_port"] = update.app_port
    if update.proxy_host:
        current_cfg["proxy_host"] = update.proxy_host
    if update.proxy_port:
        current_cfg["proxy_port"] = update.proxy_port
    if update.mysql:
        if "mysql" not in current_cfg:
            current_cfg["mysql"] = {}
        current_cfg["mysql"].update(update.mysql)

    try:
        with open(config_path, "w", encoding="utf-8") as f:
            # Manual TOML writing since standard lib doesn't have a dump
            lines = []
            if "app_host" in current_cfg:
                lines.append(f'app_host = "{current_cfg["app_host"]}"')
            if "app_port" in current_cfg:
                lines.append(f'app_port = {current_cfg["app_port"]}')
            if "proxy_host" in current_cfg:
                lines.append(f'proxy_host = "{current_cfg["proxy_host"]}"')
            if "proxy_port" in current_cfg:
                lines.append(f'proxy_port = {current_cfg["proxy_port"]}')
            if "db_type" in current_cfg:
                lines.append(f'db_type = "{current_cfg["db_type"]}"')

            if "mysql" in current_cfg:
                lines.append("\n[mysql]")
                for k, v in current_cfg["mysql"].items():
                    if isinstance(v, str):
                        lines.append(f'{k} = "{v}"')
                    else:
                        lines.append(f"{k} = {v}")

            f.write("\n".join(lines))

        logger.info("Configuration updated successfully")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update config: {e}")
        raise HTTPException(status_code=500, detail=str(e))
