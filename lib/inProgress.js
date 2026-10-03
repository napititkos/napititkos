// Félbehagyott napi játék állapota (felhasznált tippek, felfedett betűk, beírt válasz),
// napra és megfejtésre kötve, hogy kilépés és visszatérés után is megmaradjon.
const KEY = 'titkositas_inprogress_v1';
const TIP_TYPES = ['definicio', 'indikator', 'fodder', 'alternativ', 'betu'];

export function loadInProgress(date, answer) {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    const n = Array.from(answer || '').length;
    if (!d || d.date !== date || d.answerLen !== n) return null;
    if (!Array.isArray(d.guess) || d.guess.length !== n || !Array.isArray(d.lockedLetters) || d.lockedLetters.length !== n) return null;
    return {
      guess: d.guess.map((c, i) => (answer[i] === ' ' ? ' ' : typeof c === 'string' ? c.slice(0, 1) : '')),
      lockedLetters: d.lockedLetters.map(Boolean),
      revealed: Array.isArray(d.revealed) ? d.revealed.filter((t) => TIP_TYPES.includes(t)) : [],
      betuCount: Number.isInteger(d.betuCount) && d.betuCount >= 0 ? d.betuCount : 0,
    };
  } catch {
    return null;
  }
}

export function saveInProgress(date, answer, state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date, answerLen: Array.from(answer || '').length, ...state }));
  } catch {}
}

export function clearInProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
