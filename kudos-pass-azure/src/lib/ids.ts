import { randomUUID } from 'crypto';

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function newSessionCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function newAdminToken(): string {
  return randomUUID().replace(/-/g, '');
}

