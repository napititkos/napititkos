import { MINI_LETTERS, MINI_TEMPLATES, MINI_WORDS } from './miniData.js';
import { N, slotsOf } from './miniGrid.js';

// A rács közös segédei (N, slotsOf) a miniGrid.js-ben vannak, hogy a böngészős szerkesztő a
// szólista nélkül is használhassa őket; a régi importok változatlanul működnek.
export { N, slotsOf };

// Mini keresztrejtvény-generátor (5x5). Minden betű külön négyzet (a kettős betű 2 négyzet, az
// ékezetes betűk külön betűk). Egy rácsban nincs ismétlődő szó, legfeljebb egy egybetűs és két
// kétbetűs szó (ezt a minták biztosítják). A már kérdéssel rendelkező (banki) szavakat előnyben
// részesíti, így kevesebb új kérdést kell írni.
function blackCount(mask) {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}

export function templateGrid(mask) {
  return Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => ((mask >> (r * N + c)) & 1) === 1));
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Egyszerű, magolható véletlenszám-generátor (a tesztekhez megismételhető).
export function rng(seed = Date.now()) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

export function buildIndex(words) {
  const byLen = new Map();
  const idx = new Map(); // `${len}|${pos}|${ch}` -> Set
  for (const w of words) {
    const chars = Array.from(w);
    const L = chars.length;
    if (!byLen.has(L)) byLen.set(L, []);
    byLen.get(L).push(w);
    chars.forEach((ch, i) => {
      const k = `${L}|${i}|${ch}`;
      if (!idx.has(k)) idx.set(k, new Set());
      idx.get(k).add(w);
    });
  }
  return { byLen, idx };
}

function candidates(index, pattern) {
  const L = pattern.length;
  let cand = null;
  for (let i = 0; i < L; i++) {
    const ch = pattern[i];
    if (ch == null) continue;
    const s = index.idx.get(`${L}|${i}|${ch}`);
    if (!s) return [];
    if (cand == null) cand = [...s];
    else cand = cand.filter((w) => s.has(w));
    if (!cand.length) return [];
  }
  return cand == null ? [...(index.byLen.get(L) || [])] : cand;
}

// Egy minta kitöltése visszalépéses kereséssel (mindig a legkevesebb jelöltű szakasz először).
// A fixed (opcionális) a már beírt betűk: négyzetkulcs (sor * N + oszlop) -> betű. Ezeket a keresés
// nem változtatja; a teljesen kitöltött szavak adottak (akkor is, ha nincsenek a szótárban), és a
// többi szónak illeszkednie kell hozzájuk.
function fillGrid(grid, index, { deadline, rnd, preferred, fixed }) {
  const slots = slotsOf(grid);
  const letters = new Map(fixed || []);
  const used = new Set();
  const assigned = new Array(slots.length).fill(null);
  const key = ([r, c]) => r * N + c;
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].cells.every((x) => letters.has(key(x)))) continue;
    const w = slots[i].cells.map((x) => letters.get(key(x))).join('');
    if (used.has(w)) return null; // ugyanaz a szó kétszer a beírtak között
    assigned[i] = w;
    used.add(w);
  }
  if (slots.some((s, i) => assigned[i] == null && !index.byLen.has(s.cells.length))) return null;
  const pat = (s) => s.cells.map((x) => letters.get(key(x)) ?? null);
  let nodes = 0;
  function rec() {
    if (++nodes % 256 === 0 && Date.now() > deadline) throw new Error('timeout');
    let best = -1, bestC = null;
    for (let i = 0; i < slots.length; i++) {
      if (assigned[i] != null) continue;
      const c = candidates(index, pat(slots[i])).filter((w) => !used.has(w));
      if (!c.length) return false;
      if (best < 0 || c.length < bestC.length) { best = i; bestC = c; }
      if (c.length === 1) break;
    }
    if (best < 0) return true;
    shuffle(bestC, rnd);
    // A kérdéssel már rendelkező szavak kerülnek előre (de véletlen sorrendben).
    if (preferred) bestC.sort((a, b) => (preferred.has(b) ? 1 : 0) - (preferred.has(a) ? 1 : 0));
    const s = slots[best];
    for (const w of bestC.slice(0, 150)) {
      const chars = Array.from(w);
      const placed = [];
      s.cells.forEach((x, i) => {
        if (!letters.has(key(x))) { letters.set(key(x), chars[i]); placed.push(key(x)); }
      });
      assigned[best] = w; used.add(w);
      if (rec()) return true;
      assigned[best] = null; used.delete(w);
      placed.forEach((k) => letters.delete(k));
    }
    return false;
  }
  try {
    if (!rec()) return null;
  } catch {
    return null;
  }
  const rows = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => (grid[r][c] ? '#' : letters.get(r * N + c))));
  return { rows, entries: slots.map((s, i) => ({ dir: s.dir, row: s.row, col: s.col, len: s.cells.length, word: assigned[i] })) };
}

