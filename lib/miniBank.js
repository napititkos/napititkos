// Mini keresztrejtvény: a szóbank és a kérdésbank áttekintése (admin). Tiszta logika, adatbázis
// nélkül: a végpont összegyűjti az adatokat, ez építi a sorokat, szűri, rendezi és lapozza őket.
//
// Egy sor egy szó: a kézzel írt kérdései (kérdésbank), a megjelent titkosírásokból származó
// kérdései, az, hogy benne van-e az alap szótárban, kizárt-e, és hányszor szerepelt rejtvényben.
export const PAGE_SIZE = 50;
export const FILTERS = ['clues', 'bank', 'titkos', 'noclue', 'excluded', 'all'];
export const SORTS = ['word', 'len', 'recent', 'used', 'rel'];

const collator = new Intl.Collator('hu');

// bank: { szó: [{ id, clue, at }] }, titkos: { szó: [kérdés] }, usage: { szó: { count, lastWeek } }
export function buildRows({ dictWords = [], bank = {}, titkos = {}, excluded = [], usage = {} }) {
  const dict = new Set(dictWords);
  const ex = new Set(excluded);
  const words = new Set([...dict, ...Object.keys(bank), ...Object.keys(titkos), ...ex]);
  const rows = [];
  for (const word of words) {
    const own = [...(bank[word] || [])]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .map((x) => ({ id: x.id || null, clue: x.clue, src: 'kézi', at: x.at || null, editedAt: x.editedAt || null }));
    const tk = (titkos[word] || []).map((c) => ({ id: null, clue: c, src: 'titkosírás', at: null, editedAt: null }));
    rows.push({
      word,
      f: fold(word),
      len: Array.from(word).length,
      inDict: dict.has(word),
      excluded: ex.has(word),
      clues: [...own, ...tk],
      ownCount: own.length,
      lastAt: own[0]?.at || null,
      used: usage[word]?.count || 0,
      lastWeek: usage[word]?.lastWeek || null,
    });
  }
  return rows;
}

// Összesítő számok a fejléchez (a teljes bankról, a szűrőtől függetlenül).
export function bankStats(rows, excluded = []) {
  const withOwn = rows.filter((r) => r.ownCount > 0);
  return {
    words: rows.length,
    bankWords: withOwn.length,
    bankClues: withOwn.reduce((n, r) => n + r.ownCount, 0),
    titkosWords: rows.filter((r) => r.clues.length > r.ownCount).length,
    withClues: rows.filter((r) => r.clues.length > 0).length,
    noClue: rows.filter((r) => r.clues.length === 0).length,
    dictWords: rows.filter((r) => r.inDict).length,
    excluded: excluded.length,
  };
}

const matchers = {
  clues: (r) => r.clues.length > 0,
  bank: (r) => r.ownCount > 0,
  titkos: (r) => r.clues.length > r.ownCount,
  noclue: (r) => r.clues.length === 0,
  excluded: (r) => r.excluded,
  all: () => true,
};

