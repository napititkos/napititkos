export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';

// Összesített megfejtőszám egy korábbi titkosírásra = aznapi megfejtők + azóta az
// archívumban megfejtők. Az aznapi szám a napi statisztikából jön, ami 120 nap után
// lejár, ezért itt tartósan elmentjük (solvers:day), mielőtt eltűnne.
async function solverTotals(dates) {
  if (!dates.length) return {};
  const r = kv.raw();
  const [day, archive] = await Promise.all([r.hmget('solvers:day', ...dates), r.hmget('solvers:archive', ...dates)]);

  const missing = dates.filter((_, i) => day[i] == null);
  const fromStats = {};
  if (missing.length) {
    const p = r.pipeline();
    for (const d of missing) {
      p.hget(`stats:h:${d}`, 'correctCount');
      p.get(`stats:${d}`);
    }
    const res = await p.exec();
    const snap = r.pipeline();
    missing.forEach((d, i) => {
      const hashVal = res[i * 2]?.[1];
      const legacyRaw = res[i * 2 + 1]?.[1];
      let n = null;
      if (hashVal != null) n = Number(hashVal) || 0;
      else if (legacyRaw) {
        try {
          n = Number(JSON.parse(legacyRaw)?.correctCount) || 0;
        } catch {}
      }
      if (n != null) {
        fromStats[d] = n;
        snap.hsetnx('solvers:day', d, n);
      }
    });
    await snap.exec();
  }

  const out = {};
  dates.forEach((d, i) => {
    const dayCount = day[i] != null ? Number(day[i]) || 0 : fromStats[d] || 0;
    out[d] = dayCount + (Number(archive[i]) || 0);
  });
  return out;
}

export async function GET() {
  const history = (await kv.get('rotation:history')) || [];
  // Az utolsó bejegyzés mindig a jelenleg AKTÍV titkosírás - azt nem mutatjuk,
  // nehogy lelőjük a ma megfejtendő rejtvény válaszát.
  const past = history.slice(0, -1).reverse();
  let totals = {};
  try {
    totals = await solverTotals([...new Set(past.map((p) => p.shownDate).filter(Boolean))]);
  } catch (err) {
    console.error('Archív megfejtőszám hiba:', err.message);
  }
  const archive = past.map((p) => ({ ...p, totalSolvers: totals[p.shownDate] ?? null }));
  // Mindenkinek ugyanaz, ezért a CDN rövid ideig gyorsítótárazhatja.
  return Response.json(
    { archive },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
