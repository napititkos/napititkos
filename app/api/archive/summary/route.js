export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';
import { todayStr } from '../../../../lib/date';
import { miniStart, weekStart } from '../../../../lib/mini';

// Nyilvános előzetes a korábbi titkosírásokhoz: csak darabszámok évre és hónapra bontva.
// Rejtvényszöveget, választ vagy tippet NEM ad ki (azok bejelentkezéshez kötöttek).
export async function GET() {
  const history = (await kv.get('rotation:history')) || [];
  // Az utolsó bejegyzés a mai (aktív) titkosírás, az nem tartozik az archívumhoz.
  const past = history.slice(0, -1);
  const byYear = {};
  for (const h of past) {
    const [y, m] = String(h?.shownDate || '').split('-');
    if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m)) continue;
    byYear[y] = byYear[y] || {};
    byYear[y][m] = (byYear[y][m] || 0) + 1;
  }
  const total = Object.values(byYear).reduce((a, months) => a + Object.values(months).reduce((x, n) => x + n, 0), 0);
  // Az összes játék korábbi rejtvényei együtt (titkosírás, szókereső, sudoku, heti mini) – a
  // vendégeknek szóló előzeteshez.
  let all = total;
  try {
    const today = todayStr();
    const start = miniStart() || '0000-00-00';
    const past = (prefix) => kv.scan(`${prefix}*`).then((keys) => keys.map((k) => k.slice(prefix.length)).filter((d) => d < today && d >= start).length);
    const [szo, sud, minis] = await Promise.all([past('szo:puzzle:'), past('sudoku:puzzle:'), kv.get('mini:published')]);
    const ws = weekStart();
    all += szo + sud + (minis || []).filter((m) => m.week && m.week < ws).length;
  } catch {}
  return Response.json(
    { total, all, byYear },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate' } }
  );
}
