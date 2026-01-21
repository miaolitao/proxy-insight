import { UI } from '../ui.js';
import { API } from '../api.js';

/**
 * Request List View logic
 */
export const RequestListView = {
    requestList: null,
    detailPanel: null,
    selectedRequest: null,
    currentTab: 'Header',
    offset: 0,
    limit: 50,
    query: '',
    searchTimeout: null,

    init() {
        this.requestList = document.getElementById('request-list');
        this.detailPanel = document.getElementById('detail-panel');
        this.initTabs();
        this.initLoadMore();
    },

    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.textContent.trim();
                this.updateDetailContent();
            });
        });
    },

    initLoadMore() {
        const panel = document.querySelector('.request-panel');
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.textContent = '加载更多历史记录...';
        loadMoreBtn.style.display = 'block'; // Show by default
        loadMoreBtn.addEventListener('click', () => this.loadMore());
        panel.appendChild(loadMoreBtn);
        this.loadMoreBtn = loadMoreBtn;
        
        // Load initial history on start
        this.loadMore();
    },

    async loadMore() {
        this.loadMoreBtn.textContent = '正在加载...';
        this.loadMoreBtn.disabled = true;
        
        try {
            const history = await API.getHistory(this.limit, this.offset, this.query);
            if (history && history.length > 0) {
                history.forEach(data => this.renderRequest(data, true));
                this.offset += history.length;
                if (history.length < this.limit) {
                    this.loadMoreBtn.style.display = 'none';
                }
            } else {
                this.loadMoreBtn.style.display = 'none';
            }
        } catch (err) {
            console.error('Failed to load more history:', err);
            UI.showToast('加载失败', 'error');
        } finally {
            this.loadMoreBtn.textContent = '加载更多历史记录...';
            this.loadMoreBtn.disabled = false;
        }
    },

    renderRequest(data, append = false) {
        const item = document.createElement('div');
        item.className = 'request-item';
        const methodClass = data.method.toLowerCase();
        const statusClass = (data.status && String(data.status).startsWith('2')) ? 'success' : 'error';

        item.innerHTML = `
            <div class="col method ${methodClass}">${data.method}</div>
            <div class="col status ${statusClass}">${data.status || 'Unknown'}</div>
            <div class="col url">${data.url}</div>
            <div class="col timestamp">${data.timestamp || ''}</div>
            <div class="col time">${data.time}</div>
        `;

        item.addEventListener('click', () => {
            this.requestList.querySelectorAll('.request-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            this.selectedRequest = data;
            this.detailPanel.style.display = 'flex';
            this.updateDetailContent();
        });

        if (append) {
            this.requestList.appendChild(item);
        } else {
            this.requestList.prepend(item);
        }
    },

    updateDetailContent() {
        if (!this.selectedRequest) return;
        const detailContent = document.querySelector('.detail-content');
        let html = '';

        switch (this.currentTab) {
            case 'Header':
                html = `
                    <div class="detail-section">
                        <h3>常规 (General)</h3>
                        <pre><code>URL: ${this.selectedRequest.url}\nMethod: ${this.selectedRequest.method}\nStatus: ${this.selectedRequest.status}</code></pre>
                    </div>
                    <div class="detail-section">
                        <h3>请求头 (Request Headers)</h3>
                        <pre><code>${UI.formatHeaders(this.selectedRequest.request.headers)}</code></pre>
                    </div>
                    <div class="detail-section">
                        <h3>响应头 (Response Headers)</h3>
                        <pre><code>${UI.formatHeaders(this.selectedRequest.response.headers)}</code></pre>
                    </div>
                `;
                break;
            case 'Body':
                html = `
                    <div class="detail-section">
                        <h3>请求主体 (Request Body)</h3>
                        <pre><code>${UI.formatBody(this.selectedRequest.request.body)}</code></pre>
                    </div>
                    <div class="detail-section">
                        <h3>响应主体 (Response Body)</h3>
                        <pre><code>${UI.formatBody(this.selectedRequest.response.body)}</code></pre>
                    </div>
                `;
                break;
            case 'Cookie':
                html = `
                    <div class="detail-section">
                        <h3>请求 Cookie</h3>
                        <pre><code>${JSON.stringify(this.selectedRequest.request.cookies, null, 2)}</code></pre>
                    </div>
                    <div class="detail-section">
                        <h3>响应 Cookie</h3>
                        <pre><code>${JSON.stringify(this.selectedRequest.response.cookies, null, 2)}</code></pre>
                    </div>
                `;
                break;
            case 'Curl': {
                const curlCmd = UI.generateCurlCommand(this.selectedRequest);
                html = `
                    <div class="detail-section">
                        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <h3>cURL Command</h3>
                            <button class="copy-btn" onclick="navigator.clipboard.writeText(document.querySelector('#curl-code').innerText).then(() => { const btn = document.querySelector('.copy-btn'); btn.textContent = '已复制'; setTimeout(() => btn.textContent = '复制', 2000); })">复制</button>
                        </div>
                        <pre><code id="curl-code">${curlCmd}</code></pre>
                    </div>
                `;
                break;
            }
            case 'Response':
                html = `
                    <div class="detail-section">
                        <h3>状态 (Status)</h3>
                        <pre><code>${this.selectedRequest.status}</code></pre>
                    </div>
                    <div class="detail-section">
                        <h3>响应头 (Response Headers)</h3>
                        <pre><code>${UI.formatHeaders(this.selectedRequest.response.headers)}</code></pre>
                    </div>
                    <div class="detail-section">
                        <h3>响应主体 (Response Body)</h3>
                        <pre><code>${UI.formatBody(this.selectedRequest.response.body)}</code></pre>
                    </div>
                `;
                break;
            case '耗时':
                html = `
                    <div class="detail-section">
                        <h3>耗时统计</h3>
                        <pre><code>Total Time: ${this.selectedRequest.time}</code></pre>
                    </div>
                `;
                break;
        }

        detailContent.innerHTML = html;
    },

    clear() {
        if (this.requestList) this.requestList.innerHTML = '';
        if (this.detailPanel) this.detailPanel.style.display = 'none';
        this.selectedRequest = null;
        this.offset = 0;
        if (this.loadMoreBtn) this.loadMoreBtn.style.display = 'none';
    },

    async filter(query) {
        this.query = query;
        this.offset = 0;
        
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        
        this.searchTimeout = setTimeout(async () => {
            this.clear();
            await this.loadMore();
            if (query) {
                UI.showToast(`搜索历史: ${query}`, 'info');
            }
        }, 500);
    }
};

