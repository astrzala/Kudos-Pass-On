"use client";
import { useEffect, useState } from 'react';

export function useCountdown(startIso: string | undefined, durationSeconds: number) {
  const [remaining, setRemaining] = useState<number>(durationSeconds);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let skewMs = 0;
    async function calibrate() {
      try {
        const res = await fetch('/api/now');
        const { nowUtc } = await res.json();
        const serverNow = new Date(nowUtc).getTime();
        const clientNow = Date.now();
        skewMs = serverNow - clientNow;
      } catch {}
    }
    function tick() {
      if (!startIso) return;
      const start = new Date(startIso).getTime();
      const end = start + durationSeconds * 1000;
      const now = Date.now() + skewMs;
      const rem = Math.max(0, Math.floor((end - now) / 1000));
      setRemaining(rem);
    }
    calibrate().then(() => {
      tick();
      timer = setInterval(tick, 1000);
    });
    return () => { if (timer) clearInterval(timer); };
  }, [startIso, durationSeconds]);

  return remaining;
}

