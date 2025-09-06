import { z } from 'zod';

const envSchema = z.object({
  COSMOS_CONN_STRING: z.string().min(1),
  COSMOS_DB_NAME: z.string().default('kudos'),
  COSMOS_CONTAINER_NAME: z.string().default('items'),
  WEBPUBSUB_CONN_STRING: z.string().optional(),
  WEBPUBSUB_HUB: z.string().default('kudos'),
  ORIGIN_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse({
    COSMOS_CONN_STRING: process.env.COSMOS_CONN_STRING,
    COSMOS_DB_NAME: process.env.COSMOS_DB_NAME ?? 'kudospass-database',
    COSMOS_CONTAINER_NAME: process.env.COSMOS_CONTAINER_NAME ?? 'items',
    WEBPUBSUB_CONN_STRING: process.env.WEBPUBSUB_CONN_STRING,
    WEBPUBSUB_HUB: process.env.WEBPUBSUB_HUB ?? 'kudos',
    ORIGIN_URL: process.env.ORIGIN_URL,
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  });

  if (!parsed.success) {
    console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

