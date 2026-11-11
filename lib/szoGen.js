// Napi szókereső – a rácsgenerátor és a megoldó (tiszta függvények, egységtesztelhető).
import { SZO_BONUS, SZO_PROFANE, SZO_REQUIRED } from './szoData.js';

const HU = new Set(Array.from('aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz'));

export function normSzo(w) {
  const s = String(w || '').trim().toLowerCase();
  const a = Array.from(s);
  return a.length >= 3 && a.length <= 9 && a.every((c) => HU.has(c)) ? s : null;
}

// Szomszédság a 3x3-as rácson (átlósan is).
export const NEIGHBORS = Array.from({ length: 9 }, (_, i) =>
  Array.from({ length: 9 }, (_, j) => j).filter((j) => j !== i && Math.abs(Math.floor(j / 3) - Math.floor(i / 3)) <= 1 && Math.abs((j % 3) - (i % 3)) <= 1)
);

// Az összes Hamilton-út (784 db): a napi szó ezek valamelyikén kerül a rácsba.
let HAM = null;
function hamiltonPaths() {
  if (HAM) return HAM;
  HAM = [];
  const rec = (p) => {
    if (p.length === 9) return HAM.push(p.slice());
    for (const j of NEIGHBORS[p[p.length - 1]]) if (!p.includes(j)) { p.push(j); rec(p); p.pop(); }
  };
  for (let s = 0; s < 9; s++) rec([s]);
  return HAM;
}

// A szótárak (modulszinten egyszer felépítve).
let DICT = null;
function dict() {
  if (DICT) return DICT;
  const profane = new Set(SZO_PROFANE);
  const required = new Set(SZO_REQUIRED.filter((w) => !profane.has(w)));
  const bonus = new Set(SZO_BONUS.filter((w) => !profane.has(w) && !required.has(w)));
  const prefixes = new Set();
  for (const set of [required, bonus]) for (const w of set) { const a = Array.from(w); for (let i = 1; i <= a.length; i++) prefixes.add(a.slice(0, i).join('')); }
  DICT = { required, bonus, prefixes, profane };
  return DICT;
}

// A rácsban kirakható szavak, az első megtalált útjukkal.
export function solveGrid(grid, { added = [], banned = [] } = {}) {
  const D = dict();
  const ban = new Set(banned);
  const add = new Set(added.filter((w) => !ban.has(w)));
  const extraPref = new Set();
  for (const w of add) { const a = Array.from(w); for (let i = 1; i <= a.length; i++) extraPref.add(a.slice(0, i).join('')); }
  const found = new Map();
  const dfs = (i, used, cur, path) => {
    const s = cur + grid[i];
    if (!D.prefixes.has(s) && !extraPref.has(s)) return;
    const p = [...path, i];
    if (p.length >= 3 && !found.has(s) && !ban.has(s) && (D.required.has(s) || D.bonus.has(s) || add.has(s))) found.set(s, p);
    for (const j of NEIGHBORS[i]) if (!used.has(j)) { used.add(j); dfs(j, used, s, p); used.delete(j); }
  };
  for (let i = 0; i < 9; i++) dfs(i, new Set([i]), '', []);
  const required = [];
  const bonus = [];
  const paths = {};
  for (const [w, p] of found) {
    paths[w] = p;
    if (D.required.has(w) || add.has(w)) required.push(w);
    else bonus.push(w);
  }
  const order = (a, b) => Array.from(a).length - Array.from(b).length || a.localeCompare(b, 'hu');
  return { required: required.sort(order), bonus: bonus.sort(order), paths };
}

function rng(seed) {
  let x = 0;
  for (const ch of String(seed)) x = (Math.imul(x ^ ch.codePointAt(0), 2654435761) >>> 0) || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

// Egy nap rácsa: véletlen (a dátumból magolt) 9 betűs napi szavak, mindegyikhez több elrendezés;
// a legtöbb kötelező szót adó változat nyer (legalább MIN_REQUIRED-et keresünk, időkorláttal).
// A hét napja szerinti nehézség: hétfőn a legkevesebb, vasárnap a legtöbb kötelező szó. A generátor
// azt az elrendezést választja, amelyiknek a kötelező szavainak száma a nap célértékéhez a
// legközelebb esik (ez az admin „Új kérése” újragenerálásánál is így van).
export const SZO_DAY_TARGET = [12, 16, 20, 24, 28, 32, 36]; // hétfő ... vasárnap
const MIN_REQUIRED = 8;
export function szoDayTarget(date) {
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return SZO_DAY_TARGET[Number.isFinite(dow) ? dow : 3];
}

// salt: újragenerálásnál (admin „Új kérése”) más véletlen sorozat ugyanarra a napra.
export function generateSzo(date, { used = [], added = [], banned = [], seconds = 6, salt = '' } = {}) {
  const D = dict();
  const rnd = rng(`szo-${date}${salt ? `-${salt}` : ''}`);
  const ban = new Set(banned);
  const usedSet = new Set(used);
  const nine = [...D.required, ...added].filter((w) => Array.from(w).length === 9 && !usedSet.has(w) && !ban.has(w));
  const paths = hamiltonPaths();
  const target = /^\d{4}-\d{2}-\d{2}$/.test(date) ? szoDayTarget(date) : 20;
  const deadline = Date.now() + seconds * 1000;
  let best = null;
  const score = (n) => (n < MIN_REQUIRED ? 1000 : Math.abs(n - target));
  for (let t = 0; t < 400 && Date.now() < deadline; t++) {
    const word = nine[Math.floor(rnd() * nine.length)];
    const letters = Array.from(word);
    for (let k = 0; k < 30; k++) {
      const path = paths[Math.floor(rnd() * paths.length)];
      const grid = new Array(9);
      path.forEach((cell, i) => (grid[cell] = letters[i]));
      const s = solveGrid(grid, { added, banned });
      if (!best || score(s.required.length) < score(best.required.length)) best = { date, grid, word, path, ...s };
    }
    if (best && score(best.required.length) <= 1) break;
  }
  return best;
}

