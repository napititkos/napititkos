export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { kv } from '../../../../lib/kv';
import { isAdminRequest } from '../../../../lib/adminAuth';
import { readJson } from '../../../../lib/validate';
import { generateMini } from '../../../../lib/miniGen';
import { MINI_KEYS, cluesFor, loadBank, miniStart, normWord, rotateMini, titkosClues, validatePuzzle, weekStart } from '../../../../lib/mini';

const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// GET: a várólista, a legutóbb megjelentek, az aktuális hét és a bank mérete.
export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
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

  if (action === 'publish') {
    const v = validatePuzzle(body);
    if (typeof v === 'string') return Response.json({ error: 'invalid', message: v }, { status: 400 });
    const result = await kv.withLock('mini-bank', async () => {
      const bank = await loadBank();
      const titkos = await titkosClues();
      for (const e of v.entries) {
        const known = cluesFor(e.word, bank, titkos).some((c) => c.clue === e.clue);
        if (!known) (bank[e.word] = bank[e.word] || []).push({ id: newId(), clue: e.clue, at: new Date().toISOString() });
      }
      await kv.set(MINI_KEYS.bank, bank);
      const queue = (await kv.get(MINI_KEYS.queue)) || [];
      const item = { id: newId(), rows: v.rows, entries: v.entries, createdAt: new Date().toISOString() };
      queue.push(item);
      await kv.set(MINI_KEYS.queue, queue);
      return item;
    });
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
