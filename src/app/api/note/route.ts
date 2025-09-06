import { NextRequest, NextResponse } from 'next/server';
import { noteSchema } from '@/lib/zod-schemas';
import { readItemsByQuery, upsertItem } from '@/lib/cosmos';
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

  const sessions = await readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [{ name: '@code', value: sessionCode }]);
  const session = sessions[0];
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status === 'finished') return NextResponse.json({ error: 'Session ended' }, { status: 400 });
  if (session.submissionLocked) return NextResponse.json({ error: 'Submissions locked' }, { status: 403 });

  const rounds = await readItemsByQuery<RoundDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Round" AND c.sessionCode = @code ORDER BY c.index DESC', [{ name: '@code', value: sessionCode }]);
  const round = rounds[0];
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
  await upsertItem(note);
  session.lastActivityUtc = now;
  await upsertItem(session);
  await publishSessionEvent(sessionCode, 'note:submitted', { noteId: note.id, roundIndex: note.roundIndex });

  return NextResponse.json({ ok: true, noteId: note.id });
}

