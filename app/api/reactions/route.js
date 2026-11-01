export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { auth } from '../../../auth';
import { isValidDateStr } from '../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../lib/rateLimit';
import { readJson } from '../../../lib/validate';
import { EMOJIS, actorFor, dailyReactionsKey, reactionSummary } from '../../../lib/reactions';

// Napi titkosírás reakciói: GET ?date=YYYY-MM-DD&device=<eszközazonosító> -> darabszámok és a saját;
// POST { date, reaction: 0..n | null, device } -> beállítja vagy visszavonja a sajátot.
// Csak már megjelent (az előzményben szereplő) napra lehet reagálni.
async function shownDate(date) {
  if (!isValidDateStr(date)) return false;
  const history = (await kv.get('rotation:history')) || [];
  return history.some((h) => h.shownDate === date);
}

async function sessionUserId() {
  try {
    const session = await auth();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(req) {
  if (await isLimited('reactions:get', clientIp(req), 240, 60)) return tooMany(60);
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || '';
  if (!(await shownDate(date))) return Response.json({ error: 'not-found' }, { status: 404, headers: noStore });
  const actor = actorFor(await sessionUserId(), url.searchParams.get('device'));
  return Response.json(await reactionSummary(date, actor), { headers: noStore });
}

export async function POST(req) {
  if (await isLimited('reactions:post', clientIp(req), 120, 3600)) return tooMany(3600);
  const body = (await readJson(req, 500)) || {};
  const date = String(body.date || '');
  if (!(await shownDate(date))) return Response.json({ error: 'not-found' }, { status: 404, headers: noStore });
  const reaction = body.reaction;
  if (reaction !== null && !(Number.isInteger(reaction) && reaction >= 0 && reaction < EMOJIS.length)) {
    return Response.json({ error: 'invalid-reaction' }, { status: 400, headers: noStore });
  }
  const actor = actorFor(await sessionUserId(), body.device);
  if (!actor) return Response.json({ error: 'invalid-device' }, { status: 400, headers: noStore });
  const r = kv.raw();
  if (reaction === null) await r.hdel(dailyReactionsKey(date), actor);
  else await r.hset(dailyReactionsKey(date), actor, String(reaction));
  return Response.json({ ok: true, ...(await reactionSummary(date, actor)) }, { headers: noStore });
}
