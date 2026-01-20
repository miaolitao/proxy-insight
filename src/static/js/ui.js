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
    }
};
