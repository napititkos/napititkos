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
r = await fetch(BASE + '/api/archive');
check('archívum bejelentkezés nélkül: 401, nem gyorsítótárazható', r.status === 401 && /no-store/.test(h('cache-control')) && /private/.test(h('cache-control')));
await seedUser('archiv-olvaso@teszt.hu', 'Archiv-Jelszo-1');
const arcJar = (await credLogin('archiv-olvaso@teszt.hu', 'Archiv-Jelszo-1')).jar;
r = await fetch(BASE + '/api/archive', { headers: { cookie: arcJar.header() } });
const archive = await r.json();
check('archívum bejelentkezve: az aktív rejtvény nincs benne, a CDN nem tárolja', r.status === 200 && archive.archive.length === 0 && /private/.test(h('cache-control')) && !/s-maxage/.test(h('cache-control')));
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
await post('/api/leaderboard', { name: 'GyorsBagoly#XY12', hintsUsed: 4, elapsed: 3000 }, { cookie: lg2.jar.header() });
lb = await lbGet();
check('név nélküli fióknál a vendégnév látszik, az e-mail (vagy annak része) soha', lb.entries.some((e) => e.name === 'GyorsBagoly#XY12') && !JSON.stringify(lb).includes('nevtelen') && !JSON.stringify(lb).includes('@'), JSON.stringify(lb));

r = await post('/api/account/progress', { streak: 3 }); check('haladás mentése bejelentkezés nélkül: 401', r.status === 401);
r = await post('/api/account/progress', {
  streak: 5, best: 1e15, tutorialDone: true, sharedResult: true, isAdmin: true, role: 'admin', __proto__: { x: 1 }, lastDate: budapestToday,
  history: { [budapestToday]: { guess: ['A'], lockedLetters: [true], revealed: ['definicio', 'kamu'], betuCount: 1, correct: true, gaveUp: false, elapsed: 5000, junk: 'x' }, 'leaderboard:*': { guess: [] } },
}, cookie);
check('haladás mentése: 200', r.status === 200);
const storedProgress = JSON.parse(await redis.get(`progress:${u.id}`));
check('a tárolt haladás megtisztított (nincs idegen mező, korlátozott számok)', storedProgress.isAdmin === undefined && storedProgress.tutorialDone === true && storedProgress.sharedResult === true && storedProgress.role === undefined && storedProgress.best === 100000 && Object.keys(storedProgress.history).length === 1 && storedProgress.history[budapestToday].junk === undefined && storedProgress.history[budapestToday].revealed.length === 1, JSON.stringify(storedProgress).slice(0, 200));
r = await post('/api/account/progress', '{"streak":"' + 'x'.repeat(70000) + '"}', cookie); check('túl nagy haladás-törzs: 400', r.status === 400);
r = await post('/api/account/progress', 'nem json', cookie); check('hibás JSON: 400', r.status === 400);
r = await post('/api/account/tutorial', { szojatek: 99, betujatek: 1, hack: 1 }, cookie); check('tutorial mentése: 200', r.status === 200);
const storedTut = JSON.parse(await redis.get(`tutorial:${u.id}`));
check('tutorial: csak ismert szakaszok, maximumra vágva', storedTut.hack === undefined && storedTut.szojatek === 1 && storedTut.betujatek === 1, JSON.stringify(storedTut));

// beküldések
r = await post('/api/submissions', { clue: 'Kérdés?', answer: 'VÁLASZ', hints: { definicio: 'd' } }, cookie); check('rejtvény beküldése: 200', r.status === 200);
// Két beküldés között 2 perc (felhasználónként), ezért a zár tesztjéhez 5 különböző fiók küld párhuzamosan.
const parJars = [];
for (let i = 0; i < 5; i++) { await seedUser(`parhuzamos${i}@teszt.hu`, 'Parhuzamos-Jelszo-1'); parJars.push((await credLogin(`parhuzamos${i}@teszt.hu`, 'Parhuzamos-Jelszo-1')).jar); }
const submissions = await Promise.all(parJars.map((jar, i) => post('/api/submissions', { clue: `Párhuzamos ${i}`, answer: 'SZÓ' }, { cookie: jar.header() })));
const subs = JSON.parse(await redis.get('submissions:list'));
check('párhuzamos beküldések közül egy sem vész el (zár)', submissions.every((x) => x.status === 200) && subs.length === 6, `(${subs.length})`);
r = await post('/api/submissions', { clue: '', answer: '' }, cookie); check('üres beküldés: 400', r.status === 400);

// export
r = await fetch(BASE + '/api/account/export'); check('export bejelentkezés nélkül: 401', r.status === 401);
r = await fetch(BASE + '/api/account/export', { headers: cookie });
const exp = await r.text();
check('export: letölthető JSON a saját adatokkal, jelszó-hash nélkül', r.status === 200 && /attachment/.test(r.headers.get('content-disposition') || '') && exp.includes(UEMAIL) && !exp.includes('passwordHash') && !exp.includes(u.passwordHash.slice(0, 20)) && JSON.parse(exp).submissions.length === 1, exp.slice(0, 200));

