"use client";

const ADMIN_TOKEN_KEY = (code: string) => `kudos_admin_${code}`;
const PARTICIPANT_KEY = (code: string) => `kudos_part_${code}`;

export function saveAdminToken(sessionCode: string, token: string) {
  try { localStorage.setItem(ADMIN_TOKEN_KEY(sessionCode), token); } catch {}
}
export function getAdminToken(sessionCode: string): string | null {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY(sessionCode)); } catch { return null; }
}

export type ParticipantLocal = { id: string; name: string; email?: string };
export function saveParticipant(sessionCode: string, p: ParticipantLocal) {
  try { localStorage.setItem(PARTICIPANT_KEY(sessionCode), JSON.stringify(p)); } catch {}
}
export function getParticipant(sessionCode: string): ParticipantLocal | null {
  try {
    const raw = localStorage.getItem(PARTICIPANT_KEY(sessionCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

