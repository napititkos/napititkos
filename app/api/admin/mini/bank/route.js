export const dynamic = 'force-dynamic';

import { kv } from '../../../../../lib/kv';
import { isAdminRequest } from '../../../../../lib/adminAuth';
import { MINI_LETTERS, MINI_WORDS } from '../../../../../lib/miniData';
import { MINI_KEYS, loadBank, titkosClues } from '../../../../../lib/mini';
import { bankStats, buildRows, queryRows, usageOf } from '../../../../../lib/miniBank';

// A szóbank és a kérdésbank áttekintése (csak olvasás): a kézzel írt kérdések, a megjelent
// titkosírásokból származó kérdések, a kizárt szavak és az alap szótár egy listában.
//   GET ?q=<keresés>&filter=clues|bank|titkos|noclue|excluded|all&sort=word|len|recent|used&page=1
// A szűrés, rendezés és lapozás a szerveren történik, így a 8000+ szavas lista nem megy le egyben.
export async function GET(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const [bank, titkos, excludedRaw, queue, published] = await Promise.all([
    loadBank(),
    titkosClues(),
    kv.get(MINI_KEYS.excluded),
    kv.get(MINI_KEYS.queue),
    kv.get(MINI_KEYS.published),
  ]);
  const excluded = excludedRaw || [];
  const all = buildRows({
    dictWords: [...MINI_LETTERS, ...MINI_WORDS],
    bank,
    titkos,
    excluded,
    usage: usageOf([...(queue || []), ...(published || [])]),
  });
  const page = Number.parseInt(sp.get('page') || '1', 10);
  const result = queryRows(all, {
    q: String(sp.get('q') || '').slice(0, 60),
    filter: sp.get('filter') || undefined,
    sort: sp.get('sort') || undefined,
    page: Number.isInteger(page) ? page : 1,
  });
  return Response.json({ ...result, stats: bankStats(all, excluded) }, { headers: { 'Cache-Control': 'no-store' } });
}
