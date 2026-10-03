export const dynamic = 'force-dynamic';

import { kv } from '../../../../lib/kv';

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
  return Response.json(
    { total, byYear },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate' } }
  );
}
