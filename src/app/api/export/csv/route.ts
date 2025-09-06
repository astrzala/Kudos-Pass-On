import { NextRequest, NextResponse } from 'next/server';
import { readItemsByQuery } from '@/lib/cosmos';
import type { NoteDoc, ParticipantDoc, SessionDoc } from '@/lib/types';

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(',')).join('\n');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const [sessionArr, notes, parts] = await Promise.all([
    readItemsByQuery<SessionDoc>('SELECT TOP 1 * FROM c WHERE c.type = "Session" AND c.sessionCode = @code', [{ name: '@code', value: code }]),
    readItemsByQuery<NoteDoc>('SELECT * FROM c WHERE c.type = "Note" AND c.sessionCode = @code AND (NOT IS_DEFINED(c.softDeleted) OR c.softDeleted = false)', [{ name: '@code', value: code }]),
    readItemsByQuery<ParticipantDoc>('SELECT * FROM c WHERE c.type = "Participant" AND c.sessionCode = @code', [{ name: '@code', value: code }]),
  ]);
  const session = sessionArr[0];
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const byId = new Map(parts.map(p => [p.id, p] as const));

  const header = ['targetName', 'text', 'authorName', 'roundIndex', 'createdAt'];
  const rows = notes.map(n => [
    byId.get(n.targetId)?.name ?? n.targetId,
    n.text,
    session.settings.anonymity ? '' : (byId.get(n.authorId)?.name ?? n.authorId),
    String(n.roundIndex),
    n.createdAt,
  ]);
  const csv = toCsv([header, ...rows]);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kudos_${code}.csv"`,
    },
  });
}

