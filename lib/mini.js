import { kv } from './kv';
import { todayStr } from './date';
import { N, HU, normWord, slotsOf } from './miniGrid';

export { normWord };

// Mini keresztrejtvény (5x5) – tárolás és heti megjelenés.
//   mini:bank       { szó: [{ id, clue, at }] }   a kézzel írt kérdések (szavanként több változat)
//   mini:excluded   [szó]                         a bankból törölt / kizárt szavak (nem generálódnak)
//   mini:queue      [rejtvény]                    a beemelt, megjelenésre váró rejtvények
//   mini:published  [rejtvény + week]             a megjelentek (a legutolsó az aktuális)
// A titkosírásokból származó kérdések nem tárolódnak: a már megjelent (a mai előtti), egyszavas,
// legfeljebb 5 betűs megfejtésű titkosírásokból minden lekéréskor számoljuk őket, így a jövőbeli
// (és a mai) titkosírás megfejtése sosem kerülhet a mini rejtvénybe.
export const MINI_KEYS = { bank: 'mini:bank', excluded: 'mini:excluded', queue: 'mini:queue', published: 'mini:published' };

export async function loadBank() {
  return (await kv.get(MINI_KEYS.bank)) || {};
}

// A titkosírásokból származó kérdések: szó -> [titkosírás szövege].
export async function titkosClues(now = new Date()) {
  const today = todayStr(now);
  const history = (await kv.get('rotation:history')) || [];
  const out = {};
  for (const h of history) {
    if (!h?.shownDate || h.shownDate >= today) continue;
    const w = normWord(h.answer);
    if (!w || !String(h.clue || '').trim()) continue;
    (out[w] = out[w] || []).push(String(h.clue).trim());
  }
  for (const w of Object.keys(out)) out[w] = [...new Set(out[w])];
  return out;
}

// Egy szó összes kérdésváltozata (előbb a kézzel írtak, a legújabb elöl, utána a titkosírások).
export function cluesFor(word, bank, titkos) {
  const own = [...(bank[word] || [])].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((x) => ({ clue: x.clue, src: x.src ? 'automatikus' : 'kézi' }));
  const tk = (titkos[word] || []).map((c) => ({ clue: c, src: 'titkosírás' }));
  return [...own, ...tk];
}

