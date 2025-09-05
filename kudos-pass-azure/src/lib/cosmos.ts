import { CosmosClient, Database, Container, ItemDefinition } from '@azure/cosmos';
import { getEnv } from './env';

let containerPromise: Promise<Container> | null = null;

export function getContainer(): Promise<Container> {
  if (!containerPromise) {
    containerPromise = (async () => {
      const env = getEnv();
      const client = new CosmosClient(env.COSMOS_CONN_STRING);
      const { database } = await client.databases.createIfNotExists({ id: env.COSMOS_DB_NAME });
      const { container } = await database.containers.createIfNotExists({
        id: env.COSMOS_CONTAINER_NAME,
        partitionKey: { paths: ['/sessionCode'] },
        defaultTtl: 86400,
      });
      return container;
    })();
  }
  return containerPromise;
}

export async function upsertItem<T extends { sessionCode: string }>(item: T & { _ttl?: number }): Promise<void> {
  const container = await getContainer();
  await container.items.upsert({ ...item, _ttl: 86400 } as any);
}

export async function readItemsByQuery<T>(query: string, parameters: { name: string; value: any }[]): Promise<T[]> {
  const container = await getContainer();
  const iterator = container.items.query<T>({ query, parameters });
  const { resources } = await iterator.fetchAll();
  return resources;
}

export async function readItemById<T extends ItemDefinition = ItemDefinition>(id: string, partitionKey: string): Promise<T | null> {
  const container = await getContainer();
  try {
    const { resource } = await container.item(id, partitionKey).read<T>();
    return (resource as T | undefined) ?? null;
  } catch (err: any) {
    if (err.code === 404) return null;
    throw err;
  }
}

export async function patchItem<T>(id: string, partitionKey: string, operations: any[]): Promise<T> {
  const container = await getContainer();
  const { resource } = await container.item(id, partitionKey).patch(operations);
  return resource as T;
}

