import { createHash, timingSafeEqual } from 'node:crypto';
import { kv } from './kv';
import { enumerationFor, huDate } from './format';
import { themeForDay } from './socialTheme';
import { miniLive } from './mini';

// Napi automatikus poszt a Facebook oldalra és az Instagramra (Meta Graph API). A poszt szövegében
// nincs emoji.
// Környezeti változók (csak Productionben): FB_PAGE_ID, FB_PAGE_TOKEN (nem lejáró oldal-token),
// IG_USER_ID, CRON_SECRET; SOCIAL_DRY_RUN=1 esetén mindent előkészít, de semmit nem küld el.
// A Graph API verzióját rögzítjük (META_GRAPH_VERSION felülírhatja), a META_GRAPH_BASE csak a
// tesztekhez (hamis Graph szerver) való.
const DEFAULT_GRAPH_VERSION = 'v24.0';
const FLAG_TTL = 8 * 24 * 60 * 60; // a posztjelzők 8 nap után maguktól törlődnek

export function isDryRun() {
  return process.env.SOCIAL_DRY_RUN === '1';
}

export function socialConfig() {
  const token = process.env.FB_PAGE_TOKEN || '';
  return {
    fb: !!(process.env.FB_PAGE_ID && token),
    ig: !!(process.env.IG_USER_ID && token),
  };
}

// A cron kérés ellenőrzése: a Vercel a CRON_SECRET-et "Authorization: Bearer ..." fejlécben küldi.
// Időzítés-független összehasonlítás (azonos hosszú hash-eken).
export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = createHash('sha256').update(req.headers.get('authorization') || '').digest();
  const want = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(got, want);
}

// Az adott napi titkosírás a poszthoz: az előzmény-bejegyzés (a nap sorszámával), de a szöveg,
// a megfejtés és a beküldő az élő rejtvénylistából, ha a rejtvény még megvan - így a megjelenés
// óta (vagy a posztolás előtt) végzett admin-módosítások is érvényesülnek. Egy napon belüli
// csere (beütemezés) esetén az utolsó bejegyzés számít.
export async function socialEntryFor(date) {
  const history = (await kv.get('rotation:history')) || [];
  const index = history.findLastIndex((h) => h.shownDate === date);
  if (index < 0) return null;
  const snap = history[index];
  const live = ((await kv.get('puzzles:list')) || []).find((p) => p.id && p.id === snap.id && p.clue?.trim() && p.answer?.trim());
  const src = live || snap;
  return {
    dayNumber: index + 1,
    entry: { id: snap.id, shownDate: date, clue: src.clue, answer: src.answer, submittedBy: src.submittedBy || snap.submittedBy || '', difficulty: Number(src.difficulty) || 0 },
  };
}

// A kép címe: a "v" a tartalom (szöveg, megfejtés-hossz, téma) lenyomata, hogy egy módosítás után
// se egy korábban letöltött (gyorsítótárazott) kép kerüljön ki.
export function cardUrl(siteUrl, date, format, version = '') {
  return `${siteUrl}/api/social/card?d=${encodeURIComponent(date)}&f=${format}${version ? `&v=${version}` : ''}`;
}

export function cardVersion(entry, theme) {
  return createHash('sha256').update(JSON.stringify([entry.clue, entry.answer, theme])).digest('hex').slice(0, 12);
}

const HASHTAGS = '#titkosírás #rejtvény #kriptikusrejtvény #napirejtvény #fejtörő #magyarrejtvény #napititkos';

