import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ nowUtc: new Date().toISOString() });
}

