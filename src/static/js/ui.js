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
        if (requestData.request && requestData.request.headers) {
            Object.entries(requestData.request.headers).forEach(([k, v]) => {
                // Skip Cookie header in normal headers loop if we handle it separately
                // But usually it's better to keep it if present. 
                // However, if the user sees 'Cookie' missing, it might be stripped.
                // Let's check if 'Cookie' is in headers.
                if (k.toLowerCase() === 'cookie') return; 
                cmd += ` \\\n  -H "${k}: ${v}"`;
            });
        }

        // Cookies
        if (requestData.request && requestData.request.cookies && Object.keys(requestData.request.cookies).length > 0) {
            const cookieStr = Object.entries(requestData.request.cookies)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ');
            cmd += ` \\\n  -b '${cookieStr}'`;
        }
        
        // Body
        if (requestData.request && requestData.request.body) {
            // Escape single quotes for shell safety if needed, simple version for now
            // A more robust implementation would use something like shell-quote, 
            // but for frontend JS simple escaping is usually "good enough" for display
            let body = requestData.request.body;
            // Minify JSON if it's a JSON body for cleaner copy-paste
            try {
                body = JSON.stringify(JSON.parse(body));
            } catch (e) {
                // Not JSON, use as is
            }
            // Escape double quotes inside the body since we wrap body in single quotes
            // or we wrap body in single quotes and escape single quotes.
            // Let's use single quotes for body '...'
            const escapedBody = body.replace(/'/g, "'\\''");
            cmd += ` \\\n  -d '${escapedBody}'`;
        }
        
        return cmd;
    }
};
