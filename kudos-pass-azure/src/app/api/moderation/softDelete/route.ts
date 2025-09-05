import { NextRequest, NextResponse } from 'next/server';
import { softDeleteSchema } from '@/lib/zod-schemas';
import { readItemsByQuery, patchItem, upsertItem } from '@/lib/cosmos';
import type { NoteDoc, SessionDoc } from '@/lib/types';
import { publishSessionEvent } from '@/lib/webpubsub';
import { nowIso } from '@/lib/time';
import { rateLimitOrThrow } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try { rateLimitOrThrow(req as any); } catch (e: any) { return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }); }
  const { searchParams } = new URL(req.url);
  const adminToken = req.headers.get('x-admin-token') || searchParams.get('admin');
  const body = await req.json();
  const parsed = softDeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { sessionCode, noteId } = parsed.data;

  const sessions = await readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [{ name: '@code', value: sessionCode }]);
  const session = sessions[0];
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.adminToken !== adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await patchItem<NoteDoc>(noteId, sessionCode, [
    { op: 'add', path: '/softDeleted', value: true },
  ]);
  session.lastActivityUtc = nowIso();
  await upsertItem(session);
  await publishSessionEvent(sessionCode, 'moderation:update', { noteId });
  return NextResponse.json({ ok: true });
}

