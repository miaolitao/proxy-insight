import { API } from './api.js';
import { UI } from './ui.js';
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
            (data) => this.handleNewRequest(data),
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

            // Load requests
            const history = await API.getHistory();
            if (Array.isArray(history)) {
                // Use a separate copy to satisfy lint and keep order logic clear
                const reversedHistory = [...history].reverse();
                reversedHistory.forEach(data => {
                    this.allRequests.unshift(data);
                    RequestListView.renderRequest(data);
                });
                UI.showToast(`已加载 ${history.length} 条历史记录`, 'info');
            }
        } catch (err) {
            console.error('Failed to load history:', err);
            UI.showToast('历史记录加载失败', 'error');
        }
    }

    bindEvents() {
        const proxyToggle = document.getElementById('proxy-toggle');
        const clearBtn = document.getElementById('clear-btn');
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
                    UI.showToast(enable ? '代理服务已启动' : '代理服务已停止', 'success');
                } else {
                    proxyToggle.checked = !enable;
                    UI.showToast('操作失败，请检查权限', 'error');
                }
            } catch (err) {
                console.error('Toggle error:', err);
                proxyToggle.checked = !enable;
                UI.showToast('无法连接到后端服务', 'error');
            }
        });

        // Clear All
        clearBtn.addEventListener('click', () => {
            this.allRequests = [];
            DashboardView.clear();
            RequestListView.clear();
            searchInput.value = '';
            UI.showToast('列表及统计已清空');
        });

        // Search Filter
        searchInput.addEventListener('input', (e) => {
            RequestListView.filter(e.target.value.toLowerCase());
        });

        // Navigation
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const text = item.innerText;
                if (text.includes('仪表盘')) {
                    e.preventDefault();
                    this.switchView('dashboard');
                } else if (text.includes('请求列表')) {
                    e.preventDefault();
                    this.switchView('request-list');
                }
                
                if (!item.id.includes('cert-link') && item.getAttribute('href') === '#') {
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

    handleNewRequest(data) {
        this.allRequests.unshift(data);
        if (this.allRequests.length > 500) this.allRequests.pop();
        
        DashboardView.update(data);
        RequestListView.renderRequest(data);
    }

    switchView(viewName) {
        this.currentView = viewName;
        const dashboardView = document.getElementById('dashboard-view');
        const listView = document.getElementById('request-list-view');
        
        if (viewName === 'dashboard') {
            dashboardView.style.display = 'block';
            listView.style.display = 'none';
        } else {
            dashboardView.style.display = 'none';
            listView.style.display = 'flex';
        }
    }
}

// Start the app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
