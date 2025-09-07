"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdminToken } from '@/lib/client-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState('Sprint Kudos');
  const [hostName, setHostName] = useState('');
  const [anonymity, setAnonymity] = useState(true);
  const [roundSecondsStr, setRoundSecondsStr] = useState('90');
  const [roundCountStr, setRoundCountStr] = useState('1');
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const parsedRoundSeconds = parseInt(roundSecondsStr, 10);
      const roundSeconds = Number.isFinite(parsedRoundSeconds) ? Math.min(600, Math.max(30, parsedRoundSeconds)) : 90;
      const parsedRoundCount = parseInt(roundCountStr, 10);
      const roundCount = Number.isFinite(parsedRoundCount) ? Math.min(20, Math.max(1, parsedRoundCount)) : 1;
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, hostName: hostName.trim(), settings: { anonymity, roundSeconds, language, roundCount } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const reason = data?.error ? `: ${data.error}` : '';
        const reqId = data?.reqId ? ` (id ${data.reqId})` : '';
        throw new Error('Failed to create' + reason + reqId);
      }
      const data = await res.json();
      saveAdminToken(data.sessionCode, data.adminToken);
      // Persist host as a participant locally to avoid showing self in lists
      try {
        const { saveParticipant } = await import('@/lib/client-store');
        if (data.hostParticipantId) {
          saveParticipant(data.sessionCode, { id: data.hostParticipantId, name: hostName.trim() });
        }
      } catch {}
      router.push(`/s/${data.sessionCode}`);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally { setLoading(false); }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create Session</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">Your name (host)
          <Input className="mt-1" value={hostName} onChange={(e) => setHostName(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Title
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={anonymity} onChange={(e) => setAnonymity(e.target.checked)} />
          Anonymity
        </label>
        <label className="block text-sm font-medium">Round seconds
          <Input
            type="number"
            min={30}
            max={600}
            className="mt-1"
            value={roundSecondsStr}
            onChange={(e) => setRoundSecondsStr(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">Number of rounds
          <Input
            type="number"
            min={1}
            max={20}
            className="mt-1"
            value={roundCountStr}
            onChange={(e) => setRoundCountStr(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">Language
          <select className="mt-1 w-full border rounded px-3 py-2" value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'pl')}>
            <option value="en">English</option>
            <option value="pl">Polski</option>
          </select>
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
      </form>
    </main>
  );
}

