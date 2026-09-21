import crypto from 'crypto';
import { promisify } from 'util';

// Jelszó-hashelés Node beépített scrypt függvényével - nincs külön csomag rá szükség.
// Az aszinkron változatot használjuk, mert a szinkron (scryptSync) a számítás
// idejére blokkolná az egész szervert.
const scrypt = promisify(crypto.scrypt);

export const MAX_PASSWORD_LENGTH = 200;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) return false;
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const testHash = await scrypt(password, salt, 64);
  if (testHash.length !== hashBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, testHash);
}

// Ha nincs ilyen fiók, ugyanannyi munkát végzünk, mintha lenne: így a válaszidőből
// nem derül ki, hogy egy e-mail cím regisztrált-e.
export async function burnPasswordCheck(password) {
  const p = typeof password === 'string' ? password.slice(0, MAX_PASSWORD_LENGTH) : '';
  await scrypt(p, 'nincs-ilyen-fiok-dummy-so', 64);
}
