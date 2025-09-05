export function nowIso(): string {
  return new Date().toISOString();
}

export function toUtcDate(iso: string): Date {
  return new Date(iso);
}

