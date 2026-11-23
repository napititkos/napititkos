import { todayStr } from './date.js';

// Egy nap napi rejtvényei közül melyik van kész (a főoldali pipákhoz és az „összes rejtvény egy
// napon” trófeákhoz): a napi titkosírás, a szókereső minden szava, a 6x6-os és a 9x9-es sudoku, és
// az adott hét Heti Minije.
export function weekStartOf(d) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export function dailyDone(prog, date = todayStr()) {
  let miniLocal = null;
  try {
    miniLocal = JSON.parse(localStorage.getItem('titkositas_mini_v1') || 'null');
  } catch {}
  const week = weekStartOf(date);
  return {
    titkos: !!prog.history?.[date]?.correct,
    szo: (prog.szoFullDays || []).includes(date),
    szolanc: (prog.szolancDays || []).includes(date),
    sudoku6: (prog.sudokuDays || []).includes(date),
    sudoku9: (prog.sudoku9Days || []).includes(date),
    mini: (prog.miniWeeks || []).includes(week) || miniLocal?.week === week,
  };
}

// Ha ma minden napi rejtvény kész, a mai nap bekerül a haladás „allDoneDays” listájába. A lista csak
// bővül: egy később érkező új játék a korábban teljesített napokat (és a trófeákat) nem veszi el.
export function markAllDoneToday(prog, date = todayStr()) {
  const d = dailyDone(prog, date);
  if (!Object.values(d).every(Boolean)) return false;
  const set = new Set(prog.allDoneDays || []);
  if (set.has(date)) return false;
  set.add(date);
  prog.allDoneDays = [...set].sort().slice(-1000);
  return true;
}

// A főoldal sorrendje a „Következő játék” gombhoz.
export const GAME_ORDER = [
  ['titkos', '/titkosiras'],
  ['szo', '/szokereso'],
  ['szolanc', '/szolanc'],
  ['sudoku6', '/sudoku'],
  ['sudoku9', '/sudoku?m=9'],
  ['mini', '/mini'],
];
// Az első még nem teljesített napi játék felülről (a mostanit kihagyva); ha minden kész: a
// közösségi rejtvények.
// Így a 9×9-es sudoku után, ha a 6×6-os még nincs meg, a 6×6-osra visz.
export function nextGameHref(prog, current, date = todayStr()) {
  const d = dailyDone(prog, date);
  const next = GAME_ORDER.find(([k]) => k !== current && !d[k]);
  return next ? next[1] : '/kozossegi';
}
