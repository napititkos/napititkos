import { kv } from './kv';

// Egyszeri karbantartás: a megszűnt komment-funkció tárolt kommentjeinek törlése. Kizárólag a
// "comments:YYYY-MM-DD" nevű, lista típusú kulcsokat törli (ezekben voltak a napi kommentek);
// minden más kulcs érintetlen marad. A lefutást egy jelző rögzíti (mikor, hány kulcs), így a
// napi cron csak egyszer végzi el.
export const LEGACY_COMMENTS_FLAG = 'maintenance:legacy-comments-deleted';
const COMMENT_KEY = /^comments:\d{4}-\d{2}-\d{2}$/;

export async function deleteLegacyComments() {
  const done = await kv.get(LEGACY_COMMENTS_FLAG);
  if (done) return { skipped: true, ...done };
  const r = kv.raw();
  let deletedKeys = 0;
  let deletedComments = 0;
  for (const key of await kv.scan('comments:*')) {
    if (!COMMENT_KEY.test(key)) continue;
    if ((await r.type(key)) !== 'list') continue;
    deletedComments += Number(await r.llen(key)) || 0;
    deletedKeys += Number(await r.del(key)) || 0;
  }
  const result = { at: new Date().toISOString(), deletedKeys, deletedComments };
  await kv.set(LEGACY_COMMENTS_FLAG, result);
  return result;
}
