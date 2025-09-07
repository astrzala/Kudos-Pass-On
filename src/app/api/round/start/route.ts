import { NextRequest, NextResponse } from 'next/server';
import { startRoundSchema } from '@/lib/zod-schemas';
import { mongoFindMany, mongoFindOne, mongoUpsert } from '@/lib/mongo';
import type { ParticipantDoc, RoundDoc, SessionDoc } from '@/lib/types';
import { generateDerangement } from '@/lib/derangement';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { publishSessionEvent } from '@/lib/webpubsub';
import { rateLimitOrThrow } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try { rateLimitOrThrow(req as any); } catch (e: any) { return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }); }
  const { searchParams } = new URL(req.url);
  const adminToken = req.headers.get('x-admin-token') || searchParams.get('admin');
  const body = await req.json();
  const parsed = startRoundSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const { sessionCode } = parsed.data;

  const [session, participants, previousRounds] = await Promise.all([
    mongoFindOne<SessionDoc>({ type: 'Session', sessionCode }),
    mongoFindMany<ParticipantDoc>({ type: 'Participant', sessionCode }),
    mongoFindMany<RoundDoc>({ type: 'Round', sessionCode }, { sort: { index: 1 } }),
  ]);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.adminToken !== adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((participants?.length ?? 0) < 2) return NextResponse.json({ error: 'Need at least 2 participants' }, { status: 400 });
  const maxRounds = session.settings.roundCount ?? 1;
  if (previousRounds.length >= maxRounds) {
    return NextResponse.json({ error: 'All rounds completed' }, { status: 400 });
  }

  const participantIds = participants.map((p) => p.id);
  const usedPairs = new Set<string>();
  for (const r of previousRounds) {
    for (const m of r.mappings) usedPairs.add(`${m.from}->${m.to}`);
  }

  const mappings = generateDerangement(participantIds, usedPairs);
  const now = nowIso();
  const round: RoundDoc = {
    id: newId('round'),
    type: 'Round',
    sessionCode,
    index: (previousRounds[previousRounds.length - 1]?.index ?? -1) + 1,
    mappings,
    createdAt: now,
    _ttl: 86400,
  };

  session.roundIndex = round.index;
  session.roundStartUtc = now;
  session.status = 'running';
  session.lastActivityUtc = now;

  await Promise.all([
    mongoUpsert({ ...round, expireAt: new Date(Date.now() + 86400 * 1000) }),
    mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) })
  ]);
  await publishSessionEvent(sessionCode, 'round:start', { roundIndex: round.index, roundStartUtc: now, roundSeconds: session.settings.roundSeconds });

  return NextResponse.json({ ok: true, roundIndex: round.index, roundStartUtc: now });
}

