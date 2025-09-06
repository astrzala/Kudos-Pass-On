import { NextResponse } from 'next/server';
import { mongoPing } from '@/lib/mongo';
import { negotiateUrl } from '@/lib/webpubsub';

export async function GET() {
  const startedAt = Date.now();
  const env = {
    hasCOSMOS_CONN_STRING: !!process.env.COSMOS_CONN_STRING,
    COSMOS_DB_NAME: process.env.COSMOS_DB_NAME,
    COSMOS_CONTAINER_NAME: process.env.COSMOS_CONTAINER_NAME,
    has_WEBPUBSUB_CONN_STRING: !!process.env.WEBPUBSUB_CONN_STRING,
    WEBPUBSUB_HUB: process.env.WEBPUBSUB_HUB,
    ORIGIN_URL: process.env.ORIGIN_URL,
    NODE_ENV: process.env.NODE_ENV,
  } as const;

  const mongo = await mongoPing();
  let webpubsub: { ok: boolean; error?: string } = { ok: false };
  try {
    const url = await negotiateUrl('healthcheck');
    webpubsub = { ok: !!url };
  } catch (err: any) {
    webpubsub = { ok: false, error: err?.message };
  }

  const ok = mongo.ok; // DB is required for core functionality
  const durationMs = Date.now() - startedAt;
  const body = { ok, env, mongo, webpubsub, durationMs };
  return NextResponse.json(body, { status: ok ? 200 : 503 });
}

