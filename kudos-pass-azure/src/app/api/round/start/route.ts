import { NextRequest, NextResponse } from 'next/server';
import { startRoundSchema } from '@/lib/zod-schemas';
import { readItemsByQuery, upsertItem } from '@/lib/cosmos';
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

  const [sessions, participants, previousRounds] = await Promise.all([
    readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [{ name: '@code', value: sessionCode }]),
    readItemsByQuery<ParticipantDoc>('SELECT * FROM c WHERE c.type = "Participant" AND c.sessionCode = @code', [{ name: '@code', value: sessionCode }]),
    readItemsByQuery<RoundDoc>('SELECT * FROM c WHERE c.type = "Round" AND c.sessionCode = @code ORDER BY c.index ASC', [{ name: '@code', value: sessionCode }]),
  ]);

  const session = sessions[0];
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.adminToken !== adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  await Promise.all([upsertItem(round), upsertItem(session)]);
  await publishSessionEvent(sessionCode, 'round:start', { roundIndex: round.index, roundStartUtc: now, roundSeconds: session.settings.roundSeconds });

  return NextResponse.json({ ok: true, roundIndex: round.index, roundStartUtc: now });
}

