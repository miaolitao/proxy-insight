import logging
import os
import json
from logging.handlers import RotatingFileHandler


def load_config():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(base_dir, "config.json")
    config = {
        "app_host": "0.0.0.0",
        "app_port": 8000,
        "proxy_host": "0.0.0.0",
        "proxy_port": 8080,
    }
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                config.update(json.load(f))
        except Exception as e:
            print(f"Failed to load config.json: {e}")

    # Allow environment variables to override
    config["app_host"] = os.getenv("APP_HOST", config["app_host"])
    config["app_port"] = int(os.getenv("APP_PORT", config["app_port"]))
    config["proxy_host"] = os.getenv("PROXY_HOST", config["proxy_host"])
    config["proxy_port"] = int(os.getenv("PROXY_PORT", config["proxy_port"]))

    return config


def setup_logging():
    # 确保 logs 目录存在于项目根目录 (src 的上一级)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    log_dir = os.path.join(project_root, "logs")
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file = os.path.join(log_dir, "app.log")

    # 配置根日志记录器
    logger = logging.getLogger("proxy_insight")
    logger.setLevel(logging.INFO)

    # 避免重复添加 handler
    if not logger.handlers:
        # 控制台处理器
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(console_formatter)

        # 文件处理器 (带轮转)
        file_handler = RotatingFileHandler(
            log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)
        file_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        file_handler.setFormatter(file_formatter)

        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

    # 禁止日志向上传递到根日志中
    logger.propagate = False

    return logger


# 全局实例
logger = setup_logging()
config = load_config()
