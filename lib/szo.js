import { kv } from './kv';
import { todayStr } from './date';
import { generateSzo } from './szoGen';
import { szoPointsTotal } from './szoPoints';
export { NEIGHBORS, normSzo, solveGrid, generateSzo } from './szoGen';

// Napi szókereső (3x3). Minden nap új rács egy 9 betűs „napi szóból”, ami az összes négyzetet
// használja (szomszédos – átlósan is szomszédos – négyzeteken át). A rácsban kirakható 3+ betűs
// szavak közül a köznévlista szavai a kötelezők, a nagy szólista többi szava bónusz.
// Minden betű külön négyzet (a kettős betű kettő). A trágár és az admin által tiltott szavak
// sehol nem számítanak.
//   szo:puzzle:<dátum>   { date, grid[9], word, path[9], required[], bonus[], paths{szó: [négyzetek]} }
//   szo:used             [a már felhasznált napi szavak]
//   szo:added            [admin által hozzáadott kötelező szavak]
//   szo:banned           [admin által tiltott szavak]
//   szo:lb:<dátum>       szereplő -> {c: szószám, e: idő ms}  (ranglista, 2 napig)
//   szo:lbn:<dátum>      szereplő -> név                       (ranglista, 2 napig)
//   szo:res:<dátum>      szereplő -> "szószám:idő"            (saját eredmény, az archívumhoz; megmarad)
//   szo:found:<dátum>    szereplő -> [megtalált szavak]        (eszközök közti szinkron, 7 napig)
export const SZO_KEYS = { used: 'szo:used', added: 'szo:added', banned: 'szo:banned' };
export const szoPuzzleKey = (d) => `szo:puzzle:${d}`;
export const szoLbKey = (d) => `szo:lb:${d}`;
export const szoLbNamesKey = (d) => `szo:lbn:${d}`;
export const szoResKey = (d) => `szo:res:${d}`;
export const szoFoundKey = (d) => `szo:found:${d}`;
export const SZO_LB_TTL = 2 * 24 * 3600;
export const SZO_FOUND_TTL = 7 * 24 * 3600;
async function lists() {
  const [used, added, banned] = await Promise.all([kv.get(SZO_KEYS.used), kv.get(SZO_KEYS.added), kv.get(SZO_KEYS.banned)]);
  return { used: used || [], added: added || [], banned: banned || [] };
}

// A nap rácsa (ha még nincs, legenerálja és elmenti).
export async function szoForDate(date, { create = true } = {}) {
  const have = await kv.get(szoPuzzleKey(date));
  if (have || !create) return have || null;
  const res = await kv.withLock(
    `szo-gen:${date}`,
    async () => {
      const again = await kv.get(szoPuzzleKey(date));
      if (again) return again;
      const l = await lists();
      const p = generateSzo(date, l);
      if (!p) return null;
      await kv.set(szoPuzzleKey(date), p);
      await kv.set(SZO_KEYS.used, [...l.used, p.word].slice(-5000));
      return p;
    },
    { ttlMs: 20000, waitMs: 12000 }
  );
  return res ? res.value : null;
}

export async function szoToday(now = new Date()) {
  return szoForDate(todayStr(now));
}

// Egy (jövőbeli) nap rácsának cseréje: új napi szóval generál, a régi napi szót felszabadítja.
export async function regenerateSzo(date) {
  const res = await kv.withLock(
    `szo-gen:${date}`,
    async () => {
      const old = await kv.get(szoPuzzleKey(date));
      const l = await lists();
      const used = l.used.filter((w) => w !== old?.word);
      const p = generateSzo(date, { ...l, used: old?.word ? [...used, old.word] : used, salt: Date.now().toString(36) });
      if (!p) return null;
      await kv.set(szoPuzzleKey(date), p);
      await kv.set(SZO_KEYS.used, [...used, p.word].slice(-5000));
      return p;
    },
    { ttlMs: 20000, waitMs: 12000 }
  );
  return res ? res.value : null;
}

export { lists as szoLists };

// Egy nap eredményeinek újraszámolása a rács (megváltozott) szólistája alapján, pl. ha az admin a
// mai rácsból kitilt egy szót: a ranglistán és a saját eredmények között a szószám és a pont a
// játékos megtalált szavaiból újraszámolódik (a kitiltott szó már nem számít), az idő marad.
// Akinek nincs meg a megtalált szavainak listája, annak az eredménye nem változik.
export async function szoRecount(date) {
  const p = await kv.get(szoPuzzleKey(date));
  if (!p) return 0;
  const req = new Set(p.required);
  const valid = new Set([...p.required, ...p.bonus]);
  const r = kv.raw();
  const [lb, res, found] = await Promise.all([r.hgetall(szoLbKey(date)), r.hgetall(szoResKey(date)), r.hgetall(szoFoundKey(date))]);
  let changed = 0;
  for (const actor of Object.keys(found || {})) {
    let words;
    try {
      words = JSON.parse(found[actor]);
    } catch {
      continue;
    }
    if (!Array.isArray(words)) continue;
    const keep = words.filter((w) => valid.has(w));
    const reqFound = keep.filter((w) => req.has(w));
    const c = reqFound.length;
    const pts = szoPointsTotal(reqFound);
    if (keep.length !== words.length) await r.hset(szoFoundKey(date), actor, JSON.stringify(keep));
    if (lb && lb[actor]) {
      try {
        const o = JSON.parse(lb[actor]);
        if (Number(o.c) !== c || Number(o.p) !== pts) {
          await r.hset(szoLbKey(date), actor, JSON.stringify({ c, e: Number(o.e) || 0, p: pts }));
          changed++;
        }
      } catch {}
    }
    if (res && res[actor]) {
      const old = String(res[actor]).split(':').map(Number);
      if (old[0] !== c || old[2] !== pts) await r.hset(szoResKey(date), actor, `${c}:${old[1] || 0}:${pts}`);
    }
  }
  return changed;
}
