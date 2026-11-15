import { kv } from './kv';
import { generateSudoku } from './sudokuGen';
export { generateSudoku, sudokuLevel, conflicts, countSolutions } from './sudokuGen';

// Napi sudoku tárolása: minden nap egy 6x6-os és egy 9x9-es (azonos nehézséggel). A 9x9-es kulcsai
// „sudoku9:” előtaggal kezdődnek, egyébként ugyanazok.
//   sudoku:puzzle:<dátum>  { date, size, level, givens[36|81], solution[36|81], clues }
//   sudoku:lb:<dátum>      szereplő -> idő ms   (ranglista, 2 napig)
//   sudoku:lbn:<dátum>     szereplő -> név      (ranglista, 2 napig)
//   sudoku:res:<dátum>     szereplő -> idő ms   (saját eredmény az archívumhoz és a statisztikához; megmarad)
// A megoldás soha nem megy ki a játékosnak: a beküldött rácsot a szerver ellenőrzi.
export const sudokuSize = (x) => (Number(x) === 9 ? 9 : 6);
const pre = (size) => (sudokuSize(size) === 9 ? 'sudoku9' : 'sudoku');
export const sudokuPuzzleKey = (d, size = 6) => `${pre(size)}:puzzle:${d}`;
export const sudokuLbKey = (d, size = 6) => `${pre(size)}:lb:${d}`;
export const sudokuLbNamesKey = (d, size = 6) => `${pre(size)}:lbn:${d}`;
export const sudokuResKey = (d, size = 6) => `${pre(size)}:res:${d}`;
export const SUDOKU_LB_TTL = 2 * 24 * 3600;

export async function sudokuForDate(date, { create = true, size = 6 } = {}) {
  const key = sudokuPuzzleKey(date, size);
  const have = await kv.get(key);
  if (have || !create) return have || null;
  const res = await kv.withLock(
    `${pre(size)}-gen:${date}`,
    async () => {
      const again = await kv.get(key);
      if (again) return again;
      const p = generateSudoku(date, { size: sudokuSize(size) });
      await kv.set(key, p);
      return p;
    },
    { ttlMs: 15000, waitMs: 12000 }
  );
  return res ? res.value : null;
}

// Egy jövőbeli nap rejtvényének cseréje (admin „Új kérése”): ugyanaz a nehézség, új rejtvény.
export async function regenerateSudoku(date, size = 6) {
  const p = generateSudoku(date, { salt: Date.now().toString(36), size: sudokuSize(size) });
  await kv.set(sudokuPuzzleKey(date, size), p);
  return p;
}

// A játékosnak kiadható rész (a megoldás nélkül).
export const publicSudoku = (p) => (p ? { date: p.date, size: p.givens?.length === 81 ? 9 : 6, level: p.level, givens: p.givens } : null);

// A sorszám: 2026. november 11. az 1., utána naponta eggyel több.
export const SUDOKU_FIRST = '2026-11-11';
export const sudokuNumber = (date) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${SUDOKU_FIRST}T12:00:00Z`)) / 86400000) + 1;
