import { UI } from '../ui.js';

/**
 * Request List View logic
 */
export const RequestListView = {
    requestList: null,
    detailPanel: null,
    selectedRequest: null,
    currentTab: 'Header',

    init() {
        this.requestList = document.getElementById('request-list');
        this.detailPanel = document.getElementById('detail-panel');
        this.initTabs();
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

    renderRequest(data) {
        const item = document.createElement('div');
        item.className = 'request-item';
        const methodClass = data.method.toLowerCase();
        const statusClass = data.status.startsWith('2') ? 'success' : 'error';

        item.innerHTML = `
            <div class="col method ${methodClass}">${data.method}</div>
            <div class="col status ${statusClass}">${data.status}</div>
            <div class="col url">${data.url}</div>
            <div class="col time">${data.time}</div>
        `;

        item.addEventListener('click', () => {
            this.requestList.querySelectorAll('.request-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            this.selectedRequest = data;
            this.detailPanel.style.display = 'flex';
            this.updateDetailContent();
        });

        // Apply current filter
        const query = document.getElementById('search-input').value.toLowerCase();
        if (query && !item.textContent.toLowerCase().includes(query)) {
            item.style.display = 'none';
        }

        this.requestList.prepend(item);
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
    },

    filter(query) {
        const items = this.requestList.querySelectorAll('.request-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }
};
