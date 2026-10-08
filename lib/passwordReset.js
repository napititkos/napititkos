import crypto from 'crypto';

// Jelszó-visszaállítás közös részei. A tokent csak hash-elve tároljuk, így egy esetleges
// adatbázis-szivárgásból sem lehet érvényes visszaállító linket összerakni.
export const RESET_TTL_SECONDS = 60 * 60; // 1 óra

export function newResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function isResetTokenFormat(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

export function resetKey(token) {
  return `pwreset:${crypto.createHash('sha256').update(token).digest('hex')}`;
}
