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

  // Ha a fiókhoz tartozik név (pl. Google-lal kapott), az jelenik meg, és azt a szerver a
  // fiókból veszi (a kliens nem adhatja ki magát másnak). Név nélküli fióknál - és
  // vendégnél - a kliens által generált vendégnév jár. Az e-mail-cím (vagy annak bármely
  // része) sosem jelenik meg a ranglistán.
  const session = await auth();
  const r = kv.raw();
  const date = todayStr();
  const zKey = `leaderboard:z:${date}`;
  const nKey = `leaderboard:n:${date}`;
  const dKey = `leaderboard:d:${date}`;
  // Az eszköz azonosítója (a kliens véletlenszerű, helyben tárolt azonosítója): a vendégként
  // elért eredmény ehhez kötődik, így később csak ugyanarról az eszközről lehet a fiókhoz
  // kapcsolni - egy másik játékos vendégeredményét a nyilvános neve alapján nem lehet átvenni.
  const device = typeof body.device === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(body.device) ? body.device : '';

  // Ismételt megfejtés: aki ma vendégként már megfejtette, majd bejelentkezve újra, annak
  // a vendégként elért eredménye marad a ranglistán, de mostantól a profilja nevével.
  if (body.repeat === true) {
    if (session?.user?.name && session.user.verified && device) {
      const guestKey = `g:${cleanName(body.guestName)}`;
      const guestScore = await r.zscore(zKey, guestKey);
      const guestDevice = await r.hget(dKey, guestKey);
      if (guestScore !== null && guestDevice === device) {
        const userKey = `u:${session.user.id || session.user.email}`;
        await r.zadd(zKey, 'NX', Number(guestScore), userKey);
        await r.hset(nKey, userKey, cleanName(session.user.name));
        await r.zrem(zKey, guestKey);
        await r.hdel(nKey, guestKey);
        await r.hdel(dKey, guestKey);
        return Response.json({ ok: true, claimed: true });
      }
    }
    // Egyébként az ismétlés nem kerül fel újra (a vendégeredmény marad, ahogy volt).
    return Response.json({ ok: true, claimed: false });
  }
  let playerKey;
  let name;
  // A saját nevével csak megerősített fiók kerülhet a ranglistára; a meg nem erősített
  // fiók vendégként (generált névvel) szerepel.
  if (session?.user?.name && session.user.verified) {
    playerKey = `u:${session.user.id || session.user.email}`;
    name = cleanName(session.user.name);
  } else {
    name = cleanName(body.name);
    playerKey = `g:${name}`;
  }

  // A dátum mindig a szerver mai napja, a kliens nem választhat kulcsot.
  const score = hintsUsed * SCORE_BASE + Math.min(Math.floor(elapsed), MAX_ELAPSED_MS);
  // NX: játékosonként csak az első eredmény számít.
  const added = await r.zadd(zKey, 'NX', score, playerKey);
  await r.hset(nKey, playerKey, name);
  if (added && playerKey.startsWith('g:') && device) await r.hset(dKey, playerKey, device);
  await r.expire(zKey, LEADERBOARD_TTL_SECONDS);
  await r.expire(nKey, LEADERBOARD_TTL_SECONDS);
  await r.expire(dKey, LEADERBOARD_TTL_SECONDS);
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
