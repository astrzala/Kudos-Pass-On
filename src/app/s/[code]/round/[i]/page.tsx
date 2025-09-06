"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getParticipant } from '@/lib/client-store';
import { useCountdown } from '@/lib/countdown';

type Hydrate = {
  session: any;
  currentRound: { index: number; mappings: { from: string; to: string }[]; } | null;
};

export default function RoundPage() {
  const { code, i } = useParams<{ code: string; i: string }>();
  const [data, setData] = useState<Hydrate | null>(null);
  const participant = getParticipant(code);
  const roundSeconds = data?.session?.settings?.roundSeconds ?? 90;
  const startIso = data?.session?.roundStartUtc;
  const remaining = useCountdown(startIso, roundSeconds);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const targetId = useMemo(() => {
    if (!participant?.id || !data?.currentRound) return null;
    const mapping = data.currentRound.mappings.find((m) => m.from === participant.id);
    return mapping?.to ?? null;
  }, [participant, data]);

  useEffect(() => { refresh(); }, [code]);

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
    if (res.ok) setSubmitted(true);
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Round {i}</h1>
      <p className="text-gray-600">Time remaining: {remaining}s</p>
      <div className="space-y-2">
        <p className="font-medium">Write a positive note for your teammate.</p>
        <textarea className="w-full border rounded px-3 py-2 h-32" value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={submitted} onClick={submit} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{submitted ? 'Submitted' : 'Submit'}</button>
      </div>
    </main>
  );
}

