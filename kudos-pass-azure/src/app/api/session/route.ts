import { NextRequest, NextResponse } from 'next/server';
import { createSessionSchema } from '@/lib/zod-schemas';
import { newAdminToken, newId, newSessionCode } from '@/lib/ids';
import { nowIso } from '@/lib/time';
import { upsertItem, readItemsByQuery } from '@/lib/cosmos';
import { publishSessionEvent } from '@/lib/webpubsub';
import type { ParticipantDoc, RoundDoc, SessionDoc, NoteDoc } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { title, settings } = parsed.data;
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

  await upsertItem(session);
  await publishSessionEvent(sessionCode, 'session:update', { session });

  return NextResponse.json({ sessionCode, adminToken });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionCode = searchParams.get('code');
  if (!sessionCode) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const [sessions, participants, rounds, notes] = await Promise.all([
    readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [
      { name: '@code', value: sessionCode },
    ]),
    readItemsByQuery<ParticipantDoc>('SELECT * FROM c WHERE c.type = "Participant" AND c.sessionCode = @code', [
      { name: '@code', value: sessionCode },
    ]),
    readItemsByQuery<RoundDoc>('SELECT * FROM c WHERE c.type = "Round" AND c.sessionCode = @code ORDER BY c.index DESC', [
      { name: '@code', value: sessionCode },
    ]),
    readItemsByQuery<NoteDoc>('SELECT TOP 200 * FROM c WHERE c.type = "Note" AND c.sessionCode = @code AND (NOT IS_DEFINED(c.softDeleted) OR c.softDeleted = false) ORDER BY c.createdAt DESC', [
      { name: '@code', value: sessionCode },
    ]),
  ]);

  const session = sessions[0] ?? null;
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hydrate = { session, participants, currentRound: rounds[0] ?? null, notes };
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

