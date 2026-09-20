import { kv } from './kv';
import crypto from 'crypto';

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

// Egyedi Auth.js adapter a saját (ioredis-alapú) Redis kapcsolatunkhoz, mivel a
// hivatalos Upstash adapter a REST API-s kliens formátumát várja, nekünk pedig
// TCP-alapú (REDIS_URL) kapcsolatunk van.
export function RedisAdapter() {
  return {
    async createUser(data) {
      const id = newId();
      const user = { id, email: data.email, name: data.name || null, image: data.image || null, emailVerified: data.emailVerified || null, role: 'user' };
      await kv.set(`au:user:${id}`, user);
      if (user.email) await kv.set(`au:userByEmail:${user.email}`, id);
      return user;
    },
    async getUser(id) {
      return (await kv.get(`au:user:${id}`)) || null;
    },
    async getUserByEmail(email) {
      const id = await kv.get(`au:userByEmail:${email}`);
      if (!id) return null;
      return (await kv.get(`au:user:${id}`)) || null;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const link = await kv.get(`au:account:${provider}:${providerAccountId}`);
      if (!link) return null;
      return (await kv.get(`au:user:${link.userId}`)) || null;
    },
    async updateUser(data) {
      const existing = await kv.get(`au:user:${data.id}`);
      const updated = { ...existing, ...data };
      await kv.set(`au:user:${data.id}`, updated);
      if (updated.email) await kv.set(`au:userByEmail:${updated.email}`, updated.id);
      return updated;
    },
    async deleteUser(id) {
      const user = await kv.get(`au:user:${id}`);
      if (user?.email) await kv.del(`au:userByEmail:${user.email}`);
      await kv.del(`au:user:${id}`);
    },
    async linkAccount(account) {
      await kv.set(`au:account:${account.provider}:${account.providerAccountId}`, {
        userId: account.userId,
        ...account,
      });
      return account;
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await kv.del(`au:account:${provider}:${providerAccountId}`);
    },
    // Munkamenetet nem az adatbázisban tároljuk (JWT stratégiát használunk),
    // ezek a metódusok csak a kompatibilitás miatt vannak jelen.
    async createSession(session) {
      return session;
    },
    async getSessionAndUser() {
      return null;
    },
    async updateSession(session) {
      return session;
    },
    async deleteSession() {
      return;
    },
    async createVerificationToken(data) {
      await kv.set(
        `au:verificationToken:${data.identifier}:${data.token}`,
        { expires: data.expires },
        15 * 60
      );
      return data;
    },
    async useVerificationToken({ identifier, token }) {
      const key = `au:verificationToken:${identifier}:${token}`;
      const record = await kv.get(key);
      if (!record) return null;
      await kv.del(key);
      return { identifier, token, expires: new Date(record.expires) };
    },
  };
}
