import { kv } from './kv';
import { generateSudoku } from './sudokuGen';
export { generateSudoku, sudokuLevel, conflicts, countSolutions } from './sudokuGen';

// Napi mini sudoku (6x6) tárolása.
//   sudoku:puzzle:<dátum>  { date, level, givens[36], solution[36], clues }
//   sudoku:lb:<dátum>      szereplő -> idő ms   (ranglista, 2 napig)
//   sudoku:lbn:<dátum>     szereplő -> név      (ranglista, 2 napig)
//   sudoku:res:<dátum>     szereplő -> idő ms   (saját eredmény az archívumhoz és a statisztikához; megmarad)
// A megoldás soha nem megy ki a játékosnak: a beküldött rácsot a szerver ellenőrzi.
export const sudokuPuzzleKey = (d) => `sudoku:puzzle:${d}`;
export const sudokuLbKey = (d) => `sudoku:lb:${d}`;
export const sudokuLbNamesKey = (d) => `sudoku:lbn:${d}`;
export const sudokuResKey = (d) => `sudoku:res:${d}`;
export const SUDOKU_LB_TTL = 2 * 24 * 3600;

export async function sudokuForDate(date, { create = true } = {}) {
  const have = await kv.get(sudokuPuzzleKey(date));
  if (have || !create) return have || null;
  const res = await kv.withLock(
    `sudoku-gen:${date}`,
    async () => {
      const again = await kv.get(sudokuPuzzleKey(date));
      if (again) return again;
      const p = generateSudoku(date);
      await kv.set(sudokuPuzzleKey(date), p);
      return p;
    },
    { ttlMs: 15000, waitMs: 10000 }
  );
  return res ? res.value : null;
}

// Egy jövőbeli nap rejtvényének cseréje (admin „Új kérése”): ugyanaz a nehézség, új rejtvény.
export async function regenerateSudoku(date) {
  const p = generateSudoku(date, { salt: Date.now().toString(36) });
  await kv.set(sudokuPuzzleKey(date), p);
  return p;
}

// A játékosnak kiadható rész (a megoldás nélkül).
export const publicSudoku = (p) => (p ? { date: p.date, level: p.level, givens: p.givens } : null);

// A sorszám: 2026. november 11. az 1., utána naponta eggyel több.
export const SUDOKU_FIRST = '2026-11-11';
export const sudokuNumber = (date) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${SUDOKU_FIRST}T12:00:00Z`)) / 86400000) + 1;
