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

// A tipp-ablakban a tippek neve melletti kérdőjel magyarázata.
export const HINT_HELP = {
  definicio: 'A rejtvény azon része, ami a megoldásra utal, mint egy keresztrejtvénynél!',
  fodder: 'A rejtvény azon szavai, amiket a mutatók segítségével átformálunk a megoldássá.',
  indikator: 'A rejtvény azon szavai, amik a készlet szavait a megoldássá formálják.',
  alternativ: 'Egy önmagában is értelmes, másik rejtvény ugyanarra a megoldásra. Ritkán van: csak ha a rejtvény írójának két változata is van.',
  betu: 'Egy véletlenszerűen kiválasztott helyre beírja és rögzíti a helyes betűt.',
};
