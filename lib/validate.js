import { isValidDateStr } from './date.js';

// Bemenet-ellenőrzés és -tisztítás: a szerver soha nem tárol el ellenőrizetlen,
// tetszőleges méretű vagy alakú JSON-t.

export const HINT_TYPES = ['definicio', 'indikator', 'fodder', 'alternativ', 'betu'];

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const bool = (v) => v === true;
const num = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A kérés törzsének beolvasása méretkorláttal. Hibás vagy túl nagy törzsnél null.
export async function readJson(req, maxBytes = 20000) {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const text = await req.text().catch(() => null);
  if (text == null || text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Megjelenített név: hosszkorlát, vezérlő- és láthatatlan karakterek nélkül.
export function cleanName(v, fallback = 'Névtelen') {
  const s = str(v, 60)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
  return s || fallback;
}

// ---------------------------------------------------------------- rejtvények (admin)
function cleanHint(h, withText) {
  return withText ? { enabled: bool(h?.enabled), text: str(h?.text, 400) } : { enabled: bool(h?.enabled) };
}

export function sanitizePuzzle(p) {
  if (!isObj(p)) return null;
  const id = str(p.id, 40);
  if (!id) return null;
  const scheduled = typeof p.scheduledDate === 'string' && isValidDateStr(p.scheduledDate) ? p.scheduledDate : '';
  const words = Array.isArray(p.answerWords) ? p.answerWords.slice(0, 10).map((w) => str(w, 60)) : undefined;
  const out = {
    id,
    clue: str(p.clue, 400),
    answer: str(p.answer, 60),
    parHints: num(Number(p.parHints), 10),
    submittedBy: str(p.submittedBy, 60),
    submittedByEmail: str(p.submittedByEmail, 254),
    scheduledDate: scheduled,
    hints: {
      definicio: cleanHint(p.hints?.definicio, true),
      indikator: cleanHint(p.hints?.indikator, true),
      fodder: cleanHint(p.hints?.fodder, true),
      alternativ: cleanHint(p.hints?.alternativ, true),
      betu: cleanHint(p.hints?.betu, false),
    },
  };
  if (words) out.answerWords = words;
  return out;
}

// Az egész lista érvényes-e; hibánál a hibás elem indexe.
export function sanitizePuzzleList(list) {
  if (!Array.isArray(list) || list.length > 2000) return { error: 'invalid-list' };
  const out = [];
  const ids = new Set();
  for (let i = 0; i < list.length; i++) {
    const p = sanitizePuzzle(list[i]);
    if (!p) return { error: 'invalid-puzzle', index: i };
    if (ids.has(p.id)) return { error: 'duplicate-id', index: i };
    ids.add(p.id);
    out.push(p);
  }
  return { puzzles: out };
}

// ---------------------------------------------------------------- játékos haladása
export function sanitizeProgress(p) {
  if (!isObj(p)) return null;
  const history = {};
  const entries = isObj(p.history) ? Object.entries(p.history) : [];
  for (const [date, e] of entries.slice(-500)) {
    if (!isValidDateStr(date) || !isObj(e)) continue;
    history[date] = {
      guess: Array.isArray(e.guess) ? e.guess.slice(0, 60).map((c) => str(c, 2)) : [],
      lockedLetters: Array.isArray(e.lockedLetters) ? e.lockedLetters.slice(0, 60).map(bool) : [],
      revealed: Array.isArray(e.revealed) ? e.revealed.filter((t) => HINT_TYPES.includes(t)).slice(0, 5) : [],
      betuCount: num(e.betuCount, 60),
      correct: bool(e.correct),
      gaveUp: bool(e.gaveUp),
      elapsed: num(e.elapsed, 86400000),
    };
  }
  const ids = (v, n) => (Array.isArray(v) ? [...new Set(v.map((x) => str(x, 40)).filter(Boolean))].slice(0, n) : []);
  return {
    lastDate: typeof p.lastDate === 'string' && isValidDateStr(p.lastDate) ? p.lastDate : null,
    streak: num(p.streak, 100000),
    best: num(p.best, 100000),
    history,
    totalSolved: num(p.totalSolved, 1000000),
    noHintSolves: num(p.noHintSolves, 1000000),
    fastestTime: p.fastestTime == null ? null : num(p.fastestTime, 86400000),
    submittedPuzzle: bool(p.submittedPuzzle),
    readHelp: bool(p.readHelp),
    unlocked: ids(p.unlocked, 60),
    archiveSolved: ids(p.archiveSolved, 2000),
  };
}

export function sanitizeTutorial(t, sections) {
  if (!isObj(t)) return null;
  const out = {};
  for (const s of sections) out[s.id] = Math.min(s.totalTasks, num(Number(t[s.id]), 100));
  return out;
}
