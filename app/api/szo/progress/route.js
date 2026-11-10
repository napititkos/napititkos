export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr, isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { cleanName, readJson } from '../../../../lib/validate';
import { miniLive } from '../../../../lib/mini';
import { actorFor } from '../../../../lib/reactions';
import { SZO_FOUND_TTL, SZO_LB_TTL, szoFoundKey, szoForDate, szoLbKey, szoLbNamesKey, szoResKey } from '../../../../lib/szo';

// Haladás mentése: { date, words: [...], elapsed, device, name? }. A szerver csak a rács érvényes
// szavait fogadja el; a kötelező szavak száma és az idő (amikor az utolsó új szót megtalálta)
// kerül a ranglistára (csak a mai napon) és a saját eredmények közé (az archívumhoz).
export async function POST(req) {
  if (await isLimited('szo:progress:ip', clientIp(req), 600, 3600)) return tooMany(3600);
  if (!miniLive()) return Response.json({ error: 'not-live' }, { status: 404 });
  const body = (await readJson(req, 20000)) || {};
  const date = String(body.date || '');
  const today = todayStr();
  if (!isValidDateStr(date) || date > today) return Response.json({ error: 'not-found' }, { status: 404 });
  const p = await szoForDate(date, { create: false });
  if (!p) return Response.json({ error: 'not-found' }, { status: 404 });
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const actor = actorFor(user?.id || null, body.device);
  if (!actor) return Response.json({ error: 'invalid-device' }, { status: 400 });
  const valid = new Set([...p.required, ...p.bonus]);
  const req0 = new Set(p.required);
  const r = kv.raw();
  let prev = [];
  try {
    prev = JSON.parse((await r.hget(szoFoundKey(date), actor)) || '[]');
  } catch {}
  const words = [...new Set([...prev, ...(Array.isArray(body.words) ? body.words : [])].map(String))].filter((w) => valid.has(w));
  const count = words.filter((w) => req0.has(w)).length;
  const elapsed = Math.max(0, Math.min(24 * 3600 * 1000, Math.round(Number(body.elapsed) || 0)));
  await r.hset(szoFoundKey(date), actor, JSON.stringify(words));
  await r.expire(szoFoundKey(date), SZO_FOUND_TTL);
  const old = String((await r.hget(szoResKey(date), actor)) || '0:0').split(':').map(Number);
  if (count > old[0]) {
    await r.hset(szoResKey(date), actor, `${count}:${elapsed}`);
    if (date === today) {
      await r.hset(szoLbKey(date), actor, JSON.stringify({ c: count, e: elapsed }));
      await r.hset(szoLbNamesKey(date), actor, cleanName(user?.name || body.name || ''));
      await r.expire(szoLbKey(date), SZO_LB_TTL);
      await r.expire(szoLbNamesKey(date), SZO_LB_TTL);
    }
  }
  return Response.json({ ok: true, count, total: p.required.length, found: words });
}
