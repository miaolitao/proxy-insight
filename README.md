# ProxyInsight

ProxyInsight 是一款现代化、高性能的 mitmproxy Web 界面，旨在为开发者提供“开箱即用”的本地网络抓包环境与极致的视觉监控体验。

## 🌟 核心特性

- **高级视觉美学**：采用 4K 科技电路板纹理背景结合深度毛玻璃（Glassmorphism）设计，提供旗舰级的 UI 体验。
- **首页实时看板**：集成 Chart.js，动态展示流量趋势、响应耗时及请求状态分布。
- **实时通知中心**：内置 WebSocket 通知铃铛，实时捕获系统状态及关键事件。
- **一键代理控制**：自动接管并还原 macOS 系统全局代理，无需手动配置。
- **双引擎数据库**：支持轻量级 SQLite（默认）及高性能 MySQL 存储后端，历史数据永久留存。
- **全异步架构**：基于 FastAPI 与全异步数据库驱动，确保在高并发抓包场景下依然流畅。

## 🛠 技术栈

- **后端**: Python 3.10+, FastAPI, mitmproxy, Pydantic v2
- **前端**: 原生 HTML5, CSS3 (Vanilla), JavaScript (ES6+), Chart.js
- **包管理**: [uv](https://github.com/astral-sh/uv)
- **数据库**: aiosqlite / aiomysql

## 🚀 快速开始

### 1. 环境准备

确保已安装 `uv`（极致平衡的 Python 包管理工具）：

```bash
curl -LsSf https://astral-sh/uv/install.sh | sh
```

### 2. 启动应用

在项目根目录下运行：

```bash
python start.py
```

### 3. 进入界面

访问 [http://127.0.0.1:8000](http://127.0.0.1:8000) 即可进入首页。

## ⚙️ 关键配置说明

项目采用 `src/config.toml` 进行管理，其中两个核心端口的定义如下：

| 配置项 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `app_port` | `8000` | **应用入口**：用于访问 Web 管理界面及 API 服务。 |
| `proxy_port` | `8081` | **抓包入口**：mitmproxy 监听的端口。请将设备代理指向此端口以捕获流量。 |

> [!TIP]
> 切换数据库类型（SQLite/MySQL）只需在配置页面或 `config.toml` 中修改 `db_type` 即可。

## 📂 项目结构

```text
proxy-insight/
├── src/
│   ├── static/          # 前端静态资源 (CSS/JS/Assets)
│   ├── main.py          # FastAPI 应用入口与 WebSocket 逻辑
│   ├── db.py            # 异步数据库管理中心 (DBManager)
│   ├── config_api.py    # 动态配置 API 模块
│   ├── proxy_mgr.py     # mitmproxy 核心引擎封装
│   ├── config.toml      # 主配置文件
│   └── logging_config.py # 全局日志与路径定义
├── logs/                # 本地运行日志
├── pyproject.toml       # 项目依赖定义
└── README.md            # 项目说明文档
```

## 🔒 证书安装

为了拦截 HTTPS 流量，请在代理开启状态下访问 [http://mitm.it](http://mitm.it) 并按照指引安装并信任 mitmproxy CA 证书。

---

*Made with Premium UI/UX Design.*
