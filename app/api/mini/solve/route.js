export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { cleanName, readJson } from '../../../../lib/validate';
import { currentMini, miniNamesKey, miniSolvesKey, miniStats } from '../../../../lib/mini';
import { actorFor } from '../../../../lib/reactions';

// A heti mini megfejtése: { week, elapsed (ms), device, name? }. Szereplőnként az első megfejtés
// számít (a statisztikához és az idő szerinti ranglistához). A név a fiókból jön; vendégnél a
// kliens vendégneve (ahogy a napi ranglistán).
const MIN_MS = 3000;
const MAX_MS = 24 * 3600 * 1000;

export async function POST(req) {
  if (await isLimited('mini:solve:ip', clientIp(req), 30, 3600)) return tooMany(3600);
  const body = (await readJson(req, 2000)) || {};
  const cur = await currentMini();
  if (!cur || body.week !== cur.week) return Response.json({ error: 'not-current' }, { status: 409 });
  const elapsed = Math.round(Number(body.elapsed));
  if (!Number.isFinite(elapsed) || elapsed < MIN_MS || elapsed > MAX_MS) return Response.json({ error: 'invalid-time' }, { status: 400 });
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const actor = actorFor(user?.id || null, body.device);
  if (!actor) return Response.json({ error: 'invalid-device' }, { status: 400 });
  const r = kv.raw();
  const first = await r.hsetnx(miniSolvesKey(cur.week), actor, String(elapsed));
  const name = cleanName(user?.name || body.name || '');
  if (first && name) {
    await r.hset(miniNamesKey(cur.week), actor, name);
    // A ranglista nevei 2 hét után törlődnek (az idők az archívumhoz megmaradnak).
    await r.expire(miniNamesKey(cur.week), 14 * 24 * 3600);
  }
  return Response.json({ ok: true, first: !!first, stats: await miniStats(cur.week, actor) }, { headers: { 'Cache-Control': 'no-store' } });
}
