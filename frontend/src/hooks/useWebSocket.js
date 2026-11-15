import { useEffect, useRef } from 'react';

export function useWebSocket(path, onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!path) return;
    let ws;
    let closed = false;
    let retryTimer;

    const connect = () => {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
      let wsUrl;
      if (apiBase) {
        const u = new URL(apiBase);
        const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${proto}//${u.host}${path}`;
      } else {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${proto}//${window.location.host}${path}`;
      }

      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.warn('WebSocket parse error:', err);
        }
      };
      ws.onclose = () => {
        if (!closed) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [path]);
}

export default useWebSocket;