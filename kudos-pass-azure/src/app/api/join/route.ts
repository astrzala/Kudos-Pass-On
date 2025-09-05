import { NextRequest, NextResponse } from 'next/server';
import { joinSchema } from '@/lib/zod-schemas';
import { readItemsByQuery, upsertItem } from '@/lib/cosmos';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import type { ParticipantDoc, SessionDoc } from '@/lib/types';
import { publishSessionEvent } from '@/lib/webpubsub';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { sessionCode, name, email } = parsed.data;

  const sessions = await readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [
    { name: '@code', value: sessionCode },
  ]);
  const session = sessions[0];
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const now = nowIso();
  const participant: ParticipantDoc = {
    id: newId('part'),
    type: 'Participant',
    sessionCode,
    name,
    email,
    createdAt: now,
    _ttl: 86400,
  };

  await upsertItem(participant);
  session.lastActivityUtc = now;
  await upsertItem(session);
  await publishSessionEvent(sessionCode, 'session:update', { participant });

  return NextResponse.json({ participantId: participant.id });
}

