import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(1).max(120),
  settings: z.object({
    anonymity: z.boolean(),
    roundSeconds: z.number().int().min(30).max(600),
    language: z.enum(['en', 'pl']).default('en'),
  }),
});

export const joinSchema = z.object({
  sessionCode: z.string().min(4).max(10),
  name: z.string().min(1).max(50),
  email: z.string().email().optional(),
});

export const startRoundSchema = z.object({
  sessionCode: z.string().min(4).max(10),
});

export const noteSchema = z.object({
  sessionCode: z.string().min(4).max(10),
  authorId: z.string().min(1),
  text: z.string().min(3).max(280),
});

export const softDeleteSchema = z.object({
  sessionCode: z.string().min(4).max(10),
  noteId: z.string().min(1),
});

