export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';
import { todayStr } from '../../../../lib/date';
import { SZO_KEYS, normSzo, szoForDate, szoLists } from '../../../../lib/szo';
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

export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  const l = await szoLists();
  const today = await szoForDate(todayStr());
  const added = new Set(l.added);
  const banned = new Set(l.banned);
  const status = (w) => (banned.has(w) ? 'tiltott' : added.has(w) ? 'hozzáadott' : REQ.has(w) ? 'kötelező' : BON.has(w) ? 'bónusz' : PROF.has(w) ? 'trágár' : 'nincs a listákon');
  let results = [];
  if (q) {
    const fq = fold(q);
    const pool = new Set([...l.added, ...l.banned, ...SZO_REQUIRED]);
    results = [...pool].filter((w) => fold(w).includes(fq)).sort((a, b) => a.length - b.length || a.localeCompare(b, 'hu')).slice(0, 60).map((w) => ({ word: w, status: status(w) }));
    const exact = normSzo(q);
    if (exact && !results.some((r) => r.word === exact)) results.unshift({ word: exact, status: status(exact) });
  }
  return Response.json(
    {
      today: today ? { date: today.date, grid: today.grid, word: today.word, required: today.required, bonus: today.bonus } : null,
      counts: { required: REQ.size, bonus: BON.size, added: l.added.length, banned: l.banned.length },
      banned: l.banned.slice().sort((a, b) => a.localeCompare(b, 'hu')),
      added: l.added.slice().sort((a, b) => a.localeCompare(b, 'hu')),
      results,
      reports: ((await kv.get('szo:reports')) || []).slice(0, 100),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await readJson(req, 2000)) || {};
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
    return 'ok';
  });
  if (!res) return Response.json({ error: 'busy' }, { status: 503 });
  if (res.value === 'unknown') return Response.json({ error: 'unknown-action' }, { status: 400 });
  return Response.json({ ok: true, word });
}
