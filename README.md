# ProxyInsight

ProxyInsight 是一款现代化、高性能的 mitmproxy Web 界面，旨在为开发者提供“开箱即用”的本地网络抓包环境。

## 核心特性

- **高级视觉设计**：采用深色模式与磨砂玻璃（Glassmorphism）美学。
- **一键控制系统代理**：自动配置/还原 macOS 系统全局代理设置。
- **实时流量监控**：基于 WebSocket 的 live 抓包数据实时流式传输。
- **单一入口**：后端集成前端静态资源托管，一键启动。

## 技术栈

- **后端**: Python 3.10+, FastAPI, mitmproxy
- **前端**: 原生 HTML5, CSS3 (Vanilla), JavaScript
- **包管理**: [uv](https://github.com/astral-sh/uv)

## 快速开始

### 1. 环境准备

确保已安装 `uv`：

```bash
curl -LsSf https://astral-sh/uv/install.sh | sh
```

### 2. 安装依赖并启动

在项目根目录下运行：

```bash
python start.py
```

### 3. 使用

访问 [http://127.0.0.1:8000](http://127.0.0.1:8000) 即可进入 Web 界面。

## 项目结构

```text
proxy-insight/
├── src/             # 源代码目录
│   ├── static/      # 前端静态资源
│   ├── main.py      # FastAPI 应用入口
│   ├── proxy_mgr.py # mitmproxy 逻辑封装
│   ├── utils.py     # 系统代理控制工具
│   ├── config.json  # 配置文件
│   └── logging_config.py # 日志与配置加载中心
├── logs/            # 日志目录（自动生成）
├── pyproject.toml   # uv 配置文件
└── README.md
```

## 证书安装

为了拦截 HTTPS 流量，请在首次运行后访问 [http://mitm.it](http://mitm.it) 并按照指引安装 mitmproxy CA 证书。
