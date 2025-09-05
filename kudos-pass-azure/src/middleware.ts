import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const origin = process.env.ORIGIN_URL;
  const res = NextResponse.next();
  if (origin && req.nextUrl.pathname.startsWith('/api')) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  }
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};

