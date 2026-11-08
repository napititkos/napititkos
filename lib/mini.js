import { kv } from './kv';
import { todayStr } from './date';
import { N, slotsOf } from './miniGen';

// Mini keresztrejtvény (5x5) – tárolás és heti megjelenés.
//   mini:bank       { szó: [{ id, clue, at }] }   a kézzel írt kérdések (szavanként több változat)
//   mini:excluded   [szó]                         a bankból törölt / kizárt szavak (nem generálódnak)
//   mini:queue      [rejtvény]                    a beemelt, megjelenésre váró rejtvények
//   mini:published  [rejtvény + week]             a megjelentek (a legutolsó az aktuális)
// A titkosírásokból származó kérdések nem tárolódnak: a már megjelent (a mai előtti), egyszavas,
// legfeljebb 5 betűs megfejtésű titkosírásokból minden lekéréskor számoljuk őket, így a jövőbeli
// (és a mai) titkosírás megfejtése sosem kerülhet a mini rejtvénybe.
export const MINI_KEYS = { bank: 'mini:bank', excluded: 'mini:excluded', queue: 'mini:queue', published: 'mini:published' };
const HU = new Set(Array.from('aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz'));

export function normWord(w) {
  const s = String(w || '').trim().toLowerCase();
  const chars = Array.from(s);
  if (!chars.length || chars.length > N || !chars.every((c) => HU.has(c))) return null;
  return s;
}

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
  const own = [...(bank[word] || [])].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((x) => ({ clue: x.clue, src: 'kézi' }));
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
      published.push(next);
      await kv.set(MINI_KEYS.queue, queue);
      await kv.set(MINI_KEYS.published, published.slice(-520));
      return true;
    },
    { ttlMs: 10000, waitMs: 3000 }
  );
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
