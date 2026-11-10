export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { todayStr } from '../../../../lib/date';
import { miniLive, miniStart } from '../../../../lib/mini';
import { szoResKey } from '../../../../lib/szo';

// A korábbi napok szókeresői (a mai előttiek), a saját eredménnyel. Bejelentkezve, mint a többi
// korábbi rejtvény.
export async function GET() {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!miniLive()) return Response.json({ live: false, items: [] }, { headers: noStore });
  let uid = null;
  try {
    uid = (await auth())?.user?.id || null;
  } catch {}
  if (!uid) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: noStore });
  const today = todayStr();
  // Csak az élesítés óta megjelent napok (az admin előnézet miatt korábban generált rácsok nem).
  const start = miniStart() || '0000-00-00';
  const dates = (await kv.scan('szo:puzzle:*')).map((k) => k.slice('szo:puzzle:'.length)).filter((d) => d < today && d >= start).sort().reverse().slice(0, 365);
  const r = kv.raw();
  const pl = r.pipeline();
  for (const d of dates) {
    pl.get(`szo:puzzle:${d}`);
    pl.hget(szoResKey(d), `u:${uid}`);
  }
  const res = dates.length ? await pl.exec() : [];
  const items = dates.map((d, i) => {
    let p = null;
    try {
      p = JSON.parse(res[i * 2]?.[1] || 'null');
    } catch {}
    const mine = res[i * 2 + 1]?.[1] ? String(res[i * 2 + 1][1]).split(':').map(Number) : null;
    return { date: d, total: p?.required?.length || 0, grid: p?.grid || [], count: mine ? mine[0] : 0, elapsed: mine ? mine[1] : null, points: mine ? mine[2] || 0 : 0 };
  });
  return Response.json({ live: true, items }, { headers: noStore });
}
