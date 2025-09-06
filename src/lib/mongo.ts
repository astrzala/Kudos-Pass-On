import { MongoClient, Collection, Document, Filter, Sort } from 'mongodb';
import { getEnv } from './env';

let clientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const env = getEnv();
    if (!env.COSMOS_CONN_STRING) throw new Error('Missing COSMOS_CONN_STRING');
    console.log('Mongo: initializing client', {
      hasCOSMOS_CONN_STRING: true,
      COSMOS_DB_NAME: env.COSMOS_DB_NAME,
      COSMOS_CONTAINER_NAME: env.COSMOS_CONTAINER_NAME,
    });
    const client = new MongoClient(env.COSMOS_CONN_STRING, { serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getCollection<T extends Document>(): Promise<Collection<T>> {
  const env = getEnv();
  const client = await getMongoClient();
  return client.db(env.COSMOS_DB_NAME).collection<T>(env.COSMOS_CONTAINER_NAME);
}

export async function mongoUpsert<T extends Document & { id: string; sessionCode: string }>(doc: T & { expireAt?: Date }): Promise<void> {
  const col = await getCollection<T & { _id: string }>();
  const withId = { ...doc, _id: doc.id } as any;
  await col.replaceOne({ _id: doc.id, sessionCode: doc.sessionCode } as any, withId, { upsert: true });
}

export async function mongoFindOne<T extends Document>(filter: Filter<T>, options?: { sort?: Sort }): Promise<T | null> {
  const col = await getCollection<T>();
  if (options?.sort) return col.findOne(filter, { sort: options.sort }) as any;
  return col.findOne(filter as any) as any;
}

export async function mongoFindMany<T extends Document>(filter: Filter<T>, options?: { sort?: Sort; limit?: number }): Promise<T[]> {
  const col = await getCollection<T>();
  let cursor = col.find(filter as any);
  if (options?.sort) cursor = cursor.sort(options.sort as any);
  if (options?.limit) cursor = cursor.limit(options.limit);
  return (await cursor.toArray()) as any;
}

export async function mongoUpdateById<T extends Document>(id: string, sessionCode: string, update: Document): Promise<void> {
  const col = await getCollection<T & { _id: string }>();
  await col.updateOne({ _id: id, sessionCode } as any, update);
}

let ensured = false;
export async function ensureIndexes(): Promise<void> {
  if (ensured) return;
  const col = await getCollection<Document>();
  await Promise.all([
    col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
    col.createIndex({ sessionCode: 1, type: 1 }),
    col.createIndex({ sessionCode: 1, type: 1, createdAt: -1 }),
  ]);
  ensured = true;
}

export async function mongoPing(): Promise<{ ok: boolean; error?: string }> {
  try {
    const env = getEnv();
    const client = await getMongoClient();
    await client.db(env.COSMOS_DB_NAME).command({ ping: 1 } as any);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'unknown error' };
  }
}

