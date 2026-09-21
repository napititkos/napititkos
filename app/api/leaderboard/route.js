export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { todayStr, isValidDateStr } from '../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../lib/rateLimit';
import { cleanName, readJson } from '../../../lib/validate';
import { LEADERBOARD_TTL_SECONDS, gameKey, readGameToken } from '../../../lib/game';

// Az eredmény a szerver által mért adatokból áll össze: egy helyesen megfejtett játék
// tokenjével lehet ranglistára kerülni, az idő és a tippszám nem a kliens állítása.
// Rendezés: kevesebb tipp, azon belül gyorsabb idő. Pontszám = tippek * 1e9 + idő (ms).
const SCORE_BASE = 1e9;

export async function POST(req) {
  if (await isLimited('lb:ip', clientIp(req), 30, 60)) return tooMany(60);
  const body = await readJson(req, 2000);
  const tok = readGameToken(body?.token);
  if (!tok) return Response.json({ ok: false, error: 'invalid-token' }, { status: 400 });

  const key = gameKey(body.token);
  const r = kv.raw();
  const state = await r.hgetall(key);
  if (state.status !== 'solved') return Response.json({ ok: false, error: 'not-solved' }, { status: 400 });
  // Egy játék egyszer kerülhet a ranglistára.
  if ((await r.hsetnx(key, 'lb', '1')) !== 1) return Response.json({ ok: true });

  const session = await auth();
  let playerKey;
  let name;
  if (session?.user) {
    // Bejelentkezett játékosnál a név a fiókból jön (a kliens nem hamisíthatja),
    // és az e-mail-cím sosem jelenik meg: nevet vagy az e-mail helyi részét mutatjuk.
    playerKey = `u:${session.user.id || session.user.email}`;
    name = cleanName(session.user.name || String(session.user.email || '').split('@')[0]);
  } else {
    name = cleanName(body.name);
    playerKey = `g:${name}`;
  }

  const score = Number(state.hintsUsed) * SCORE_BASE + Math.min(Number(state.elapsed) || 0, SCORE_BASE - 1);
  const zKey = `leaderboard:z:${tok.d}`;
  const nKey = `leaderboard:n:${tok.d}`;
  // NX: játékosonként csak az első megfejtés számít.
  await r.zadd(zKey, 'NX', score, playerKey);
  await r.hset(nKey, playerKey, name);
  await r.expire(zKey, LEADERBOARD_TTL_SECONDS);
  await r.expire(nKey, LEADERBOARD_TTL_SECONDS);
  return Response.json({ ok: true });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('date');
  const date = requested && isValidDateStr(requested) ? requested : todayStr();
  const r = kv.raw();
  const raw = await r.zrange(`leaderboard:z:${date}`, 0, 19, 'WITHSCORES');
  let entries = [];
  if (raw.length) {
    const members = raw.filter((_, i) => i % 2 === 0);
    const scores = raw.filter((_, i) => i % 2 === 1).map(Number);
    const names = await r.hmget(`leaderboard:n:${date}`, ...members);
    entries = members.map((m, i) => ({
      name: names[i] || 'Névtelen',
      hintsUsed: Math.floor(scores[i] / SCORE_BASE),
      elapsed: scores[i] % SCORE_BASE,
    }));
  } else {
    // Átmenet: a korábbi (JSON-listás) formátumú mai ranglista még olvasható.
    const legacy = (await kv.get(`leaderboard:${date}`)) || [];
    entries = [...legacy]
      .sort((a, b) => a.hintsUsed - b.hintsUsed || a.elapsed - b.elapsed)
      .slice(0, 20)
      .map((e) => ({ name: cleanName(e.name), hintsUsed: e.hintsUsed, elapsed: e.elapsed }));
  }
  return Response.json({ entries }, { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15' } });
}
