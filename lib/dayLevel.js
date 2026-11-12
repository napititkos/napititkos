// A napi játékok nehézsége a hét napja szerint (1–5): hétfő, kedd 1 · szerda, csütörtök 2 ·
// péntek 3 · szombat 4 · vasárnap 5. A szókereső szószáma és a sudoku is így nő a héten.
export const DAY_LEVELS = [1, 1, 2, 2, 3, 4, 5];
export function dayLevel(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return 1;
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return DAY_LEVELS[dow] || 1;
}
