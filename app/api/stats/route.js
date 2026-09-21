export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr, isValidDateStr } from '../../../lib/date';

// A statisztikát a szerver rögzíti a játék végén (/api/game/guess és /api/game/giveup),
// ezért a régi, kliens által küldött POST már nem hat semmire. (A már megnyitott, régi
// oldalak hibamentesen kapnak választ.)
export async function POST() {
  return Response.json({ ok: false, error: 'deprecated' }, { status: 410 });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('date');
  const date = requested && isValidDateStr(requested) ? requested : todayStr();

  let completions = 0;
  let totalHints = 0;
  let correctCount = 0;
  const h = await kv.raw().hgetall(`stats:h:${date}`);
  if (h && h.completions) {
    completions = Number(h.completions) || 0;
    totalHints = Number(h.totalHints) || 0;
    correctCount = Number(h.correctCount) || 0;
  } else {
    // Átmenet: a korábbi (JSON) formátumú statisztika.
    const legacy = await kv.get(`stats:${date}`);
    if (legacy) {
      completions = legacy.completions || 0;
      totalHints = legacy.totalHints || 0;
      correctCount = legacy.correctCount || 0;
    }
  }
  const average = completions ? totalHints / completions : 0;
  return Response.json(
    { completions, average, correctCount },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } }
  );
}
