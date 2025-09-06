"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getParticipant } from '@/lib/client-store';

export default function MySummaryPage() {
  const { code } = useParams<{ code: string }>();
  const me = getParticipant(code);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => { refresh(); }, [code]);
  async function refresh() {
    if (!me?.id) return;
    const res = await fetch(`/api/session?code=${code}`);
    if (res.ok) {
      const j = await res.json();
      setNotes((j.notes || []).filter((n: any) => n.targetId === me.id));
    }
  }

  const csvUrl = useMemo(() => me?.id ? `/api/export/csv?code=${code}` : null, [code, me]);
  const pdfUrl = useMemo(() => me?.id ? `/api/export/pdf?code=${code}&me=${me.id}` : null, [code, me]);

  if (!me) return <main className="max-w-2xl mx-auto p-6">Join first.</main>;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Kudos</h1>
      <div className="flex gap-3">
        {csvUrl && <a className="underline" href={csvUrl}>Export CSV (all)</a>}
        {pdfUrl && <a className="underline" href={pdfUrl}>Export PDF (mine)</a>}
      </div>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="border rounded p-3">{n.text}</li>
        ))}
      </ul>
    </main>
  );
}

