export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';
import { findPuzzle, gameKey, hintsUsedOf, norm, readGameToken, recordResult, touchGame } from '../../../../lib/game';

const MAX_GUESSES_PER_GAME = 300;
const MAX_ELAPSED_MS = 24 * 3600 * 1000;

// Megfejtés ellenőrzése a szerveren: { token, guess } -> { correct, ... }
// Helyes válasznál a szerver méri az időt és számolja a tippeket, és rögzíti a statisztikát.
export async function POST(req) {
  if (await isLimited('game:ip', clientIp(req), 120, 60)) return tooMany(60);
  const body = await readJson(req, 4000);
  const tok = readGameToken(body?.token);
  if (!tok || typeof body.guess !== 'string') return Response.json({ error: 'invalid-body' }, { status: 400 });

  const puzzle = await findPuzzle(tok.p);
  if (!puzzle) return Response.json({ error: 'not-found' }, { status: 404 });
  const key = gameKey(body.token);
  const r = kv.raw();
  const state = await r.hgetall(key);

  if (state.status === 'solved') {
    return Response.json({
      correct: true,
      answer: String(puzzle.answer),
      elapsed: Number(state.elapsed) || 0,
      hintsUsed: Number(state.hintsUsed) || 0,
    });
  }
  if (state.status === 'gaveup') return Response.json({ error: 'finished' }, { status: 409 });

  if ((await r.hincrby(key, 'guesses', 1)) > MAX_GUESSES_PER_GAME) return tooMany(3600);
  await touchGame(key);

  if (norm(body.guess.slice(0, 200)) !== norm(String(puzzle.answer))) {
    return Response.json({ correct: false });
  }

  const elapsed = Math.max(0, Math.min(MAX_ELAPSED_MS, Date.now() - tok.t));
  const hintsUsed = hintsUsedOf(state);
  // Csak az első helyes megfejtés számít (párhuzamos kéréseknél is egyszer rögzítjük).
  if ((await r.hsetnx(key, 'status', 'solved')) === 1) {
    await r.hset(key, 'elapsed', elapsed, 'hintsUsed', hintsUsed);
    await recordResult(tok.d, { hintsUsed, correct: true });
  }
  return Response.json({ correct: true, answer: String(puzzle.answer), elapsed, hintsUsed });
}
