type Bucket = {
  tokens: number;
  lastRefillMs: number;
};

const ipBuckets = new Map<string, Bucket>();
const keyBuckets = new Map<string, Bucket>();

function take(map: Map<string, Bucket>, key: string, ratePerSec: number, burst: number): boolean {
  const now = Date.now();
  let b = map.get(key);
  if (!b) {
    b = { tokens: burst, lastRefillMs: now };
    map.set(key, b);
  }
  const elapsed = (now - b.lastRefillMs) / 1000;
  b.tokens = Math.min(burst, b.tokens + elapsed * ratePerSec);
  b.lastRefillMs = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

export function rateLimitOrThrow(req: Request, key?: string) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const okIp = take(ipBuckets, ip, 5, 10); // 5 rps, burst 10 per IP
  const okKey = key ? take(keyBuckets, key, 2, 5) : true; // 2 rps, burst 5 per key
  if (!okIp || !okKey) {
    const err = new Error('Too Many Requests');
    // @ts-expect-error flag
    err.statusCode = 429;
    throw err;
  }
}

