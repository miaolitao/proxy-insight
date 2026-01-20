import sys
import os
import uvicorn

# 将 src 目录添加到 Python 路径，以便导入项目模块
base_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(base_dir, "src")
sys.path.append(src_dir)

from logging_config import logger, config

if __name__ == "__main__":
    port = config.get("app_port", 8000)
    host = config.get("app_host", "0.0.0.0")

    logger.info(f"Startup successful. Backend running on http://{host}:{port}")

    # 启动 FastAPI 服务
    # 使用字符串形式指定 app，以便 uvicorn 能够正确处理重载等功能
    uvicorn.run("main:app", host=host, port=port, reload=True, factory=False)
