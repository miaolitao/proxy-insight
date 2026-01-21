import { API } from './api.js?v=20260121';
import { UI } from './ui.js?v=20260121';
import { DashboardView } from './views/dashboard.js';
import { RequestListView } from './views/request-list.js';

/**
 * Main Application Orchestrator
 */
class App {
    constructor() {
        this.allRequests = [];
        this.currentView = 'dashboard';
    }

    async init() {
        // Initialize views
        DashboardView.init();
        RequestListView.init();

        // Bind global controls
        this.bindEvents();
        
        // Initial status check & History
        try {
            await this.checkStatus();
            await this.initializeHistory();
        } catch (err) {
            console.error('Initialization error:', err);
        }

        // Initialize WebSocket
        API.initWebSocket(
            (data) => {
                if (data.type === 'clear') {
                    this.handleRemoteClear();
                } else if (data.type === 'notification') {
                    UI.addNotification(data);
                } else {
                    this.handleNewRequest(data);
                }
            },
            (err) => {
                UI.showToast('WebSocket 连接异常', 'error');
                console.error(err);
            }
        );

        // Set initial view
        this.switchView('dashboard');
    }

    async checkStatus() {
        try {
            const data = await API.getStatus();
            const isActive = data.proxy_running;
            const toggle = document.getElementById('proxy-toggle');
            if (toggle) toggle.checked = isActive;
            UI.updateStatusUI(isActive);
        } catch (err) {
            UI.showToast('获取初始化状态失败', 'error');
            throw err;
        }
    }

    async initializeHistory() {
        try {
            // Load stats first
            const stats = await API.getStats();
            DashboardView.setStats(stats);

            // Load first page of requests
            await RequestListView.loadMore();
            UI.showToast('历史记录已加载', 'info');
        } catch (err) {
            console.error('Failed to load history:', err);
            UI.showToast('历史记录加载失败', 'error');
        }
    }

    bindEvents() {
        const proxyToggle = document.getElementById('proxy-toggle');
        const clearBtn = document.getElementById('clear-btn');
        const bellBtn = document.getElementById('bell-btn');
        const markReadBtn = document.getElementById('mark-read-btn');
        const notifDropdown = document.getElementById('notif-dropdown');
        const searchInput = document.getElementById('search-input');
        const navItems = document.querySelectorAll('.nav-item');
        const certLink = document.getElementById('cert-link');

        // Proxy Toggle
        proxyToggle.addEventListener('change', async (e) => {
            const enable = e.target.checked;
            try {
                const data = await API.toggleProxy(enable);
                if (data.success) {
                    UI.updateStatusUI(enable);
                } else {
                    proxyToggle.checked = !enable;
                    UI.showToast(data.error || '操作失败，请检查权限', 'error');
                }
            } catch (err) {
                console.error('Toggle error:', err);
                proxyToggle.checked = !enable;
                UI.showToast('无法连接到后端服务', 'error');
            }
        });

        // Clear All
        clearBtn.addEventListener('click', async () => {
            try {
                await API.clearAll();
                this.handleRemoteClear();
                UI.showToast('列表及统计已清空');
            } catch (err) {
                console.error('Clear error:', err);
                UI.showToast('清空失败', 'error');
            }
        });

        // Notification Bell
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('show');
            const badge = document.getElementById('notif-badge');
            if (notifDropdown.classList.contains('show')) {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
        });

        markReadBtn.addEventListener('click', () => {
            const list = document.getElementById('notif-list');
            list.innerHTML = '<div class="notif-empty">暂无新消息</div>';
            UI.showToast('已标记全部为已读');
        });

        document.addEventListener('click', () => {
            notifDropdown.classList.remove('show');
        });

        // Search Filter
        searchInput.addEventListener('input', (e) => {
            RequestListView.filter(e.target.value.trim());
        });

        // Navigation
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                const text = item.innerText;
                if (text.includes('仪表盘')) {
                    e.preventDefault();
                    this.switchView('dashboard');
                } else if (text.includes('请求列表')) {
                    e.preventDefault();
                    this.switchView('request-list');
                } else if (text.includes('设置')) {
                    e.preventDefault();
                    await this.showSettings();
                }
                
                if (item.getAttribute('href') === '#') {
                    navItems.forEach(ni => ni.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });

        // Cert Link
        if (certLink) {
            certLink.addEventListener('click', () => {
                UI.showToast('开始下载 CA 证书...', 'info');
            });
        }
    }

    async showSettings() {
        try {
            const config = await API.getConfig();
            UI.renderSettings(config);
            this.switchView('settings');
            
            // Re-bind save button since it's re-rendered
            document.getElementById('save-config-btn').onclick = async () => {
                const updated = {
                    app_host: document.getElementById('cfg-app-host').value,
                    app_port: Number.parseInt(document.getElementById('cfg-app-port').value),
                    proxy_host: document.getElementById('cfg-proxy-host').value,
                    proxy_port: Number.parseInt(document.getElementById('cfg-proxy-port').value),
                    db_type: document.querySelector('.db-option.active').dataset.type,
                    mysql: {
                        host: document.getElementById('cfg-mysql-host').value,
                        port: Number.parseInt(document.getElementById('cfg-mysql-port').value),
                        user: document.getElementById('cfg-mysql-user').value,
                        password: document.getElementById('cfg-mysql-pass').value,
                        database: document.getElementById('cfg-mysql-db').value
                    }
                };
                
                try {
                    const res = await API.updateConfig(updated);
                    if (res.success) {
                        UI.showToast('配置已保存，部分设置需重启生效', 'success');
                    }
                } catch (err) {
                    UI.showToast('保存失败', 'error');
                }
            };
        } catch (err) {
            UI.showToast('加载配置失败', 'error');
        }
    }

    handleNewRequest(data) {
        this.allRequests.unshift(data);
        if (this.allRequests.length > 500) this.allRequests.pop();
        
        DashboardView.update(data);
        RequestListView.renderRequest(data);
    }

    handleRemoteClear() {
        this.allRequests = [];
        DashboardView.clear();
        RequestListView.clear();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
    }

    switchView(viewName) {
        this.currentView = viewName;
        const views = {
            'dashboard': document.getElementById('dashboard-view'),
            'request-list': document.getElementById('request-list-view'),
            'settings': document.getElementById('settings-view')
        };
        
        Object.keys(views).forEach(v => {
            if (views[v]) views[v].style.display = 'none';
        });
        
        if (views[viewName]) {
            views[viewName].style.display = viewName === 'request-list' ? 'flex' : 'block';
        }
    }
}

// Start the app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
