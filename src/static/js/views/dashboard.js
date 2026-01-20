/**
 * Dashboard View logic
 */
export const DashboardView = {
    stats: {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        totalLatency: 0,
        avgLatency: 0
    },

    init() {
        this.render();
    },

    setStats(stats) {
        this.stats.totalRequests = stats.total;
        this.stats.successCount = stats.success;
        this.stats.errorCount = stats.error;
        // Calculation from pre-aggregated average latency
        if (stats.avg_latency) {
            this.stats.avgLatency = Number.parseInt(stats.avg_latency, 10) || 0;
            this.stats.totalLatency = this.stats.avgLatency * this.stats.totalRequests;
        }
        this.render();
    },

    update(data) {
        this.stats.totalRequests++;
        const statusStr = String(data.status);
        const isSuccess = !statusStr.startsWith('4') && !statusStr.startsWith('5');
        if (isSuccess) {
            this.stats.successCount++;
        } else {
            this.stats.errorCount++;
        }

        // Latency
        const latency = Number.parseInt(data.time, 10) || 0;
        this.stats.totalLatency += latency;
        this.stats.avgLatency = Math.round(this.stats.totalLatency / this.stats.totalRequests);

        this.render();
    },

    clear() {
        this.stats = {
            totalRequests: 0,
            successCount: 0,
            errorCount: 0,
            totalLatency: 0,
            avgLatency: 0
        };
        this.render();
    },

    render() {
        const container = document.getElementById('dashboard-view');
        if (!container) return;

        const successRate = this.stats.totalRequests > 0 
            ? Math.round((this.stats.successCount / this.stats.totalRequests) * 100) 
            : 0;

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-value">${this.stats.totalRequests}</div>
                    <div class="stat-label">总请求数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value success">${successRate}%</div>
                    <div class="stat-label">成功率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value error">${this.stats.errorCount}</div>
                    <div class="stat-label">失败数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value info">${this.stats.avgLatency}ms</div>
                    <div class="stat-label">平均耗时</div>
                </div>
            </div>
            <div class="dashboard-section mt-4">
                <h3>统计数据说明</h3>
                <p>当前面板展示的是数据库中存储的所有历史流量统计。即使代理服务未运行，你依然可以查看过往的请求数据。数据会随着新捕获的请求实时更新。</p>
            </div>
        `;
    }
};
