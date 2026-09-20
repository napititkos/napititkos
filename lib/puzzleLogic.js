export const HINT_LABELS = {
  fodder: 'Készlet',
  indikator: 'Mutató',
  definicio: 'Definíció',
  alternativ: 'Alternatív tipp',
  betu: 'Helyes betű',
};
export const HINT_ORDER = ['definicio', 'indikator', 'fodder', 'alternativ', 'betu'];

export const norm = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');

export function emptyGuess(answer) {
  return Array.from(answer).map((ch) => (ch === ' ' ? ' ' : ''));
}
export function emptyLocked(answer) {
  return Array.from(answer).map(() => false);
}
