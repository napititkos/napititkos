// Helyi végpontok közötti próba II.: rejtvény-kiadás, rotáció, ranglista, statisztika, validáció,
// fiókkezelés, korlátok. (futtatás: npm run test:e2e)
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
const lbGet = async (q = '') => (await fetch(BASE + `/api/leaderboard${q}`)).json();
const stGet = async (q = `?date=${budapestToday}`) => (await fetch(BASE + `/api/stats${q}`)).json();

// ---------------------------------------------------------------- előkészítés
const allKeys = await redis.keys('*'); if (allKeys.length) await redis.del(...allKeys);
const puzzles = [
  { id: 'pz1', clue: 'Szamár kalandozás közben üdítőre szomjazik.', answer: 'MÁRKA', answerWords: ['MÁRKA'], parHints: 2, submittedBy: 'Anna', submittedByEmail: 'szerzo@example.hu', scheduledDate: '',
    hints: { definicio: { enabled: true, text: 'A definíció az üdítő.' }, indikator: { enabled: true, text: 'A mutató a közben.' }, fodder: { enabled: false, text: '' }, alternativ: { enabled: false, text: '' }, betu: { enabled: true } } },
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
check("CSP: frame-ancestors 'none', object-src 'none', worker-src blob, nincs külső script", /frame-ancestors 'none'/.test(h('content-security-policy')) && /object-src 'none'/.test(h('content-security-policy')) && /worker-src 'self' blob:/.test(h('content-security-policy')) && !/script-src[^;]*https:/.test(h('content-security-policy')));
check('nincs X-Powered-By', !h('x-powered-by'));
const html = await r.text();
check('az oldal nem tölt külső (Google) betűtípust', !html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
r = await fetch(BASE + '/admin'); check('/admin: X-Robots-Tag noindex', /noindex/.test(h('x-robots-tag')));
r = await fetch(BASE + '/api/puzzle'); check('/api/*: X-Robots-Tag noindex', /noindex/.test(h('x-robots-tag')));

// ---------------------------------------------------------------- RÉJTVÉNY KIADÁSA, ROTÁCIÓ
section('Rejtvény kiadása');
let p = await getPuzzle();
const body = JSON.stringify(p);
check('200, a játékhoz szükséges mezők megvannak (clue, answer, hints, dátum)', p.puzzle?.answer === 'MÁRKA' && p.puzzle?.clue?.startsWith('Szamár') && p.puzzle?.hints?.definicio?.text === 'A definíció az üdítő.' && p.date === budapestToday, body.slice(0, 200));
check('a beküldő e-mail-címe nem kerül ki a látogatókhoz', !body.includes('szerzo@example.hu') && p.puzzle.submittedByEmail === undefined);
check('az admin időzítése (scheduledDate) nem kerül ki', p.puzzle.scheduledDate === undefined && !body.includes('scheduledDate'));
check('a szerző neve megjelenik (Beküldte: ...)', p.puzzle.submittedBy === 'Anna');
r = await fetch(BASE + '/api/puzzle'); check('Cache-Control: no-store', h('cache-control') === 'no-store');

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
check('az archívum nem tartalmaz e-mail-címet', !JSON.stringify(archive).includes('example.hu'));

// ---------------------------------------------------------------- STATISZTIKA
section('Statisztika: ellenőrzött bemenet, Redis-számlálók');
r = await post('/api/stats', { hintsUsed: 2, correct: true }); check('érvényes küldés: 200', r.status === 200);
r = await post('/api/stats', { hintsUsed: 2, correct: false }); check('feladott játék: 200', r.status === 200);
let st = await stGet();
check('2 játék, 1 helyes, átlag 2', st.completions === 2 && st.correctCount === 1 && st.average === 2, JSON.stringify(st));
for (const bad of [{ hintsUsed: -1 }, { hintsUsed: 999 }, { hintsUsed: 'x' }, { hintsUsed: 1.5 }, {}, { correct: true }]) {
  r = await post('/api/stats', bad); check(`hibás bemenet elutasítva: ${JSON.stringify(bad)}`, r.status === 400, `(${r.status})`);
}
r = await post('/api/stats', 'nem json'); check('hibás JSON: 400', r.status === 400);
r = await post('/api/stats', { date: 'leaderboard:*', hintsUsed: 0, correct: true });
check('a kliens dátuma figyelmen kívül marad (nem hoz létre tetszőleges kulcsot)', r.status === 200 && (await redis.keys('stats:h:*')).join() === `stats:h:${budapestToday}`, (await redis.keys('stats:h:*')).join());
check('a statisztika-kulcsnak van lejárata (TTL)', (await redis.ttl(`stats:h:${budapestToday}`)) > 0);
const par = await Promise.all(Array.from({ length: 20 }, () => post('/api/stats', { hintsUsed: 1, correct: true })));
st = await stGet();
check('20 párhuzamos küldés közül egy sem vész el (natív számláló)', par.every((x) => x.status === 200) && st.completions === 23, JSON.stringify(st));
await redis.set('stats:2026-01-01', JSON.stringify({ completions: 4, totalHints: 8, correctCount: 3 }));
st = await stGet('?date=2026-01-01');
check('régi formátumú statisztika még olvasható', st.completions === 4 && st.correctCount === 3 && st.average === 2, JSON.stringify(st));
st = await stGet('?date=stats:*');
check('érvénytelen dátum a mai napra esik vissza', st.completions === 23);

// ---------------------------------------------------------------- RANGLISTA
section('Ranglista: ellenőrzött bemenet, hamisítás ellen');
const guest = 'Gyors' + String.fromCharCode(0x200b) + 'Róka#AB12' + String.fromCharCode(1);
r = await post('/api/leaderboard', { name: guest, hintsUsed: 2, elapsed: 5000 }); check('érvényes küldés: 200', r.status === 200);
for (const bad of [{ hintsUsed: 'x', elapsed: 1 }, { hintsUsed: -1, elapsed: 1 }, { hintsUsed: 21, elapsed: 1 }, { hintsUsed: 1, elapsed: -5 }, { hintsUsed: 1 }, { elapsed: 1 }, {}]) {
  r = await post('/api/leaderboard', { name: 'X', ...bad }); check(`hibás bemenet elutasítva: ${JSON.stringify(bad)}`, r.status === 400, `(${r.status})`);
}
r = await post('/api/leaderboard', 'nem json'); check('hibás JSON: 400', r.status === 400);
r = await post('/api/leaderboard', 'x'.repeat(5000)); check('túl nagy törzs: 400', r.status === 400);
r = await post('/api/leaderboard', { name: guest, hintsUsed: 0, elapsed: 1 });
check('ugyanaz a név másodszor: nem javíthatja az eredményét (NX)', r.status === 200);
r = await post('/api/leaderboard', { date: 'leaderboard:*', name: 'Másik Játékos', hintsUsed: 1, elapsed: 90000 });
check('a kliens dátuma figyelmen kívül marad', r.status === 200 && (await redis.keys('leaderboard:z:*')).join() === `leaderboard:z:${budapestToday}`, (await redis.keys('leaderboard:z:*')).join());
let lb = await lbGet();
check('a ranglista rendezett: kevesebb tipp előre, a névből a láthatatlan karakterek kiestek', lb.entries.length === 2 && lb.entries[0].name === 'Másik Játékos' && lb.entries[0].hintsUsed === 1 && lb.entries[1].name === 'GyorsRóka#AB12' && lb.entries[1].hintsUsed === 2 && lb.entries[1].elapsed === 5000, JSON.stringify(lb));
await post('/api/leaderboard', { name: 'x'.repeat(200), hintsUsed: 3, elapsed: 1000 });
lb = await lbGet();
check('a név legfeljebb 30 karakter', lb.entries.every((e) => e.name.length <= 30));
lb = await lbGet('?date=leaderboard:*');
check('érvénytelen dátum a mai napra esik vissza, nem hoz létre kulcsot', Array.isArray(lb.entries) && (await redis.keys('leaderboard:z:leaderboard*')).length === 0);
const zk = await redis.keys('leaderboard:z:*');
check('a ranglista kulcsának van lejárata (TTL)', (await redis.ttl(zk[0])) > 0);
await redis.set('leaderboard:2026-01-01', JSON.stringify([{ name: 'Régi B', hintsUsed: 1, elapsed: 9000 }, { name: 'Régi A', hintsUsed: 0, elapsed: 8000 }]));
lb = await lbGet('?date=2026-01-01');
check('régi formátumú ranglista még olvasható, rendezve', lb.entries.length === 2 && lb.entries[0].name === 'Régi A', JSON.stringify(lb));

// ---------------------------------------------------------------- FIÓKOK
section('Bejelentkezett játékos a ranglistán, haladás, export, törlés');
const UEMAIL = 'jatekos@example.hu';
const PW = 'Jatekos-Jelszo-1';
const u = await seedUser(UEMAIL, PW);
const lg = await credLogin(UEMAIL, PW);
check('belépés', lg.ok && lg.session.user.verified === true);
const cookie = { cookie: lg.jar.header() };
r = await post('/api/leaderboard', { name: 'Hamis Név', hintsUsed: 0, elapsed: 4000 }, cookie); check('ranglista: 200', r.status === 200);
lb = await lbGet();
check('a név a fiókból jön, nem a kliensből; az e-mail nem jelenik meg', lb.entries.some((e) => e.name === 'Teszt Elek') && !JSON.stringify(lb).includes('example.hu') && !JSON.stringify(lb).includes('Hamis Név'), JSON.stringify(lb));
const noName = await seedUser('nevtelen@example.hu', 'Nevtelen-Jelszo-1', { name: null });
const lg2 = await credLogin('nevtelen@example.hu', 'Nevtelen-Jelszo-1');
await post('/api/leaderboard', { name: 'X', hintsUsed: 4, elapsed: 3000 }, { cookie: lg2.jar.header() });
lb = await lbGet();
check('név nélküli fióknál az e-mail helyi része látszik (nem a teljes cím)', lb.entries.some((e) => e.name === 'nevtelen') && !JSON.stringify(lb).includes('@'), JSON.stringify(lb));

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
lb = await lbGet();
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
check('a biztonsági másolat a régi tartalmat adja vissza', old.puzzles.length === 2 && old.puzzles[0].hints.definicio.text === 'A definíció az üdítő.');
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
for (let i = 0; i < 10; i++) await credLogin(V, 'rossz-jelszo-' + i);
check('10 hibás jelszó után a HELYES jelszó sem enged be (zárolt)', !(await credLogin(V, 'Helyes-Jelszo-123')).ok);
const V2 = 'masik@example.hu';
await seedUser(V2, 'Masik-Jelszo-123');
check('egy másik fiók belépése nem érintett', (await credLogin(V2, 'Masik-Jelszo-123')).ok);
await redis.del(`rl:login:email:${V}`);
check('a zárolás feloldása után (számláló törlése) a helyes jelszó működik', (await credLogin(V, 'Helyes-Jelszo-123')).ok);
// A ranglista-küldés címenként óránként 30: a korábbi küldésekkel együtt számoljuk.
const lbKeys = await redis.keys('rl:lb:ip:*');
const before = lbKeys.length ? Number(await redis.get(lbKeys[0])) : 0;
const lbs = [];
for (let i = 0; i < 35; i++) lbs.push((await post('/api/leaderboard', { name: `Spam ${i}`, hintsUsed: 1, elapsed: 1000 + i })).status);
check('ranglista: a címenkénti óránkénti 30 küldés után 429', lbs.filter((s) => s === 200).length === 30 - before && lbs.filter((s) => s === 429).length === 35 - (30 - before), `(${before}) ${JSON.stringify(lbs)}`);

console.log(`\nÖsszesen: ${pass} sikeres, ${fail} hibás`);
await redis.quit();
process.exit(fail ? 1 : 0);
