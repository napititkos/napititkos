export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr, isValidDateStr } from '../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../lib/rateLimit';
import { readJson } from '../../../lib/validate';
import { recordResult } from '../../../lib/stats';

const MAX_HINTS = 20;

// A játék végén a kliens küldi. Ellenőrzött bemenet: a dátum mindig a szerver mai napja
// (a kliens nem hozhat létre tetszőleges kulcsot), a tippszám korlátos egész szám.
export async function POST(req) {
  if (await isLimited('stats:ip', clientIp(req), 60, 3600)) return tooMany(3600);
  const body = await readJson(req, 1000);
  const hintsUsed = Number(body?.hintsUsed);
  if (!body || !Number.isInteger(hintsUsed) || hintsUsed < 0 || hintsUsed > MAX_HINTS) {
    return Response.json({ ok: false, error: 'invalid-body' }, { status: 400 });
  }
  await recordResult(todayStr(), { hintsUsed, correct: body.correct === true });
  return Response.json({ ok: true });
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
