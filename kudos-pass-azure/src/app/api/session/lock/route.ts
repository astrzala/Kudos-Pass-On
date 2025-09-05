import { NextRequest, NextResponse } from 'next/server';
import { readItemsByQuery, upsertItem } from '@/lib/cosmos';
import type { SessionDoc } from '@/lib/types';
import { nowIso } from '@/lib/time';
import { publishSessionEvent } from '@/lib/webpubsub';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminToken = req.headers.get('x-admin-token') || searchParams.get('admin');
  const code = searchParams.get('code');
  const lock = searchParams.get('lock') === '1';
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  const sessions = await readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [{ name: '@code', value: code }]);
  const session = sessions[0];
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.adminToken !== adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  session.submissionLocked = lock;
  session.lastActivityUtc = nowIso();
  await upsertItem(session);
  await publishSessionEvent(code, 'session:update', { submissionLocked: lock });
  return NextResponse.json({ ok: true });
}

