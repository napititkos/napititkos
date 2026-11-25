export const dynamic = 'force-dynamic';

import { auth } from '../../../auth';
import { kv } from '../../../lib/kv';
import { todayStr } from '../../../lib/date';
import { enumerationFor } from '../../../lib/format';
import { communityList, migrateLegacyOnce, solvedKey, summaries } from '../../../lib/community';

// A Közösségi titkosírások listája: csak a lista-nézethez szükséges adatok (rejtvény, beküldő,
// dátum, értékelés). A megoldás és a tippek csak a rejtvény megnyitásakor töltődnek le.
export async function GET() {
  // A lista vendégeknek is látható (megfejteni, értékelni csak bejelentkezve lehet); a lista
  // a megoldást és a tippeket nem tartalmazza.
  await migrateLegacyOnce();
  const list = await communityList();
  const sums = await summaries(list.map((s) => s.id));
  const today = todayStr();
  const shownList = ((await kv.get('rotation:history')) || []).filter((h) => h?.shownDate && h.shownDate < today);
  const shownBefore = new Set(shownList.map((h) => h.id));
  const shownDateOf = new Map(shownList.map((h) => [h.id, h.shownDate]));
  // Bejelentkezve: melyiket fejtette már meg (a listában pipa jelzi).
  const session = await auth();
  let solvedIds = new Set();
  if (session?.user?.id && list.length) {
    const p = kv.raw().pipeline();
    for (const s of list) p.hget(solvedKey(s.id), session.user.id);
    const res = await p.exec();
    solvedIds = new Set(list.filter((_, i) => res[i]?.[1]).map((s) => s.id));
  }
  return Response.json(
    {
      items: list.map((s) => ({
        id: s.id,
        clue: s.clue,
        // A betűszám (pl. "(5)") a kicsinyített nézethez; a megfejtést nem árulja el.
        enumeration: enumerationFor(s.answer),
        name: s.name && s.name !== 'Névtelen' ? s.name : '',
        createdAt: s.createdAt,
        avg: sums[s.id]?.avg ?? null,
        ratingCount: sums[s.id]?.ratingCount || 0,
        // "Bekerült a napi titkosírások közé" csak akkor, ha a napi rejtvényként már meg is
        // jelent (az archívumban van), nem már a beemeléskor.
        promoted: !!(s.promotedPuzzleId && shownBefore.has(s.promotedPuzzleId)),
        // Melyik napon jelent meg napi titkosírásként (a lenyitott nézetben látszik).
        promotedDate: s.promotedPuzzleId ? shownDateOf.get(s.promotedPuzzleId) || null : null,
        solved: solvedIds.has(s.id),
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
