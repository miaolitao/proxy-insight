/**
 * API and WebSocket communication module
 */
export const API = {
  async getStatus() {
    const res = await fetch("/api/status");
    return await res.json();
  },

  async toggleProxy(enable) {
    const res = await fetch(`/api/proxy/toggle?enable=${enable}`, {
      method: "POST",
    });
    return await res.json();
  },

  async getHistory(limit = 50, offset = 0) {
    const res = await fetch(`/api/requests?limit=${limit}&offset=${offset}`);
    return await res.json();
  },

  async getStats() {
    const res = await fetch("/api/stats");
    return await res.json();
  },

  initWebSocket(onMessage, onError) {
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${globalThis.location.host}/ws/traffic`,
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      data.id = Date.now() + Math.random();
      onMessage(data);
    };

    socket.onerror = (err) => {
      if (onError) onError(err);
    };

    return socket;
  },
};
