export function nowIso(): string {
  return new Date().toISOString();
}

export function toUtcDate(iso: string): Date {
  return new Date(iso);
}

export function expireAtInSeconds(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export function expireAt24h(): Date {
  return expireAtInSeconds(86400);
}

