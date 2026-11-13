// Szókereső: a kifakuló betűkhöz tartozó négyzetválasztás (tiszta függvény, egységtesztelhető).
// A legkevesebb négyzet, amelyen minden szónak van legalább egy teljes útja (routes: szavanként az
// utak listája). A 3x3-as rácson legfeljebb 2^9 részhalmaz van, így a kimerítő keresés gyors.
// prev: az előző választás (ha egy legkisebb megoldás belefér, azt választjuk); seed: a véletlen
// választás magja (napra és a hátralévő szavak számára állandó, így újratöltéskor sem változik).
export function minimalCells(routes, prev, seed = '') {
  const all = new Set(routes.flat(2));
  const cells = [...all];
  const ok = (mask) => routes.every((rs) => rs.some((r) => r.every((i) => mask & (1 << i))));
  const full = cells.reduce((m, i) => m | (1 << i), 0);
  if (!routes.length || !ok(full)) return all;
  const bits = (m) => cells.filter((i) => m & (1 << i));
  const best = [];
  let bestSize = Infinity;
  // csak a full részhalmazai
  for (let m = full; ; m = (m - 1) & full) {
    const n = bits(m).length;
    if (n <= bestSize && ok(m)) {
      if (n < bestSize) {
        bestSize = n;
        best.length = 0;
      }
      best.push(m);
    }
    if (m === 0) break;
  }
  if (best.length === 1) return new Set(bits(best[0]));
  const prevMask = prev ? [...prev].reduce((m, i) => m | (1 << i), 0) : 0;
  const inPrev = prev ? best.filter((m) => (m & prevMask) === m) : [];
  const pool = inPrev.length ? inPrev : best;
  pool.sort((a, b) => a - b);
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return new Set(bits(pool[Math.abs(h) % pool.length]));
}