// Szólista a generáláshoz: a szótár, a betűk és a banki (kérdéssel rendelkező) szavak, a kizártak nélkül.
export function wordPool({ bankWords = [], excluded = [] } = {}) {
  const ex = new Set(excluded);
  const all = new Set([...MINI_LETTERS, ...MINI_WORDS, ...bankWords.filter((w) => Array.from(w).length <= N)]);
  return [...all].filter((w) => !ex.has(w));
}

// Egy új rejtvény: véletlen minták egymás után, amíg valamelyik kitölthető (időkorláttal).
export function generateMini({ bankWords = [], excluded = [], seconds = 6, seed } = {}) {
  const rnd = rng(seed ?? Date.now());
  const index = buildIndex(wordPool({ bankWords, excluded }));
  const preferred = new Set(bankWords);
  // Változatosság: minden generálásnál egy véletlen „cél” feketeszám (2-6) körüli minták jönnek
  // előbb, így a rácsok hol sűrűbbek, hol több fekete négyzetesek.
  const target = 2 + Math.floor(rnd() * 5);
  const order = MINI_TEMPLATES.map((m) => [m, Math.abs(blackCount(m) - target) + rnd() * 1.5]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const deadline = Date.now() + seconds * 1000;
  for (const mask of order) {
    if (Date.now() > deadline) break;
    const grid = templateGrid(mask);
    const got = fillGrid(grid, index, { deadline: Math.min(deadline, Date.now() + 400), rnd, preferred });
    if (got) return { ...got, blacks: grid.flat().filter(Boolean).length };
  }
  return null;
}

// A részben kitöltött tábla maradékának generálása: a fekete négyzetek és a már beírt betűk
// adottak, a hiányzó betűket szavakkal tölti ki (a kérdéssel rendelkező szavakat előnyben
// részesítve). Eredmény: { rows, entries }, vagy { error }: 'nothing-to-fill' (nincs üres négyzet),
// 'duplicate' (egy szó kétszer szerepel a beírtak között), 'no-fill' (nem sikerült kitölteni).
// A rows: 5x5 szöveg, '#' = fekete, '' = üres, egyébként egy kisbetű.
export function completeMini({ rows, bankWords = [], excluded = [], seconds = 6, seed } = {}) {
  const grid = rows.map((r) => r.map((ch) => ch === '#'));
  const fixed = new Map();
  rows.forEach((r, ri) => r.forEach((ch, ci) => ch && ch !== '#' && fixed.set(ri * N + ci, ch)));
  if (!rows.some((r, ri) => r.some((ch, ci) => ch === '' && !grid[ri][ci]))) return { error: 'nothing-to-fill' };
  const rnd = rng(seed ?? Date.now());
  const index = buildIndex(wordPool({ bankWords, excluded }));
  const preferred = new Set(bankWords);
  const deadline = Date.now() + seconds * 1000;
  // Egy-egy próba rövid, mert a visszalépéses keresés néha beleragad; újabb véletlen sorrenddel
  // újrapróbáljuk az időkorlátig.
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts++;
    const got = fillGrid(grid, index, { deadline: Math.min(deadline, Date.now() + 700), rnd, preferred, fixed });
    if (got) return got;
    // Ha az első próba azonnal elbukik a beírt szavak ismétlődése miatt, felesleges tovább keresni.
    if (attempts === 1 && hasDuplicateFixedWords(grid, fixed)) return { error: 'duplicate' };
  }
  return { error: 'no-fill' };
}

function hasDuplicateFixedWords(grid, fixed) {
  const seen = new Set();
  for (const s of slotsOf(grid)) {
    if (!s.cells.every(([r, c]) => fixed.has(r * N + c))) continue;
    const w = s.cells.map(([r, c]) => fixed.get(r * N + c)).join('');
    if (seen.has(w)) return true;
    seen.add(w);
  }
  return false;
}
