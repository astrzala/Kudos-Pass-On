import { NextRequest, NextResponse } from 'next/server';
import { mongoFindOne, mongoUpsert } from '@/lib/mongo';
import type { SessionDoc } from '@/lib/types';
import { nowIso } from '@/lib/time';
import { publishSessionEvent } from '@/lib/webpubsub';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminToken = req.headers.get('x-admin-token') || searchParams.get('admin');
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  const session = await mongoFindOne<SessionDoc>({ type: 'Session', sessionCode: code });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.adminToken !== adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  session.status = 'finished';
  session.lastActivityUtc = nowIso();
  await mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) });
  await publishSessionEvent(code, 'session:update', { status: 'finished' });
  return NextResponse.json({ ok: true });
}

