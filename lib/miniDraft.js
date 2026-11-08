import { HU, N, blackGrid, normWord, slotKey, slotsOf } from './miniGrid.js';

// Mini keresztrejtvény piszkozatai: a még nem kész, de elmentett (és más adminok által is
// szerkeszthető) táblák tiszta logikája. Nincs benne adatbázis-elérés, így tesztelhető és a
// böngészőben is használható.
//
// Egy piszkozat:
//   { id, title, rows, clues, rev, createdAt, createdBy, updatedAt, updatedBy }
//   rows   5x5 szöveg: '#' = fekete négyzet, '' = még üres, egyébként egy kisbetű
//   clues  { "A:0:0": { clue, word } } - a szó azonosítójához (irány:sor:oszlop) a kérdés és az a
//          szó, amelyhez írták (ha a szó azóta megváltozott, a kérdés "elavult")
//   rev    mentésenként nő: két admin egyszerre szerkesztése így nem írja felül egymást
export const MAX_TITLE = 60;
export const MAX_CLUE = 300;
const KEY_RE = /^[AD]:[0-4]:[0-4]$/;

// A kliens által küldött tartalom ellenőrzése és megtisztítása. Hibánál szöveget ad vissza.
export function sanitizeDraftInput(body) {
  if (!body || !Array.isArray(body.rows) || body.rows.length !== N) return 'Hibás rács.';
  const rows = [];
  for (const raw of body.rows) {
    if (!Array.isArray(raw) || raw.length !== N) return 'Hibás rács.';
    const row = [];
    for (const v of raw) {
      const s = String(v ?? '').trim().toLowerCase();
      if (s === '' || s === '#') row.push(s);
      else if (HU.has(s)) row.push(s);
      else return 'Hibás betű a rácsban.';
    }
    rows.push(row);
  }
  const clues = {};
  const given = body.clues && typeof body.clues === 'object' && !Array.isArray(body.clues) ? body.clues : {};
  for (const [key, val] of Object.entries(given)) {
    if (!KEY_RE.test(key) || !val || typeof val !== 'object') continue;
    const clue = String(val.clue ?? '').trim().slice(0, MAX_CLUE);
    if (!clue) continue;
    clues[key] = { clue, word: normWord(val.word) || '' };
  }
  const title = String(body.title ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
  return { title, rows, clues };
}

// A rács szavai a kérdésekkel. Egy szó "kész", ha minden négyzete ki van töltve; a kérdése
// "elavult", ha azt egy másik szóhoz írták (azóta átírták a betűit).
export function assemble(rows, clues = {}) {
  return slotsOf(blackGrid(rows)).map((s) => {
    const letters = s.cells.map(([r, c]) => rows[r][c]);
    const complete = letters.every((ch) => ch && ch !== '#');
    const word = complete ? letters.join('') : '';
    const key = slotKey(s.dir, s.row, s.col);
    const saved = clues[key];
    const clue = saved?.clue || '';
    const stale = !!(complete && clue && saved.word && saved.word !== word);
    return { key, dir: s.dir, row: s.row, col: s.col, len: s.cells.length, letters, word, complete, clue, stale };
  });
}

// Mennyire kész a piszkozat: szavak, kész szavak, kérdéssel ellátott (nem elavult) szavak.
export function draftProgress(draft) {
  const all = assemble(draft.rows, draft.clues);
  return {
    total: all.length,
    complete: all.filter((s) => s.complete).length,
    clued: all.filter((s) => s.complete && s.clue && !s.stale).length,
  };
}

// A beemeléshez szükséges, validatePuzzle-nek átadható tartalom, vagy hibaüzenet szövege.
export function toPublishable(draft) {
  const all = assemble(draft.rows, draft.clues);
  if (!all.length) return 'A tábla üres.';
  if (all.some((s) => !s.complete)) return 'Nincs minden négyzet kitöltve.';
  const stale = all.find((s) => s.stale);
  if (stale) return `A(z) „${stale.word.toUpperCase()}” szó megváltozott, nézd át a kérdését.`;
  const missing = all.find((s) => !s.clue);
  if (missing) return `A(z) „${missing.word.toUpperCase()}” szóhoz nincs kérdés.`;
  return {
    rows: draft.rows,
    entries: all.map((s) => ({ dir: s.dir, row: s.row, col: s.col, len: s.len, word: s.word, clue: s.clue })),
  };
}

// A listában mutatott rövid kép a piszkozatról (a kérdések szövege nélkül).
export function draftSummary(draft) {
  return {
    id: draft.id,
    title: draft.title,
    rows: draft.rows,
    rev: draft.rev,
    createdAt: draft.createdAt,
    createdBy: draft.createdBy,
    updatedAt: draft.updatedAt,
    updatedBy: draft.updatedBy,
    progress: draftProgress(draft),
  };
}
