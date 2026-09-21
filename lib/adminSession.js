import crypto from 'crypto';

// Az admin munkamenet aláírt, lejáró token (HMAC-SHA256) - a süti nem tartalmaz
// jelszót. Az aláíró kulcs az AUTH_SECRET-ből ÉS az ADMIN_PASSWORD-ből származik,
// így az admin jelszó cseréje azonnal érvényteleníti az összes meglévő munkamenetet.

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60; // 8 óra

// Élesben __Host- előtag: csak Secure, Path=/ és Domain nélküli süti lehet.
export function adminCookieName() {
  return process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session';
}

function signingKey() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!secret || !adminPassword) return null;
  return crypto.createHmac('sha256', secret).update(`admin-session-v1\0${adminPassword}`).digest();
}

function sign(payload, key) {
  return crypto.createHmac('sha256', key).update(payload).digest();
}

export function createAdminToken(now = Date.now()) {
  const key = signingKey();
  if (!key) throw new Error('Az admin munkamenethez AUTH_SECRET és ADMIN_PASSWORD szükséges.');
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(now / 1000) + ADMIN_SESSION_SECONDS, n: crypto.randomBytes(8).toString('hex') })
  ).toString('base64url');
  return `${payload}.${sign(payload, key).toString('base64url')}`;
}

export function verifyAdminToken(token, now = Date.now()) {
  const key = signingKey();
  if (!key || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = sign(payload, key);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && exp * 1000 > now;
  } catch {
    return false;
  }
}

// Időállandó jelszó-összehasonlítás (előbb azonos hosszúságú hash-ekké alakítva).
export function passwordMatches(input, expected) {
  if (typeof input !== 'string' || !input || !expected) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}
