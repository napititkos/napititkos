import crypto from 'crypto';

// Jelszó-hashelés Node beépített scrypt függvényével - nincs külön csomag rá szükség.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const testHash = crypto.scryptSync(password, salt, 64);
  if (testHash.length !== hashBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, testHash);
}
