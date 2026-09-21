import crypto from 'crypto';
import { kv } from './kv.js';
import { norm } from './puzzleLogic.js';

// Szerveroldali játékmenet: a megfejtés soha nem kerül a kliensre az aktuális rejtvénynél.
// A játék indulásakor a szerver aláírt tokent ad (rejtvény, dátum, kezdési idő), a tippeket,
// az ellenőrzést, az időmérést és a statisztikát pedig a szerver végzi.

const TOKEN_MAX_AGE_MS = 36 * 60 * 60 * 1000;
const GAME_TTL_SECONDS = 2 * 24 * 3600;
const STATS_TTL_SECONDS = 120 * 24 * 3600;
export const LEADERBOARD_TTL_SECONDS = 45 * 24 * 3600;
export const TEXT_HINTS = ['definicio', 'indikator', 'fodder', 'alternativ'];

function tokenKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Az AUTH_SECRET nincs beállítva.');
  return crypto.createHmac('sha256', secret).update('game-token-v1').digest();
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

export function issueGameToken(puzzleId, date, now = Date.now()) {
  const payload = b64(JSON.stringify({ p: puzzleId, d: date, t: now, n: crypto.randomBytes(6).toString('hex') }));
  const sig = b64(crypto.createHmac('sha256', tokenKey()).update(payload).digest());
  return `${payload}.${sig}`;
}

// Érvényes token esetén { p, d, t }, különben null.
export function readGameToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 400) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac('sha256', tokenKey()).update(parts[0]).digest();
  const given = Buffer.from(parts[1], 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const { p, d, t } = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (typeof p !== 'string' || typeof d !== 'string' || !Number.isFinite(t)) return null;
    if (now - t > TOKEN_MAX_AGE_MS || t > now + 60000) return null;
    return { p, d, t };
  } catch {
    return null;
  }
}

export const gameKey = (token) => `game:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 32)}`;

export async function findPuzzle(id) {
  const list = (await kv.get('puzzles:list')) || [];
  return list.find((p) => p.id === id && p.clue?.trim() && p.answer?.trim()) || null;
}

// Ami a kliensnek kiadható: megfejtés, tipp-szövegek és beküldői e-mail nélkül.
export function publicPuzzle(p) {
  const answer = String(p.answer || '');
  const h = p.hints || {};
  return {
    id: p.id,
    clue: p.clue,
    mask: answer.replace(/[^ ]/g, '_'),
    parHints: p.parHints,
    submittedBy: p.submittedBy || '',
    hints: {
      definicio: { enabled: !!h.definicio?.enabled },
      indikator: { enabled: !!h.indikator?.enabled },
      fodder: { enabled: !!h.fodder?.enabled },
      alternativ: { enabled: !!h.alternativ?.enabled },
      betu: { enabled: h.betu?.enabled !== false },
    },
  };
}

export function hintsUsedOf(state) {
  const texts = (state.hints || '').split(',').filter(Boolean).length;
  return texts + (Number(state.betu) || 0) + (state.status === 'gaveup' ? 1 : 0);
}

export async function touchGame(key) {
  await kv.raw().expire(key, GAME_TTL_SECONDS);
}

// Statisztika Redis-számlálókkal (párhuzamos kéréseknél sem veszik el adat).
export async function recordResult(date, { hintsUsed, correct }) {
  const r = kv.raw();
  const key = `stats:h:${date}`;
  await r.hincrby(key, 'completions', 1);
  await r.hincrby(key, 'totalHints', hintsUsed);
  if (correct) await r.hincrby(key, 'correctCount', 1);
  await r.expire(key, STATS_TTL_SECONDS);
}

// Betű-tipp: egy véletlen, még hibás vagy üres pozíció helyes betűje.
export function pickLetterHint(answer, guess) {
  const chars = Array.from(answer);
  const g = Array.isArray(guess) ? guess : [];
  const candidates = [];
  chars.forEach((ch, pos) => {
    if (ch !== ' ' && norm(String(g[pos] ?? '')) !== norm(ch)) candidates.push(pos);
  });
  if (!candidates.length) return null;
  const pos = candidates[crypto.randomInt(candidates.length)];
  return { pos, letter: chars[pos].toUpperCase() };
}

export { norm };
