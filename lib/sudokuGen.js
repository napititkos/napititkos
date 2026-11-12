// Napi mini sudoku (6x6, 2 sor x 3 oszlopos dobozok). Tiszta logika, adatbázis nélkül, így a
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
// Megadott számok célértéke nehézségenként (a 6x6-os egyedi megoldásúhoz legalább 8 kell).
const CLUE_TARGET = { 1: 21, 2: 16, 3: 12, 4: 10, 5: 9 };

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

const boxOf = (r, c) => Math.floor(r / BOX_R) * (N / BOX_C) + Math.floor(c / BOX_C);

// Az i. cella (0..35) társai: azonos sor, oszlop vagy doboz.
export const PEERS = Array.from({ length: N * N }, (_, i) => {
  const r = Math.floor(i / N), c = i % N, b = boxOf(r, c);
  const out = [];
  for (let j = 0; j < N * N; j++) {
    if (j === i) continue;
    const rj = Math.floor(j / N), cj = j % N;
    if (rj === r || cj === c || boxOf(rj, cj) === b) out.push(j);
  }
  return out;
});
// A 18 egység (6 sor, 6 oszlop, 6 doboz) cellái.
export const UNITS = [
  ...Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => r * N + c)),
  ...Array.from({ length: N }, (_, c) => Array.from({ length: N }, (_, r) => r * N + c)),
  ...Array.from({ length: N }, (_, b) => {
    const r0 = Math.floor(b / (N / BOX_C)) * BOX_R, c0 = (b % (N / BOX_C)) * BOX_C;
    const out = [];
    for (let r = 0; r < BOX_R; r++) for (let c = 0; c < BOX_C; c++) out.push((r0 + r) * N + c0 + c);
    return out;
  }),
];

// Ütköző cellák: amelyik szám ugyanabban a sorban, oszlopban vagy dobozban kétszer szerepel.
// grid: 36 elem, 0 = üres. Visszaad: Set a cellaindexekkel.
export function conflicts(grid) {
  const bad = new Set();
  for (let i = 0; i < N * N; i++) {
    if (!grid[i]) continue;
    for (const j of PEERS[i]) if (grid[j] === grid[i]) bad.add(i);
  }
  return bad;
}

const candidatesOf = (grid, i) => {
  if (grid[i]) return [];
  const used = new Set(PEERS[i].map((j) => grid[j]));
  return [1, 2, 3, 4, 5, 6].filter((d) => !used.has(d));
};

// Megoldások száma (legfeljebb limit-ig): visszalépéses keresés, mindig a legkevesebb jelöltű
// üres cellával kezdve.
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  const rec = () => {
    let best = -1, bestC = null;
    for (let i = 0; i < N * N; i++) {
      if (g[i]) continue;
      const cand = candidatesOf(g, i);
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
  for (;;) {
    if (!g.includes(0)) return true;
    let moved = false;
    for (let i = 0; i < N * N; i++) {
      if (g[i]) continue;
      const c = candidatesOf(g, i);
      if (c.length === 0) return false;
      if (c.length === 1) {
        g[i] = c[0];
        moved = true;
      }
    }
    if (moved) continue;
    if (!hidden) return false;
    for (const unit of UNITS) {
      for (let d = 1; d <= N; d++) {
        if (unit.some((i) => g[i] === d)) continue;
        const spots = unit.filter((i) => !g[i] && candidatesOf(g, i).includes(d));
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
  const cand = g.map((v, i) => (v ? new Set() : new Set(candidatesOf(g, i))));
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

function fullGrid(rnd) {
  const g = new Array(N * N).fill(0);
  const rec = (i) => {
    if (i === N * N) return true;
    for (const d of shuffle([1, 2, 3, 4, 5, 6], rnd)) {
      if (PEERS[i].some((j) => g[j] === d)) continue;
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
  let clues = N * N;
  for (const i of shuffle([...Array(N * N).keys()], rnd)) {
    if (clues <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep;
    else clues--;
  }
  return puzzle;
}

// A nap rejtvénye. salt: az admin „Új kérése” gombjához (más véletlen sorozat ugyanarra a napra).
export function generateSudoku(date, { salt = '' } = {}) {
  const level = /^\d{4}-\d{2}-\d{2}$/.test(date) ? sudokuLevel(date) : 1;
  const target = CLUE_TARGET[level];
  const rnd = rng(`sudoku-${date}${salt ? `-${salt}` : ''}`);
  let best = null;
  for (let attempt = 0; attempt < (level === 5 ? 1500 : 400); attempt++) {
    const solution = fullGrid(rnd);
    const puzzle = carve(solution, rnd, target);
    const clues = puzzle.filter(Boolean).length;
    // A két legnehezebb szinten olyat keresünk, ami csupasz egyesekkel nem, csak rejtett
    // egyesekkel oldható meg végig; a könnyebbeknél csupasz egyesekkel is megoldható legyen.
    const nakedOk = solvableWith(puzzle, { hidden: false });
    const singlesOk = nakedOk || solvableWith(puzzle);
    const fits = level === 5 ? !singlesOk && solvableAdvanced(puzzle) : level >= 3 ? !nakedOk && singlesOk : nakedOk;
    const score = Math.abs(clues - target) + (fits ? 0 : 10);
    if (!best || score < best.score) best = { score, puzzle, solution, clues };
    if (score === 0) break;
  }
  return { date, level, givens: best.puzzle, solution: best.solution, clues: best.clues };
}
