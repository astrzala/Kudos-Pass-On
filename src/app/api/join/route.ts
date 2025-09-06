import { NextRequest, NextResponse } from 'next/server';
import { joinSchema } from '@/lib/zod-schemas';
import { mongoFindOne, mongoUpsert } from '@/lib/mongo';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import type { ParticipantDoc, SessionDoc } from '@/lib/types';
import { publishSessionEvent } from '@/lib/webpubsub';
import { rateLimitOrThrow } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try { rateLimitOrThrow(req as any); } catch (e: any) { return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }); }
  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { sessionCode, name, email } = parsed.data;

  const session = await mongoFindOne<SessionDoc>({ type: 'Session', sessionCode });
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

  await mongoUpsert({ ...participant, expireAt: new Date(Date.now() + 86400 * 1000) });
  session.lastActivityUtc = now;
  await mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) });
  await publishSessionEvent(sessionCode, 'session:update', { participant });

  return NextResponse.json({ participantId: participant.id });
}

