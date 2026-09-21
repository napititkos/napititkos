export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';
import { findPuzzle, gameKey, hintsUsedOf, readGameToken, recordResult, touchGame } from '../../../../lib/game';

// Feladás: a szerver kiadja a megfejtést, a játék pedig nem kerülhet ranglistára.
export async function POST(req) {
  const ip = clientIp(req);
  if (await isLimited('game:ip', ip, 120, 60)) return tooMany(60);
  // A feladás kiadja a megfejtést, ezért címenként naponta korlátozzuk (a megfejtés
  // "lekérdezésére" való visszaélés ellen).
  if (await isLimited('giveup:ip', ip, 20, 86400)) return tooMany(3600);
  const body = await readJson(req, 2000);
  const tok = readGameToken(body?.token);
  if (!tok) return Response.json({ error: 'invalid-token' }, { status: 400 });

  const puzzle = await findPuzzle(tok.p);
  if (!puzzle) return Response.json({ error: 'not-found' }, { status: 404 });
  const key = gameKey(body.token);
  const r = kv.raw();

  const state = await r.hgetall(key);
  if (state.status === 'solved') return Response.json({ error: 'finished' }, { status: 409 });
  if ((await r.hsetnx(key, 'status', 'gaveup')) === 1) {
    const hintsUsed = hintsUsedOf({ ...state, status: 'gaveup' });
    await r.hset(key, 'hintsUsed', hintsUsed);
    await touchGame(key);
    await recordResult(tok.d, { hintsUsed, correct: false });
  }
  return Response.json({ answer: String(puzzle.answer) });
}
