// Helyi végpontok közötti próba II.: játékmenet, ranglista, statisztika, validáció, fiókkezelés, korlátok. (futtatás: npm run test:e2e)
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const REPO = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '');
const require = createRequire(`${REPO}/package.json`);
const ioredis = require('ioredis');
const Redis = ioredis.default || ioredis.Redis || ioredis;
const { hashPassword } = await import(pathToFileURL(`${REPO}/lib/password.js`).href);

const BASE = 'http://localhost:3100';
const ADMIN_PW = 'Helyi-Admin-Jelszo-1';
const redis = new Redis('redis://127.0.0.1:6390');

let pass = 0; let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  OK    ${name}`); } else { fail++; console.log(`  HIBA  ${name} ${extra}`); }
}
const section = (t) => console.log(`\n== ${t}`);
const post = (path, body, headers = {}) =>
  fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const budapestToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function newJar() {
  const jar = {};
  return {
    take(res) { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); const v = kv.slice(i + 1); if (v === '') delete jar[kv.slice(0, i)]; else jar[kv.slice(0, i)] = v; } },
    header() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); },
  };
}
async function credLogin(email, password) {
  const jar = newJar();
  let r = await fetch(BASE + '/api/auth/csrf'); jar.take(r);
  const { csrfToken } = await r.json();
  r = await fetch(BASE + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() }, body: new URLSearchParams({ csrfToken, email, password, json: 'true' }) });
  jar.take(r);
  const s = await (await fetch(BASE + '/api/auth/session', { headers: { cookie: jar.header() } })).json();
  return { jar, session: s, ok: !!s?.user?.email };
}
const seedUser = async (email, pw, extra = {}) => {
  const id = 'u' + Math.random().toString(36).slice(2, 8);
  const user = { id, email, name: 'Teszt Elek', image: null, emailVerified: new Date().toISOString(), role: 'user', passwordHash: await hashPassword(pw), ...extra };
  await redis.set(`au:user:${id}`, JSON.stringify(user));
  await redis.set(`au:userByEmail:${email}`, JSON.stringify(id));
  return user;
};
const getPuzzle = async () => (await fetch(BASE + '/api/puzzle')).json();
const game = (path, body) => post(`/api/game/${path}`, body);

// ---------------------------------------------------------------- előkészítés
const allKeys = await redis.keys('*'); if (allKeys.length) await redis.del(...allKeys);
const puzzles = [
  { id: 'pz1', clue: 'Szamár kalandozás közben üdítőre szomjazik.', answer: 'MÁRKA', answerWords: ['MÁRKA'], parHints: 2, submittedBy: 'Anna', submittedByEmail: 'szerzo@example.hu', scheduledDate: '',
    hints: { definicio: { enabled: true, text: 'TITKOS-DEFINÍCIÓ-SZÖVEG' }, indikator: { enabled: true, text: 'TITKOS-MUTATÓ' }, fodder: { enabled: false, text: '' }, alternativ: { enabled: false, text: '' }, betu: { enabled: true } } },
  { id: 'pz2', clue: 'Második rejtvény.', answer: 'ALMA FA', parHints: 1, hints: { betu: { enabled: true } } },
];
await redis.set('puzzles:list', JSON.stringify(puzzles));

// ---------------------------------------------------------------- BIZTONSÁGI FEJLÉCEK
section('Biztonsági fejlécek');
let r = await fetch(BASE + '/');
const h = (n) => r.headers.get(n) || '';
check('X-Content-Type-Options: nosniff', h('x-content-type-options') === 'nosniff');
check('X-Frame-Options: DENY', h('x-frame-options') === 'DENY');
check('Referrer-Policy beállítva', h('referrer-policy') === 'strict-origin-when-cross-origin');
check('Permissions-Policy beállítva', h('permissions-policy').includes('camera=()'));
check("CSP: frame-ancestors 'none', object-src 'none', nincs külső script", /frame-ancestors 'none'/.test(h('content-security-policy')) && /object-src 'none'/.test(h('content-security-policy')) && !/script-src[^;]*https:/.test(h('content-security-policy')));
check('nincs X-Powered-By', !h('x-powered-by'));
const html = await r.text();
check('az oldal nem tölt külső (Google) betűtípust', !html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
r = await fetch(BASE + '/admin'); check('/admin: X-Robots-Tag noindex', /noindex/.test(h('x-robots-tag')));
r = await fetch(BASE + '/api/puzzle'); check('/api/*: X-Robots-Tag noindex', /noindex/.test(h('x-robots-tag')));

// ---------------------------------------------------------------- RÉJTVÉNY KIADÁSA, ROTÁCIÓ
section('Rejtvény kiadása: a megfejtés nem szivárog');
let p = await getPuzzle();
const body = JSON.stringify(p);
check('200 és van token, mask, dátum', !!p.token && p.puzzle?.mask === '_____' && p.date === budapestToday, JSON.stringify(p).slice(0, 200));
check('a válasz nem tartalmazza a megfejtést', !/MÁRKA|márka/i.test(body));
check('a válasz nem tartalmazza a tipp-szövegeket', !body.includes('TITKOS'));
check('a válasz nem tartalmazza a beküldő e-mailjét és az időzítést', !body.includes('szerzo@example.hu') && !body.includes('scheduledDate'));
check('a tipp-jelzők megvannak (definicio be, fodder ki)', p.puzzle.hints.definicio.enabled === true && p.puzzle.hints.fodder.enabled === false);
r = await fetch(BASE + '/api/puzzle'); check('Cache-Control: no-store', h('cache-control') === 'no-store');
check('a token szerver oldali aláírású (két lekérés két token)', (await getPuzzle()).token !== p.token);

section('Rotáció: párhuzamos kérések nem duplázzák az előzményt');
await redis.del('rotation:state', 'rotation:usedIds', 'rotation:history');
const many = await Promise.all(Array.from({ length: 12 }, () => getPuzzle()));
const ids = new Set(many.map((m) => m.puzzle?.id));
const history = JSON.parse((await redis.get('rotation:history')) || '[]');
check('12 párhuzamos kérés ugyanazt a rejtvényt adja', ids.size === 1, JSON.stringify([...ids]));
check('az előzményben pontosan egy bejegyzés van', history.length === 1, `(${history.length})`);
check('az előzmény dátuma budapesti mai nap', history[0]?.shownDate === budapestToday);
check('nincs megmaradt zár', (await redis.keys('lock:*')).length === 0);
const archive = await (await fetch(BASE + '/api/archive')).json();
r = await fetch(BASE + '/api/archive');
check('archívum: az aktív rejtvény nincs benne, gyorsítótár-fejléc van', archive.archive.length === 0 && /s-maxage=60/.test(h('cache-control')));

// ---------------------------------------------------------------- JÁTÉKMENET
section('Tippek és ellenőrzés a szerveren');
p = await getPuzzle();
const T = p.token;
r = await game('hint', { token: 'hamis.token', type: 'definicio' }); check('hamis token: 400', r.status === 400);
r = await game('hint', { token: T, type: 'valami' }); check('ismeretlen tipptípus: 400', r.status === 400);
r = await game('hint', { token: T, type: 'fodder' }); check('kikapcsolt tipp: 403', r.status === 403);
r = await game('hint', { token: T, type: 'definicio' });
let d = await r.json();
check('szöveges tipp: a szerver adja ki a szöveget', r.status === 200 && d.text === 'TITKOS-DEFINÍCIÓ-SZÖVEG');
await game('hint', { token: T, type: 'definicio' });
const empty = ['', '', '', '', ''];
r = await game('hint', { token: T, type: 'betu', guess: empty });
d = await r.json();
check('betű-tipp: pozíció és a helyes betű', d.pos >= 0 && d.pos < 5 && d.letter === 'MÁRKA'[d.pos], JSON.stringify(d));
const full = ['M', 'Á', 'R', 'K', 'A'];
r = await game('hint', { token: T, type: 'betu', guess: full });
d = await r.json();
check('kész megfejtésnél nincs több betű (pos: null)', d.pos === null);
r = await game('guess', { token: T, guess: 'ALMA' }); d = await r.json();
check('rossz válasz: correct=false, nem szivárog a megoldás', d.correct === false && !JSON.stringify(d).includes('MÁRKA'));
r = await game('guess', { token: T, guess: 'márka' }); d = await r.json();
check('helyes válasz (kisbetűvel is): correct + megfejtés + szerver mérte adatok', d.correct === true && d.answer === 'MÁRKA' && d.hintsUsed === 2 && d.elapsed >= 0 && d.elapsed < 60000, JSON.stringify(d));
const solved = d;
r = await game('guess', { token: T, guess: 'márka' }); d = await r.json();
check('másodszori helyes válasz ugyanazt adja (idempotens)', d.correct === true && d.hintsUsed === solved.hintsUsed && d.elapsed === solved.elapsed);
r = await game('hint', { token: T, type: 'indikator' }); check('befejezett játékban tipp: 409', r.status === 409);
let st = await (await fetch(BASE + `/api/stats?date=${budapestToday}`)).json();
check('statisztika: 1 megfejtő, átlag = a szerver számolt tippek', st.completions === 1 && st.correctCount === 1 && st.average === 2, JSON.stringify(st));

section('Feladás');
const G = (await getPuzzle()).token;
await game('hint', { token: G, type: 'indikator' });
r = await game('giveup', { token: G }); d = await r.json();
check('feladás: a szerver kiadja a megfejtést', r.status === 200 && d.answer === 'MÁRKA');
r = await game('guess', { token: G, guess: 'MÁRKA' }); check('feladás után tipp: 409', r.status === 409);
st = await (await fetch(BASE + `/api/stats?date=${budapestToday}`)).json();
check('statisztika: 2 játék, 1 helyes, átlag (2+2)/2', st.completions === 2 && st.correctCount === 1 && st.average === 2, JSON.stringify(st));
r = await post('/api/leaderboard', { token: G, name: 'Csaló' }); check('feladott játékkal nem lehet ranglistára kerülni: 400', r.status === 400);

section('Ranglista: hamisíthatatlan');
r = await post('/api/leaderboard', { date: budapestToday, name: 'Csaló', hintsUsed: 0, elapsed: 1 }); check('token nélküli (régi típusú) küldés: 400', r.status === 400);
r = await post('/api/leaderboard', { token: 'hamis.token', name: 'X' }); check('hamis token: 400', r.status === 400);
const U = (await getPuzzle()).token;
r = await post('/api/leaderboard', { token: U, name: 'X' }); check('megfejtetlen játék: 400', r.status === 400);
r = await post('/api/leaderboard', { token: T, name: 'Gyors\u200bRóka#AB12\u0001' }); check('megfejtett játék: 200', r.status === 200);
r = await post('/api/leaderboard', { token: T, name: 'Másik' }); check('ugyanaz a játék másodszor: 200, de nem kerül fel újra', r.status === 200);
let lb = await (await fetch(BASE + '/api/leaderboard')).json();
check('a ranglistán egy bejegyzés van, tisztított névvel és a szerver adataival', lb.entries.length === 1 && lb.entries[0].name === 'GyorsRóka#AB12' && lb.entries[0].hintsUsed === 2 && lb.entries[0].elapsed === solved.elapsed, JSON.stringify(lb));
lb = await (await fetch(BASE + '/api/leaderboard?date=leaderboard:*')).json();
check('érvénytelen dátum nem hoz létre tetszőleges kulcsot', Array.isArray(lb.entries) && (await redis.keys('leaderboard:z:leaderboard*')).length === 0);
const zk = await redis.keys('leaderboard:z:*');
check('a ranglista kulcsának van lejárata (TTL)', (await redis.ttl(zk[0])) > 0);
r = await post('/api/stats', { date: 'x', hintsUsed: 0, correct: true }); check('régi kliens statisztika-küldése: 410, hatástalan', r.status === 410);
st = await (await fetch(BASE + `/api/stats?date=${budapestToday}`)).json();
check('a statisztika nem változott', st.completions === 2);

// ---------------------------------------------------------------- FIÓKOK
section('Bejelentkezett játékos a ranglistán, haladás, export, törlés');
const UEMAIL = 'jatekos@example.hu';
const PW = 'Jatekos-Jelszo-1';
const u = await seedUser(UEMAIL, PW);
const lg = await credLogin(UEMAIL, PW);
check('belépés', lg.ok && lg.session.user.verified === true);
const cookie = { cookie: lg.jar.header() };
const T2 = (await getPuzzle()).token;
await game('guess', { token: T2, guess: 'MÁRKA' });
r = await post('/api/leaderboard', { token: T2, name: 'Hamis Név' }, cookie); check('ranglista: 200', r.status === 200);
lb = await (await fetch(BASE + '/api/leaderboard')).json();
check('a név a fiókból jön, nem a kliensből; az e-mail nem jelenik meg', lb.entries.some((e) => e.name === 'Teszt Elek') && !JSON.stringify(lb).includes('example.hu') && !JSON.stringify(lb).includes('Hamis Név'), JSON.stringify(lb));

r = await post('/api/account/progress', { streak: 3 }); check('haladás mentése bejelentkezés nélkül: 401', r.status === 401);
r = await post('/api/account/progress', {
  streak: 5, best: 1e15, isAdmin: true, role: 'admin', __proto__: { x: 1 }, lastDate: budapestToday,
  history: { [budapestToday]: { guess: ['A'], lockedLetters: [true], revealed: ['definicio', 'kamu'], betuCount: 1, correct: true, gaveUp: false, elapsed: 5000, junk: 'x' }, 'leaderboard:*': { guess: [] } },
}, cookie);
check('haladás mentése: 200', r.status === 200);
const storedProgress = JSON.parse(await redis.get(`progress:${u.id}`));
check('a tárolt haladás megtisztított (nincs idegen mező, korlátozott számok)', storedProgress.isAdmin === undefined && storedProgress.role === undefined && storedProgress.best === 100000 && Object.keys(storedProgress.history).length === 1 && storedProgress.history[budapestToday].junk === undefined && storedProgress.history[budapestToday].revealed.length === 1, JSON.stringify(storedProgress).slice(0, 200));
r = await post('/api/account/progress', '{"streak":"' + 'x'.repeat(70000) + '"}', cookie); check('túl nagy haladás-törzs: 400', r.status === 400);
r = await post('/api/account/progress', 'nem json', cookie); check('hibás JSON: 400', r.status === 400);
r = await post('/api/account/tutorial', { szojatek: 99, betujatek: 1, hack: 1 }, cookie); check('tutorial mentése: 200', r.status === 200);
const storedTut = JSON.parse(await redis.get(`tutorial:${u.id}`));
check('tutorial: csak ismert szakaszok, maximumra vágva', storedTut.hack === undefined && storedTut.szojatek === 1 && storedTut.betujatek === 1, JSON.stringify(storedTut));

// beküldések
r = await post('/api/submissions', { clue: 'Kérdés?', answer: 'VÁLASZ', hints: { definicio: 'd' } }, cookie); check('rejtvény beküldése: 200', r.status === 200);
const submissions = await Promise.all(Array.from({ length: 5 }, (_, i) => post('/api/submissions', { clue: `Párhuzamos ${i}`, answer: 'SZÓ' }, cookie)));
const subs = JSON.parse(await redis.get('submissions:list'));
check('párhuzamos beküldések közül egy sem vész el (zár)', submissions.every((x) => x.status === 200) && subs.length === 6, `(${subs.length})`);
r = await post('/api/submissions', { clue: '', answer: '' }, cookie); check('üres beküldés: 400', r.status === 400);

// export
r = await fetch(BASE + '/api/account/export'); check('export bejelentkezés nélkül: 401', r.status === 401);
r = await fetch(BASE + '/api/account/export', { headers: cookie });
const exp = await r.text();
check('export: letölthető JSON a saját adatokkal, jelszó-hash nélkül', r.status === 200 && /attachment/.test(r.headers.get('content-disposition') || '') && exp.includes(UEMAIL) && !exp.includes('passwordHash') && !exp.includes(u.passwordHash.slice(0, 20)) && JSON.parse(exp).submissions.length === 6, exp.slice(0, 200));

// törlés: a szerző e-mailje egy közzétett rejtvényen
const pl = JSON.parse(await redis.get('puzzles:list'));
pl[0].submittedBy = 'Teszt Elek'; pl[0].submittedByEmail = UEMAIL;
await redis.set('puzzles:list', JSON.stringify(pl));
r = await post('/api/account/delete', {}); check('törlés bejelentkezés nélkül: 401', r.status === 401);
r = await post('/api/account/delete', {}, cookie); check('törlés megerősítés nélkül: 400', r.status === 400);
r = await post('/api/account/delete', { confirm: true }, cookie); check('törlés: 200', r.status === 200);
check('a fiók, az e-mail-index, a haladás és a tutorial törölve', !(await redis.get(`au:user:${u.id}`)) && !(await redis.get(`au:userByEmail:${UEMAIL}`)) && !(await redis.get(`progress:${u.id}`)) && !(await redis.get(`tutorial:${u.id}`)));
check('a beküldései törölve', JSON.parse((await redis.get('submissions:list')) || '[]').length === 0);
const pl2 = JSON.parse(await redis.get('puzzles:list'));
check('a közzétett rejtvényen nincs név és e-mail, a szöveg megmaradt', pl2[0].submittedBy === '' && pl2[0].submittedByEmail === '' && pl2[0].clue.startsWith('Szamár'));
lb = await (await fetch(BASE + '/api/leaderboard')).json();
check('a ranglista-bejegyzései törölve', !lb.entries.some((e) => e.name === 'Teszt Elek'), JSON.stringify(lb));
check('törlés után nem lehet belépni', !(await credLogin(UEMAIL, PW)).ok);

// ---------------------------------------------------------------- ADMIN: rejtvénylista
section('Admin: rejtvénylista ellenőrzés és mentés');
let rr = await post('/api/admin/login', { password: ADMIN_PW });
const adm = { cookie: `__Host-admin_session=${rr.headers.getSetCookie().find((c) => c.startsWith('__Host-admin_session=')).split(';')[0].split('=')[1]}` };
r = await post('/api/admin/puzzles', { puzzles: 'nem lista' }, adm); check('nem lista: 400', r.status === 400);
r = await post('/api/admin/puzzles', { puzzles: [puzzles[0], puzzles[0]] }, adm); check('duplikált azonosító: 400', r.status === 400);
r = await post('/api/admin/puzzles', { puzzles: [{ clue: 'nincs id' }] }, adm); check('azonosító nélküli elem: 400', r.status === 400);
check('hibás mentés nem írta felül a listát', JSON.parse(await redis.get('puzzles:list')).length === 2);
r = await post('/api/admin/puzzles', { puzzles: [{ ...puzzles[0], evil: 'x', hints: { ...puzzles[0].hints, definicio: { enabled: true, text: 'Új szöveg', junk: 1 } } }, puzzles[1]] }, adm);
check('érvényes mentés: 200', r.status === 200);
const saved = JSON.parse(await redis.get('puzzles:list'));
check('a mentett lista megtisztított (nincs idegen mező)', saved[0].evil === undefined && saved[0].hints.definicio.junk === undefined && saved[0].hints.definicio.text === 'Új szöveg');
let bk = await (await fetch(BASE + '/api/admin/puzzles?backups=1', { headers: adm })).json();
check('mentés előtt biztonsági másolat készült', bk.backups.length === 1, JSON.stringify(bk));
const old = await (await fetch(BASE + `/api/admin/puzzles?backup=${bk.backups[0]}`, { headers: adm })).json();
check('a biztonsági másolat a régi tartalmat adja vissza', old.puzzles.length === 2 && old.puzzles[0].hints.definicio.text === 'TITKOS-DEFINÍCIÓ-SZÖVEG');
r = await fetch(BASE + '/api/admin/puzzles?backup=../../x', { headers: adm }); check('hibás másolat-azonosító: 400', r.status === 400);
r = await fetch(BASE + '/api/admin/puzzles?backups=1'); check('másolatok admin süti nélkül: 401', r.status === 401);
r = await fetch(BASE + '/api/admin/users', { headers: adm });
const users = await r.json();
check('felhasználólista (SCAN + MGET): 200, jelszó-hash nélkül', r.status === 200 && Array.isArray(users.users) && !JSON.stringify(users).includes('passwordHash'));

// ---------------------------------------------------------------- KORLÁTOK
section('Korlátok');
const limited = [];
for (let i = 0; i < 4; i++) limited.push((await post('/api/auth/register', { email: 'sok@example.hu', password: 'Hosszu-Jelszo-1' })).status);
check('regisztráció: címenként a 4. kérés 429', limited.slice(0, 3).every((s) => s === 200) && limited[3] === 429, JSON.stringify(limited));
const V = 'zarolt@example.hu';
await seedUser(V, 'Helyes-Jelszo-123');
let last;
for (let i = 0; i < 10; i++) last = await credLogin(V, 'rossz-jelszo-' + i);
check('10 hibás jelszó után a HELYES jelszó sem enged be (zárolt)', !(await credLogin(V, 'Helyes-Jelszo-123')).ok);
const V2 = 'masik@example.hu';
await seedUser(V2, 'Masik-Jelszo-123');
check('egy másik fiók belépése nem érintett', (await credLogin(V2, 'Masik-Jelszo-123')).ok);
await redis.del(`rl:login:email:${V}`);
check('a zárolás feloldása után (számláló törlése) a helyes jelszó működik', (await credLogin(V, 'Helyes-Jelszo-123')).ok);
const gs = [];
for (let i = 0; i < 22; i++) gs.push((await game('giveup', { token: (await getPuzzle()).token })).status);
// A korábbi feladással (G) együtt összesen 20 engedélyezett naponta.
check('feladás: címenként napi 20 után 429', gs.slice(0, 19).every((s) => s === 200) && gs.slice(19).every((s) => s === 429), JSON.stringify(gs));

console.log(`\nÖsszesen: ${pass} sikeres, ${fail} hibás`);
await redis.quit();
process.exit(fail ? 1 : 0);
