export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { todayStr, isValidDateStr } from '../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../lib/rateLimit';
import { cleanName, readJson } from '../../../lib/validate';

// Redis ZSET: rendezés kevesebb tipp, azon belül gyorsabb idő szerint.
// Pontszám = tippek * 1e9 + idő (ms). A neveket külön hash tárolja.
const SCORE_BASE = 1e9;
const MAX_HINTS = 20;
const MAX_ELAPSED_MS = 24 * 3600 * 1000;
const LEADERBOARD_TTL_SECONDS = 45 * 24 * 3600;

export async function POST(req) {
  // Címenként óránként legfeljebb 30 beküldés (spam ellen).
  if (await isLimited('lb:ip', clientIp(req), 30, 3600)) return tooMany(3600);
  const body = await readJson(req, 2000);
  const hintsUsed = Number(body?.hintsUsed);
  const elapsed = Number(body?.elapsed);
  if (
    !body ||
    !Number.isInteger(hintsUsed) || hintsUsed < 0 || hintsUsed > MAX_HINTS ||
    !Number.isFinite(elapsed) || elapsed < 0
  ) {
    return Response.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }

  // Bejelentkezett játékosnál a név a fiókból jön (a kliens nem adhatja ki magát másnak),
  // és az e-mail-cím sosem jelenik meg: nevet vagy az e-mail helyi részét mutatjuk.
  const session = await auth();
  let playerKey;
  let name;
  if (session?.user) {
    playerKey = `u:${session.user.id || session.user.email}`;
    name = cleanName(session.user.name || String(session.user.email || '').split('@')[0]);
  } else {
    name = cleanName(body.name);
    playerKey = `g:${name}`;
  }

  // A dátum mindig a szerver mai napja, a kliens nem választhat kulcsot.
  const date = todayStr();
  const score = hintsUsed * SCORE_BASE + Math.min(Math.floor(elapsed), MAX_ELAPSED_MS);
  const r = kv.raw();
  const zKey = `leaderboard:z:${date}`;
  const nKey = `leaderboard:n:${date}`;
  // NX: játékosonként csak az első eredmény számít.
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
  return Response.json({ entries }, { headers: { 'Cache-Control': 'no-store' } });
}
