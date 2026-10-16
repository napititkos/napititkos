import { kv } from './kv';
import { splitAnswerWords } from './format';

// Közösségi titkosírások: a beküldött (fanmade) rejtvények (submissions:list), beküldés után
// azonnal nyilvánosak. Megfejtés, értékelés (1-5 csillag) és emoji-reakció bejelentkezett,
// megerősített fiókkal, fiókonként egy-egy. Tárolás rejtvényenként egy-egy hash-ben:
//   community:solved:<id>    uid -> megfejtés ideje
//   community:ratings:<id>   uid -> csillag (1-5)
//   community:reactions:<id> uid -> emoji sorszáma (0-9)
export const EMOJIS = ['😍', '🤯', '😂', '🧠', '🔥', '👏', '🤔', '😅', '😤', '🐏'];

export const solvedKey = (id) => `community:solved:${id}`;
export const ratingsKey = (id) => `community:ratings:${id}`;
export const reactionsKey = (id) => `community:reactions:${id}`;
// Kiről küldtünk már értesítést a beküldőnek (uid:s = értékelés, uid:r = reakció).
export const notifiedKey = (id) => `community:notified:${id}`;

export async function communityList() {
  return (await kv.get('submissions:list')) || [];
}

export function normAnswer(s) {
  return String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

// A beküldés a játékban használt rejtvény-formára (ugyanaz a leképezés, mint az admin átemelésénél).
export function toPlayable(s) {
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
  const answer = String(s.answer || '').toUpperCase();
  return {
    id: s.id,
    clue: cap(s.clue || ''),
    answer,
    answerWords: splitAnswerWords(answer),
    hints: {
      definicio: { enabled: !!s.hints?.definicio, text: cap(s.hints?.definicio || ''), words: s.hintWords?.definicio || [] },
      indikator: { enabled: !!s.hints?.indikator, text: cap(s.hints?.indikator || ''), words: s.hintWords?.indikator || [] },
      fodder: { enabled: !!s.hints?.fodder, text: cap(s.hints?.fodder || ''), words: s.hintWords?.fodder || [] },
      alternativ: { enabled: !!s.hints?.alternativ, text: cap(s.hints?.alternativ || '') },
      betu: { enabled: true },
    },
  };
}

// Átlag és darabszám, reakciók összesítve - több rejtvényre egy körben.
export async function summaries(ids) {
  if (!ids.length) return {};
  const p = kv.raw().pipeline();
  for (const id of ids) {
    p.hgetall(ratingsKey(id));
    p.hgetall(reactionsKey(id));
  }
  const res = await p.exec();
  const out = {};
  ids.forEach((id, i) => {
    const ratings = Object.values(res[i * 2]?.[1] || {}).map(Number).filter((n) => n >= 1 && n <= 5);
    const reacts = Object.values(res[i * 2 + 1]?.[1] || {}).map(Number);
    const counts = EMOJIS.map((_, k) => reacts.filter((r) => r === k).length);
    out[id] = {
      avg: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      ratingCount: ratings.length,
      reactions: counts,
    };
  });
  return out;
}

// Egy rejtvény összes közösségi adatának törlése (pl. a rejtvény törlésekor).
export async function deleteCommunityData(id) {
  await kv.raw().del(solvedKey(id), ratingsKey(id), reactionsKey(id), notifiedKey(id));
}

// A rejtvény törlésekor a beküldőnek szóló, hozzá kapcsolódó értesítések is eltűnnek.
export async function deleteCommunityNotifications(email, id) {
  const { removeUserNotifications } = await import('./userNotifications');
  await removeUserNotifications(email, (n) => n.ref?.type === 'community' && n.ref.id === id);
}

// Egyszeri átállás: a régi rendszerben (admin felületen) beküldött és már a fő listába
// átemelt rejtvények is megjelennek a közösségi oldalon (beemeltként jelölve), a beküldő
// adataival. Csak egyszer fut le (a community:migrated:v1 kulcs jelzi).
export async function migrateLegacyOnce() {
  const r = kv.raw();
  if ((await r.get('community:migrated:v1')) != null) return;
  if (!(await r.set('community:migrated:v1', String(Date.now()), 'NX'))) return;
  const puzzles = (await kv.get('puzzles:list')) || [];
  const history = (await kv.get('rotation:history')) || [];
  const shown = {};
  history.forEach((h) => {
    if (h?.id && h.shownDate) shown[h.id] = h.shownDate;
  });
  await kv.withLock('submissions', async () => {
    const list = (await kv.get('submissions:list')) || [];
    const linked = new Set(list.map((x) => x.promotedPuzzleId).filter(Boolean));
    const added = [];
    for (const p of puzzles) {
      if (!p?.submittedByEmail || p.fromCommunity || linked.has(p.id)) continue;
      const text = (k) => (p.hints?.[k]?.enabled ? String(p.hints[k].text || '') : '');
      const words = (k) => (p.hints?.[k]?.enabled && Array.isArray(p.hints[k].words) ? p.hints[k].words : []);
      added.push({
        id: `m${p.id}`.slice(0, 60),
        name: p.submittedBy || 'Névtelen',
        submitterEmail: p.submittedByEmail,
        clue: String(p.clue || '').slice(0, 400),
        answer: String(p.answer || '').slice(0, 60),
        hints: { fodder: text('fodder'), indikator: text('indikator'), definicio: text('definicio'), alternativ: text('alternativ') },
        hintWords: { definicio: words('definicio'), indikator: words('indikator'), fodder: words('fodder') },
        createdAt: shown[p.id] ? new Date(`${shown[p.id]}T00:00:00Z`).toISOString() : new Date().toISOString(),
        promotedAt: new Date().toISOString(),
        promotedPuzzleId: p.id,
      });
    }
    if (added.length) await kv.set('submissions:list', [...list, ...added]);
    return added.length;
  });
}

// Vendégeknek mutatott, tízesre lefelé kerekített darabszám ("30+"); 10 alatt a pontos szám.
export function roundedCount(n) {
  return n < 10 ? String(n) : `${Math.floor(n / 10) * 10}+`;
}