// gamePath: élesítés után a napi titkosírás a /titkosiras címen van (a főoldal a játékok listája).
export function captions({ clue, answer, submittedBy, difficulty, date, siteUrl, gamePath = '' }) {
  const line = `„${String(clue || '').trim()}” ${enumerationFor(String(answer || '').trim())}`;
  const by = String(submittedBy || '').trim();
  const byLine = by ? `\nBeküldte: ${by}` : '';
  const d = Number(difficulty);
  const diffLine = Number.isInteger(d) && d >= 1 && d <= 5 ? `\nNehézség: ${d}/5` : '';
  const day = huDate(date);
  const host = siteUrl.replace(/^https?:\/\//, '');
  return {
    fb: `Mai rejtvényünk – ${day}\n\n${line}${byLine}${diffLine}\n\nFejtsd meg! A link az első hozzászólásban.\n\n${HASHTAGS}`,
    fbComment: `Itt tudod megfejteni: ${siteUrl}${gamePath}`,
    ig: `Mai rejtvényünk – ${day}\n\n${line}${byLine}${diffLine}\n\nFejtsd meg a ${host} oldalon – a link a profilban!\n\n${HASHTAGS}`,
  };
}

// Világos / sötét ritmus platformonként, a poszt fajtájától függetlenül (titkosírás, szókereső +
// szólánc, heti mini, és bármilyen jövőbeli poszt): minden új poszt az előzőhöz képest a másik
// témát kapja. A sorszám (social:seq:<platform>) Redisben van; a poszt a saját jelzőjében
// megjegyzi a témáját, így egy ismételt (pótló) futás ugyanazzal a témával megy ki.
// Új poszttípusnál: a téma mindig themeFor(platform, jelzőkulcs) legyen.
async function ensureSeq(platform, dayNumber) {
  // Első induláskor a sorozat a korábbi (sorszám szerinti) váltakozás folytatása.
  if (dayNumber) await kv.raw().set(`social:seq:${platform}`, String(Math.max(0, dayNumber - 1)), 'NX');
}
export async function themeFor(platform, key) {
  const st = (await kv.get(key)) || {};
  if (st.theme) return st.theme;
  const n = await kv.raw().incr(`social:seq:${platform}`);
  st.theme = n % 2 === 1 ? 'light' : 'dark';
  await kv.set(key, st, FLAG_TTL);
  return st.theme;
}
// Előrejelzés (próbafuttatáshoz): a következő k-adik poszt témája, a sorszám növelése nélkül.
async function peekTheme(platform, key, k) {
  const st = (await kv.get(key)) || {};
  if (st.theme) return st.theme;
  const n = (Number(await kv.raw().get(`social:seq:${platform}`)) || 0) + 1 + k;
  return n % 2 === 1 ? 'light' : 'dark';
}

class GraphError extends Error {}

async function graph(path, params, method = 'POST') {
  const base = process.env.META_GRAPH_BASE || `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION}`;
  const query = method === 'GET' && params ? `?${new URLSearchParams(params)}` : '';
  // A token fejlécben megy, hogy ne kerüljön URL-be (és így naplóba).
  const res = await fetch(`${base}/${path}${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.FB_PAGE_TOKEN}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? new URLSearchParams(params) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new GraphError(json.error?.message || `HTTP ${res.status}`);
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postFacebook({ date, image, caption, comment, key = `social:fb:${date}` }) {
  const st = (await kv.get(key)) || {};
  if (!st.postId) {
    const r = await graph(`${process.env.FB_PAGE_ID}/photos`, { url: image, caption, published: 'true' });
    st.postId = r.post_id || r.id;
    await kv.set(key, st, FLAG_TTL);
  }
  // Egy vagy több hozzászólás (több linknél mindegyik külön hozzászólásban); a már kiment
  // hozzászólásokat egy ismételt futás nem küldi újra.
  if (Array.isArray(comment)) {
    st.commentIds = st.commentIds || [];
    for (let i = st.commentIds.length; i < comment.length; i++) {
      const c = await graph(`${st.postId}/comments`, { message: comment[i] });
      st.commentIds.push(c.id);
      await kv.set(key, st, FLAG_TTL);
    }
  } else if (!st.commentId) {
    const c = await graph(`${st.postId}/comments`, { message: comment });
    st.commentId = c.id;
    await kv.set(key, st, FLAG_TTL);
  }
  return { status: 'ok', postId: st.postId };
}

async function postInstagram({ date, image, caption, pollMs = 2000, key = `social:ig:${date}` }) {
  const st = (await kv.get(key)) || {};
  if (st.mediaId) return { status: 'ok', mediaId: st.mediaId };
  if (!st.containerId) {
    const c = await graph(`${process.env.IG_USER_ID}/media`, { image_url: image, caption });
    st.containerId = c.id;
    await kv.set(key, st, FLAG_TTL);
  }
  // A konténer feldolgozása (a kép letöltése) általában azonnali, de megvárjuk a FINISHED állapotot.
  for (let i = 0; i < 6; i++) {
    const s = await graph(st.containerId, { fields: 'status_code' }, 'GET');
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
      delete st.containerId; // a következő futás újat hoz létre
      await kv.set(key, st, FLAG_TTL);
      throw new GraphError(`Instagram konténer: ${s.status_code}`);
    }
    await sleep(pollMs);
  }
  const p = await graph(`${process.env.IG_USER_ID}/media_publish`, { creation_id: st.containerId });
  st.mediaId = p.id;
  await kv.set(key, st, FLAG_TTL);
  return { status: 'ok', mediaId: st.mediaId };
}

// A Facebookon naponta két poszt: a titkosírás és a szókereső + szólánc (egymás mellett); a kettő
// sorrendje naponta cserélődik, így a világos/sötét ritmusban mindkettő váltakozik. Az Instagramon
// egyelőre csak a titkosírás.
export function comboCaptions({ date, start, end, siteUrl }) {
  const day = huDate(date);
  return {
    fb: `Mai szókereső és szólánc – ${day}\n\nFejtsd meg! A linkeket a hozzászólásokban találod.\n\n#szókereső #szólánc #szójáték #rejtvény #fejtörő #napititkos`,
    // A két játék linkje két külön hozzászólásban.
    fbComment: [`Szókereső: ${siteUrl}/szokereso`, `Szólánc: ${siteUrl}/szolanc`],
  };
}

// Egy futás: platformonként külön, hogy az egyik hibája ne akadályozza a másikat, és a jelzők
// miatt egy ismételt futás (pl. kézi újraindítás aznap) se posztoljon duplán.
// slot: 'am' – a délelőtti futás (az első facebookos poszt és az Instagram), 'pm' – a délután négyórás
// futás (a második facebookos poszt); 'all' (alapból, kézi futtatásnál) – mind.
export async function runSocialPost({ date, siteUrl, pollMs, slot = 'all' }) {
  const cfg = socialConfig();
  const found = await socialEntryFor(date);
  if (!found) return { date, error: 'not-found' };
  const { entry, dayNumber } = found;
  const text = captions({ clue: entry.clue, answer: entry.answer, submittedBy: entry.submittedBy, difficulty: entry.difficulty, date, siteUrl, gamePath: miniLive() ? '/titkosiras' : '' });
  const combo = await comboFor(date);
  const ctext = combo ? comboCaptions({ date, start: combo.start, end: combo.end, siteUrl }) : null;
  // A két facebookos poszt sorrendje naponta cserélődik.
  const comboFirst = dayNumber % 2 === 0;
  const fullOrder = combo ? (comboFirst ? ['combo', 'titkos'] : ['titkos', 'combo']) : ['titkos'];
  const fbOrder = slot === 'am' ? fullOrder.slice(0, 1) : slot === 'pm' ? fullOrder.slice(1) : fullOrder;
  const withIg = slot !== 'pm';
  const keys = { titkos: `social:fb:${date}`, combo: `social:fbcombo:${date}`, ig: `social:ig:${date}` };
  const titkosImage = (fmt, theme) => `${cardUrl(siteUrl, date, fmt, cardVersion(entry, theme))}&t=${theme}`;
  const comboImage = (theme) => `${siteUrl}/api/social/combo-card?d=${date}&t=${theme}`;

  await ensureSeq('fb', dayNumber);
  await ensureSeq('ig', dayNumber);

  if (isDryRun()) {
    const out = { dryRun: true, date, configured: cfg, fbOrder };
    for (const [i, kind] of fbOrder.entries()) {
      const theme = await peekTheme('fb', keys[kind], i);
      out[kind === 'titkos' ? 'fb' : 'fbCombo'] = kind === 'titkos' ? { theme, image: titkosImage('fb', theme), caption: text.fb, comment: text.fbComment } : { theme, image: comboImage(theme), caption: ctext.fb, comment: ctext.fbComment };
    }
    if (withIg) {
      const igTheme = await peekTheme('ig', keys.ig, 0);
      out.ig = { theme: igTheme, image: titkosImage('ig', igTheme), caption: text.ig };
    }
    return out;
  }

  const locked = await kv.withLock(
    'social-post',
    async () => {
      const out = { date, fbOrder };
      for (const kind of fbOrder) {
        const slot = kind === 'titkos' ? 'fb' : 'fbCombo';
        if (!cfg.fb) {
          out[slot] = { status: 'not-configured' };
          continue;
        }
        try {
          const theme = await themeFor('fb', keys[kind]);
          out[slot] =
            kind === 'titkos'
              ? await postFacebook({ date, image: titkosImage('fb', theme), caption: text.fb, comment: text.fbComment, key: keys.titkos })
              : await postFacebook({ date, image: comboImage(theme), caption: ctext.fb, comment: ctext.fbComment, key: keys.combo });
          out[slot].theme = theme;
        } catch (err) {
          console.error(`Facebook poszt hiba (${kind}):`, err.message);
          out[slot] = { status: 'error', error: err.message };
        }
      }
      if (!withIg) out.ig = { status: 'later' };
      else if (cfg.ig) {
        try {
          const theme = await themeFor('ig', keys.ig);
          out.ig = await postInstagram({ date, image: titkosImage('ig', theme), caption: text.ig, pollMs, key: keys.ig });
          out.ig.theme = theme;
        } catch (err) {
          console.error('Instagram poszt hiba:', err.message);
          out.ig = { status: 'error', error: err.message };
        }
      } else out.ig = { status: 'not-configured' };
      out.slot = slot;
      return out;
    },
    { ttlMs: 55000, waitMs: 0 }
  );
  if (!locked) return { date, busy: true };
  return locked.value;
}

// A szókereső + szólánc poszt adatai: a nap 3x3-as rácsa és a Szólánc kezdő- és célszava.
export async function comboFor(date) {
  try {
    const [{ szoForDate }, { szolancForDate }] = await Promise.all([import('./szo'), import('./szolancStore')]);
    const szo = await szoForDate(date, { create: true });
    const lanc = await szolancForDate(date);
    if (!szo?.grid || !lanc?.start) return null;
    return { grid: szo.grid, words: Array.isArray(szo.required) ? szo.required.length : 0, start: lanc.start, end: lanc.end };
  } catch (err) {
    console.error('Szókereső/szólánc poszt adatai:', err.message);
    return null;
  }
}

// A heti mini keresztrejtvény posztja (hetente egyszer, a hét első cron-futásakor). Saját jelzők
// (social:minifb:<hét>, social:miniig:<hét>), így a napi poszttól függetlenül egyszer megy ki.
export function miniCaptions(siteUrl) {
  const host = siteUrl.replace(/^https?:\/\//, '');
  return {
    fb: `Heti mini keresztrejtvény\n\nFejtsd meg! A link az első hozzászólásban.\n\n#minikeresztrejtvény #keresztrejtvény #rejtvény #napititkos`,
    fbComment: `Itt tudod megfejteni: ${siteUrl}/mini`,
    ig: `Heti mini keresztrejtvény\n\nFejtsd meg a ${host} oldalon – a link a profilban!\n\n#minikeresztrejtvény #keresztrejtvény #rejtvény #fejtörő #napititkos`,
  };
}

export async function runMiniPost({ week, weekIndex, siteUrl, pollMs }) {
  const cfg = socialConfig();
  const text = miniCaptions(siteUrl);
  // A heti mini is a közös világos/sötét ritmusban (a napi posztok után következik).
  const img = (fmt, theme) => `${siteUrl}/api/social/mini-card?f=${fmt}&t=${theme}&w=${week}`;
  if (isDryRun()) {
    const tf = await peekTheme('fb', `social:minifb:${week}`, 0);
    const ti = await peekTheme('ig', `social:miniig:${week}`, 0);
    return { dryRun: true, week, fb: { theme: tf, image: img('fb', tf), caption: text.fb, comment: text.fbComment }, ig: { theme: ti, image: img('ig', ti), caption: text.ig } };
  }
  const out = { week };
  if (cfg.fb) {
    try {
      const st = (await kv.get(`social:minifb:${week}`)) || {};
      const theme = st.postId && !st.theme ? 'dark' : await themeFor('fb', `social:minifb:${week}`);
      out.fb = await postFacebook({ date: week, image: img('fb', theme), caption: text.fb, comment: text.fbComment, key: `social:minifb:${week}` });
    } catch (err) {
      console.error('Facebook mini poszt hiba:', err.message);
      out.fb = { status: 'error', error: err.message };
    }
  } else out.fb = { status: 'not-configured' };
  if (cfg.ig) {
    try {
      const sti = (await kv.get(`social:miniig:${week}`)) || {};
      const theme = sti.mediaId && !sti.theme ? 'dark' : await themeFor('ig', `social:miniig:${week}`);
      out.ig = await postInstagram({ date: week, image: img('ig', theme), caption: text.ig, pollMs, key: `social:miniig:${week}` });
    } catch (err) {
      console.error('Instagram mini poszt hiba:', err.message);
      out.ig = { status: 'error', error: err.message };
    }
  } else out.ig = { status: 'not-configured' };
  return out;
}
