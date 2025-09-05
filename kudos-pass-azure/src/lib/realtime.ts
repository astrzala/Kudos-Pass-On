"use client";
import { useEffect, useRef, useState } from 'react';

type EventPayload = { event: string; payload: unknown };

export function useSessionRealtime(sessionCode: string, onEvent: (e: EventPayload) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function connectWs() {
      try {
        const res = await fetch(`/api/webpubsub/negotiate?user=${encodeURIComponent(sessionCode)}`);
        if (!res.ok) throw new Error('negotiate failed');
        const { url } = await res.json();
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data as string);
            if (data && data.event) onEvent(data as EventPayload);
          } catch {}
        };
      } catch {
        startPolling();
      }
    }

    function startPolling() {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        const headers: Record<string, string> = {};
        if (etagRef.current) headers['If-None-Match'] = etagRef.current;
        const res = await fetch(`/api/session?code=${sessionCode}`, { headers });
        if (res.status === 304) return;
        if (res.ok) {
          const etag = res.headers.get('ETag');
          if (etag) etagRef.current = etag;
          onEvent({ event: 'poll:update', payload: await res.json() });
        }
      }, 3500);
    }

    connectWs();
    return () => {
      cancelled = true;
      if (wsRef.current) wsRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionCode, onEvent]);

  return { connected };
}

