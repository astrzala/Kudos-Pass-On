"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveParticipant } from '@/lib/client-store';

export default function JoinPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const code = sessionCode.trim().toUpperCase();
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: code, name: name.trim(), email: email || undefined }),
      });
      if (!res.ok) throw new Error('Failed to join');
      const data = await res.json();
      saveParticipant(code, { id: data.participantId, name: name.trim(), email: email || undefined });
      router.push(`/s/${code}`);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally { setLoading(false); }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Join Session</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">Session code
          <input className="mt-1 w-full border rounded px-3 py-2 uppercase" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Name
          <input className="mt-1 w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Email (optional)
          <input className="mt-1 w-full border rounded px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{loading ? 'Joining...' : 'Join'}</button>
      </form>
    </main>
  );
}

