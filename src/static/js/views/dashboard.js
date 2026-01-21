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
    trendData: [], // Stores last 15 points
    charts: {
        trend: null,
        status: null
    },

    init() {
        this.render();
        this.initCharts();
    },

    initCharts() {
        const trendCtx = document.getElementById('trend-chart')?.getContext('2d');
        const statusCtx = document.getElementById('status-chart')?.getContext('2d');

        if (trendCtx) {
            this.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: new Array(15).fill(''),
                    datasets: [{
                        label: '响应耗时 (ms)',
                        data: new Array(15).fill(0),
                        borderColor: '#8e44ad',
                        backgroundColor: 'rgba(142, 68, 173, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0' } },
                        x: { display: false }
                    }
                }
            });
        }

        if (statusCtx) {
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['成功', '失败'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#2ecc71', '#e74c3c'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#a0a0a0', padding: 20 } } },
                    cutout: '70%'
                }
            });
        }
    },

    setStats(stats) {
        this.stats.totalRequests = stats.total;
        this.stats.successCount = stats.success;
        this.stats.errorCount = stats.error;
        if (stats.avg_latency) {
            this.stats.avgLatency = Math.round(stats.avg_latency) || 0;
            this.stats.totalLatency = this.stats.avgLatency * this.stats.totalRequests;
        }
        this.updateUI();
        this.updateCharts();
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

        const latency = Number.parseInt(data.time, 10) || 0;
        this.stats.totalLatency += latency;
        this.stats.avgLatency = Math.round(this.stats.totalLatency / this.stats.totalRequests);

        // Update trend data
        this.trendData.push(latency);
        if (this.trendData.length > 15) this.trendData.shift();

        this.updateUI();
        this.updateCharts();
    },

    updateUI() {
        const totalEl = document.getElementById('stat-total');
        const rateEl = document.getElementById('stat-rate');
        const errorEl = document.getElementById('stat-error');
        const latencyEl = document.getElementById('stat-latency');

        if (totalEl) totalEl.textContent = this.stats.totalRequests;
        if (rateEl) {
            const rate = this.stats.totalRequests > 0 
                ? Math.round((this.stats.successCount / this.stats.totalRequests) * 100) 
                : 0;
            rateEl.textContent = `${rate}%`;
        }
        if (errorEl) errorEl.textContent = this.stats.errorCount;
        if (latencyEl) latencyEl.textContent = `${this.stats.avgLatency}ms`;
    },

    updateCharts() {
        if (this.charts.trend && this.trendData.length > 0) {
            // Fill with zeros if less than 15 points
            const data = [...new Array(Math.max(0, 15 - this.trendData.length)).fill(0), ...this.trendData];
            this.charts.trend.data.datasets[0].data = data;
            this.charts.trend.update('none');
        }

        if (this.charts.status) {
            this.charts.status.data.datasets[0].data = [this.stats.successCount, this.stats.errorCount];
            this.charts.status.update('none');
        }
    },

    clear() {
        this.stats = { totalRequests: 0, successCount: 0, errorCount: 0, totalLatency: 0, avgLatency: 0 };
        this.trendData = [];
        this.updateUI();
        this.updateCharts();
    },

    render() {
        const container = document.getElementById('dashboard-view');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-value" id="stat-total">0</div>
                    <div class="stat-label">总请求数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value success" id="stat-rate">0%</div>
                    <div class="stat-label">成功率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value error" id="stat-error">0</div>
                    <div class="stat-label">失败数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value info" id="stat-latency">0ms</div>
                    <div class="stat-label">平均耗时</div>
                </div>
            </div>

            <div class="dashboard-charts">
                <div class="chart-container">
                    <h3><span>📈</span> 实时流量趋势</h3>
                    <div class="chart-wrapper">
                        <canvas id="trend-chart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <h3><span>🎯</span> 响应状态分布</h3>
                    <div class="chart-wrapper">
                        <canvas id="status-chart"></canvas>
                    </div>
                </div>
            </div>

            <div class="dashboard-section">
                <h3>统计数据报告</h3>
                <p>当前面板展示的是数据库中存储的所有历史流量统计。数据实时同步，支持多维度可视化分析。</p>
            </div>
        `;
        
        // Re-init charts if they were destroyed by innerHTML
        setTimeout(() => this.initCharts(), 0);
    }
};
