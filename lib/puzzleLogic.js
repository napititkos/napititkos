export const HINT_LABELS = {
  fodder: 'Készlet',
  indikator: 'Mutató',
  definicio: 'Definíció',
  alternativ: 'Alternatív rejtvény',
  betu: 'Helyes betű',
};
export const HINT_ORDER = ['definicio', 'fodder', 'indikator', 'alternativ', 'betu'];

export const norm = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');

export function emptyGuess(answer) {
  return Array.from(answer).map((ch) => (ch === ' ' ? ' ' : ''));
}
export function emptyLocked(answer) {
  return Array.from(answer).map(() => false);
}
