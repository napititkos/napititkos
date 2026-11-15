// Napi sudoku (6x6, 2 sor x 3 oszlopos dobozok, és 9x9, 3x3-as dobozok). Tiszta logika, adatbázis nélkül, így a
// böngészőben is használható (ütközésvizsgálat) és tesztelhető.
//
// Generálás: a dátumból képzett véletlen sorozattal egy teljes, szabályos rács (visszalépéses
// kitöltés), majd a számok egyenkénti kivétele úgy, hogy a rejtvénynek mindig pontosan egy
// megoldása maradjon (a megoldó a második megoldásnál megáll). A nehézséget a hét napja adja:
//   hétfő, kedd: 1/5 · szerda, csütörtök: 2/5 · péntek: 3/5 · szombat: 4/5 · vasárnap: 5/5
// A nehezebb napokon kevesebb a megadott szám, és a legnehezebbeknél olyan rejtvényt keresünk,
// amely egyszerű kizárással (egyetlen lehetséges szám egy cellában) nem oldható meg végig, csak
// rejtett egyesekkel (egy szám egy sorban / oszlopban / dobozban csak egy helyre kerülhet).
export const N = 6;
export const BOX_R = 2;
export const BOX_C = 3;
export const SUDOKU_LEVELS = [1, 1, 2, 2, 3, 4, 5]; // hétfő ... vasárnap
// Megadott számok célértéke nehézségenként (a 6x6-os egyedi megoldásúhoz legalább 8 kell, a 9x9-eshez 17).
const CLUE_TARGET = { 6: { 1: 21, 2: 16, 3: 12, 4: 10, 5: 9 }, 9: { 1: 40, 2: 34, 3: 29, 4: 26, 5: 24 } };
export const SUDOKU_SIZES = [6, 9];

export function sudokuLevel(date) {
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return SUDOKU_LEVELS[Number.isFinite(dow) ? dow : 0];
}

function rng(seedStr) {
  let h = 2166136261;
  for (const ch of String(seedStr)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffle = (arr, rnd) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// A rács szerkezete méretenként: 6x6 (2 sor x 3 oszlopos dobozok) és 9x9 (3x3-as dobozok).
// A függvények a rács hosszából (36 vagy 81) tudják, melyikről van szó.
function makeGeom(n) {
  const br = n === 9 ? 3 : 2, bc = 3;
  const boxOf = (r, c) => Math.floor(r / br) * (n / bc) + Math.floor(c / bc);
  const peers = Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n), c = i % n, b = boxOf(r, c);
    const out = [];
    for (let j = 0; j < n * n; j++) {
      if (j === i) continue;
      const rj = Math.floor(j / n), cj = j % n;
      if (rj === r || cj === c || boxOf(rj, cj) === b) out.push(j);
    }
    return out;
  });
  const units = [
    ...Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c)),
    ...Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => r * n + c)),
    ...Array.from({ length: n }, (_, b) => {
      const r0 = Math.floor(b / (n / bc)) * br, c0 = (b % (n / bc)) * bc;
      const out = [];
      for (let r = 0; r < br; r++) for (let c = 0; c < bc; c++) out.push((r0 + r) * n + c0 + c);
      return out;
    }),
  ];
  return { n, br, bc, peers, units, digits: Array.from({ length: n }, (_, k) => k + 1) };
}
const GEOMS = { 6: makeGeom(6), 9: makeGeom(9) };
export const sudokuGeom = (size) => GEOMS[size === 9 ? 9 : 6];
const geomOf = (grid) => GEOMS[grid.length === 81 ? 9 : 6];

// A 6x6-os rács (régi exportok): az i. cella társai és a 18 egység.
export const PEERS = GEOMS[6].peers;
export const UNITS = GEOMS[6].units;

// Ütköző cellák: amelyik szám ugyanabban a sorban, oszlopban vagy dobozban kétszer szerepel.
// grid: 36 vagy 81 elem, 0 = üres. Visszaad: Set a cellaindexekkel.
export function conflicts(grid) {
  const { peers } = geomOf(grid);
  const bad = new Set();
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    for (const j of peers[i]) if (grid[j] === grid[i]) bad.add(i);
  }
  return bad;
}

