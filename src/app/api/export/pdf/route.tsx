import { NextRequest, NextResponse } from 'next/server';

import { mongoFindMany, mongoFindOne } from '@/lib/mongo';
import type { NoteDoc, ParticipantDoc, SessionDoc } from '@/lib/types';
import { renderToStream, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const me = searchParams.get('me');
  if (!code || !me) return NextResponse.json({ error: 'Missing params' }, { status: 400 });


  const [session, notes, parts] = await Promise.all([
    mongoFindOne<SessionDoc>({ type: 'Session', sessionCode: code }),
    mongoFindMany<NoteDoc>({ type: 'Note', sessionCode: code, targetId: me, $or: [{ softDeleted: { $exists: false } }, { softDeleted: false }] }, { sort: { createdAt: 1 } }),
    mongoFindMany<ParticipantDoc>({ type: 'Participant', sessionCode: code }),
  ]);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const byId = new Map(parts.map(p => [p.id, p] as const));

  const styles = StyleSheet.create({
    page: { padding: 24 },
    title: { fontSize: 18, marginBottom: 8 },
    subtitle: { fontSize: 12, marginBottom: 16 },
    note: { marginBottom: 10 },
    small: { fontSize: 10, color: '#555' },
  });

  const PdfDoc = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.subtitle}>Kudos for {byId.get(me)?.name ?? me}</Text>
        {notes.map((n) => (
          <View key={n.id} style={styles.note}>
            <Text>{n.text}</Text>
            {!session.settings.anonymity && <Text style={styles.small}>from {byId.get(n.authorId)?.name ?? n.authorId} — round {n.roundIndex}</Text>}
          </View>
        ))}
      </Page>
    </Document>
  );

  const stream = await renderToStream(<PdfDoc />);
  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="kudos_${code}_${me}.pdf"`,
    },
  });
}