// törlés: a szerző e-mailje egy közzétett rejtvényen
const pl = JSON.parse(await redis.get('puzzles:list'));
pl[0].submittedBy = 'Teszt Elek'; pl[0].submittedByEmail = UEMAIL;
await redis.set('puzzles:list', JSON.stringify(pl));
r = await post('/api/account/delete', {}); check('törlés bejelentkezés nélkül: 401', r.status === 401);
r = await post('/api/account/delete', {}, cookie); check('törlés megerősítés nélkül: 400', r.status === 400);
r = await post('/api/account/delete', { confirm: true }, cookie); check('törlés: 200', r.status === 200);
check('a fiók, az e-mail-index, a haladás és a tutorial törölve', !(await redis.get(`au:user:${u.id}`)) && !(await redis.get(`au:userByEmail:${UEMAIL}`)) && !(await redis.get(`progress:${u.id}`)) && !(await redis.get(`tutorial:${u.id}`)));
const subsAfterDelete = JSON.parse((await redis.get('submissions:list')) || '[]');
check('a beküldései törölve, a többiekéi megmaradtak', !subsAfterDelete.some((x) => x.submitterEmail === UEMAIL) && subsAfterDelete.length === 5, `(${subsAfterDelete.length})`);
const pl2 = JSON.parse(await redis.get('puzzles:list'));
check('a közzétett rejtvényen nincs név és e-mail, a szöveg megmaradt', pl2[0].submittedBy === '' && pl2[0].submittedByEmail === '' && pl2[0].clue.startsWith('Szamár'));
lb = await lbGet();
check('a ranglista-bejegyzései törölve', !lb.entries.some((e) => e.name === 'Teszt Elek'), JSON.stringify(lb));
check('törlés után nem lehet belépni', !(await credLogin(UEMAIL, PW)).ok);

// ---------------------------------------------------------------- ADMIN: rejtvénylista
section('Admin: rejtvénylista ellenőrzés és mentés');
await seedUser('admin2@teszt.hu', 'Admin-Fiok-Jelszo-2', { role: 'admin' });
const admAccJar = (await credLogin('admin2@teszt.hu', 'Admin-Fiok-Jelszo-2')).jar;
let rr = await post('/api/admin/login', { password: ADMIN_PW }, { cookie: admAccJar.header() });
const adm = { cookie: `__Host-admin_session=${rr.headers.getSetCookie().find((c) => c.startsWith('__Host-admin_session=')).split(';')[0].split('=')[1]}; ${admAccJar.header()}` };
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


// ---------------------------------------------------------------- KOMMENTEK
section('Kommentek');
r = await fetch(BASE + '/api/comments?count=1'); let j = await r.json();
check('darabszám vendégként is: 200, 0', r.status === 200 && j.count === 0, JSON.stringify(j));
r = await fetch(BASE + '/api/comments'); check('lista vendégként: 401 (a megfejtést is elárulhatja)', r.status === 401);
r = await post('/api/comments', { text: 'Vendég vagyok' }); check('írás vendégként: 401', r.status === 401);
await seedUser('kommentelo@teszt.hu', 'Komment-Jelszo-1', { name: 'Kommentelő Kata' });
const cA = (await credLogin('kommentelo@teszt.hu', 'Komment-Jelszo-1')).jar;
await seedUser('masik@teszt.hu', 'Komment-Jelszo-2', { name: '' });
const cB = (await credLogin('masik@teszt.hu', 'Komment-Jelszo-2')).jar;
await seedUser('nincsmeg@teszt.hu', 'Komment-Jelszo-3', { emailVerified: null });
const cC = (await credLogin('nincsmeg@teszt.hu', 'Komment-Jelszo-3')).jar;
r = await post('/api/comments', { text: 'Nem megerősített' }, { cookie: cC.header() }); check('írás megerősítetlen fiókkal: 403', r.status === 403, `(${r.status})`);
r = await post('/api/comments', { text: '   ' }, { cookie: cA.header() }); check('üres komment: 400', r.status === 400);
r = await post('/api/comments', { text: 'Szép rejtvény!\u200b\u0007', evil: 1 }, { cookie: cA.header() }); j = await r.json();
check('komment elküldve: 200', r.status === 200, `(${r.status})`);
check('a név a fiókból jön, e-mail nincs benne', j.comment?.name === 'Kommentelő Kata' && !JSON.stringify(j).includes('@'));
check('láthatatlan és vezérlőkarakterek kiszűrve', j.comment?.text === 'Szép rejtvény!');
r = await post('/api/comments', { text: 'x'.repeat(900) }, { cookie: cB.header() }); j = await r.json();
check('név nélküli fiók: "Névtelen", nem e-mail', j.comment?.name === 'Névtelen', JSON.stringify(j.comment?.name));
check('túl hosszú szöveg 500 karakterre vágva', j.comment?.text?.length === 500);
r = await fetch(BASE + '/api/comments?count=1'); check('darabszám: 2', (await r.json()).count === 2);
r = await fetch(BASE + '/api/comments', { headers: { cookie: cB.header() } }); j = await r.json();
check('lista bejelentkezve: 2 komment, uid és e-mail nélkül', j.comments?.length === 2 && !JSON.stringify(j).includes('"uid"') && !JSON.stringify(j).includes('@'));
check('a saját komment "mine" jelölést kap', j.comments?.[1]?.mine === true && j.comments?.[0]?.mine === false);
const firstId = j.comments[0].id;
r = await fetch(BASE + `/api/comments?date=${budapestToday}&id=${firstId}`, { method: 'DELETE', headers: { cookie: cB.header() } });
check('más kommentjének törlése: 403', r.status === 403, `(${r.status})`);
r = await fetch(BASE + `/api/comments?date=${budapestToday}&id=${firstId}`, { method: 'DELETE', headers: { cookie: cA.header() } });
check('saját komment törlése: 200', r.status === 200, `(${r.status})`);
const secondId = (await (await fetch(BASE + '/api/comments', { headers: { cookie: cB.header() } })).json()).comments[0].id;
r = await fetch(BASE + `/api/comments?date=${budapestToday}&id=${secondId}`, { method: 'DELETE', headers: adm });
check('admin bármelyiket törölheti: 200', r.status === 200, `(${r.status})`);
r = await fetch(BASE + '/api/comments?count=1'); check('törlések után: 0', (await r.json()).count === 0);

