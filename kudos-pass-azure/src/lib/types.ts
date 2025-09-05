export type SessionSettings = {
  anonymity: boolean;
  roundSeconds: number;
  language: 'en' | 'pl';
};

export type SessionDoc = {
  id: string;
  type: 'Session';
  sessionCode: string;
  title: string;
  settings: SessionSettings;
  status: 'lobby' | 'running' | 'finished';
  roundIndex: number;
  roundStartUtc?: string;
  createdAt: string;
  lastActivityUtc: string;
  adminToken: string;
  _ttl?: number;
};

export type ParticipantDoc = {
  id: string;
  type: 'Participant';
  sessionCode: string;
  name: string;
  email?: string;
  createdAt: string;
  _ttl?: number;
};

export type RoundMapping = { from: string; to: string };

export type RoundDoc = {
  id: string;
  type: 'Round';
  sessionCode: string;
  index: number;
  mappings: RoundMapping[];
  createdAt: string;
  _ttl?: number;
};

export type NoteDoc = {
  id: string;
  type: 'Note';
  sessionCode: string;
  roundIndex: number;
  authorId: string;
  targetId: string;
  text: string;
  createdAt: string;
  softDeleted: boolean;
  _ttl?: number;
};

export type ApiError = { error: string };

