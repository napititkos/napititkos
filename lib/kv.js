import Redis from 'ioredis';

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.REDIS_URL) {
      throw new Error('Missing REDIS_URL environment variable');
    }
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
    });
  }
  return client;
}

export const kv = {
  async get(key) {
    const raw = await getClient().get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },
  async set(key, value) {
    const raw = JSON.stringify(value);
    await getClient().set(key, raw);
    return 'OK';
  },
};
