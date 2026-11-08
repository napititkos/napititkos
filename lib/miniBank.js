// Mini keresztrejtvény: a szóbank és a kérdésbank áttekintése (admin). Tiszta logika, adatbázis
// nélkül: a végpont összegyűjti az adatokat, ez építi a sorokat, szűri, rendezi és lapozza őket.
//
// Egy sor egy szó: a kézzel írt kérdései (kérdésbank), a megjelent titkosírásokból származó
// kérdései, az, hogy benne van-e az alap szótárban, kizárt-e, és hányszor szerepelt rejtvényben.
export const PAGE_SIZE = 50;
export const FILTERS = ['clues', 'bank', 'titkos', 'noclue', 'excluded', 'all'];
export const SORTS = ['word', 'len', 'recent', 'used'];

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
      .map((x) => ({ clue: x.clue, src: 'kézi', at: x.at || null }));
    const tk = (titkos[word] || []).map((c) => ({ clue: c, src: 'titkosírás', at: null }));
    rows.push({
      word,
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

// A keresés a szóban és a kérdések szövegében is keres (kis- és nagybetűre érzéketlenül).
export function queryRows(rows, { q = '', filter = 'clues', sort = 'word', page = 1, pageSize = PAGE_SIZE } = {}) {
  const f = FILTERS.includes(filter) ? filter : 'clues';
  const s = SORTS.includes(sort) ? sort : 'word';
  const needle = String(q || '').trim().toLowerCase();
  let out = rows.filter(matchers[f]);
  if (needle) out = out.filter((r) => r.word.includes(needle) || r.clues.some((c) => c.clue.toLowerCase().includes(needle)));
  out = [...out].sort(sorters[s]);
  const pages = Math.max(1, Math.ceil(out.length / pageSize));
  const p = Math.min(pages, Math.max(1, Number.isInteger(page) ? page : 1));
  return { rows: out.slice((p - 1) * pageSize, p * pageSize), total: out.length, page: p, pages, filter: f, sort: s };
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
