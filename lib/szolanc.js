// Szólánc (prototípus): a kezdőszóból a célszóba kell eljutni úgy, hogy minden lépésben pontosan
// egy betű változik (a helye marad), és minden közbülső alak létező szó (ragozott alak is lehet).
// A napi feladvány a dátumból mindig ugyanaz (a szerver is ugyanígy állítja elő az ellenőrzéshez).
// Egyetlen legrövidebb megoldás csak a legnehezebb (5/5) napokon lehet.
import { SZOLANC_COMMON, SZOLANC_COMMON3, SZOLANC_WORDS, SZOLANC_WORDS3 } from './szolancData.js';

export const SZOLANC_START = '2026-11-23';
export const SZOLANC_LEN = 4;
export const SZOLANC_LEVELS = [1, 1, 2, 2, 3, 4, 5]; // hétfő ... vasárnap
// Nehézség (1/5–5/5): a legrövidebb út hossza (lépések) és a legrövidebb utak száma (alternatív
// utak; több út = könnyebb). Egyetlen jó út csak 5/5-nél lehet, a többinél legalább 2 van.
export const LEVEL_RULE = { 1: { d: 4, lo: 4, hi: 5 }, 2: { d: 4, lo: 2, hi: 3 }, 3: { d: 5, lo: 3, hi: 5 }, 4: { d: 5, lo: 2, hi: 2 }, 5: { d: 5, lo: 1, hi: 1 } };

// Két gráf: a teljes szókincs (ezekkel lehet lépni) és a tiszta szavaké (ezekből lesz a feladvány,
// és ezeken számoljuk a megoldási utakat, hogy a „hivatalos” utak csak ismert szavakon vezessenek).
function makeGraph(words) {
  const index = new Map(words.map((w, i) => [w, i]));
  let A = null;
  const adj = () => {
    if (A) return A;
    const buckets = new Map();
    words.forEach((w, i) => {
      for (let p = 0; p < w.length; p++) {
        const k = `${p}:${w.slice(0, p)}_${w.slice(p + 1)}`;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(i);
      }
    });
    A = words.map(() => []);
    for (const g of buckets.values()) for (const a of g) for (const b of g) if (a !== b) A[a].push(b);
    return A;
  };
  return { words, index, adj };
}
// Szóhosszonként egy-egy gráfpár. A 3 és 4 betűs a böngészőben is elérhető; az 5 betűst (nagy lista)
// csak a szerver tölti be (lib/szolancServer.js → registerSzolancLength).
const GRAPHS = {};
export function registerSzolancLength(len, words, common) {
  if (GRAPHS[len]) return;
  const full = makeGraph(words);
  GRAPHS[len] = { full, clean: makeGraph(common.filter((w) => full.index.has(w))) };
}
registerSzolancLength(3, SZOLANC_WORDS3, SZOLANC_COMMON3);
registerSzolancLength(4, SZOLANC_WORDS, SZOLANC_COMMON);
export const hasSzolancLength = (len) => !!GRAPHS[len];
const FULLof = (w) => GRAPHS[[...String(w)].length]?.full;
const CLEANof = (w) => GRAPHS[[...String(w)].length]?.clean;
const FULL = GRAPHS[4].full;
const CLEAN = GRAPHS[4].clean;

export const isWord = (w) => !!FULLof(w)?.index.has(w);
export const oneLetterApart = (a, b) => a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1;

// Szélességi keresés a kezdőszóból: távolság és a legrövidebb utak száma minden szóhoz.
export function ladderFrom(start, maxD = 8, G = FULLof(start)) {
  if (!G) return { dist: new Int16Array(0), cnt: new Float64Array(0) };
  const A = G.adj();
  const n = G.words.length;
  const dist = new Int16Array(n).fill(-1);
  const cnt = new Float64Array(n);
  const s = G.index.get(start);
  if (s === undefined) return { dist, cnt };
  dist[s] = 0;
  cnt[s] = 1;
  let q = [s];
  for (let d = 1; d <= maxD && q.length; d++) {
    const nq = [];
    for (const u of q)
      for (const v of A[u]) {
        if (dist[v] < 0) {
          dist[v] = d;
          cnt[v] = cnt[u];
          nq.push(v);
        } else if (dist[v] === d) cnt[v] += cnt[u];
      }
    q = nq;
  }
  return { dist, cnt };
}

