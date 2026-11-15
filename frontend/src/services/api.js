export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

export const listAgents = async () => {
  const res = await fetch(`${API_BASE}/agents`);
  if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`);
  return res.json();
};

export const submitQuery = async (payload) => {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Query failed: ${res.status}`);
  }
  return res.json();
};

export const getMemory = async (sessionId, limit = 50) => {
  const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(sessionId)}?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load memory: ${res.status}`);
  return res.json();
};

export const clearMemory = async (sessionId) => {
  const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to clear memory: ${res.status}`);
  return res.json();
};

export const connectLogs = (onMessage) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const apiOrigin = import.meta.env.VITE_API_BASE_URL ? new URL(import.meta.env.VITE_API_BASE_URL) : null;
  const wsProto = apiOrigin ? (apiOrigin.protocol === 'https:' ? 'wss:' : 'ws:') : protocol;
  const wsHost = apiOrigin ? apiOrigin.host : window.location.host;
  const ws = new WebSocket(`${wsProto}//${wsHost}/api/ws/logs`);
  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch (err) {
      console.warn('Failed to parse log message', err);
    }
  };
  return ws;
};