const sorters = {
  word: (a, b) => collator.compare(a.word, b.word),
  len: (a, b) => a.len - b.len || collator.compare(a.word, b.word),
  // A legutóbb felvitt kérdéssel rendelkezők elöl, a kézi kérdés nélküliek a végén.
  recent: (a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')) || collator.compare(a.word, b.word),
  used: (a, b) => b.used - a.used || collator.compare(a.word, b.word),
};

// Ékezet- és kisbetű-független alak: a "ko" megtalálja a KŐ-t és a KÓ-t, a "lo" a LÓ-t. Az ékezetes
// betűk egy karakterek maradnak (á→a, ő→o), ezért a hossz és a betűpozíciók nem változnak.
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Kezdőbetű az ékezet nélküli alakban: az Á, É, Ö, Ő… szavak az A, E, O… betű alatt vannak,
// ahogy az ábécé szerinti rendezésben is egymás mellett állnak.
export const firstLetter = (word) => fold(word).charAt(0);
const cleanLetter = (v) => {
  const l = firstLetter(v);
  return /^[a-z]$/.test(l) ? l : '';
};
export const MAX_LEN = 5;
const MAX_PATTERN = 20;

// A keresőmező tartalma háromféle lehet:
//   - üres: nincs keresés;
//   - minta: csak betűk, ? és * (legalább az egyik jel van benne), pl. "a??a" vagy "k*ő". A ? pontosan
//     egy betűt, a * tetszőleges számú (akár nulla) betűt helyettesít, és a TELJES szóra illeszkedik.
//     Mintára csak a szavak között keres, a kérdések szövegében nem (ott a ? írásjel is lehet);
//   - szöveg: bármi más; a szóban és a kérdések szövegében is keres, az ékezeteket figyelmen kívül hagyva.
export function parseNeedle(q) {
  const text = fold(String(q ?? '').trim());
  if (!text) return { kind: 'none', text: '' };
  if (/^[a-z?*]+$/.test(text) && /[?*]/.test(text) && text.length <= MAX_PATTERN) {
    const src = text.replace(/\*+/g, '*').replace(/\?/g, '.').replace(/\*/g, '.*');
    return { kind: 'pattern', text, re: new RegExp('^' + src + '$') };
  }
  return { kind: 'text', text };
}

// A keresés találati sorrendje (szövegkeresésnél): pontos egyezés, szó eleje, szó belseje (előbb a
// korábbi helyen), végül az, amelyiknél csak a kérdés tartalmazza.
function relevance(word, text) {
  if (word === text) return 0;
  const i = word.indexOf(text);
  if (i === 0) return 1;
  if (i > 0) return 1 + i;
  return 99;
}

// A keresés (lásd parseNeedle) mellett a hossz (len) és a kezdőbetű (letter) szűkít. A válasz a gombokhoz
// mellé adja, hogy a jelenlegi szűrő és
// keresés mellett melyik hosszból hány szó van (lenCounts, a kezdőbetűt is figyelembe véve), illetve
// melyik kezdőbetűből hány (letters, a hosszt is figyelembe véve): mindkettő a saját választását
// nem veszi figyelembe, így látszik, mi lenne egy másik gombbal.
// A 'rel' rendezés a találat jósága szerint rendez (szövegkeresésnél), egyébként ábécé szerint.
export function queryRows(rows, { q = '', filter = 'clues', sort = 'word', page = 1, pageSize = PAGE_SIZE, len = 0, letter = '' } = {}) {
  const f = FILTERS.includes(filter) ? filter : 'clues';
  const s = SORTS.includes(sort) ? sort : 'word';
  const nd = parseNeedle(q);
  const L = Number.isInteger(len) && len >= 1 && len <= MAX_LEN ? len : 0;
  const ch = cleanLetter(letter);
  const fw = (r) => r.f ?? fold(r.word);
  const first = (r) => fw(r).charAt(0);
  let base = rows.filter(matchers[f]);
  if (nd.kind === 'pattern') base = base.filter((r) => nd.re.test(fw(r)));
  else if (nd.kind === 'text') base = base.filter((r) => fw(r).includes(nd.text) || r.clues.some((c) => fold(c.clue).includes(nd.text)));

  const lenCounts = {};
  for (const r of ch ? base.filter((x) => first(x) === ch) : base) lenCounts[r.len] = (lenCounts[r.len] || 0) + 1;
  const letterMap = new Map();
  for (const r of L ? base.filter((x) => x.len === L) : base) letterMap.set(first(r), (letterMap.get(first(r)) || 0) + 1);
  const letters = [...letterMap].sort((a, b) => collator.compare(a[0], b[0]));

  let out = base;
  if (L) out = out.filter((r) => r.len === L);
  if (ch) out = out.filter((r) => first(r) === ch);
  if (s === 'rel' && nd.kind === 'text') {
    const rank = new Map(out.map((r) => [r, relevance(fw(r), nd.text)]));
    out = [...out].sort((a, b) => rank.get(a) - rank.get(b) || a.len - b.len || collator.compare(a.word, b.word));
  } else {
    out = [...out].sort(s === 'rel' ? sorters.word : sorters[s]);
  }
  const pages = Math.max(1, Math.ceil(out.length / pageSize));
  const p = Math.min(pages, Math.max(1, Number.isInteger(page) ? page : 1));
  return { rows: out.slice((p - 1) * pageSize, p * pageSize), total: out.length, page: p, pages, pageSize, filter: f, sort: s, len: L, letter: ch, lenCounts, letters };
}

// A rejtvényekben (várólista és megjelentek) szereplő szavak: hányszor, és melyik héten utoljára.
export function usageOf(puzzles = []) {
  const usage = {};
  for (const p of puzzles) {
    for (const e of p?.entries || []) {
      const w = e?.word;
      if (!w) continue;
      const u = (usage[w] = usage[w] || { count: 0, lastWeek: null });
      u.count++;
      if (p.week && (!u.lastWeek || p.week > u.lastWeek)) u.lastWeek = p.week;
    }
  }
  return usage;
}

// ---------------------------------------------------------------------------------------------
// A kézi kérdésváltozatok módosítása. Tiszta függvények: a kapott bankot nem módosítják, hanem az
// új állapotot adják vissza ({ bank }), vagy hibát ({ error }). A végpont zár alatt hívja őket.
export const MAX_CLUE = 300;
export const cleanClue = (v) => String(v ?? '').trim().slice(0, MAX_CLUE);

// Új kérdésváltozat egy szóhoz (egy szóhoz tetszőleges számú, különböző kérdés tartozhat).
export function addVariant(bank, word, clue, { id, at }) {
  const text = cleanClue(clue);
  if (!text) return { error: 'missing-clue' };
  const list = bank[word] || [];
  if (list.some((x) => x.clue === text)) return { error: 'duplicate' };
  return { bank: { ...bank, [word]: [...list, { id, clue: text, at }] } };
}

// Egy változat átírása. A létrehozás ideje (és így a sorrend) nem változik, csak a szerkesztésé jelenik meg.
export function editVariant(bank, word, id, clue, { at }) {
  const list = bank[word];
  const i = list ? list.findIndex((x) => x.id === id) : -1;
  if (i < 0) return { error: 'not-found' };
  const text = cleanClue(clue);
  if (!text) return { error: 'missing-clue' };
  if (list[i].clue === text) return { bank };
  if (list.some((x, k) => k !== i && x.clue === text)) return { error: 'duplicate' };
  return { bank: { ...bank, [word]: list.map((x, k) => (k === i ? { ...x, clue: text, editedAt: at } : x)) } };
}

// Egy változat törlése; ha ez volt az utolsó, a szó kikerül a kézi kérdéses szavak közül.
export function deleteVariant(bank, word, id) {
  const list = bank[word];
  if (!list || !list.some((x) => x.id === id)) return { error: 'not-found' };
  const next = list.filter((x) => x.id !== id);
  const out = { ...bank };
  if (next.length) out[word] = next;
  else delete out[word];
  return { bank: out };
}
