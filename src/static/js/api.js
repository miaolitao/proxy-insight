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

  async getHistory(limit = 50, offset = 0, query = "") {
    let url = `/api/requests?limit=${limit}&offset=${offset}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    return await res.json();
  },

  async getStats() {
    const res = await fetch("/api/stats");
    return await res.json();
  },

  async clearAll() {
    const res = await fetch("/api/clear", {
      method: "POST",
    });
    return await res.json();
  },

  async getConfig() {
    const res = await fetch("/api/config");
    return await res.json();
  },

  async updateConfig(config) {
    const res = await fetch("/api/config/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });
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