// Legrövidebb út hossza és a legrövidebb utak száma két szó között.
// d: a teljes szókincsen; paths: a tiszta szavakon át vezető legrövidebb utak száma.
export function ladderInfo(a, b) {
  const F = FULLof(a);
  const C = CLEANof(a);
  if (!F || [...a].length !== [...b].length) return { d: -1, paths: 0 };
  const { dist } = ladderFrom(a, 8, F);
  const j = F.index.get(b);
  if (j === undefined || dist[j] < 0) return { d: -1, paths: 0 };
  const c = ladderFrom(a, 8, C);
  const k = C.index.get(b);
  return { d: dist[j], paths: k !== undefined && c.dist[k] === dist[j] ? c.cnt[k] : 0 };
}

// Egy legrövidebb út (a Kisokoshoz és a megfejtés utáni bemutatáshoz).
// Egy legrövidebb út, lehetőleg tiszta szavakon át (a Kisokoshoz és a megfejtés utáni bemutatáshoz).
export function shortestPath(a, b) {
  for (const G of [CLEANof(a), FULLof(a)].filter(Boolean)) {
    const { dist } = ladderFrom(b, 8, G);
    const A = G.adj();
    let u = G.index.get(a);
    if (u === undefined || dist[u] < 0) continue;
    const out = [G.words[u]];
    while (dist[u] > 0) {
      u = A[u].find((v) => dist[v] === dist[u] - 1);
      out.push(G.words[u]);
    }
    return out;
  }
  return [];
}

