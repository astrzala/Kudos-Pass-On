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
  const reqId = newId('req');
  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', reqId }, { status: 400 });
  }

  const debugEnv = {
    hasCOSMOS_CONN_STRING: !!process.env.COSMOS_CONN_STRING,
    COSMOS_DB_NAME: process.env.COSMOS_DB_NAME,
    COSMOS_CONTAINER_NAME: process.env.COSMOS_CONTAINER_NAME,
    has_WEBPUBSUB_CONN_STRING: !!process.env.WEBPUBSUB_CONN_STRING,
    WEBPUBSUB_HUB: process.env.WEBPUBSUB_HUB,
    NODE_ENV: process.env.NODE_ENV,
  } as const;
  console.log('POST /api/session start', { reqId, debugEnv });

  const { title, settings, hostName } = parsed.data as any;
  try {
    await ensureIndexes();
  } catch (err: any) {
    console.error('ensureIndexes failed', { reqId, debugEnv, message: err?.message });
    return NextResponse.json({ error: 'Database unavailable', reqId }, { status: 503 });
  }

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

  let hostParticipantId: string | null = null;
  try {
    await mongoUpsert({ ...session, expireAt: new Date(Date.now() + 86400 * 1000) });
    // Create host participant immediately
    const host: ParticipantDoc = {
      id: newId('part'),
      type: 'Participant',
      sessionCode,
      name: hostName,
      createdAt: now,
      isHost: true,
      _ttl: 86400,
    } as ParticipantDoc;
    await mongoUpsert({ ...host, expireAt: new Date(Date.now() + 86400 * 1000) });
    hostParticipantId = host.id;
  } catch (err: any) {
    console.error('mongoUpsert failed', { reqId, debugEnv, message: err?.message });
    return NextResponse.json({ error: 'DB write failed', reqId }, { status: 500 });
  }

  try {
    await publishSessionEvent(sessionCode, 'session:update', { session });
  } catch (err: any) {
    console.warn('WebPubSub publish failed (non-fatal)', { reqId, message: err?.message });
  }

  console.log('POST /api/session success', { reqId, sessionCode });
  return NextResponse.json({ sessionCode, adminToken, hostParticipantId, reqId });
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
  const currentRound = session.status === 'running' ? (rounds[0] ?? null) : null;
  const hydrate = { session: sessionPublic, participants: participantsPublic, currentRound, notes };
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

