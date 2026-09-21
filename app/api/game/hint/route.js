export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';
import { TEXT_HINTS, findPuzzle, gameKey, pickLetterHint, readGameToken, touchGame } from '../../../../lib/game';

// Tipp kérése. A tipp szövege csak innen érhető el, és a szerver számolja, hány tippet használt a játékos.
// Szöveges tipp: { token, type } -> { text }    Betű-tipp: { token, type: 'betu', guess: [...] } -> { pos, letter }
export async function POST(req) {
  if (await isLimited('game:ip', clientIp(req), 120, 60)) return tooMany(60);
  const body = await readJson(req, 4000);
  const tok = readGameToken(body?.token);
  if (!tok) return Response.json({ error: 'invalid-token' }, { status: 400 });
  const type = body.type;
  if (type !== 'betu' && !TEXT_HINTS.includes(type)) return Response.json({ error: 'invalid-type' }, { status: 400 });

  const puzzle = await findPuzzle(tok.p);
  if (!puzzle) return Response.json({ error: 'not-found' }, { status: 404 });
  const key = gameKey(body.token);
  const r = kv.raw();
  if (await r.hget(key, 'status')) return Response.json({ error: 'finished' }, { status: 409 });

  if (type === 'betu') {
    if (puzzle.hints?.betu?.enabled === false) return Response.json({ error: 'disabled' }, { status: 403 });
    const pick = pickLetterHint(String(puzzle.answer), body.guess);
    if (!pick) return Response.json({ pos: null, letter: null });
    await r.hincrby(key, 'betu', 1);
    await touchGame(key);
    return Response.json(pick);
  }

  const hint = puzzle.hints?.[type];
  if (!hint?.enabled) return Response.json({ error: 'disabled' }, { status: 403 });
  const used = new Set(((await r.hget(key, 'hints')) || '').split(',').filter(Boolean));
  used.add(type);
  await r.hset(key, 'hints', [...used].join(','));
  await touchGame(key);
  return Response.json({ text: String(hint.text || '') });
}
