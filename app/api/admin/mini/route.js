export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { importMiniSetsOnce } from '../../../../lib/miniImport';
import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';
import { completeMini, generateMini } from '../../../../lib/miniGen';
import { sanitizeDraftInput } from '../../../../lib/miniDraft';
import { MINI_KEYS, cluesFor, enqueuePuzzle, loadBank, miniStart, newMiniId, normWord, rotateMini, titkosClues, validatePuzzle, weekStart } from '../../../../lib/mini';

const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
const newId = newMiniId;

// GET: a várólista, a legutóbb megjelentek, az aktuális hét és a bank mérete.
export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  // Az automatikus készletek egyszeri beemelése a kérdésbankba (csak az első lekéréskor fut le).
  await importMiniSetsOnce();
  await rotateMini();
  const [queue, published, bank, excluded, titkos] = await Promise.all([
    kv.get(MINI_KEYS.queue),
    kv.get(MINI_KEYS.published),
    loadBank(),
    kv.get(MINI_KEYS.excluded),
    titkosClues(),
  ]);
  const pub = published || [];
  return Response.json(
    {
      queue: queue || [],
      published: pub.slice(-10).reverse(),
      current: pub[pub.length - 1] || null,
      week: weekStart(),
      // A várólista elemeinek tervezett hete: ha a mostani héten már megjelent mini, a következő
      // héttől, különben ettől a héttől sorban.
      scheduled: (() => {
        const ws = weekStart();
        const curDone = pub.length && pub[pub.length - 1].week >= ws;
        return (queue || []).map((_, i) => {
          const d = new Date(`${ws}T12:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 7 * (i + (curDone ? 1 : 0)));
          return d.toISOString().slice(0, 10);
        });
      })(),
      start: miniStart(),
      bankWords: Object.keys(bank).length,
      titkosWords: Object.keys(titkos).length,
      excluded: (excluded || []).length,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// POST { action, ... }:
//   generate                          új rács, a szavak kérdésváltozataival
//   publish { rows, entries }         beemelés a várólistára (minden kérdés kötelező); az új
//                                     vagy átírt kérdések új változatként a bankba kerülnek
//   deleteWord { word }               a szó kérdései törlődnek, és többé nem generálódik
//   addWord { word, clue }            új szó és kérdés a bankba
//   removeQueued { id }               rejtvény törlése a várólistáról
export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await readJson(req, 20000)) || {};
  const action = body.action;

  if (action === 'generate') {
    const [bank, titkos, excluded] = await Promise.all([loadBank(), titkosClues(), kv.get(MINI_KEYS.excluded)]);
    const bankWords = [...new Set([...Object.keys(bank), ...Object.keys(titkos)])];
    const got = generateMini({ bankWords, excluded: excluded || [], seconds: 8 });
    if (!got) return Response.json({ error: 'no-fill', message: 'Most nem sikerült rácsot generálni. Próbáld újra!' }, { status: 503 });
    const entries = got.entries.map((e) => ({ ...e, clues: cluesFor(e.word, bank, titkos) }));
    return Response.json({ puzzle: { rows: got.rows, entries, blacks: got.blacks } });
  }

  // A részben kitöltött tábla maradékának generálása (a fekete négyzetek és a beírt betűk adottak).
  if (action === 'complete') {
    const clean = sanitizeDraftInput({ rows: body.rows });
    if (typeof clean === 'string') return Response.json({ error: 'invalid', message: clean }, { status: 400 });
    const [bank, titkos, excluded] = await Promise.all([loadBank(), titkosClues(), kv.get(MINI_KEYS.excluded)]);
    const bankWords = [...new Set([...Object.keys(bank), ...Object.keys(titkos)])];
    const got = completeMini({ rows: clean.rows, bankWords, excluded: excluded || [], seconds: 8 });
    if (got.error === 'nothing-to-fill') return Response.json({ error: got.error, message: 'Nincs üres négyzet: a tábla már teljesen ki van töltve.' }, { status: 400 });
    if (got.error === 'duplicate') return Response.json({ error: got.error, message: 'Egy szó kétszer szerepel a beírt szavak között.' }, { status: 400 });
    if (got.error) {
      return Response.json(
        { error: got.error, message: 'A beírt betűkhöz és a fekete négyzetekhez nem találtam illő kitöltést. Próbáld újra (más szavak jöhetnek), vagy változtass a betűkön.' },
        { status: 422 }
      );
    }
    const entries = got.entries.map((e) => ({ ...e, clues: cluesFor(e.word, bank, titkos) }));
    return Response.json({ puzzle: { rows: got.rows, entries } });
  }

  if (action === 'publish') {
    const v = validatePuzzle(body);
    if (typeof v === 'string') return Response.json({ error: 'invalid', message: v }, { status: 400 });
    const result = await enqueuePuzzle(v);
    if (!result) return Response.json({ error: 'busy' }, { status: 503 });
    return Response.json({ ok: true, id: result.value.id });
  }

  if (action === 'deleteWord') {
    const word = normWord(body.word);
    if (!word) return Response.json({ error: 'invalid-word' }, { status: 400 });
    const r = await kv.withLock('mini-bank', async () => {
      const bank = await loadBank();
      delete bank[word];
      await kv.set(MINI_KEYS.bank, bank);
      const ex = new Set((await kv.get(MINI_KEYS.excluded)) || []);
      ex.add(word);
      await kv.set(MINI_KEYS.excluded, [...ex]);
      return true;
    });
    if (!r) return Response.json({ error: 'busy' }, { status: 503 });
    return Response.json({ ok: true });
  }

  if (action === 'addWord') {
    const word = normWord(body.word);
    const clue = String(body.clue || '').trim().slice(0, 300);
    if (!word) return Response.json({ error: 'invalid-word', message: 'A szó 1-5 betűs lehet, csak magyar betűkkel (szóköz, kötőjel nélkül).' }, { status: 400 });
    if (!clue) return Response.json({ error: 'missing-clue', message: 'Írj kérdést a szóhoz!' }, { status: 400 });
    const r = await kv.withLock('mini-bank', async () => {
      const bank = await loadBank();
      const list = (bank[word] = bank[word] || []);
      if (!list.some((x) => x.clue === clue)) list.push({ id: newId(), clue, at: new Date().toISOString() });
      await kv.set(MINI_KEYS.bank, bank);
      const ex = ((await kv.get(MINI_KEYS.excluded)) || []).filter((w) => w !== word);
      await kv.set(MINI_KEYS.excluded, ex);
      return list.length;
    });
    if (!r) return Response.json({ error: 'busy' }, { status: 503 });
    return Response.json({ ok: true, word, variants: r.value });
  }

  if (action === 'removeQueued') {
    const r = await kv.withLock('mini-bank', async () => {
      const queue = (await kv.get(MINI_KEYS.queue)) || [];
      await kv.set(MINI_KEYS.queue, queue.filter((x) => x.id !== body.id));
      return true;
    });
    if (!r) return Response.json({ error: 'busy' }, { status: 503 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown-action' }, { status: 400 });
}
