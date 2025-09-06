"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdminToken } from '@/lib/client-store';

type Hydrate = {
  notes: any[];
};

export default function ReviewPage() {
  const { code } = useParams<{ code: string }>();
  const adminToken = getAdminToken(code);
  const [data, setData] = useState<Hydrate | null>(null);

  useEffect(() => { refresh(); }, [code]);
  async function refresh() {
    const res = await fetch(`/api/session?code=${code}`);
    if (res.ok) setData(await res.json());
  }

  async function removeNote(id: string) {
    await fetch('/api/moderation/softDelete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(adminToken ? { 'x-admin-token': adminToken } : {}) },
      body: JSON.stringify({ sessionCode: code, noteId: id }),
    });
    refresh();
  }

  if (!adminToken) return <main className="max-w-2xl mx-auto p-6">Admin token required.</main>;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Review Notes</h1>
      <ul className="space-y-3">
        {data?.notes.map((n) => (
          <li key={n.id} className="border rounded p-3 flex items-start justify-between gap-3">
            <div>
              <p>{n.text}</p>
              <p className="text-xs text-gray-600">round {n.roundIndex}</p>
            </div>
            <button onClick={() => removeNote(n.id)} className="text-red-600">Remove</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