function rng(seedStr) {
  let h = 2166136261;
  for (const ch of String(seedStr)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function szolancLevel(date) {
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  return SZOLANC_LEVELS[Number.isFinite(dow) ? dow : 0];
}
export const szolancNumber = (date) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${SZOLANC_START}T12:00:00Z`)) / 86400000) + 1;

// A nap feladványa: kezdő- és célszó a gyakori szavak közül, a nehézségnek megfelelő távolsággal és
// útszámmal (5/5 kivételével mindig legalább 2 legrövidebb út).
export function generateSzolanc(date, { level } = {}) {
  const lv = level || (/^\d{4}-\d{2}-\d{2}$/.test(date) ? szolancLevel(date) : 1);
  const rule = LEVEL_RULE[lv];
  const rnd = rng(`szolanc-${date}`);
  const order = CLEAN.words.map((w) => [rnd(), w]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  for (const start of order.slice(0, 600)) {
    const c = ladderFrom(start, rule.d, CLEAN);
    const f = ladderFrom(start, rule.d, FULL);
    const ends = [];
    for (let j = 0; j < CLEAN.words.length; j++) {
      if (c.dist[j] !== rule.d || c.cnt[j] < rule.lo || c.cnt[j] > rule.hi) continue;
      // A teljes szókincsben se legyen rövidebb út (ragozott alakon át sem).
      if (f.dist[FULL.index.get(CLEAN.words[j])] !== rule.d) continue;
      ends.push(j);
    }
    if (ends.length) {
      const j = ends[Math.floor(rnd() * ends.length)];
      return { date, level: lv, number: szolancNumber(date), start, end: CLEAN.words[j], par: rule.d, paths: c.cnt[j] };
    }
  }
  return null;
}

// Egy beküldött lánc ellenőrzése: a nap kezdőszavával kezdődik, a célszóval végződik, minden
// lépés egy betűs csere létező szóra (egy korábbi szó újra szerepelhet: így lehet visszalépni).
// Visszaad: a lépések száma vagy -1.
export function checkChain(p, chain) {
  if (!p || !Array.isArray(chain) || chain.length < 2 || chain.length > 60) return -1;
  if (chain[0] !== p.start || chain[chain.length - 1] !== p.end) return -1;
  for (let i = 1; i < chain.length; i++) if (typeof chain[i] !== 'string' || !isWord(chain[i]) || !oneLetterApart(chain[i - 1], chain[i])) return -1;
  return chain.length - 1;
}
export const szolancLbKey = (d) => `szolanc:lb:${d}`;
export const szolancLbNamesKey = (d) => `szolanc:lbn:${d}`;
export const szolancResKey = (d) => `szolanc:res:${d}`;
export const SZOLANC_LB_TTL = 3 * 86400;

// Az összes legrövidebb út a tiszta szavakon át (legfeljebb max darab; az admin felülethez).
export function allShortestPaths(a, b, max = 12) {
  const C = CLEANof(a);
  if (!C) return [];
  const { dist } = ladderFrom(b, 8, C);
  const A = C.adj();
  const s = C.index.get(a);
  if (s === undefined || dist[s] < 0) return [];
  const out = [];
  const walk = (u, acc) => {
    if (out.length >= max) return;
    if (dist[u] === 0) return out.push(acc.map((i) => C.words[i]));
    for (const v of A[u]) if (dist[v] === dist[u] - 1) walk(v, [...acc, v]);
  };
  walk(s, [s]);
  return out;
}

// 5 betűs szavaknál a legnehezebb (5/5) szinten nem kell, hogy csak egyetlen út legyen (1–3 út):
// a hosszabb szavakkal eleve nehezebb.
export const ruleFor = (level, len = 4) => (len === 5 && Number(level) === 5 ? { d: 5, lo: 1, hi: 3 } : LEVEL_RULE[level] || LEVEL_RULE[1]);
export const fitsLevel = (par, paths, len, level) => {
  const r = ruleFor(level, len);
  return par === r.d && paths >= r.lo && paths <= r.hi;
};

// Egy feladvány nehézsége a lépésszám és a legrövidebb utak száma alapján (0: nem illik egyikbe sem).
export function levelOf(par, paths) {
  for (const [lv, r] of Object.entries(LEVEL_RULE)) if (r.d === par && paths >= r.lo && paths <= r.hi) return Number(lv);
  return 0;
}

// Véletlen javaslatok az admin felülethez egy adott nehézségre (count darab, az exclude
// kezdő-cél párokat kihagyva). Minden javaslatnál ott a legrövidebb utak listája is.
// Melyik szóhosszakból javasoljon az admin felület az adott nehézséghez: a legkönnyebbhez 3 betűst is,
// a 3/5–5/5-höz 5 betűst is (ha a szerver betöltötte).
export const SUGGEST_LENGTHS = { 1: [3, 4], 2: [4], 3: [4, 5], 4: [4, 5], 5: [4, 5] };

export function suggestSzolanc(level, count = 10, exclude = [], seed = String(Date.now())) {
  const rnd = rng(`szolanc-admin-${seed}`);
  const skip = new Set(exclude);
  const lens = (SUGGEST_LENGTHS[level] || [4]).filter((n) => GRAPHS[n]);
  // Szóhosszonként a starthelyek véletlen sorrendben; felváltva veszünk belőlük (így vegyes a lista).
  const queues = lens.map((n) => {
    const G = GRAPHS[n];
    return { G, order: G.clean.words.map((w) => [rnd(), w]).sort((x, y) => x[0] - y[0]).map((x) => x[1]), i: 0 };
  });
  const out = [];
  // Szóhosszonként egyenlő arányban (pl. 5 + 5); ha valamelyikből nem jön ki elég, a többi pótolja.
  const quota = Math.ceil(count / Math.max(1, queues.length));
  queues.forEach((q) => (q.n = 0));
  let guard = 0;
  while (out.length < count && queues.some((q) => q.i < q.order.length) && guard++ < 40000) {
    const open = queues.filter((q) => q.i < q.order.length && q.n < quota);
    const pool = open.length ? open : queues.filter((q) => q.i < q.order.length);
    const q = pool[guard % pool.length];
    const start = q.order[q.i++];
    const rule = ruleFor(level, [...start].length);
    const c = ladderFrom(start, rule.d, q.G.clean);
    const f = ladderFrom(start, rule.d, q.G.full);
    const ends = [];
    for (let j = 0; j < q.G.clean.words.length; j++) {
      if (c.dist[j] !== rule.d || c.cnt[j] < rule.lo || c.cnt[j] > rule.hi) continue;
      if (f.dist[q.G.full.index.get(q.G.clean.words[j])] !== rule.d) continue;
      const end = q.G.clean.words[j];
      if (skip.has(`${start}>${end}`) || skip.has(`${end}>${start}`)) continue;
      ends.push(j);
    }
    if (!ends.length) continue;
    const j = ends[Math.floor(rnd() * ends.length)];
    const end = q.G.clean.words[j];
    skip.add(`${start}>${end}`);
    q.n++;
    out.push({ start, end, level, len: [...start].length, par: rule.d, paths: c.cnt[j], allPaths: allShortestPaths(start, end) });
  }
  return out;
}
