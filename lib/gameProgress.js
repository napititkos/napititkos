import { loadProgress, saveProgress } from './progress';

// A mini és a szókereső trófeáihoz: a megfejtett mini hetek és a megtalált szavak száma a
// haladásban (fiókkal szinkronizálva), utána trófea-ellenőrzés.
export function recordMiniWeek(week) {
  if (!week) return;
  const prog = loadProgress();
  const set = new Set(prog.miniWeeks || []);
  if (set.has(week)) return;
  set.add(week);
  prog.miniWeeks = [...set].sort().slice(-520);
  saveProgress(prog);
  window.dispatchEvent(new Event('achievements-recheck'));
}

export function recordSzoWord() {
  const prog = loadProgress();
  prog.szoWords = (prog.szoWords || 0) + 1;
  saveProgress(prog);
  clearTimeout(recordSzoWord.t);
  recordSzoWord.t = setTimeout(() => window.dispatchEvent(new Event('achievements-recheck')), 500);
}

// A szókereső teljesítése (az összes kötelező szó megvan) – a 1/5/10 teljesítés trófeáihoz.
export function recordSzoFull(date) {
  const prog = loadProgress();
  const set = new Set(prog.szoFullDays || []);
  if (set.has(date)) return;
  set.add(date);
  prog.szoFullDays = [...set].sort().slice(-1000);
  saveProgress(prog);
  window.dispatchEvent(new Event('achievements-recheck'));
}

// A szókereső Kisokosa végigcsinálva.
export function recordSzoTutorial() {
  const prog = loadProgress();
  if (prog.szoTutorialDone) return;
  prog.szoTutorialDone = true;
  saveProgress(prog);
  window.dispatchEvent(new Event('achievements-recheck'));
}
