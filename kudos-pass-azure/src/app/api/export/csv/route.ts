import { NextRequest, NextResponse } from 'next/server';
import { mongoFindMany, mongoFindOne } from '@/lib/mongo';
import type { NoteDoc, ParticipantDoc, SessionDoc } from '@/lib/types';

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(',')).join('\n');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const [session, notes, parts] = await Promise.all([
    mongoFindOne<SessionDoc>({ type: 'Session', sessionCode: code }),
    mongoFindMany<NoteDoc>({ type: 'Note', sessionCode: code, $or: [{ softDeleted: { $exists: false } }, { softDeleted: false }] }),
    mongoFindMany<ParticipantDoc>({ type: 'Participant', sessionCode: code }),
  ]);
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

