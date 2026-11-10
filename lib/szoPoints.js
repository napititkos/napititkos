// Szókereső pontozás a szó hossza szerint (a ranglista pontok, majd idő szerint rangsorol).
// Csak a kötelező szavak adnak pontot; a bónuszszavak a ranglistába nem számítanak bele.
export const SZO_POINTS = { 3: 3, 4: 5, 5: 10, 6: 15, 7: 25, 8: 40, 9: 65 };
export const szoPointsOf = (w) => SZO_POINTS[Array.from(String(w)).length] || 0;
export const szoPointsTotal = (words) => words.reduce((a, w) => a + szoPointsOf(w), 0);