// A heti megjelenés: hétfő 00:00-kor (vasárnap éjfélkor, budapesti idő szerint) a várólista első
// eleme lesz az aktuális. A váltás az első lekéréskor történik meg (ahogy a napi titkosírásnál).
export function weekStart(now = new Date()) {
  const d = todayStr(now); // budapesti dátum
  const dt = new Date(`${d}T12:00:00Z`);
  const dow = (dt.getUTCDay() + 6) % 7; // hétfő = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

// A megjelenés csak a MINI_START (hétfői dátum, ÉÉÉÉ-HH-NN) környezeti változóban megadott héttől
// indul: addig a várólista csak gyűlik (a nyilvános oldal még nem él).
export function miniStart() {
  const s = process.env.MINI_START || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function rotateMini(now = new Date()) {
  const week = weekStart(now);
  const start = miniStart();
  if (!start || week < start) return false;
  return kv.withLock(
    'mini-rotation',
    async () => {
      const published = (await kv.get(MINI_KEYS.published)) || [];
      if (published.length && published[published.length - 1].week >= week) return false;
      const queue = (await kv.get(MINI_KEYS.queue)) || [];
      if (!queue.length) return false;
      const next = { ...queue.shift(), week, publishedAt: new Date(now).toISOString() };
      const firstEver = published.length === 0;
      published.push(next);
      await kv.set(MINI_KEYS.queue, queue);
      await kv.set(MINI_KEYS.published, published.slice(-520));
      // Értesítés mindenkinek (a harang alatt, gombbal): az első megjelenéskor a bejelentés,
      // utána minden héten az új rejtvényről.
      await announceMini(firstEver, now);
      return true;
    },
    { ttlMs: 10000, waitMs: 3000 }
  );
}

export const newMiniId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Az ellenőrzött rejtvény (validatePuzzle eredménye) felvétele a várólista végére. Az új vagy
// átírt kérdések új változatként a kérdésbankba kerülnek. Zár alatt fut; zárolás hiányában null.
export async function enqueuePuzzle(v) {
  return kv.withLock('mini-bank', async () => {
    const bank = await loadBank();
    const titkos = await titkosClues();
    for (const e of v.entries) {
      const known = cluesFor(e.word, bank, titkos).some((c) => c.clue === e.clue);
      if (!known) (bank[e.word] = bank[e.word] || []).push({ id: newMiniId(), clue: e.clue, at: new Date().toISOString() });
    }
    await kv.set(MINI_KEYS.bank, bank);
    // A beemelt rejtvény szavai nem lehetnek kizártak: aki egy korábban kizárt szót kézzel beír és
    // beemel, az szándékosan használja újra (ahogy az "Új szó felvitele" is feloldja a kizárást).
    const used = new Set(v.entries.map((e) => e.word));
    const excluded = (await kv.get(MINI_KEYS.excluded)) || [];
    const stillExcluded = excluded.filter((w) => !used.has(w));
    if (stillExcluded.length !== excluded.length) await kv.set(MINI_KEYS.excluded, stillExcluded);
    const queue = (await kv.get(MINI_KEYS.queue)) || [];
    const item = { id: newMiniId(), rows: v.rows, entries: v.entries, createdAt: new Date().toISOString() };
    queue.push(item);
    await kv.set(MINI_KEYS.queue, queue);
    return item;
  });
}

// Beemelés előtti ellenőrzés: a rács és a szavak egyezése, minden kérdés kitöltve.
export function validatePuzzle(p) {
  if (!p || !Array.isArray(p.rows) || p.rows.length !== N) return 'Hibás rács.';
  const rows = p.rows.map((r) => (Array.isArray(r) ? r.map(String) : []));
  if (rows.some((r) => r.length !== N || r.some((ch) => ch !== '#' && !HU.has(ch)))) return 'Hibás rács.';
  const grid = rows.map((r) => r.map((ch) => ch === '#'));
  const slots = slotsOf(grid);
  if (!Array.isArray(p.entries) || p.entries.length !== slots.length) return 'A szavak nem egyeznek a ráccsal.';
  const entries = [];
  for (const s of slots) {
    const e = p.entries.find((x) => x && x.dir === s.dir && x.row === s.row && x.col === s.col);
    const word = s.cells.map(([r, c]) => rows[r][c]).join('');
    if (!e || normWord(e.word) !== word) return 'A szavak nem egyeznek a ráccsal.';
    const clue = String(e.clue || '').trim().slice(0, 300);
    if (!clue) return 'Minden szóhoz írj kérdést!';
    entries.push({ dir: s.dir, row: s.row, col: s.col, len: s.cells.length, word, clue });
  }
  const words = entries.map((e) => e.word);
  if (new Set(words).size !== words.length) return 'Egy szó nem szerepelhet kétszer.';
  return { rows, entries };
}

// Élesítés: a felhasználói részek (oldal, gombok, ranglista, értesítések, posztok) csak a
// MINI_START hetétől látszanak, és csak ha már van megjelent rejtvény.
export function miniLive(now = new Date()) {
  const start = miniStart();
  return !!start && weekStart(now) >= start;
}

export const MINI_FIRST_NOTICE =
  'Új játékkal bővült az oldal! Heti gyakorisággal mini keresztrejtvényt fogunk feltölteni, az odavezető gombot az oldal alján, illetve itt az értesítésben találod majd.';
export const MINI_WEEKLY_NOTICE = 'Új heti mini keresztrejtvény érhető el!';

async function announceMini(firstEver, now = new Date()) {
  const list = (await kv.get('notifications:list')) || [];
  const item = {
    id: 'mini-' + Date.now().toString(36),
    text: firstEver ? MINI_FIRST_NOTICE : MINI_WEEKLY_NOTICE,
    ts: new Date(now).getTime(),
    href: '/mini',
    linkText: 'Irány a mini keresztrejtvény',
  };
  await kv.set('notifications:list', [item, ...list].slice(0, 100));
}

// Az aktuális (élő) heti rejtvény, vagy null. A váltást is elvégzi, ha esedékes.
export async function currentMini(now = new Date()) {
  if (!miniLive(now)) return null;
  await rotateMini(now);
  const published = (await kv.get(MINI_KEYS.published)) || [];
  const cur = published[published.length - 1];
  return cur && cur.week === weekStart(now) ? cur : null;
}

// Megfejtések és ranglista (hetente új):
//   mini:solves:<hét>   szereplő ("u:<uid>" | "d:<eszköz>") -> idő (ms), az első megfejtés
//   mini:lbnames:<hét>  szereplő -> megjelenített név (a ranglistához)
export const miniSolvesKey = (week) => `mini:solves:${week}`;
export const miniNamesKey = (week) => `mini:lbnames:${week}`;
export const miniReactionsKey = (week) => `mini:reactions:${week}`;

export async function miniStats(week, actor) {
  const all = (await kv.raw().hgetall(miniSolvesKey(week))) || {};
  const times = Object.values(all).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const mine = actor && all[actor] ? Number(all[actor]) : null;
  return { count: times.length, avg, mine };
}

export async function miniLeaderboard(week, limit = 50) {
  const r = kv.raw();
  const [all, names] = await Promise.all([r.hgetall(miniSolvesKey(week)), r.hgetall(miniNamesKey(week))]);
  return Object.entries(all || {})
    .filter(([k]) => names && names[k])
    .map(([k, v]) => ({ key: k, name: names[k], elapsed: Number(v) }))
    .filter((e) => Number.isFinite(e.elapsed))
    .sort((a, b) => a.elapsed - b.elapsed)
    .slice(0, limit)
    .map(({ name, elapsed }) => ({ name, elapsed }));
}

// A piszkozatba mentett kész szavak kérdései azonnal a bankba kerülnek (ha pontosan ez a kérdés
// még nincs meg a szóhoz). Az elavult (más szóhoz írt) kérdések kimaradnak.
export async function addEntriesToBank(entries) {
  const list = (entries || []).filter((e) => e && e.complete && !e.stale && normWord(e.word) && String(e.clue || '').trim());
  if (!list.length) return 0;
  const res = await kv.withLock('mini-bank', async () => {
    const bank = await loadBank();
    const titkos = await titkosClues();
    let added = 0;
    for (const e of list) {
      const word = normWord(e.word);
      const clue = String(e.clue).trim().slice(0, 300);
      if (cluesFor(word, bank, titkos).some((c) => c.clue === clue)) continue;
      (bank[word] = bank[word] || []).push({ id: newMiniId(), clue, at: new Date().toISOString() });
      added++;
    }
    if (added) await kv.set(MINI_KEYS.bank, bank);
    return added;
  });
  return res ? res.value : 0;
}
