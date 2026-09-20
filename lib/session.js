import { kv } from './kv';
import crypto from 'crypto';

const SESSION_COOKIE = 'titkositas_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 nap

function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

export async function createSession(email) {
  const sessionId = randomToken();
  await kv.set(`session:${sessionId}`, { email, createdAt: Date.now() }, SESSION_TTL_SECONDS);
  return sessionId;
}

export async function getSessionUser(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/titkositas_session=([^;]+)/);
  if (!match) return null;
  const sessionId = decodeURIComponent(match[1]);
  const session = await kv.get(`session:${sessionId}`);
  if (!session) return null;
  const user = await kv.get(`user:${session.email}`);
  if (!user) return null;
  return { email: session.email, name: user.name || session.email, role: user.role || 'user' };
}

export async function destroySession(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/titkositas_session=([^;]+)/);
  if (match) {
    await kv.del(`session:${decodeURIComponent(match[1])}`);
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
