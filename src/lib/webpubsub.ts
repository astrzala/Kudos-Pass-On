import { WebPubSubServiceClient } from '@azure/web-pubsub';
import { getEnv } from './env';

let client: WebPubSubServiceClient | null = null;

function getClient(): WebPubSubServiceClient | null {
  const env = getEnv();
  if (!env.WEBPUBSUB_CONN_STRING) return null;
  if (!client) {
    client = new WebPubSubServiceClient(env.WEBPUBSUB_CONN_STRING, env.WEBPUBSUB_HUB);
  }
  return client;
}

export async function publishSessionEvent(sessionCode: string, event: string, payload: unknown): Promise<void> {
  const svc = getClient();
  if (!svc) return;
  const group = `session:${sessionCode}`;
  await svc.group(group).sendToAll({ event, payload });
}

export async function negotiateUrl(userId: string): Promise<string | null> {
  const svc = getClient();
  if (!svc) return null;
  const token = await svc.getClientAccessToken({
    userId,
    roles: [
      'webpubsub.joinLeaveGroup',
    ],
  });
  return token.url;
}

