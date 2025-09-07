"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdminToken, getParticipant } from '@/lib/client-store';
import { useCountdown } from '@/lib/countdown';
import { useRouter } from 'next/navigation';
import { useSessionRealtime } from '@/lib/realtime';

type Hydrate = {
  session: any;
  participants: any[];
  currentRound: { index: number; mappings: { from: string; to: string }[]; } | null;
};

export default function RoundPage() {
  const { code, i } = useParams<{ code: string; i: string }>();
  const router = useRouter();
  const [data, setData] = useState<Hydrate | null>(null);
  const participant = getParticipant(code);
  const adminToken = getAdminToken(code);
  const roundSeconds = data?.session?.settings?.roundSeconds ?? 90;
  const startIso = data?.session?.roundStartUtc;
  const remaining = useCountdown(startIso, roundSeconds);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const endTriggeredRef = useRef(false);

  const targetId = useMemo(() => {
    if (!participant?.id || !data?.currentRound) return null;
    const mapping = data.currentRound.mappings.find((m) => m.from === participant.id);
    return mapping?.to ?? null;
  }, [participant, data]);

  const targetName = useMemo(() => {
    if (!data?.participants || !targetId) return null;
    const p = data.participants.find((x: any) => x.id === targetId);
    return p?.name ?? targetId;
  }, [data?.participants, targetId]);

  useEffect(() => { refresh(); }, [code]);

  useEffect(() => {
    if (remaining === 0 && adminToken && !endTriggeredRef.current) {
      endTriggeredRef.current = true;
      fetch(`/api/round/end?code=${code}`, { method: 'POST', headers: { ...(adminToken ? { 'x-admin-token': adminToken } : {}) } });
    }
  }, [remaining, adminToken, code]);

  useSessionRealtime(code, (evt) => {
    if (evt.event === 'round:start') {
      const payload: any = evt.payload;
      if (typeof payload?.roundIndex === 'number') {
        endTriggeredRef.current = false;
        router.push(`/s/${code}/round/${payload.roundIndex}`);
        return;
      }
    }
    if (evt.event === 'session:update' || evt.event === 'poll:update') {
      refresh();
    }
  });

  async function refresh() {
    const res = await fetch(`/api/session?code=${code}`);
    if (res.ok) setData(await res.json());
  }

  async function submit() {
    const res = await fetch('/api/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionCode: code, authorId: participant?.id, text }),
    });
    if (res.ok || res.status === 409) setSubmitted(true);
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Round {i}</h1>
      <p className="text-gray-600">Time remaining: {remaining}s</p>
      <div className="space-y-2">
        <p className="font-medium">Write a positive note for your teammate.</p>
        {targetName && <p className="text-sm text-gray-700">Recipient: <span className="font-medium">{targetName}</span></p>}
        <textarea disabled={submitted} className="w-full border rounded px-3 py-2 h-32 disabled:opacity-60" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2">
          <button disabled={submitted || !text.trim()} onClick={submit} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{submitted ? 'Submitted' : 'Submit'}</button>
          <button onClick={() => router.push(`/s/${code}`)} className="rounded bg-gray-200 px-4 py-2">{submitted ? 'I\'m done' : 'Skip / I\'m done'}</button>
        </div>
      </div>
    </main>
  );
}

