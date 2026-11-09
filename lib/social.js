import { createHash, timingSafeEqual } from 'node:crypto';
import { kv } from './kv';
import { enumerationFor, huDate } from './format';
import { themeForDay } from './socialTheme';

// Napi automatikus poszt a Facebook oldalra és az Instagramra (Meta Graph API).
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

export function captions({ clue, answer, submittedBy, difficulty, date, siteUrl }) {
  const line = `„${String(clue || '').trim()}” ${enumerationFor(String(answer || '').trim())}`;
  const by = String(submittedBy || '').trim();
  const byLine = by ? `\nBeküldte: ${by}` : '';
  const d = Number(difficulty);
  const diffLine = Number.isInteger(d) && d >= 1 && d <= 5 ? `\nNehézség: ${d}/5` : '';
  const day = huDate(date);
  const host = siteUrl.replace(/^https?:\/\//, '');
  return {
    fb: `🔐 Mai rejtvényünk – ${day}\n\n${line}${byLine}${diffLine}\n\nFejtsd meg! A link az első hozzászólásban. 👇\n\n${HASHTAGS}`,
    fbComment: `Itt tudod megfejteni: ${siteUrl}`,
    ig: `🔐 Mai rejtvényünk – ${day}\n\n${line}${byLine}${diffLine}\n\nFejtsd meg a ${host} oldalon – a link a profilban! 🐏\n\n${HASHTAGS}`,
  };
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
  if (!st.commentId) {
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

// Egy futás: platformonként külön, hogy az egyik hibája ne akadályozza a másikat, és a jelzők
// miatt egy ismételt futás (pl. kézi újraindítás aznap) se posztoljon duplán.
export async function runSocialPost({ date, siteUrl, pollMs }) {
  const cfg = socialConfig();
  const found = await socialEntryFor(date);
  if (!found) return { date, error: 'not-found' };
  const { entry, dayNumber } = found;
  const theme = themeForDay(dayNumber);
  const v = cardVersion(entry, theme);
  const text = captions({ clue: entry.clue, answer: entry.answer, submittedBy: entry.submittedBy, difficulty: entry.difficulty, date, siteUrl });
  const images = { fb: cardUrl(siteUrl, date, 'fb', v), ig: cardUrl(siteUrl, date, 'ig', v) };

  if (isDryRun()) {
    return {
      dryRun: true,
      date,
      theme,
      configured: cfg,
      fb: { image: images.fb, caption: text.fb, comment: text.fbComment },
      ig: { image: images.ig, caption: text.ig },
    };
  }

  const locked = await kv.withLock(
    'social-post',
    async () => {
      const out = { date };
      if (cfg.fb) {
        try {
          out.fb = await postFacebook({ date, image: images.fb, caption: text.fb, comment: text.fbComment });
        } catch (err) {
          console.error('Facebook poszt hiba:', err.message);
          out.fb = { status: 'error', error: err.message };
        }
      } else out.fb = { status: 'not-configured' };
      if (cfg.ig) {
        try {
          out.ig = await postInstagram({ date, image: images.ig, caption: text.ig, pollMs });
        } catch (err) {
          console.error('Instagram poszt hiba:', err.message);
          out.ig = { status: 'error', error: err.message };
        }
      } else out.ig = { status: 'not-configured' };
      return out;
    },
    { ttlMs: 55000, waitMs: 0 }
  );
  if (!locked) return { date, busy: true };
  return locked.value;
}

// A heti mini keresztrejtvény posztja (hetente egyszer, a hét első cron-futásakor). Saját jelzők
// (social:minifb:<hét>, social:miniig:<hét>), így a napi poszttól függetlenül egyszer megy ki.
export function miniCaptions(siteUrl) {
  const host = siteUrl.replace(/^https?:\/\//, '');
  return {
    fb: `🧩 Heti mini keresztrejtvény\n\nFejtsd meg! A link az első hozzászólásban. 👇\n\n#minikeresztrejtvény #keresztrejtvény #rejtvény #napititkos`,
    fbComment: `Itt tudod megfejteni: ${siteUrl}/mini`,
    ig: `🧩 Heti mini keresztrejtvény\n\nFejtsd meg a ${host} oldalon – a link a profilban! 🐏\n\n#minikeresztrejtvény #keresztrejtvény #rejtvény #fejtörő #napititkos`,
  };
}

export async function runMiniPost({ week, weekIndex, siteUrl, pollMs }) {
  const cfg = socialConfig();
  const theme = themeForDay(weekIndex);
  const text = miniCaptions(siteUrl);
  const images = { fb: `${siteUrl}/api/social/mini-card?f=fb&t=${theme}&w=${week}`, ig: `${siteUrl}/api/social/mini-card?f=ig&t=${theme}&w=${week}` };
  if (isDryRun()) return { dryRun: true, week, theme, fb: { image: images.fb, caption: text.fb, comment: text.fbComment }, ig: { image: images.ig, caption: text.ig } };
  const out = { week };
  if (cfg.fb) {
    try {
      out.fb = await postFacebook({ date: week, image: images.fb, caption: text.fb, comment: text.fbComment, key: `social:minifb:${week}` });
    } catch (err) {
      console.error('Facebook mini poszt hiba:', err.message);
      out.fb = { status: 'error', error: err.message };
    }
  } else out.fb = { status: 'not-configured' };
  if (cfg.ig) {
    try {
      out.ig = await postInstagram({ date: week, image: images.ig, caption: text.ig, pollMs, key: `social:miniig:${week}` });
    } catch (err) {
      console.error('Instagram mini poszt hiba:', err.message);
      out.ig = { status: 'error', error: err.message };
    }
  } else out.ig = { status: 'not-configured' };
  return out;
}
