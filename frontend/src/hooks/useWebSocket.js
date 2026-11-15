import { useEffect, useCallback, useRef } from 'react';

// Configurable WebSocket backend base URL. Defaults to the FastAPI backend
// running locally on port 8000; override with VITE_WS_BASE_URL when the
// frontend is served from a different host (e.g. production).
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export function useWebSocket(url, onMessage) {
  const cbRef = useRef(onMessage);
  const wsRef = useRef(null);

  useEffect(() => {
    cbRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url) return;
    // Resolve relative paths (e.g. "/api/ws/logs") against the backend base URL
    // so the client connects directly to the FastAPI backend instead of the
    // Vite dev port, which does not proxy WebSocket traffic.
    const resolvedUrl =
      url.startsWith('ws://') || url.startsWith('wss://')
        ? url
        : `${WS_BASE_URL}${url}`;
    const ws = new WebSocket(resolvedUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[ws] connected to log stream');
    };

    ws.onmessage = (event) => {
      try {
        cbRef.current(JSON.parse(event.data));
      } catch (err) {
        console.warn('[ws] failed to parse message', err);
      }
    };

    ws.onclose = () => {
      console.log('[ws] log stream closed');
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.warn('[ws] log stream error', err);
    };

    return () => {
      if (ws) ws.close();
      wsRef.current = null;
    };
  }, [url]);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const connected =
    wsRef.current != null && wsRef.current.readyState === WebSocket.OPEN;

  return { send, connected };
}
