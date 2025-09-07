import { NextRequest, NextResponse } from 'next/server';
import { mongoFindMany, mongoFindOne, mongoUpsert } from '@/lib/mongo';
import type { ParticipantDoc, RoundDoc, SessionDoc } from '@/lib/types';
import { publishSessionEvent } from '@/lib/webpubsub';
import { nowIso } from '@/lib/time';
import { generateDerangement } from '@/lib/derangement';
import { newId } from '@/lib/ids';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminToken = req.headers.get('x-admin-token') || searchParams.get('admin');
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const [session, rounds, participants] = await Promise.all([
    mongoFindOne<SessionDoc>({ type: 'Session', sessionCode: code }),
    mongoFindMany<RoundDoc>({ type: 'Round', sessionCode: code }, { sort: { index: 1 } }),
    mongoFindMany<ParticipantDoc>({ type: 'Participant', sessionCode: code }),
  ]);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.adminToken !== adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const maxRounds = session.settings.roundCount ?? 1;
  const completed = rounds.length;
  const now = nowIso();

  if (completed >= maxRounds) {
    session.status = 'finished';
    session.lastActivityUtc = now;
    await mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) });
    await publishSessionEvent(code, 'session:update', { status: 'finished' });
    return NextResponse.json({ ok: true, finished: true });
  }

  // Start next round automatically
  const participantIds = participants.map((p) => p.id);
  const usedPairs = new Set<string>();
  for (const r of rounds) {
    for (const m of r.mappings) usedPairs.add(`${m.from}->${m.to}`);
  }
  const mappings = generateDerangement(participantIds, usedPairs);
  const nextIndex = (rounds[rounds.length - 1]?.index ?? -1) + 1;
  const round: RoundDoc = {
    id: newId('round'),
    type: 'Round',
    sessionCode: code,
    index: nextIndex,
    mappings,
    createdAt: now,
    _ttl: 86400,
  };

  session.status = 'running';
  session.roundIndex = round.index;
  session.roundStartUtc = now;
  session.lastActivityUtc = now;

  await Promise.all([
    mongoUpsert({ ...round, expireAt: new Date(Date.now() + 86400 * 1000) }),
    mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) }),
  ]);
  await publishSessionEvent(code, 'round:start', { roundIndex: round.index, roundStartUtc: now, roundSeconds: session.settings.roundSeconds });
  return NextResponse.json({ ok: true, finished: false, roundIndex: round.index });
}

