/**
 * UI components and general helpers
 */
export const UI = {
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        // Force reflow
        toast.offsetWidth;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, 3000);
    },

    updateStatusUI(isActive) {
        const statusLabel = document.getElementById('status-label');
        if (!statusLabel) return;
        statusLabel.textContent = isActive ? '运行中' : '已关闭';
        statusLabel.className = isActive ? 'status-active' : 'status-inactive';
    },

    formatHeaders(headers) {
        if (!headers) return '';
        return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
    },

    formatBody(content) {
        if (!content) return '(Empty Body)';
        try {
            const obj = JSON.parse(content);
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            console.error('Body format error:', e);
            return content;
        }
    },

    generateCurlCommand(requestData) {
        if (!requestData) return '';
        
        let cmd = `curl -X ${requestData.method} "${requestData.url}"`;
        
        // Headers
        if (requestData.request?.headers) {
            Object.entries(requestData.request.headers).forEach(([k, v]) => {
                if (k.toLowerCase() === 'cookie') return; 
                cmd += ` \\\n  -H "${k}: ${v}"`;
            });
        }

        // Cookies
        if (requestData.request?.cookies && Object.keys(requestData.request.cookies).length > 0) {
            const cookieStr = Object.entries(requestData.request.cookies)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ');
            cmd += ` \\\n  -b '${cookieStr}'`;
        }
        
        // Body
        if (requestData.request?.body) {
            let body = requestData.request.body;
            try {
                body = JSON.stringify(JSON.parse(body));
            } catch (e) { }
            const escapedBody = body.replaceAll(/'/g, "'\\''");
            cmd += ` \\\n  -d '${escapedBody}'`;
        }
        
        return cmd;
    },

    addNotification(notif) {
        const list = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (!list || !badge) return;

        // Remove empty state
        const empty = list.querySelector('.notif-empty');
        if (empty) empty.remove();

        const item = document.createElement('div');
        item.className = `notif-item ${notif.level}`;
        
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        item.innerHTML = `
            <div class="notif-icon">${icons[notif.level] || '🔔'}</div>
            <div class="notif-info">
                <span class="notif-title">${notif.title}</span>
                <span class="notif-msg">${notif.message}</span>
                <span class="notif-time">${notif.timestamp}</span>
            </div>
        `;
        list.prepend(item);

        // Update badge
        const count = Number.parseInt(badge.textContent) + 1;
        badge.textContent = count;
        badge.style.display = 'block';
    },

    renderSettings(config) {
        const container = document.getElementById('settings-view');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-container">
                <section class="settings-section">
                    <h2>应用配置</h2>
                    <div class="settings-group">
                        <div class="form-item">
                            <label>服务监听地址 (Host)</label>
                            <input type="text" id="cfg-app-host" value="${config.app_host}">
                        </div>
                        <div class="form-item">
                            <label>服务端口 (Port)</label>
                            <input type="number" id="cfg-app-port" value="${config.app_port}">
                        </div>
                    </div>
                </section>

                <section class="settings-section">
                    <h2>代理配置</h2>
                    <div class="settings-group">
                        <div class="form-item">
                            <label>代理监听地址 (Host)</label>
                            <input type="text" id="cfg-proxy-host" value="${config.proxy_host}">
                        </div>
                        <div class="form-item">
                            <label>代理端口 (Port)</label>
                            <input type="number" id="cfg-proxy-port" value="${config.proxy_port}">
                        </div>
                    </div>
                </section>

                <section class="settings-section">
                    <h2>数据库配置</h2>
                    <div class="db-selector">
                        <div class="db-option ${config.db_type === 'sqlite' ? 'active' : ''}" data-type="sqlite">
                            <span class="icon">📁</span>
                            <span class="db-name">SQLite</span>
                        </div>
                        <div class="db-option ${config.db_type === 'mysql' ? 'active' : ''}" data-type="mysql">
                            <span class="icon">🐬</span>
                            <span class="db-name">MySQL</span>
                        </div>
                    </div>

                    <div id="mysql-settings" style="display: ${config.db_type === 'mysql' ? 'block' : 'none'}">
                        <div class="settings-group">
                            <div class="form-item">
                                <label>MySQL 主机</label>
                                <input type="text" id="cfg-mysql-host" value="${config.mysql?.host || ''}">
                            </div>
                            <div class="form-item">
                                <label>端口</label>
                                <input type="number" id="cfg-mysql-port" value="${config.mysql?.port || 3306}">
                            </div>
                            <div class="form-item">
                                <label>用户名</label>
                                <input type="text" id="cfg-mysql-user" value="${config.mysql?.user || ''}">
                            </div>
                            <div class="form-item">
                                <label>密码</label>
                                <input type="password" id="cfg-mysql-pass" value="${config.mysql?.password || ''}">
                            </div>
                            <div class="form-item">
                                <label>数据库名</label>
                                <input type="text" id="cfg-mysql-db" value="${config.mysql?.database || ''}">
                            </div>
                        </div>
                    </div>
                </section>

                <div class="settings-actions">
                    <button class="btn-secondary" id="reset-config-btn">恢复默认</button>
                    <button class="btn-primary" id="save-config-btn">保存并应用</button>
                </div>
            </div>
        `;

        // Add event listeners for settings interaction
        const dbOptions = container.querySelectorAll('.db-option');
        const mysqlSection = container.querySelector('#mysql-settings');
        dbOptions.forEach(opt => {
            opt.onclick = () => {
                dbOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                mysqlSection.style.display = opt.dataset.type === 'mysql' ? 'block' : 'none';
            };
        });
    }
};
