import { kv } from './kv';
import { MINI_KEYS, enqueuePuzzle, newMiniId, validatePuzzle } from './mini';
import { sanitizeDraftInput, toPublishable } from './miniDraft.js';

// Mini keresztrejtvény piszkozatok tárolása: egy Redis hash (id -> JSON). Minden módosítás a
// piszkozat saját zára alatt, a "rev" (mentésszám) ellenőrzésével történik: ha valaki közben
// mentett, a második mentés 409-et kap a friss változattal, és nem írja felül a másikat.
export const DRAFTS_KEY = 'mini:drafts';
export const MAX_DRAFTS = 100;
const ID_RE = /^[a-z0-9]{6,30}$/;
const LOCK = { ttlMs: 8000, waitMs: 4000 };

export const isDraftId = (id) => typeof id === 'string' && ID_RE.test(id);

function parse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function listDrafts() {
  const all = (await kv.raw().hgetall(DRAFTS_KEY)) || {};
  return Object.values(all)
    .map(parse)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function getDraft(id) {
  return parse(await kv.raw().hget(DRAFTS_KEY, id));
}

// Minden művelet { status, ... } eredményt ad, vagy null-t, ha a zárat nem sikerült megszerezni.
const locked = async (name, fn) => {
  const res = await kv.withLock(name, fn, LOCK);
  return res ? res.value : null;
};

// Mentés. id nélkül új piszkozat jön létre; id mellett a rev-nek egyeznie kell a tároltéval.
export async function saveDraft({ id, rev, input, actor }) {
  const clean = sanitizeDraftInput(input);
  if (typeof clean === 'string') return { status: 400, message: clean };
  return locked(`mini-draft:${id || 'new'}`, async () => {
    const r = kv.raw();
    const now = new Date().toISOString();
    if (!id) {
      if ((await r.hlen(DRAFTS_KEY)) >= MAX_DRAFTS) {
        return { status: 400, message: `Legfeljebb ${MAX_DRAFTS} piszkozat lehet egyszerre; törölj néhányat.` };
      }
      const draft = { id: newMiniId(), ...clean, rev: 1, createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor };
      await r.hset(DRAFTS_KEY, draft.id, JSON.stringify(draft));
      return { status: 200, draft };
    }
    const cur = parse(await r.hget(DRAFTS_KEY, id));
    if (!cur) return { status: 404 };
    if (cur.rev !== rev) return { status: 409, draft: cur };
    const draft = { ...cur, ...clean, rev: cur.rev + 1, updatedAt: now, updatedBy: actor };
    await r.hset(DRAFTS_KEY, id, JSON.stringify(draft));
    return { status: 200, draft };
  });
}

export async function deleteDraft({ id, rev }) {
  return locked(`mini-draft:${id}`, async () => {
    const r = kv.raw();
    const cur = parse(await r.hget(DRAFTS_KEY, id));
    if (!cur) return { status: 404 };
    if (cur.rev !== rev) return { status: 409, draft: cur };
    await r.hdel(DRAFTS_KEY, id);
    return { status: 200 };
  });
}

// Beemelés a várólistára: csak a legutóbb látott (rev) állapot emelhető be, teljes ellenőrzéssel.
// Siker esetén a piszkozat megszűnik.
export async function publishDraft({ id, rev }) {
  return locked(`mini-draft:${id}`, async () => {
    const r = kv.raw();
    const cur = parse(await r.hget(DRAFTS_KEY, id));
    if (!cur) return { status: 404 };
    if (cur.rev !== rev) return { status: 409, draft: cur };
    const pub = toPublishable(cur);
    if (typeof pub === 'string') return { status: 400, message: pub };
    const v = validatePuzzle(pub);
    if (typeof v === 'string') return { status: 400, message: v };
    const queued = await enqueuePuzzle(v, { author: cur.author || cur.createdBy?.name, index: cur.fromQueue?.index });
    if (!queued) return null;
    await r.hdel(DRAFTS_KEY, id);
    return { status: 200, id: queued.value.id };
  });
}

// Várólistán lévő rejtvény szerkesztése: piszkozattá alakul (a várólistáról kikerül), és
// beemeléskor ugyanarra a helyre tér vissza, a készítő nevével együtt.
export async function draftFromQueue({ id, actor }) {
  return locked('mini-bank', async () => {
    const queue = (await kv.get(MINI_KEYS.queue)) || [];
    const index = queue.findIndex((x) => x.id === id);
    if (index < 0) return { status: 404 };
    const q = queue[index];
    const clues = {};
    for (const e of q.entries) clues[`${e.dir}:${e.row}:${e.col}`] = { clue: e.clue, word: e.word };
    const now = new Date().toISOString();
    const draft = { id: newMiniId(), title: 'Várólistáról szerkesztve', rows: q.rows, clues, rev: 1, createdAt: now, createdBy: actor, updatedAt: now, updatedBy: actor, author: q.author || null, fromQueue: { index } };
    await kv.raw().hset(DRAFTS_KEY, draft.id, JSON.stringify(draft));
    queue.splice(index, 1);
    await kv.set(MINI_KEYS.queue, queue);
    return { status: 200, id: draft.id };
  });
}
