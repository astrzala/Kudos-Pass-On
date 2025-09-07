"use client";
import { useEffect, useRef, useState } from 'react';

type EventPayload = { event: string; payload: unknown };

export function useSessionRealtime(sessionCode: string, onEvent: (e: EventPayload) => void) {
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<'unknown' | 'ws' | 'polling'>('unknown');
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const etagRef = useRef<string | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    async function connectWs() {
      try {
        const res = await fetch(`/api/webpubsub/negotiate?user=${encodeURIComponent(sessionCode)}`);
        if (!res.ok) throw new Error('negotiate failed');
        const { url } = await res.json();
        // Specify the Azure Web PubSub JSON subprotocol so joinGroup works reliably
        const ws = new WebSocket(url, 'json.webpubsub.azure.v1');
        wsRef.current = ws;
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data as string);
            if (data && data.event) onEventRef.current(data as EventPayload);
          } catch {}
        };
        ws.onopen = () => {
          setConnected(true);
          setMode('ws');
          try { ws.send(JSON.stringify({ type: 'joinGroup', group: `session:${sessionCode}` })); } catch {}
        };
        ws.onerror = () => {
          setConnected(false);
          setMode('polling');
          startPolling();
        };
        ws.onclose = () => {
          setConnected(false);
          setMode('polling');
          startPolling();
        };
      } catch {
        setMode('polling');
        startPolling();
      }
    }

    function startPolling() {
      if (pollingRef.current) return;
      setMode('polling');
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
      if (wsRef.current) wsRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionCode]);

  return { connected, mode };
}

