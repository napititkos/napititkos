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
  // Ugyanazok a magyarázatok, mint a beküldésnél ("Írj te is titkosírást"), a jelölésről szóló
  // mondat nélkül.
  definicio: 'A rejtvény azon része, ami a megoldásra utal, mint egy keresztrejtvénynél!',
  fodder: 'A készlet azokat a szavakat jelenti, amelyeket valamilyen módon meg kell változtatni, kiegészíteni, manipulálni, hogy megkapjuk a megoldást.',
  indikator: 'A mutató az, amelyik megmutatja, hogy hogyan kell a készlet szavait formálni a megoldáshoz.',
  alternativ: 'Egy önmagában is értelmes rejtvény: ha esetleg két változatod lenne belőle, itt tudod megadni a másikat.',
  betu: 'Egy véletlenszerűen kiválasztott helyre beírja és rögzíti a helyes betűt.',
};
