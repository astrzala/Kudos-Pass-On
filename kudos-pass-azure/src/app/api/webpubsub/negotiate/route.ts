import { NextRequest, NextResponse } from 'next/server';
import { negotiateUrl } from '@/lib/webpubsub';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get('user') || 'anon';
  const url = negotiateUrl(user);
  if (!url) return NextResponse.json({ error: 'WebPubSub unavailable' }, { status: 503 });
  return NextResponse.json({ url });
}