// ---------------------------------------------------------------- ÉRTESÍTÉSEK
section('Értesítések');
r = await post('/api/admin/notifications', { text: 'Nem admin' }, { cookie: cA.header() }); check('küldés nem adminként: 401', r.status === 401);
r = await post('/api/admin/notifications', { text: 'Holnap új tutorial!' }, adm); j = await r.json();
check('admin küldés: 200', r.status === 200 && j.notifications?.[0]?.text === 'Holnap új tutorial!');
const nid = j.notifications[0].id;
r = await fetch(BASE + '/api/notifications'); j = await r.json();
check('nyilvános lista vendégként is látja', j.notifications?.some((n) => n.id === nid));
r = await fetch(BASE + `/api/admin/notifications?id=${nid}`, { method: 'DELETE', headers: { cookie: cA.header() } }); check('törlés nem adminként: 401', r.status === 401);
r = await fetch(BASE + `/api/admin/notifications?id=${nid}`, { method: 'DELETE', headers: adm }); check('admin törlés: 200', r.status === 200);
check('törlés után eltűnt a nyilvános listából', !(await (await fetch(BASE + '/api/notifications')).json()).notifications.some((n) => n.id === nid));

// ---------------------------------------------------------------- ARCHÍV MEGFEJTŐSZÁM
section('Archív összesített megfejtőszám');
const hist = JSON.parse(await redis.get('rotation:history'));
const pastDate = '2026-01-15';
await redis.set('rotation:history', JSON.stringify([{ ...hist[0], shownDate: pastDate }, ...hist]));
await redis.hset(`stats:h:${pastDate}`, 'correctCount', '4');
r = await fetch(BASE + '/api/archive', { headers: { cookie: cA.header() } }); j = await r.json();
let item = j.archive.find((x) => x.shownDate === pastDate);
check('összesen = aznapi megfejtők (4)', item?.totalSolvers === 4, JSON.stringify(item?.totalSolvers));
check('az aznapi szám tartósan elmentve (a napi statisztika lejárta után is megmarad)', (await redis.hget('solvers:day', pastDate)) === '4');
r = await post('/api/archive/solve', { date: pastDate }); check('utólagos megfejtés bejelentkezés nélkül: 401', r.status === 401);
const ac = { cookie: cA.header() };
r = await post('/api/archive/solve', { date: budapestToday }, ac); check('mai dátum nem számolható: 400', r.status === 400);
r = await post('/api/archive/solve', { date: '2020-01-01' }, ac); check('ismeretlen dátum: 400', r.status === 400);
r = await post('/api/archive/solve', { date: 'nem-datum' }, ac); check('hibás dátum: 400', r.status === 400);
r = await post('/api/archive/solve', { date: pastDate }, ac); check('utólagos megfejtés: 200', r.status === 200);
await redis.del(`stats:h:${pastDate}`);
r = await fetch(BASE + '/api/archive', { headers: ac }); item = (await r.json()).archive.find((x) => x.shownDate === pastDate);
check('összesen = 4 + 1, a napi statisztika törlése után is', item?.totalSolvers === 5, JSON.stringify(item?.totalSolvers));


// ---------------------------------------------------------------- MÉG FEJTI
section('Még fejti (megnyitotta, de nem fejezte be)');
const devA = 'a'.repeat(32), devB = 'b'.repeat(32), devC = 'c'.repeat(32);
const playing = async () => (await (await fetch(BASE + `/api/stats?date=${budapestToday}&t=${Math.random()}`)).json()).playing;
check('kezdetben 0', (await playing()) === 0);
for (const d of [devA, devB, devC]) await post('/api/stats/presence', { device: d, action: 'open' });
check('három eszköz megnyitotta: 3', (await playing()) === 3);
await post('/api/stats/presence', { device: devA, action: 'open' });
check('ugyanaz az eszköz kétszer megnyitva sem számít duplán: 3', (await playing()) === 3);
await post('/api/stats/presence', { device: devA, action: 'done' });
check('egy befejezte: 2', (await playing()) === 2);
await post('/api/stats/presence', { device: devA, action: 'done' });
check('kétszeri befejezés sem csökkenti duplán: 2', (await playing()) === 2);
await post('/api/stats/presence', { device: 'd'.repeat(32), action: 'done' });
check('megnyitás nélküli befejezés nem visz negatívba: 2', (await playing()) === 2);
await post('/api/stats/presence', { device: devA, action: 'open' });
check('befejezés után újra megnyitva sem számít: 2', (await playing()) === 2);
r = await post('/api/stats/presence', { device: 'nem-hex!', action: 'open' }); check('hibás eszközazonosító: 400', r.status === 400);
r = await post('/api/stats/presence', { device: devB, action: 'torol' }); check('ismeretlen művelet: 400', r.status === 400);
check('a jelenlét-kulcsnak van lejárata', (await redis.ttl(`presence:${budapestToday}`)) > 0);
const beforeRepeat = (await (await fetch(BASE + `/api/stats?date=${budapestToday}&t=${Math.random()}`)).json()).correctCount;
r = await post('/api/stats', { hintsUsed: 0, correct: true, repeat: true });
const afterRepeat = (await (await fetch(BASE + `/api/stats?date=${budapestToday}&t=${Math.random()}`)).json()).correctCount;
check('vendég után bejelentkezve újra megfejtve nem számít duplán a megfejtők közé', r.status === 200 && afterRepeat === beforeRepeat, `${beforeRepeat} -> ${afterRepeat}`);


