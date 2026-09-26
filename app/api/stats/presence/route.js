export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr } from '../../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../../lib/rateLimit';
import { readJson } from '../../../../lib/validate';

// "Még fejti": hány eszköz nyitotta meg ma a titkosírást, de még nem fejezte be
// (megfejtés vagy feladás). Névtelen, véletlen eszközazonosítóval számolunk; a kulcs két
// nap után magától törlődik. Mezők: <eszköz> = 'o' (megnyitotta) | 'd' (befejezte),
// '_playing' = a még befejezetlen eszközök száma.
const TTL = 2 * 24 * 3600;
const DEVICE = /^[a-f0-9]{32}$/;

export async function POST(req) {
  if (await isLimited('presence:ip', clientIp(req), 120, 3600)) return tooMany(3600);
  const body = await readJson(req, 500);
  const device = body?.device;
  const action = body?.action;
  if (typeof device !== 'string' || !DEVICE.test(device) || !['open', 'done'].includes(action)) {
    return Response.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }
  const r = kv.raw();
  const key = `presence:${todayStr()}`;
  if (action === 'open') {
    if ((await r.hsetnx(key, device, 'o')) === 1) await r.hincrby(key, '_playing', 1);
  } else {
    const prev = await r.hget(key, device);
    if (prev === 'o') {
      await r.hset(key, device, 'd');
      await r.hincrby(key, '_playing', -1);
    } else if (prev == null) {
      await r.hset(key, device, 'd');
    }
  }
  await r.expire(key, TTL);
  return Response.json({ ok: true });
}
