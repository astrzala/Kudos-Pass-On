import { NextRequest, NextResponse } from 'next/server';
import { createSessionSchema } from '@/lib/zod-schemas';
import { newAdminToken, newId, newSessionCode } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { ensureIndexes, mongoFindMany, mongoFindOne, mongoUpsert } from '@/lib/mongo';
import { publishSessionEvent } from '@/lib/webpubsub';
import type { ParticipantDoc, RoundDoc, SessionDoc, NoteDoc } from '@/lib/types';
import { rateLimitOrThrow } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try { rateLimitOrThrow(req as any); } catch (e: any) { return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }); }
  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { title, settings } = parsed.data;
  await ensureIndexes();
  const sessionCode = newSessionCode(6 + Math.floor(Math.random() * 3));
  const id = newId('sess');
  const adminToken = newAdminToken();
  const now = nowIso();

  const session: SessionDoc = {
    id,
    type: 'Session',
    sessionCode,
    title,
    settings,
    status: 'lobby',
    roundIndex: 0,
    createdAt: now,
    lastActivityUtc: now,
    adminToken,
    _ttl: 86400,
  };

  await mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) });
  await publishSessionEvent(sessionCode, 'session:update', { session });

  return NextResponse.json({ sessionCode, adminToken });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionCode = searchParams.get('code');
  if (!sessionCode) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  await ensureIndexes();
  const [session, participants, rounds, notes] = await Promise.all([
    mongoFindOne<SessionDoc>({ type: 'Session', sessionCode }),
    mongoFindMany<ParticipantDoc>({ type: 'Participant', sessionCode }),
    mongoFindMany<RoundDoc>({ type: 'Round', sessionCode }, { sort: { index: -1 } }),
    mongoFindMany<NoteDoc>({ type: 'Note', sessionCode, $or: [{ softDeleted: { $exists: false } }, { softDeleted: false }] }, { sort: { createdAt: -1 }, limit: 200 }),
  ]);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { adminToken: _admin, ...sessionPublic } = session as any;
  const participantsPublic = participants.map(({ email: _email, ...rest }) => rest);
  const hydrate = { session: sessionPublic, participants: participantsPublic, currentRound: rounds[0] ?? null, notes };
  const etag = 'W/"' + Buffer.from(JSON.stringify({
    s: session.lastActivityUtc,
    p: participants.length,
    r: rounds[0]?.index ?? -1,
    n: notes[0]?.createdAt ?? '0',
  })).toString('base64') + '"';

  const ifNoneMatch = req.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return NextResponse.json(hydrate, { headers: { ETag: etag } });
}