section('Még fejti: vendégként befejezte, bejelentkezve újra játszik');
const devR = 'e'.repeat(32);
const pBefore = await playing();
await post('/api/stats/presence', { device: devR, action: 'open' });
await post('/api/stats/presence', { device: devR, action: 'done' });
check('befejezés után nem fejti', (await playing()) === pBefore);
await post('/api/stats/presence', { device: devR, action: 'reopen' });
check('újrajátszáskor ismét fejti (+1)', (await playing()) === pBefore + 1);
await post('/api/stats/presence', { device: devR, action: 'reopen' });
check('kétszeri újranyitás sem számít duplán', (await playing()) === pBefore + 1);
await post('/api/stats/presence', { device: devR, action: 'done' });
check('újra befejezve visszaáll', (await playing()) === pBefore);

section('Admin: a saját admin jog nem vehető el');
const meId = JSON.parse(await redis.get(`au:userByEmail:admin2@teszt.hu`));
r = await fetch(BASE + '/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...adm }, body: JSON.stringify({ id: meId, role: 'user' }) });
check('saját jog elvétele: 409', r.status === 409, `(${r.status})`);
check('a jog megmaradt', JSON.parse(await redis.get(`au:user:${meId}`)).role === 'admin');
const otherId = JSON.parse(await redis.get(`au:userByEmail:kommentelo@teszt.hu`));
r = await fetch(BASE + '/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...adm }, body: JSON.stringify({ id: otherId, role: 'admin' }) });
check('másnak adhat jogot: 200', r.status === 200);
r = await fetch(BASE + '/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...adm }, body: JSON.stringify({ id: otherId, role: 'user' }) });
check('másét elveheti: 200', r.status === 200 && JSON.parse(await redis.get(`au:user:${otherId}`)).role === 'user');


section('Beküldés: a tippekhez kijelölt szavak');
r = await post('/api/submissions', {
  clue: 'Háborúban lelt ital zavaros alma',
  answer: 'BORZALMAS',
  hints: { definicio: 'Rettenetes', indikator: '', fodder: 'bor + alma' },
  hintWords: { definicio: [4, 4, -1, 'x', 999], indikator: [1], fodder: [0, 4], alternativ: [2] },
}, { cookie: cA.header() });
check('beküldés kijelölésekkel: 200', r.status === 200, `(${r.status})`);
const hwSubs = await (await fetch(BASE + '/api/submissions', { headers: adm })).json();
const sub = hwSubs.submissions.find((x) => x.clue === 'Háborúban lelt ital zavaros alma');
check('a kijelölések megmaradnak, a hibás értékek kiesnek', JSON.stringify(sub?.hintWords?.definicio) === '[4]' && JSON.stringify(sub?.hintWords?.fodder) === '[0,4]', JSON.stringify(sub?.hintWords));
check('üres tipphez nem tárol kijelölést', JSON.stringify(sub?.hintWords?.indikator) === '[]');
check('nem kiemelhető tipphez nem tárol kijelölést', sub?.hintWords?.alternativ === undefined);


section('Archívum előzetes (vendégeknek)');
r = await fetch(BASE + '/api/archive/summary');
j = await r.json();
const histAll = JSON.parse(await redis.get('rotation:history'));
const pastAll = histAll.slice(0, -1);
check('bejelentkezés nélkül is elérhető: 200', r.status === 200);
check('a darabszám egyezik a korábbi titkosírások számával (a mai nélkül)', j.total === pastAll.length, `${j.total} vs ${pastAll.length}`);
const [py, pm] = pastAll[0].shownDate.split('-');
check('évre és hónapra bontva', typeof j.byYear?.[py]?.[pm] === 'number' && j.byYear[py][pm] >= 1, JSON.stringify(j.byYear));
const txt = JSON.stringify(j);
check('nem ad ki rejtvényszöveget, választ vagy tippet', !pastAll.some((h) => (h.clue && txt.includes(h.clue)) || (h.answer && txt.includes(h.answer))) && !/clue|answer|hints/.test(txt));

// ---------------------------------------------------------------- BEKÜLDÉS: VÁRAKOZÁS
section('Beküldés: két beküldés között 2 perc');
await seedUser('varakozo@teszt.hu', 'Varakozo-Jelszo-1');
const svJar = (await credLogin('varakozo@teszt.hu', 'Varakozo-Jelszo-1')).jar;
const svId = JSON.parse(await redis.get('au:userByEmail:varakozo@teszt.hu'));
const svCount = async () => JSON.parse((await redis.get('submissions:list')) || '[]').filter((x) => x.submitterEmail === 'varakozo@teszt.hu').length;
r = await post('/api/submissions', { clue: 'Első beküldés', answer: 'EGY' }, { cookie: svJar.header() });
check('első beküldés: 200', r.status === 200, `(${r.status})`);
r = await post('/api/submissions', { clue: 'Második rögtön', answer: 'KETTŐ' }, { cookie: svJar.header() }); j = await r.json();
check('azonnali második beküldés: 429, hátralévő idővel', r.status === 429 && j.error === 'cooldown' && j.retryAfter > 0 && j.retryAfter <= 120 && Number(r.headers.get('retry-after')) === j.retryAfter, JSON.stringify(j));
check('a hibaüzenet magyarul kiírja a várakozást', /2 percet kell várnod/.test(j.message || '') && /múlva/.test(j.message || ''), j.message);
check('a második nem került be', (await svCount()) === 1);
r = await post('/api/submissions', { clue: '', answer: '' }, { cookie: svJar.header() });
check('hibás űrlap várakozás közben is 400 (az ellenőrzés előbb fut)', r.status === 400, `(${r.status})`);
const svTtl = await redis.ttl(`rl:cd:submit:user:${svId}`);
check('a várakozási kulcs legfeljebb 2 percig él', svTtl > 0 && svTtl <= 120, `(${svTtl})`);
await redis.del(`rl:cd:submit:user:${svId}`); // a 2 perc leteltét szimuláljuk
r = await post('/api/submissions', { clue: 'Két perc múlva', answer: 'HÁROM' }, { cookie: svJar.header() });
check('a várakozás letelte után újra beküldhet: 200', r.status === 200 && (await svCount()) === 2, `(${r.status})`);
await seedUser('rohano@teszt.hu', 'Rohano-Jelszo-1');
const rhJar = (await credLogin('rohano@teszt.hu', 'Rohano-Jelszo-1')).jar;
const rush = await Promise.all(Array.from({ length: 4 }, (_, i) => post('/api/submissions', { clue: `Egyszerre ${i}`, answer: 'SZÓ' }, { cookie: rhJar.header() })));
check('4 párhuzamos beküldésből pontosan egy megy át', rush.filter((x) => x.status === 200).length === 1 && rush.filter((x) => x.status === 429).length === 3, JSON.stringify(rush.map((x) => x.status)));

// ---------------------------------------------------------------- KOMMENT: VÁRAKOZÁS, ISMÉTLÉS
section('Komment: 30 mp várakozás és ismételt szöveg');
await seedUser('csevego@teszt.hu', 'Csevego-Jelszo-1', { name: 'Csevegő Csaba' });
const cmJar = (await credLogin('csevego@teszt.hu', 'Csevego-Jelszo-1')).jar;
const cmId = JSON.parse(await redis.get('au:userByEmail:csevego@teszt.hu'));
r = await post('/api/comments', { text: 'Ez nagyon jó volt!' }, { cookie: cmJar.header() });
check('első komment: 200', r.status === 200, `(${r.status})`);
r = await post('/api/comments', { text: 'Ez nagyon jó volt!' }, { cookie: cmJar.header() }); j = await r.json();
check('ugyanaz a szöveg újra: 409 (ismétlés)', r.status === 409 && j.error === 'duplicate' && /már elküldted/.test(j.message || ''), JSON.stringify(j));
r = await post('/api/comments', { text: 'Még egy gondolat' }, { cookie: cmJar.header() }); j = await r.json();
check('más szöveg rögtön: 429, legfeljebb 30 mp várakozás', r.status === 429 && j.error === 'cooldown' && j.retryAfter > 0 && j.retryAfter <= 30 && /30 másodpercet/.test(j.message || ''), JSON.stringify(j));
r = await post('/api/comments', { text: '   ' }, { cookie: cmJar.header() });
check('üres komment várakozás közben is 400', r.status === 400, `(${r.status})`);
await redis.del(`rl:cd:comment:user:${cmId}`); // a 30 mp leteltét szimuláljuk
r = await post('/api/comments', { text: 'Még egy gondolat' }, { cookie: cmJar.header() });
check('a várakozás után: 200', r.status === 200, `(${r.status})`);
await redis.del(`rl:cd:comment:user:${cmId}`);
r = await post('/api/comments', { text: 'Ez nagyon jó volt!' }, { cookie: cmJar.header() });
check('a korábbi szöveg várakozás után is ismétlésnek számít: 409', r.status === 409, `(${r.status})`);
await redis.del(`rl:cd:comment:user:${otherId}`); // a korábbi kommentje óta eltelt időt szimuláljuk
r = await post('/api/comments', { text: 'Ez nagyon jó volt!' }, { cookie: cA.header() });
check('ugyanazt a szöveget más felhasználó elküldheti: 200', r.status === 200, `(${r.status})`);

// ---------------------------------------------------------------- ADMIN: FIÓKTILTÁS
section('Admin: fióktiltás');
const patchUser = (bodyObj, headers) => fetch(BASE + '/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(bodyObj) });
await seedUser('tiltando@teszt.hu', 'Tiltando-Jelszo-1', { name: 'Tiltandó Tibor' });
const tbId = JSON.parse(await redis.get('au:userByEmail:tiltando@teszt.hu'));
const tbLogin = await credLogin('tiltando@teszt.hu', 'Tiltando-Jelszo-1');
check('tiltás előtt be tud lépni', tbLogin.ok);
r = await patchUser({ id: tbId, banned: true }, { cookie: cA.header() });
check('tiltás nem adminként: 401', r.status === 401, `(${r.status})`);
r = await patchUser({ id: meId, banned: true }, adm); j = await r.json();
check('saját fiók tiltása: 409', r.status === 409 && j.error === 'self-ban', JSON.stringify(j));
await seedUser('admin3@teszt.hu', 'Admin-Harom-Jelszo-1', { role: 'admin' });
const adm3Id = JSON.parse(await redis.get('au:userByEmail:admin3@teszt.hu'));
r = await patchUser({ id: adm3Id, banned: true }, adm); j = await r.json();
check('admin fiók tiltása: 409 (előbb az admin jogot kell visszavonni)', r.status === 409 && j.error === 'admin' && !JSON.parse(await redis.get(`au:user:${adm3Id}`)).banned, JSON.stringify(j));
r = await patchUser({ id: 'nincs-ilyen', banned: true }, adm); check('nem létező fiók: 404', r.status === 404, `(${r.status})`);
r = await patchUser({ id: tbId, banned: 'igen' }, adm); check('hibás tiltás-érték: 400', r.status === 400, `(${r.status})`);
r = await patchUser({ id: tbId, banned: true }, adm);
check('tiltás adminként: 200', r.status === 200, `(${r.status})`);
const tbRec = JSON.parse(await redis.get(`au:user:${tbId}`));
check('a fiókon tárolva a tiltás időpontja és az admin', !!tbRec.banned?.at && tbRec.banned.by === meId && tbRec.passwordHash, JSON.stringify(tbRec.banned));
let ul = await (await fetch(BASE + '/api/admin/users', { headers: adm })).json();
check('a felhasználólista jelzi a tiltást', ul.users.find((x) => x.id === tbId)?.banned === true && ul.users.find((x) => x.id === meId)?.banned === false);
let tbSess = await (await fetch(BASE + '/api/auth/session', { headers: { cookie: tbLogin.jar.header() } })).json();
check('a meglévő munkamenet azonnal megszűnik', !tbSess?.user, JSON.stringify(tbSess));
r = await post('/api/comments', { text: 'Tiltva is írnék' }, { cookie: tbLogin.jar.header() });
check('a régi sütivel sem kommentelhet: 401', r.status === 401, `(${r.status})`);
r = await post('/api/submissions', { clue: 'Tiltva', answer: 'NEM' }, { cookie: tbLogin.jar.header() });
check('a régi sütivel sem küldhet be rejtvényt: 401', r.status === 401, `(${r.status})`);
check('helyes jelszóval sem léphet be', !(await credLogin('tiltando@teszt.hu', 'Tiltando-Jelszo-1')).ok);
const rawLogin = async (pw) => {
  const jar = newJar();
  let x = await fetch(BASE + '/api/auth/csrf'); jar.take(x);
  const { csrfToken } = await x.json();
  x = await fetch(BASE + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() }, body: new URLSearchParams({ csrfToken, email: 'tiltando@teszt.hu', password: pw, json: 'true' }) });
  const loc = x.headers.get('location') || (await x.json().catch(() => ({}))).url || '';
  return loc;
};
check('helyes jelszónál a válasz jelzi a tiltást (error=banned)', /error=banned/.test(await rawLogin('Tiltando-Jelszo-1')));
check('hibás jelszónál nem derül ki a tiltás', !/banned/.test(await rawLogin('Rossz-Jelszo-999')));
r = await patchUser({ id: tbId, role: 'admin' }, adm); j = await r.json();
check('tiltott fióknak nem adható admin jog: 409', r.status === 409 && j.error === 'banned' && JSON.parse(await redis.get(`au:user:${tbId}`)).role === 'user', JSON.stringify(j));
r = await patchUser({ id: tbId, banned: false }, adm);
check('tiltás feloldása: 200', r.status === 200 && !JSON.parse(await redis.get(`au:user:${tbId}`)).banned, `(${r.status})`);
check('feloldás után újra be tud lépni', (await credLogin('tiltando@teszt.hu', 'Tiltando-Jelszo-1')).ok);
check('a tiltás nem nyúlt a jelszóhoz és az adatokhoz', JSON.parse(await redis.get(`au:user:${tbId}`)).passwordHash === tbRec.passwordHash && JSON.parse(await redis.get(`au:user:${tbId}`)).name === 'Tiltandó Tibor');

// ---------------------------------------------------------------- ELFELEJTETT JELSZÓ
section('Elfelejtett jelszó: visszaállító link');
const fsMail = await import('node:fs');
const mailsTo = (addr) => {
  try {
    return fsMail.readFileSync(process.env.MAIL_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.to.includes(addr));
  } catch { return []; }
};
const resetLink = (addr) => { const m = mailsTo(addr).at(-1); const x = m && /reset-password\?token=([a-f0-9]{64})/.exec(m.html); return x ? x[1] : null; };
const forgot = (email, ip) => fetch(BASE + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip || '10.9.0.1' }, body: JSON.stringify({ email }) });
const resetPw = (token, password) => fetch(BASE + '/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
await seedUser('feledekeny@teszt.hu', 'Regi-Jelszo-123', { name: 'Feledékeny Feri', emailVerified: null });
const fdId = JSON.parse(await redis.get('au:userByEmail:feledekeny@teszt.hu'));
const fdOld = await credLogin('feledekeny@teszt.hu', 'Regi-Jelszo-123');
check('a régi jelszóval be tud lépni (előtte)', fdOld.ok);
r = await fetch(BASE + '/reset-password'); check('a /reset-password oldal elérhető', r.status === 200, `(${r.status})`);
r = await forgot('nem-email'); check('érvénytelen cím: 400', r.status === 400, `(${r.status})`);
r = await forgot('senki@nincs-ilyen.hu'); j = await r.json();
check('nem létező cím: ugyanaz a válasz (200), levél nélkül', r.status === 200 && j.ok === true && mailsTo('senki@nincs-ilyen.hu').length === 0);
r = await forgot('Feledekeny@Teszt.hu '); j = await r.json();
const fdToken = resetLink('feledekeny@teszt.hu');
check('létező cím (kis-nagybetű, szóköz mindegy): 200 és levél a linkkel', r.status === 200 && j.ok === true && !!fdToken);
check('a token csak hash-elve van tárolva, 1 órás lejárattal', !(await redis.get(`pwreset:${fdToken}`)) && (await redis.keys('pwreset:*')).length >= 1 && (await redis.ttl((await redis.keys('pwreset:*'))[0])) <= 3600);
r = await resetPw('nem-token', 'Uj-Jelszo-456'); j = await r.json(); check('hibás token: 400', r.status === 400 && j.error === 'expired');
r = await resetPw('a'.repeat(64), 'Uj-Jelszo-456'); check('ismeretlen token: 400', r.status === 400);
r = await resetPw(fdToken, 'rovid'); j = await r.json(); check('túl rövid jelszó: 400, a link nem vész el', r.status === 400 && j.error === 'short');
r = await resetPw(fdToken, 'Uj-Jelszo-456'); j = await r.json();
check('új jelszó beállítása: 200', r.status === 200 && j.ok === true, JSON.stringify(j));
const fdRec = JSON.parse(await redis.get(`au:user:${fdId}`));
check('a cím megerősítettnek számít, a többi adat megmaradt', !!fdRec.emailVerified && fdRec.name === 'Feledékeny Feri' && fdRec.sessionsValidAfter > 0);
r = await resetPw(fdToken, 'Masik-Jelszo-789'); check('a link másodszor már nem használható: 400', r.status === 400);
check('a régi jelszóval már nem lehet belépni', !(await credLogin('feledekeny@teszt.hu', 'Regi-Jelszo-123')).ok);
const fdNew = await credLogin('feledekeny@teszt.hu', 'Uj-Jelszo-456');
check('az új jelszóval be lehet lépni', fdNew.ok);
let fdSess = await (await fetch(BASE + '/api/auth/session', { headers: { cookie: fdOld.jar.header() } })).json();
check('a csere előtti munkamenet megszűnt', !fdSess?.user, JSON.stringify(fdSess));
fdSess = await (await fetch(BASE + '/api/auth/session', { headers: { cookie: fdNew.jar.header() } })).json();
check('a csere utáni munkamenet érvényes', fdSess?.user?.email === 'feledekeny@teszt.hu');
await seedUser('tiltott-feledo@teszt.hu', 'Tiltott-Jelszo-1', { banned: { at: new Date().toISOString(), by: null } });
r = await forgot('tiltott-feledo@teszt.hu'); check('tiltott fiók: ugyanaz a válasz, de nem megy levél', r.status === 200 && mailsTo('tiltott-feledo@teszt.hu').length === 0);
await forgot('limit@teszt.hu', '10.9.0.2'); await forgot('limit@teszt.hu', '10.9.0.2'); await forgot('limit@teszt.hu', '10.9.0.2');
r = await forgot('limit@teszt.hu', '10.9.0.2'); check('címenként óránként legfeljebb 3 kérés: a 4. 429', r.status === 429, `(${r.status})`);

// ---------------------------------------------------------------- JELSZÓ MÓDOSÍTÁSA
section('Profil: jelszó módosítása');
const pwApi = (bodyObj, jar) => fetch(BASE + '/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: jar.header() }, body: JSON.stringify(bodyObj) });
r = await fetch(BASE + '/api/account/password'); check('vendégként: 401', r.status === 401, `(${r.status})`);
await seedUser('jelszocsere@teszt.hu', 'Regi-Jelszo-111');
const pcA = await credLogin('jelszocsere@teszt.hu', 'Regi-Jelszo-111');
const pcB = await credLogin('jelszocsere@teszt.hu', 'Regi-Jelszo-111');
j = await (await fetch(BASE + '/api/account/password', { headers: { cookie: pcA.jar.header() } })).json();
check('jelszavas fióknál hasPassword: true', j.hasPassword === true);
r = await pwApi({ currentPassword: 'Rossz-Jelszo-0', newPassword: 'Uj-Jelszo-222', newPassword2: 'Uj-Jelszo-222' }, pcA.jar); j = await r.json();
check('hibás jelenlegi jelszó: 400', r.status === 400 && j.error === 'wrong-password');
r = await pwApi({ currentPassword: 'Regi-Jelszo-111', newPassword: 'Uj-Jelszo-222', newPassword2: 'Uj-Jelszo-333' }, pcA.jar); j = await r.json();
check('eltérő új jelszavak: 400', r.status === 400 && j.error === 'mismatch');
r = await pwApi({ currentPassword: 'Regi-Jelszo-111', newPassword: 'rovid', newPassword2: 'rovid' }, pcA.jar);
check('túl rövid új jelszó: 400', r.status === 400);
r = await pwApi({ currentPassword: 'Regi-Jelszo-111', newPassword: 'Uj-Jelszo-222', newPassword2: 'Uj-Jelszo-222' }, pcA.jar);
check('jelszócsere: 200', r.status === 200, `(${r.status})`);
check('a régi jelszó már nem jó', !(await credLogin('jelszocsere@teszt.hu', 'Regi-Jelszo-111')).ok);
check('az új jelszó jó', (await credLogin('jelszocsere@teszt.hu', 'Uj-Jelszo-222')).ok);
const pcBSess = await (await fetch(BASE + '/api/auth/session', { headers: { cookie: pcB.jar.header() } })).json();
check('a többi eszköz munkamenete megszűnt', !pcBSess?.user);

// ---------------------------------------------------------------- E-MAIL-MEGERŐSÍTÉS
section('Regisztrációhoz kötött funkciók csak megerősített e-mail-címmel');
await seedUser('nemerositett@teszt.hu', 'Nem-Erositett-1', { emailVerified: null, name: 'Nem Erősített' });
const nvId = JSON.parse(await redis.get('au:userByEmail:nemerositett@teszt.hu'));
const nv = await credLogin('nemerositett@teszt.hu', 'Nem-Erositett-1');
r = await fetch(BASE + '/api/archive', { headers: { cookie: nv.jar.header() } }); j = await r.json();
check('archívum meg nem erősítve: 403 unverified', r.status === 403 && j.error === 'unverified', `(${r.status})`);
r = await post('/api/archive/solve', { date: '2026-01-01' }, { cookie: nv.jar.header() });
check('archív megfejtés meg nem erősítve: 403', r.status === 403, `(${r.status})`);
r = await post('/api/comments', { text: 'Megerősítés nélkül' }, { cookie: nv.jar.header() });
check('komment meg nem erősítve: 403', r.status === 403, `(${r.status})`);
r = await post('/api/submissions', { clue: 'X', answer: 'Y' }, { cookie: nv.jar.header() });
check('beküldés meg nem erősítve: 403', r.status === 403, `(${r.status})`);
await post('/api/leaderboard', { name: guest, hintsUsed: 0, elapsed: 4000 }, { cookie: nv.jar.header() });
check('a ranglistára nem kerül fel a meg nem erősített fiók neve', !JSON.stringify(await lbGet()).includes('Nem Erősített'));
r = await fetch(BASE + '/api/account/export', { headers: { cookie: nv.jar.header() } });
check('a saját adatok exportja megerősítés nélkül is elérhető (GDPR)', r.status === 200, `(${r.status})`);
const nvRec = JSON.parse(await redis.get(`au:user:${nvId}`)); nvRec.emailVerified = new Date().toISOString(); await redis.set(`au:user:${nvId}`, JSON.stringify(nvRec));
r = await fetch(BASE + '/api/archive', { headers: { cookie: nv.jar.header() } });
check('a megerősítés után ugyanabban a munkamenetben azonnal elérhető (újrabelépés nélkül)', r.status === 200, `(${r.status})`);
const nvSess = await (await fetch(BASE + '/api/auth/session', { headers: { cookie: nv.jar.header() } })).json();
check('a munkamenet is megerősítettnek látja', nvSess?.user?.verified === true);

section('Regisztráció: a jelszót kétszer kell megadni');
r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.9.1.1' }, body: JSON.stringify({ email: 'ketszer@teszt.hu', password: 'Elso-Jelszo-1', password2: 'Masik-Jelszo-2', name: 'K' }) }); j = await r.json();
check('eltérő jelszavak: 400', r.status === 400 && /nem egyezik/.test(j.error || ''), JSON.stringify(j));
r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.9.1.1' }, body: JSON.stringify({ email: 'ketszer@teszt.hu', password: 'Elso-Jelszo-1', password2: 'Elso-Jelszo-1', name: 'K' }) });
check('egyező jelszavak: 200', r.status === 200, `(${r.status})`);

section('Tutorial oldal, oldaltérkép, favicon');
r = await fetch(BASE + '/tutorial'); check('a /tutorial oldal elérhető', r.status === 200 && /Tutorial/.test(await r.text()));
r = await fetch(BASE + '/sitemap.xml'); check('az oldaltérképen szerepel a /tutorial', /napititkos\.hu\/tutorial/.test(await r.text()));
r = await fetch(BASE + '/icon.png'); check('a favicon (a logóból, icon.png) elérhető', r.status === 200 && /png/.test(r.headers.get('content-type') || ''));
r = await fetch(BASE + '/'); const homeHtml = await r.text();
check('a főoldal a favicont és az Apple-ikont is hirdeti', /rel="icon"[^>]*icon\.png/.test(homeHtml) && /apple-touch-icon/.test(homeHtml));
r = await fetch(BASE + '/logo-192.png'); check('a logó képfájl elérhető', r.status === 200);
check('a láblécben szerepel a logó készítője', /Logó: bundaskifli/.test(homeHtml));
r = await fetch(BASE + '/help'); const helpHtml = await r.text();
check('a Súgó elmondja a három tipptípust és linkel az archívumra', /három típusa/.test(helpHtml) && /href="\/archive"/.test(helpHtml));
check('a Súgó szerint betűfelfedés minden rejtvénynél van', /minden rejtvénynél kérhetsz betűfelfedést/.test(helpHtml));

console.log(`\nÖsszesen: ${pass} sikeres, ${fail} hibás`);
await redis.quit();
process.exit(fail ? 1 : 0);
