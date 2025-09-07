"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAdminToken, getParticipant } from '@/lib/client-store';
import { useSessionRealtime } from '@/lib/realtime';

type Hydrate = {
  session: any;
  participants: any[];
  currentRound: any | null;
  notes: any[];
};

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [data, setData] = useState<Hydrate | null>(null);
  const adminToken = getAdminToken(code);
  const participant = getParticipant(code);

  const { connected, mode } = useSessionRealtime(code, (evt) => {
    if (evt.event === 'poll:update') setData(evt.payload as Hydrate);
    if (evt.event === 'round:start') {
      const payload = evt.payload as any;
      if (typeof payload?.roundIndex === 'number') {
        router.push(`/s/${code}/round/${payload.roundIndex}`);
        return;
      }
      refresh();
      return;
    }
    if (evt.event === 'session:update' || evt.event === 'note:submitted' || evt.event === 'moderation:update') {
      refresh();
    }
  });

  async function refresh() {
    const res = await fetch(`/api/session?code=${code}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => { refresh(); }, [code]);

  // If we fetch data via polling and a round is already active, redirect joiners automatically
  useEffect(() => {
    const roundIndex = (data?.currentRound as any)?.index;
    if (typeof roundIndex === 'number' && roundIndex >= 0) {
      router.push(`/s/${code}/round/${roundIndex}`);
    }
  }, [data?.currentRound, code, router]);

  async function startRound() {
    const res = await fetch('/api/round/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(adminToken ? { 'x-admin-token': adminToken } : {}) },
      body: JSON.stringify({ sessionCode: code }),
    });
    if (res.ok) {
      const j = await res.json();
      router.push(`/s/${code}/round/${j.roundIndex}`);
    }
  }

  const canStart = useMemo(() => !!adminToken && (data?.participants.length ?? 0) >= 2, [adminToken, data]);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lobby — {code}</h1>
          <p className="text-sm text-gray-600">{mode === 'ws' ? 'Live' : mode === 'polling' ? 'Polling' : 'Connecting…'} • Participants: {data?.participants.length ?? 0}</p>
        </div>
        {canStart && (
          <button onClick={startRound} className="rounded bg-green-600 px-4 py-2 text-white">Start Round</button>
        )}
      </div>
      {!participant && (
        <p className="text-yellow-700">You have not joined. Go to Join page.</p>
      )}
      <ul className="grid grid-cols-2 gap-2">
        {data?.participants.map((p) => (
          <li key={p.id} className="border rounded px-3 py-2">{p.name}</li>
        ))}
      </ul>
    </main>
  );
}

