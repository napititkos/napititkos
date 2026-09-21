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

function parse(raw) {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const kv = {
  async get(key) {
    return parse(await getClient().get(key));
  },
  async set(key, value, ttlSeconds) {
    const raw = JSON.stringify(value);
    if (ttlSeconds) {
      await getClient().set(key, raw, 'EX', ttlSeconds);
    } else {
      await getClient().set(key, raw);
    }
    return 'OK';
  },
  // Csak akkor ír, ha a kulcs még nem létezik (SET NX) - igaz, ha sikerült.
  async setIfAbsent(key, value, ttlSeconds) {
    const raw = JSON.stringify(value);
    const res = ttlSeconds
      ? await getClient().set(key, raw, 'EX', ttlSeconds, 'NX')
      : await getClient().set(key, raw, 'NX');
    return res === 'OK';
  },
  // Egyszer használatos értékek (tokenek) kivétele: csak az kapja meg az értéket,
  // akinek a DEL 1-et ad vissza, így párhuzamos kérésnél sem használható kétszer.
  async take(key) {
    const c = getClient();
    const raw = await c.get(key);
    if (raw == null) return null;
    const removed = await c.del(key);
    return removed === 1 ? parse(raw) : null;
  },
  // Számláló növelése; az első növeléskor (vagy ha a TTL elveszett) lejáratot állít.
  async incr(key, ttlSeconds) {
    const c = getClient();
    const n = await c.incr(key);
    if (n === 1 || (await c.ttl(key)) < 0) await c.expire(key, ttlSeconds);
    return n;
  },
  async del(key) {
    await getClient().del(key);
    return 'OK';
  },
  async keys(pattern) {
    return getClient().keys(pattern);
  },
};
