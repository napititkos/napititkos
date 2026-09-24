export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr, isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';

// Archívumban (utólag) megfejtett titkosírás számlálása az összesített megfejtőszámhoz.
// A kliens rejtvényenként csak egyszer küldi; a mai rejtvényt itt nem lehet számolni.
export async function POST(req) {
  if (await isLimited('archsolve:ip', clientIp(req), 60, 3600)) return tooMany(3600);
  const body = await readJson(req, 500);
  const date = body?.date;
  if (!isValidDateStr(date) || date >= todayStr()) {
    return Response.json({ ok: false, error: 'invalid-date' }, { status: 400 });
  }
  const history = (await kv.get('rotation:history')) || [];
  if (!history.slice(0, -1).some((h) => h.shownDate === date)) {
    return Response.json({ ok: false, error: 'unknown-date' }, { status: 400 });
  }
  await kv.raw().hincrby('solvers:archive', date, 1);
  return Response.json({ ok: true });
}