const candidatesOf = (grid, i, G = geomOf(grid)) => {
  if (grid[i]) return [];
  const used = new Set(G.peers[i].map((j) => grid[j]));
  return G.digits.filter((d) => !used.has(d));
};

// Megoldások száma (legfeljebb limit-ig): visszalépéses keresés, mindig a legkevesebb jelöltű
// üres cellával kezdve.
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  const G = geomOf(g);
  let count = 0;
  const rec = () => {
    let best = -1, bestC = null;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const cand = candidatesOf(g, i, G);
      if (cand.length === 0) return;
      if (!bestC || cand.length < bestC.length) {
        best = i;
        bestC = cand;
        if (cand.length === 1) break;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    for (const d of bestC) {
      g[best] = d;
      rec();
      g[best] = 0;
      if (count >= limit) return;
    }
  };
  rec();
  return count;
}

export function solve(grid) {
  const g = grid.slice();
  let out = null;
  const rec = () => {
    const i = g.indexOf(0);
    if (i < 0) return (out = g.slice()), true;
    for (const d of candidatesOf(g, i)) {
      g[i] = d;
      if (rec()) return true;
      g[i] = 0;
    }
    return false;
  };
  rec();
  return out;
}

// Logikai megoldó: csak „csupasz egyesekkel” (egy cellának egy jelöltje) vagy rejtett egyesekkel
// is. Igaz, ha végig megoldható az adott eszközökkel.
export function solvableWith(grid, { hidden = true } = {}) {
  const g = grid.slice();
  const G = geomOf(g);
  for (;;) {
    if (!g.includes(0)) return true;
    let moved = false;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const c = candidatesOf(g, i, G);
      if (c.length === 0) return false;
      if (c.length === 1) {
        g[i] = c[0];
        moved = true;
      }
    }
    if (moved) continue;
    if (!hidden) return false;
    for (const unit of G.units) {
      for (let d = 1; d <= G.n; d++) {
        if (unit.some((i) => g[i] === d)) continue;
        const spots = unit.filter((i) => !g[i] && candidatesOf(g, i, G).includes(d));
        if (spots.length === 1) {
          g[spots[0]] = d;
          moved = true;
        }
      }
    }
    if (!moved) return false;
  }
}

// Jelöltalapú megoldó haladó lépésekkel: csupasz és rejtett egyesek, csupasz párok egy egységen
// belül, és a doboz–sor/oszlop kizárás (ha egy szám egy dobozban csak egy sorban/oszlopban lehet,
// a sor/oszlop többi részéből kiesik). Igaz, ha így végig megoldható.
export function solvableAdvanced(grid) {
  const g = grid.slice();
  const G = geomOf(g);
  const N = G.n, PEERS = G.peers, UNITS = G.units;
  const cand = g.map((v, i) => (v ? new Set() : new Set(candidatesOf(g, i, G))));
  const place = (i, d) => {
    g[i] = d;
    cand[i] = new Set();
    for (const j of PEERS[i]) cand[j].delete(d);
  };
  for (;;) {
    if (!g.includes(0)) return true;
    let moved = false;
    for (let i = 0; i < N * N; i++) {
      if (g[i]) continue;
      if (cand[i].size === 0) return false;
      if (cand[i].size === 1) {
        place(i, [...cand[i]][0]);
        moved = true;
      }
    }
    if (moved) continue;
    for (const unit of UNITS)
      for (let d = 1; d <= N; d++) {
        if (unit.some((i) => g[i] === d)) continue;
        const spots = unit.filter((i) => !g[i] && cand[i].has(d));
        if (spots.length === 1) {
          place(spots[0], d);
          moved = true;
        }
      }
    if (moved) continue;
    // csupasz párok
    for (const unit of UNITS) {
      const pairs = unit.filter((i) => !g[i] && cand[i].size === 2);
      for (let a = 0; a < pairs.length; a++)
        for (let b = a + 1; b < pairs.length; b++) {
          const A = [...cand[pairs[a]]], B = cand[pairs[b]];
          if (!(B.has(A[0]) && B.has(A[1]))) continue;
          for (const i of unit) {
            if (i === pairs[a] || i === pairs[b] || g[i]) continue;
            for (const d of A) if (cand[i].delete(d)) moved = true;
          }
        }
    }
    // doboz–sor/oszlop kizárás
    for (let b = 0; b < N; b++) {
      const box = UNITS[2 * N + b];
      for (let d = 1; d <= N; d++) {
        const spots = box.filter((i) => !g[i] && cand[i].has(d));
        if (spots.length < 2) continue;
        const rows = new Set(spots.map((i) => Math.floor(i / N))), cols = new Set(spots.map((i) => i % N));
        if (rows.size === 1) {
          const r = [...rows][0];
          for (let c = 0; c < N; c++) {
            const i = r * N + c;
            if (!box.includes(i) && !g[i] && cand[i].delete(d)) moved = true;
          }
        }
        if (cols.size === 1) {
          const c = [...cols][0];
          for (let r = 0; r < N; r++) {
            const i = r * N + c;
            if (!box.includes(i) && !g[i] && cand[i].delete(d)) moved = true;
          }
        }
      }
    }
    if (!moved) return false;
  }
}

