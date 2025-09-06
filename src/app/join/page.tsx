"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveParticipant } from '@/lib/client-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
          <Input className="mt-1 uppercase" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Name
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Email (optional)
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button disabled={loading}>{loading ? 'Joining...' : 'Join'}</Button>
      </form>
    </main>
  );
}

