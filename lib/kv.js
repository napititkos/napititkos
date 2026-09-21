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
  // Több kulcs egyszerre (egy kör Redis felé).
  async mget(keys) {
    if (!keys.length) return [];
    return (await getClient().mget(...keys)).map(parse);
  },
  // Blokkolás nélküli kulcskeresés (a KEYS az egész Redist megállítja).
  async scan(pattern) {
    const c = getClient();
    const found = [];
    let cursor = '0';
    do {
      const [next, batch] = await c.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      found.push(...batch);
    } while (cursor !== '0');
    return [...new Set(found)];
  },
  // Kölcsönös kizárás (SET NX PX): a függvény egyszerre csak egy kérésben futhat.
  // Ha a zárat nem kapjuk meg a várakozási időn belül, null-t adunk vissza.
  async withLock(name, fn, { ttlMs = 10000, waitMs = 4000 } = {}) {
    const c = getClient();
    const key = `lock:${name}`;
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const deadline = Date.now() + waitMs;
    let got = false;
    while (!got) {
      got = (await c.set(key, token, 'PX', ttlMs, 'NX')) === 'OK';
      if (!got) {
        if (Date.now() >= deadline) return null;
        await new Promise((r) => setTimeout(r, 40));
      }
    }
    try {
      return { value: await fn() };
    } finally {
      if ((await c.get(key)) === token) await c.del(key);
    }
  },
  // Natív Redis-parancsokhoz (ZADD, HINCRBY, ...).
  raw() {
    return getClient();
  },
  async keys(pattern) {
    return getClient().keys(pattern);
  },
};
