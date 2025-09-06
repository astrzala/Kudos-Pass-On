import { NextRequest, NextResponse } from 'next/server';
import { noteSchema } from '@/lib/zod-schemas';
import { mongoFindMany, mongoFindOne, mongoUpsert } from '@/lib/mongo';
import type { NoteDoc, RoundDoc, SessionDoc } from '@/lib/types';
import { checkPositivity } from '@/lib/positivity';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { publishSessionEvent } from '@/lib/webpubsub';
import { rateLimitOrThrow } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try { rateLimitOrThrow(req as any, 'note'); } catch (e: any) { return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }); }
  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { sessionCode, authorId, text } = parsed.data;


  const session = await mongoFindOne<SessionDoc>({ type: 'Session', sessionCode });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status === 'finished') return NextResponse.json({ error: 'Session ended' }, { status: 400 });
  if (session.submissionLocked) return NextResponse.json({ error: 'Submissions locked' }, { status: 403 });

  const round = await mongoFindOne<RoundDoc>({ type: 'Round', sessionCode }, { sort: { index: -1 } });
  if (!round) return NextResponse.json({ error: 'No active round' }, { status: 400 });

  const mapping = round.mappings.find((m) => m.from === authorId);
  if (!mapping) return NextResponse.json({ error: 'No target assigned' }, { status: 400 });

  const positivity = checkPositivity(text);
  if (!positivity.ok) return NextResponse.json({ error: positivity.hint ?? 'Not allowed' }, { status: 400 });

  const now = nowIso();
  const note: NoteDoc = {
    id: newId('note'),
    type: 'Note',
    sessionCode,
    roundIndex: round.index,
    authorId,
    targetId: mapping.to,
    text,
    createdAt: now,
    softDeleted: false,
    _ttl: 86400,
  };
  await mongoUpsert({ ...note, expireAt: new Date(Date.now() + 86400 * 1000) });
  session.lastActivityUtc = now;
  await mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) });
  await publishSessionEvent(sessionCode, 'note:submitted', { noteId: note.id, roundIndex: note.roundIndex });

  return NextResponse.json({ ok: true, noteId: note.id });
}

