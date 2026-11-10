export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';
import { todayStr, isValidDateStr } from '../../../../lib/date';

function addDays(d, n) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
import { SZO_KEYS, normSzo, regenerateSzo, szoForDate, szoLists, szoPuzzleKey } from '../../../../lib/szo';
import { SZO_BONUS, SZO_PROFANE, SZO_REQUIRED } from '../../../../lib/szoData';

// Admin: napi szókereső. GET ?q=<keresés>: a mai rács (élesítés előtt is), a listák mérete, és a
// keresés találatai állapottal (kötelező / bónusz / hozzáadott / tiltott / trágár).
// POST { action: 'add' | 'ban' | 'unban', word }: hozzáadás a kötelezőkhöz, tiltás (átkerül a
// tiltott listába), tiltás feloldása. A változások a következő generált napoktól érvényesek.
const REQ = new Set(SZO_REQUIRED);
const BON = new Set(SZO_BONUS);
const PROF = new Set(SZO_PROFANE);
const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// GET paraméterek (a mini szóbankjához hasonlóan, szerveroldali szűréssel és lapozással):
//   q: keresés (ékezet nélkül is; * = bármely betűk, ? = egy betű), filter: all|required|bonus|added|banned,
//   len: 3..9, letter: kezdőbetű (ékezet nélkül), sort: abc|len, page: 1..
const PAGE = 50;
function matcher(q) {
  if (!q) return () => true;
  const fq = fold(q);
  if (/[*?]/.test(fq)) {
    const re = new RegExp('^' + fq.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return (w) => re.test(fold(w));
  }
  return (w) => fold(w).includes(fq);
}

export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') || '').trim().toLowerCase();
  const filter = ['all', 'required', 'bonus', 'added', 'banned'].includes(sp.get('filter')) ? sp.get('filter') : 'all';
  const len = Number(sp.get('len')) || 0;
  const letter = fold(sp.get('letter') || '').slice(0, 1);
  const sort = sp.get('sort') === 'len' ? 'len' : 'abc';
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const l = await szoLists();
  const today = await szoForDate(todayStr());
  // A következő 7 nap tervezett rácsai (most generálódnak, ha még nincsenek; a játékosok csak az
  // adott napon kapják meg).
  const upcoming = [];
  for (let i = 1; i <= 7; i++) {
    const d = addDays(todayStr(), i);
    const p = await szoForDate(d);
    if (p) upcoming.push({ date: p.date, grid: p.grid, word: p.word, required: p.required, bonus: p.bonus, paths: p.paths });
  }
  const added = new Set(l.added);
  const banned = new Set(l.banned);
  const status = (w) => (banned.has(w) ? 'tiltott' : added.has(w) ? 'hozzáadott' : REQ.has(w) ? 'kötelező' : BON.has(w) ? 'bónusz' : PROF.has(w) ? 'trágár' : 'nincs a listákon');
  const pool =
    filter === 'required' ? [...SZO_REQUIRED, ...l.added] : filter === 'bonus' ? SZO_BONUS : filter === 'added' ? l.added : filter === 'banned' ? l.banned : [...SZO_REQUIRED, ...SZO_BONUS, ...l.added, ...l.banned];
  const m = matcher(q);
  let rows = [...new Set(pool)].filter((w) => (!len || Array.from(w).length === len) && (!letter || fold(w).startsWith(letter)) && m(w));
  if (filter === 'required' || filter === 'bonus') rows = rows.filter((w) => !banned.has(w));
  const base = sort === 'len' ? (a, b) => Array.from(a).length - Array.from(b).length || a.localeCompare(b, 'hu') : (a, b) => a.localeCompare(b, 'hu');
  // Keresésnél a pontos (ékezet nélkül is egyező) találat, utána a vele kezdődők kerülnek előre.
  const fq = fold(q);
  const rank = (w) => (!q || /[*?]/.test(q) ? 0 : w === q ? 0 : fold(w) === fq ? 1 : fold(w).startsWith(fq) ? 2 : 3);
  rows.sort((a, b) => rank(a) - rank(b) || base(a, b));
  const total = rows.length;
  const exact = normSzo(q);
  const items = rows.slice((page - 1) * PAGE, page * PAGE).map((w) => ({ word: w, status: status(w) }));
  if (page === 1 && exact && !/[*?]/.test(q) && !rows.includes(exact)) items.unshift({ word: exact, status: status(exact) });
  return Response.json(
    {
      today: today
        ? { date: today.date, grid: today.grid, word: today.word, required: today.required, bonus: today.bonus, paths: today.paths }
        : null,
      upcoming,
      counts: { required: REQ.size, bonus: BON.size, added: l.added.length, banned: l.banned.length },
      banned: l.banned.slice().sort((a, b) => a.localeCompare(b, 'hu')),
      added: l.added.slice().sort((a, b) => a.localeCompare(b, 'hu')),
      results: items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE)),
      reports: ((await kv.get('szo:reports')) || []).slice(0, 100),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await readJson(req, 2000)) || {};
  // Egy következő napi rács cseréje („Új kérése”); a mai és a korábbiak nem cserélhetők.
  if (body.action === 'regenerate') {
    const d = String(body.date || '');
    if (!isValidDateStr(d) || d <= todayStr() || d > addDays(todayStr(), 7)) return Response.json({ error: 'invalid-date', message: 'Csak a következő 7 nap rácsa cserélhető.' }, { status: 400 });
    const p = await regenerateSzo(d);
    if (!p) return Response.json({ error: 'busy', message: 'Most nem sikerült új rácsot generálni, próbáld újra.' }, { status: 503 });
    return Response.json({ ok: true, date: d, word: p.word });
  }
  if (body.action === 'dismissReport') {
    await kv.withLock('szo-reports', async () => {
      const list = (await kv.get('szo:reports')) || [];
      await kv.set('szo:reports', list.filter((x) => x.id !== body.id));
      return true;
    });
    return Response.json({ ok: true });
  }
  const word = normSzo(body.word);
  if (!word) return Response.json({ error: 'invalid-word', message: 'A szó 3-9 betűs lehet, csak magyar betűkkel.' }, { status: 400 });
  const res = await kv.withLock('szo-lists', async () => {
    const l = await szoLists();
    let added = l.added.filter((w) => w !== word);
    let banned = l.banned.filter((w) => w !== word);
    if (body.action === 'add') added = [...added, word];
    else if (body.action === 'ban') banned = [...banned, word];
    else if (body.action !== 'unban') return 'unknown';
    await kv.set(SZO_KEYS.added, added);
    await kv.set(SZO_KEYS.banned, banned);
    // A tiltott szó a mai és a következő 7 nap már legenerált rácsából is azonnal kikerül
    // (a kötelezők és a bónuszok közül is).
    if (body.action === 'ban') {
      for (let i = 0; i <= 7; i++) {
        const key = szoPuzzleKey(addDays(todayStr(), i));
        const p = await kv.get(key);
        if (!p || !(p.required.includes(word) || p.bonus.includes(word)) || p.word === word) continue;
        const paths = { ...p.paths };
        delete paths[word];
        await kv.set(key, { ...p, required: p.required.filter((w) => w !== word), bonus: p.bonus.filter((w) => w !== word), paths });
      }
    }
    return 'ok';
  });
  if (!res) return Response.json({ error: 'busy' }, { status: 503 });
  if (res.value === 'unknown') return Response.json({ error: 'unknown-action' }, { status: 400 });
  return Response.json({ ok: true, word });
}
