export const dynamic = 'force-dynamic';

import { kv } from '../../../../../lib/kv';
import { isAdminRequest } from '../../../../../lib/adminAuth';
import { MINI_LETTERS, MINI_WORDS } from '../../../../../lib/miniData';
import { MINI_KEYS, loadBank, newMiniId, normWord, titkosClues } from '../../../../../lib/mini';
import { addVariant, bankStats, buildRows, deleteVariant, editVariant, queryRows, usageOf } from '../../../../../lib/miniBank';
import { readJson } from '../../../../../lib/validate';

// A szóbank és a kérdésbank áttekintése (csak olvasás): a kézzel írt kérdések, a megjelent
// titkosírásokból származó kérdések, a kizárt szavak és az alap szótár egy listában.
//   GET ?q=<keresés>&filter=clues|bank|titkos|noclue|excluded|all&sort=word|len|recent|used&page=1
//       &len=1..5 (csak ilyen hosszú szavak) &letter=a (csak ilyen kezdőbetűs szavak, ékezet nélkül)
// A szűrés, rendezés és lapozás a szerveren történik, így a 8000+ szavas lista nem megy le egyben.
export async function GET(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const [bank, titkos, excludedRaw, queue, published] = await Promise.all([
    loadBank(),
    titkosClues(),
    kv.get(MINI_KEYS.excluded),
    kv.get(MINI_KEYS.queue),
    kv.get(MINI_KEYS.published),
  ]);
  const excluded = excludedRaw || [];
  const all = buildRows({
    dictWords: [...MINI_LETTERS, ...MINI_WORDS],
    bank,
    titkos,
    excluded,
    usage: usageOf([...(queue || []), ...(published || [])]),
  });
  const page = Number.parseInt(sp.get('page') || '1', 10);
  const result = queryRows(all, {
    q: String(sp.get('q') || '').slice(0, 60),
    filter: sp.get('filter') || undefined,
    sort: sp.get('sort') || undefined,
    page: Number.isInteger(page) ? page : 1,
    len: Number.parseInt(sp.get('len') || '0', 10) || 0,
    letter: String(sp.get('letter') || '').slice(0, 2),
  });
  return Response.json({ ...result, stats: bankStats(all, excluded) }, { headers: { 'Cache-Control': 'no-store' } });
}

// A kézi kérdésváltozatok és a kizárások módosítása. A titkosírásból származó kérdések nem
// tárolódnak (a megjelent titkosírásokból számoljuk őket), ezért azok nem szerkeszthetők.
// A már várólistán lévő vagy megjelent rejtvények a saját kérdésüket tartalmazzák, így a bankban
// végzett módosítás őket nem érinti.
//   POST { action: 'addClue',    word, clue }        új változat (egy szóhoz több is lehet); feloldja a kizárást
//   POST { action: 'editClue',   word, id, clue }    egy kézi változat átírása
//   POST { action: 'deleteClue', word, id }          egy kézi változat törlése
//   POST { action: 'exclude',    word }              kizárás (a generátor nem használja; a kérdései megmaradnak)
//   POST { action: 'unexclude',  word }              a kizárás feloldása (a generátor újra használhatja)
const MESSAGES = {
  'missing-clue': 'Írj kérdést!',
  duplicate: 'Ennél a szónál már van ilyen kérdés.',
  'not-found': 'Ez a kérdés már nem létezik (közben törölték?). Frissítsd a listát.',
  'invalid-word': 'Hibás szó.',
};
const fail = (error, status = 400) => Response.json({ error, message: MESSAGES[error] || 'Hibás kérés.' }, { status });

export async function POST(req) {
  if (!(await isAdminRequest(req))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = (await readJson(req, 5000)) || {};
  const word = normWord(body.word);
  if (!word) return fail('invalid-word');
  const id = typeof body.id === 'string' ? body.id : '';
  const at = new Date().toISOString();

  if (body.action === 'exclude') {
    const res = await kv.withLock('mini-bank', async () => {
      const ex = (await kv.get(MINI_KEYS.excluded)) || [];
      if (!ex.includes(word)) await kv.set(MINI_KEYS.excluded, [...ex, word]);
      return true;
    });
    return res ? Response.json({ ok: true }) : Response.json({ error: 'busy' }, { status: 503 });
  }

  if (body.action === 'unexclude') {
    const res = await kv.withLock('mini-bank', async () => {
      const ex = (await kv.get(MINI_KEYS.excluded)) || [];
      if (ex.includes(word)) await kv.set(MINI_KEYS.excluded, ex.filter((w) => w !== word));
      return true;
    });
    return res ? Response.json({ ok: true }) : Response.json({ error: 'busy' }, { status: 503 });
  }

  if (!['addClue', 'editClue', 'deleteClue'].includes(body.action)) return Response.json({ error: 'unknown-action' }, { status: 400 });
  if (body.action !== 'addClue' && !id) return fail('not-found', 404);

  const res = await kv.withLock('mini-bank', async () => {
    const bank = await loadBank();
    const out =
      body.action === 'addClue'
        ? addVariant(bank, word, body.clue, { id: newMiniId(), at })
        : body.action === 'editClue'
          ? editVariant(bank, word, id, body.clue, { at })
          : deleteVariant(bank, word, id);
    if (out.error) return out;
    if (out.bank !== bank) await kv.set(MINI_KEYS.bank, out.bank);
    // Új kérdés felvitelekor a szó kizárása megszűnik (ahogy az "Új szó felvitele" is teszi).
    if (body.action === 'addClue') {
      const ex = (await kv.get(MINI_KEYS.excluded)) || [];
      if (ex.includes(word)) await kv.set(MINI_KEYS.excluded, ex.filter((w) => w !== word));
    }
    return { ok: true, variants: (out.bank[word] || []).length };
  });
  if (!res) return Response.json({ error: 'busy' }, { status: 503 });
  if (res.value.error) return fail(res.value.error, res.value.error === 'not-found' ? 404 : res.value.error === 'duplicate' ? 409 : 400);
  return Response.json(res.value);
}