function fullGrid(rnd, G) {
  const n = G.n;
  const g = new Array(n * n).fill(0);
  const rec = (i) => {
    if (i === n * n) return true;
    for (const d of shuffle(G.digits, rnd)) {
      if (G.peers[i].some((j) => g[j] === d)) continue;
      g[i] = d;
      if (rec(i + 1)) return true;
    }
    g[i] = 0;
    return false;
  };
  rec(0);
  return g;
}

// Egy rejtvény a megadott véletlen sorozatból: kivesszük a számokat, amíg a cél nincs meg (vagy
// tovább már nem lehet úgy, hogy egyedi maradjon a megoldás).
function carve(solution, rnd, target) {
  const puzzle = solution.slice();
  let clues = puzzle.length;
  for (const i of shuffle([...Array(puzzle.length).keys()], rnd)) {
    if (clues <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep;
    else clues--;
  }
  return puzzle;
}

// A nap rejtvénye. salt: az admin „Új kérése” gombjához (más véletlen sorozat ugyanarra a napra).
// size: 6 (alapértelmezett) vagy 9 – ugyanazon a napon a két méret nehézsége azonos.
export function generateSudoku(date, { salt = '', size = 6 } = {}) {
  const G = sudokuGeom(size);
  const level = /^\d{4}-\d{2}-\d{2}$/.test(date) ? sudokuLevel(date) : 1;
  const target = CLUE_TARGET[G.n][level];
  const rnd = rng(`sudoku${G.n === 9 ? '9' : ''}-${date}${salt ? `-${salt}` : ''}`);
  // A 9x9-es keresés lassabb: legfeljebb kb. 6 másodpercig próbálkozunk, utána a legjobbat adjuk.
  const deadline = Date.now() + (G.n === 9 ? 6000 : 60000);
  const maxAttempts = G.n === 9 ? 400 : level === 5 ? 1500 : 400;
  let best = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = fullGrid(rnd, G);
    const puzzle = carve(solution, rnd, target);
    const clues = puzzle.filter(Boolean).length;
    // A két legnehezebb szinten olyat keresünk, ami csupasz egyesekkel nem, csak rejtett
    // egyesekkel oldható meg végig; a könnyebbeknél csupasz egyesekkel is megoldható legyen.
    const nakedOk = solvableWith(puzzle, { hidden: false });
    const singlesOk = nakedOk || solvableWith(puzzle);
    const fits = level === 5 ? !singlesOk && solvableAdvanced(puzzle) : level >= 3 ? !nakedOk && singlesOk : nakedOk;
    const score = Math.abs(clues - target) + (fits ? 0 : 10);
    if (!best || score < best.score) best = { score, puzzle, solution, clues };
    if (score === 0 || (best && Date.now() > deadline)) break;
  }
  return { date, size: G.n, level, givens: best.puzzle, solution: best.solution, clues: best.clues };
}
