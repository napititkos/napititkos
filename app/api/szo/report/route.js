export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { auth } from '../../../../auth';
import { isValidDateStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';

// „Problémád van?” – hibajelzés a szókeresőhöz: { date, type, text }. Típusok: hiányzó szó (nem
// fogadja el), hibás/sértő szó a listában, egyéb. Az admin felületen jelennek meg (szo:reports).
const REPORT_TYPES = { missing: 'Egy szót nem fogad el', wrong: 'Hibás vagy sértő szó a listában', other: 'Egyéb' };

export async function POST(req) {
  if (await isLimited('szo:report:ip', clientIp(req), 20, 3600)) return tooMany(3600);
  const body = (await readJson(req, 3000)) || {};
  const type = Object.keys(REPORT_TYPES).includes(body.type) ? body.type : null;
  const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!type) return Response.json({ error: 'invalid-type', message: 'Válaszd ki a probléma típusát.' }, { status: 400 });
  if (!text) return Response.json({ error: 'missing-text', message: 'Írd le röviden a problémát (pl. a szót).' }, { status: 400 });
  let user = null;
  try {
    user = (await auth())?.user || null;
  } catch {}
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: isValidDateStr(String(body.date || '')) ? body.date : null,
    type,
    text,
    at: new Date().toISOString(),
    name: user?.name || null,
  };
  await kv.withLock('szo-reports', async () => {
    const list = (await kv.get('szo:reports')) || [];
    await kv.set('szo:reports', [item, ...list].slice(0, 500));
    return true;
  });
  return Response.json({ ok: true });
}
