// A közösségi posztkép (lib/socialCard.js) betűdobozainak elrendezése, külön fájlban, hogy
// egységtesztből is betölthető legyen.
// A betűdobozok sorai a játék szabályai szerint: egy szó legfeljebb 14 betűig egy sorban marad,
// a hosszabbat 12-es darabokra tördeljük; több rövid szó együtt egy sorba kerülhet. A dobozok
// a lehető legnagyobbak (legfeljebb tileMax), amíg szélességben és magasságban is elférnek.
const LONG_WORD = 14;
const CHUNK = 12;
const gapFor = (t) => Math.max(4, Math.round(t * 0.12));
const wordGapFor = (t) => Math.round(t * 0.45);
const rowGapFor = (t) => Math.round(t * 0.25);

function chunksOf(answer) {
  const words = String(answer || '').split(' ').filter(Boolean).map((w) => Array.from(w).length);
  const chunks = [];
  for (const n of words) {
    if (n > LONG_WORD) for (let i = 0; i < n; i += CHUNK) chunks.push({ n: Math.min(CHUNK, n - i), own: true });
    else chunks.push({ n, own: false });
  }
  return chunks;
}

// Adott dobozméretnél a sorok (ha szélességben nem fér el, null).
function layoutAt(chunks, t, availW) {
  const gap = gapFor(t);
  const wordGap = wordGapFor(t);
  const width = (n) => n * t + (n - 1) * gap;
  if (Math.max(...chunks.map((c) => width(c.n))) > availW) return null;
  const letters = chunks.reduce((a, c) => a + c.n, 0);
  const oneRow = chunks.reduce((a, c) => a + width(c.n), 0) + (chunks.length - 1) * wordGap;
  if (chunks.length > 1 && letters <= LONG_WORD && !chunks.some((c) => c.own)) {
    return oneRow <= availW ? [chunks.map((c) => c.n)] : null;
  }
  const rows = [];
  let row = [];
  let used = 0;
  for (const c of chunks) {
    const add = width(c.n) + (row.length ? wordGap : 0);
    if (row.length && used + add > availW) {
      rows.push(row);
      row = [];
      used = 0;
    }
    used += row.length ? width(c.n) + wordGap : width(c.n);
    row.push(c.n);
  }
  if (row.length) rows.push(row);
  return rows;
}

export function tileRows(answer, availW, tileMax, availH = Infinity) {
  const chunks = chunksOf(answer);
  if (!chunks.length) return { rows: [], tile: tileMax, gap: 0, wordGap: 0, rowGap: 0 };
  for (let t = tileMax; t >= 12; t--) {
    const rows = layoutAt(chunks, t, availW);
    if (!rows) continue;
    if (rows.length * t + (rows.length - 1) * rowGapFor(t) > availH) continue;
    return { rows, tile: t, gap: gapFor(t), wordGap: wordGapFor(t), rowGap: rowGapFor(t) };
  }
  const t = 12;
  return { rows: layoutAt(chunks, t, Infinity), tile: t, gap: gapFor(t), wordGap: wordGapFor(t), rowGap: rowGapFor(t) };
}
