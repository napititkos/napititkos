export const dynamic = 'force-dynamic';

import { adminUser, isAdminRequest } from '../../../../../lib/adminAuth';
import { readJson } from '../../../../../lib/validate';
import { MINI_LETTERS, MINI_TEMPLATES, MINI_WORDS } from '../../../../../lib/miniData';
import { templateGrid } from '../../../../../lib/miniGen';
import { cluesFor, loadBank, normWord, titkosClues } from '../../../../../lib/mini';
import { draftSummary } from '../../../../../lib/miniDraft';
import { deleteDraft, getDraft, isDraftId, listDrafts, publishDraft, saveDraft } from '../../../../../lib/miniDraftStore';

// Mini keresztrejtvény piszkozatok (admin). Bármelyik admin megnyithatja és mentheti a másik
// piszkozatát; az ütközést a rev (mentésszám) kezeli: elavult rev-vel 409 jön a friss változattal.
//   GET                     a piszkozatok rövid listája
//   GET ?id=<id>            egy piszkozat teljes tartalma
//   POST { action: 'save', id?, rev?, title, rows, clues }   létrehozás (id nélkül) vagy mentés
//   POST { action: 'delete', id, rev }
//   POST { action: 'publish', id, rev }     beemelés a várólistára (minden szó kész, minden kérdés megvan)
//   POST { action: 'check', words: [...] }  kérdésjavaslatok és szótár-ellenőrzés kész szavakra
//   POST { action: 'template' }             véletlen fekete-négyzet minta (üres betűkkel)
const NO_STORE = { 'Cache-Control': 'no-store' };
const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 });

let DICT = null;
const dictionary = () => (DICT ||= new Set([...MINI_LETTERS, ...MINI_WORDS]));

function reply(result) {
  if (!result) return Response.json({ error: 'busy' }, { status: 503, headers: NO_STORE });
  switch (result.status) {
    case 200:
      return Response.json({ ok: true, ...(result.draft ? { draft: result.draft } : {}), ...(result.id ? { id: result.id } : {}) }, { headers: NO_STORE });
    case 404:
      return Response.json({ error: 'not-found', message: 'Ez a piszkozat már nem létezik.' }, { status: 404, headers: NO_STORE });
    case 409:
      return Response.json({ error: 'conflict', draft: result.draft }, { status: 409, headers: NO_STORE });
    default:
      return Response.json({ error: 'invalid', message: result.message || 'Hibás kérés.' }, { status: 400, headers: NO_STORE });
  }
}

const actorOf = (user) => ({ id: user.id, name: String(user.name || String(user.email || '').split('@')[0] || 'Admin').slice(0, 40) });

export async function GET(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (id !== null) {
    if (!isDraftId(id)) return reply({ status: 404 });
    const draft = await getDraft(id);
    return draft ? Response.json({ draft }, { headers: NO_STORE }) : reply({ status: 404 });
  }
  return Response.json({ drafts: (await listDrafts()).map(draftSummary) }, { headers: NO_STORE });
}

export async function POST(req) {
  if (!(await isAdminRequest(req))) return unauthorized();
  const body = (await readJson(req, 30000)) || {};
  const action = body.action;

  if (action === 'save') {
    const hasId = body.id !== undefined && body.id !== null;
    if (hasId && (!isDraftId(body.id) || !Number.isInteger(body.rev))) return reply({ status: 400, message: 'Hibás azonosító.' });
    const user = await adminUser();
    if (!user) return unauthorized();
    return reply(await saveDraft({ id: hasId ? body.id : undefined, rev: body.rev, input: body, actor: actorOf(user) }));
  }

  if (action === 'delete' || action === 'publish') {
    if (!isDraftId(body.id) || !Number.isInteger(body.rev)) return reply({ status: 400, message: 'Hibás azonosító.' });
    return reply(await (action === 'delete' ? deleteDraft : publishDraft)({ id: body.id, rev: body.rev }));
  }

  if (action === 'check') {
    const words = [...new Set((Array.isArray(body.words) ? body.words : []).slice(0, 20).map(normWord).filter(Boolean))];
    const [bank, titkos] = await Promise.all([loadBank(), titkosClues()]);
    const out = {};
    for (const w of words) out[w] = { known: dictionary().has(w) || !!bank[w] || !!titkos[w], clues: cluesFor(w, bank, titkos) };
    return Response.json({ words: out }, { headers: NO_STORE });
  }

  if (action === 'template') {
    const mask = MINI_TEMPLATES[Math.floor(Math.random() * MINI_TEMPLATES.length)];
    const rows = templateGrid(mask).map((r) => r.map((b) => (b ? '#' : '')));
    return Response.json({ rows }, { headers: NO_STORE });
  }

  return Response.json({ error: 'unknown-action' }, { status: 400 });
}
