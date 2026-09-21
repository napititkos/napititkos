// Helyi végpontok közötti próba: a valódi (production build) szerver + hamis Redis + levél-kamut ellen. (futtatás: npm run test:e2e)
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const REPO = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '');
const require = createRequire(`${REPO}/package.json`);
const ioredis = require('ioredis');
const Redis = ioredis.default || ioredis.Redis || ioredis;
const { hashPassword } = await import(pathToFileURL(`${REPO}/lib/password.js`).href);

const BASE = 'http://localhost:3100';
const MAIL = process.env.MAIL_LOG;
const ADMIN_PW = 'Helyi-Admin-Jelszo-1';
const redis = new Redis('redis://127.0.0.1:6390');
const limitKeys = () => redis.keys('rl:adminlogin:*');
const clearLimits = async () => { const ks = await limitKeys(); if (ks.length) await redis.del(...ks); };

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  OK    ${name}`); }
  else { fail++; console.log(`  HIBA  ${name} ${extra}`); }
}
const section = (t) => console.log(`\n== ${t}`);

const post = (path, body, headers = {}) =>
  fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const mails = () => fs.readFileSync(MAIL, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const linkOf = (mail) => mail.html.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&');
const getUser = async (email) => {
  const id = await redis.get(`au:userByEmail:${email}`);
  return id ? JSON.parse(await redis.get(`au:user:${JSON.parse(id)}`)) : null;
};
const seedUser = async (email, extra = {}) => {
  const id = 'seed' + Math.random().toString(36).slice(2, 8);
  const user = { id, email, name: email.split('@')[0], image: null, emailVerified: new Date().toISOString(), role: 'user', ...extra };
  await redis.set(`au:user:${id}`, JSON.stringify(user));
  await redis.set(`au:userByEmail:${email}`, JSON.stringify(id));
  return user;
};

function newJar() {
  const jar = {};
  return {
    take(res) {
      for (const c of res.headers.getSetCookie()) {
        const [kv] = c.split(';');
        const i = kv.indexOf('=');
        const v = kv.slice(i + 1);
        if (v === '') delete jar[kv.slice(0, i)]; else jar[kv.slice(0, i)] = v;
      }
    },
    header() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); },
  };
}
async function csrf(jar) {
  const r = await fetch(BASE + '/api/auth/csrf', { headers: { cookie: jar.header() } });
  jar.take(r);
  return (await r.json()).csrfToken;
}
async function sessionOf(jar) {
  const r = await fetch(BASE + '/api/auth/session', { headers: { cookie: jar.header() } });
  return r.json();
}
async function credLogin(email, password) {
  const jar = newJar();
  const csrfToken = await csrf(jar);
  const r = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
  });
  jar.take(r);
  return { jar, session: await sessionOf(jar) };
}
async function verify(link) {
  const r = await fetch(link, { redirect: 'manual' });
  return r.headers.get('location') || '';
}
const loggedIn = (s) => !!(s && s.user && s.user.email);

// ---------------------------------------------------------------- ADMIN
section('ADMIN belépés');
await clearLimits();
let r = await fetch(BASE + '/api/admin/users');
check('admin API süti nélkül: 401', r.status === 401);
for (let i = 1; i <= 5; i++) {
  r = await post('/api/admin/login', { password: 'rossz' + i });
  check(`hibás jelszó #${i}: 401`, r.status === 401, `(${r.status})`);
}
r = await post('/api/admin/login', { password: ADMIN_PW });
check('6. próba HELYES jelszóval is: 429 + Retry-After 900', r.status === 429 && r.headers.get('retry-after') === '900', `(${r.status})`);
const ipKeys = (await limitKeys()).filter((k) => k.startsWith('rl:adminlogin:ip:'));
console.log('  (a használt IP-kulcs:', ipKeys.join(', '), ')');
const ttl = await redis.ttl(ipKeys[0]);
check('van címenkénti számláló, értéke 5', ipKeys.length === 1 && (await redis.get(ipKeys[0])) === '5');
check('a számláló TTL-je pozitív és <= 900', ttl > 0 && ttl <= 900, `(${ttl})`);
check('van összesített számláló, értéke 5', (await redis.get('rl:adminlogin:global')) === '5');

await clearLimits();
r = await post('/api/admin/login', { password: ADMIN_PW });
check('zárolás feloldása után a helyes jelszó: 200', r.status === 200, `(${r.status})`);
const sc = r.headers.getSetCookie();
const sess = sc.find((c) => c.startsWith('__Host-admin_session='));
check('__Host-admin_session süti beállítva', !!sess);
check('süti: HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=28800',
  /HttpOnly/i.test(sess) && /Secure/i.test(sess) && /SameSite=Strict/i.test(sess) && /Path=\//i.test(sess) && /Max-Age=28800/i.test(sess), sess);
check('a süti értéke nem tartalmazza a jelszót', !sess.includes(ADMIN_PW));
check('a régi admin_token süti törlésre kerül', sc.some((c) => c.startsWith('admin_token=;') && /Max-Age=0/i.test(c)));
check('sikeres belépés törli az IP-számlálót', (await limitKeys()).filter((k) => k.startsWith('rl:adminlogin:ip:')).length === 0);
const tok = sess.split(';')[0].split('=')[1];
const adminCookie = `__Host-admin_session=${tok}`;
for (const p of ['/api/admin/users', '/api/admin/puzzles', '/api/admin/history', '/api/submissions']) {
  r = await fetch(BASE + p, { headers: { cookie: adminCookie } });
  check(`érvényes admin süti: ${p} = 200`, r.status === 200, `(${r.status})`);
}
r = await fetch(BASE + '/api/admin/users', { headers: { cookie: `admin_token=${ADMIN_PW}` } });
check('a régi (jelszót tartalmazó) süti már nem érvényes: 401', r.status === 401);
const [pl, sg] = tok.split('.');
const forgedPayload = Buffer.from(JSON.stringify({ exp: 9999999999, n: 'x' })).toString('base64url');
r = await fetch(BASE + '/api/admin/users', { headers: { cookie: `__Host-admin_session=${forgedPayload}.${sg}` } });
check('átírt lejáratú token: 401', r.status === 401);
r = await fetch(BASE + '/api/admin/users', { headers: { cookie: `__Host-admin_session=${pl}.AAAA` } });
check('hibás aláírású token: 401', r.status === 401);
r = await fetch(BASE + '/api/admin/login', { method: 'DELETE' });
check('kijelentkezés törli a sütit', r.headers.getSetCookie().some((c) => c.startsWith('__Host-admin_session=;') && /Max-Age=0/i.test(c)));
await redis.set('rl:adminlogin:global', '50', 'EX', 900);
r = await post('/api/admin/login', { password: ADMIN_PW });
check('összesített korlát (50): 429 minden címnek', r.status === 429, `(${r.status})`);
await clearLimits();

// ---------------------------------------------------------------- REGISZTRÁCIÓ
section('REGISZTRÁCIÓ: bemenet-ellenőrzés');
const reg = (email, password, headers = {}) => post('/api/auth/register', { email, password, name: 'Teszt' }, headers);
r = await reg('nem-email', 'Hosszu-Jelszo-1'); check('érvénytelen e-mail: 400', r.status === 400);
r = await reg('a@example.hu', 'rovid'); check('7 karakteres jelszó: 400', r.status === 400);
r = await reg('a@example.hu', 'x'.repeat(201)); check('201 karakteres jelszó: 400', r.status === 400);
r = await reg('a'.repeat(250) + '@example.hu', 'Hosszu-Jelszo-1'); check('255+ karakteres e-mail: 400', r.status === 400);
check('érvénytelen bemenetnél nincs függő rekord', (await redis.keys('pendingreg:*')).length === 0);

section('REGISZTRÁCIÓ: új cím, teljes út');
const B = 'uj.felhasznalo@example.hu';
const PW_B = 'Hosszu-Jelszo-1';
let mailsBefore = mails().length;
r = await reg(B, PW_B, { origin: 'https://evil.example' });
const bodyNew = await r.json();
check('regisztráció: 200 {ok:true}', r.status === 200 && bodyNew.ok === true, JSON.stringify(bodyNew));
check('pontosan egy levél ment ki', mails().length === mailsBefore + 1);
const mB = mails().at(-1);
const linkB = linkOf(mB);
check('a levél a B címre szól', mB.to[0] === B);
check('a link a fix SITE_URL-re mutat (nem az Origin-re)', linkB.startsWith(`${BASE}/api/auth/verify-email?token=`) && !linkB.includes('evil.example'), linkB);
check('a fiók még NEM létezik', (await getUser(B)) === null);
check('függő rekord létezik', (await redis.keys('pendingreg:*')).length === 1);
let lg = await credLogin(B, PW_B);
check('megerősítés előtt nem lehet belépni', !loggedIn(lg.session));
let loc = await verify(linkB);
check('link megnyitása: /login?verify=ok', loc.endsWith('/login?verify=ok'), loc);
const uB = await getUser(B);
check('a fiók létrejött, megerősítve, jelszóval', !!uB && !!uB.emailVerified && String(uB.passwordHash).includes(':'));
check('a függő rekord törlődött', (await redis.keys('pendingreg:*')).length === 0);
loc = await verify(linkB);
check('ugyanaz a link másodszor: /login?verify=expired', loc.endsWith('/login?verify=expired'), loc);
lg = await credLogin(B, PW_B);
check('megerősítés után be lehet lépni, verified=true', loggedIn(lg.session) && lg.session.user.verified === true, JSON.stringify(lg.session));

section('FIÓKÁTVÉTEL kísérletek');
const A = 'google.user@example.hu';
await seedUser(A); // jelszó nélküli (Google-os) fiók
mailsBefore = mails().length;
r = await reg(A, 'Tamado-Jelszo-123');
const bodyExisting = await r.json();
check('létező (Google-os) cím: ugyanaz a válasz mint új címnél', r.status === 200 && JSON.stringify(bodyExisting) === JSON.stringify(bodyNew));
check('nem megy ki levél és nincs függő rekord', mails().length === mailsBefore && (await redis.keys('pendingreg:*')).length === 0);
check('a fiókra NEM került jelszó', !(await getUser(A)).passwordHash);
lg = await credLogin(A, 'Tamado-Jelszo-123');
check('a támadó jelszavával nem lehet belépni', !loggedIn(lg.session));

r = await reg(B, 'Masik-Jelszo-1234');
check('jelszavas fiókra újra regisztrálva: ugyanaz a válasz', r.status === 200 && (await r.json()).ok === true);
check('a régi jelszó továbbra is működik', loggedIn((await credLogin(B, PW_B)).session));
check('az új jelszó nem működik', !loggedIn((await credLogin(B, 'Masik-Jelszo-1234')).session));

section('VERSENY: két függő regisztráció ugyanarra a címre');
const C = 'verseny@example.hu';
mailsBefore = mails().length;
await reg(C, 'Elso-Jelszo-12345'); await reg(C, 'Masodik-Jelszo-12345');
const [l1, l2] = mails().slice(mailsBefore).map(linkOf);
check('két levél, két különböző token', !!l1 && !!l2 && l1 !== l2);
check('első link: ok', (await verify(l1)).endsWith('verify=ok'));
check('második link: exists (nem írja felül)', (await verify(l2)).endsWith('verify=exists'));
check('az első jelszó működik', loggedIn((await credLogin(C, 'Elso-Jelszo-12345')).session));
check('a második jelszó nem működik', !loggedIn((await credLogin(C, 'Masodik-Jelszo-12345')).session));

section('VERSENY: közben létrejön egy Google-os fiók');
const D = 'kozben@example.hu';
mailsBefore = mails().length;
await reg(D, 'Tamado-Jelszo-999');
const lD = linkOf(mails().at(-1));
await seedUser(D);
check('link: exists', (await verify(lD)).endsWith('verify=exists'));
check('a Google-os fiók jelszó nélkül maradt', !(await getUser(D)).passwordHash);

section('HIBAÜZENET-SZIVÁRGÁS');
r = await reg('fail.user@example.hu', 'Hosszu-Jelszo-1');
const tx = await r.text();
check('levélküldési hiba: 502 általános üzenet', r.status === 502 && !tx.includes('secret-provider-detail'), tx);
check('nem marad függő rekord', (await redis.keys('pendingreg:*')).length === 0);

section('RÉGI, MEGERŐSÍTETLEN FIÓKOK');
const F1 = 'fail.legacy@example.hu';
await seedUser(F1, { emailVerified: null, passwordHash: await hashPassword('Regi-Jelszo-123') });
lg = await credLogin(F1, 'Regi-Jelszo-123');
check('megerősítetlen régi fiókkal be lehet lépni (verified=false)', loggedIn(lg.session) && lg.session.user.verified === false);
r = await fetch(BASE + '/api/auth/resend-verification', { method: 'POST', headers: { cookie: lg.jar.header() } });
const tx2 = await r.text();
check('újraküldés hibája: általános üzenet, nincs szolgáltatói részlet', r.status === 500 && !tx2.includes('secret-provider-detail'), tx2);

const F2 = 'legacy@example.hu';
await seedUser(F2, { emailVerified: null, passwordHash: await hashPassword('Regi-Jelszo-123') });
lg = await credLogin(F2, 'Regi-Jelszo-123');
mailsBefore = mails().length;
r = await fetch(BASE + '/api/auth/resend-verification', { method: 'POST', headers: { cookie: lg.jar.header(), origin: 'https://evil.example' } });
check('újraküldés: 200', r.status === 200);
const lF2 = linkOf(mails().at(-1));
check('a link a fix SITE_URL-re mutat (Origin fejléc ellenére)', lF2.startsWith(`${BASE}/api/auth/verify-email?token=`) && !lF2.includes('evil.example'), lF2);
check('link: verify=ok', (await verify(lF2)).endsWith('verify=ok'));
check('a fiók megerősítve', !!(await getUser(F2)).emailVerified);

section('ELŐRE-REGISZTRÁCIÓ (pre-hijacking) belépő linkkel');
const E = 'pre@example.hu';
await seedUser(E, { emailVerified: null, passwordHash: await hashPassword('Tamado-Jelszo-777') });
check('a támadó jelszava előtte működik (régi, megerősítetlen fiók)', loggedIn((await credLogin(E, 'Tamado-Jelszo-777')).session));
{
  const jar = newJar();
  const csrfToken = await csrf(jar);
  mailsBefore = mails().length;
  const rr = await fetch(BASE + '/api/auth/signin/email', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
    body: new URLSearchParams({ csrfToken, email: E }),
  });
  jar.take(rr);
  check('belépő link kérése: levél kiment', mails().length === mailsBefore + 1, `(${rr.status})`);
  const magic = linkOf(mails().at(-1));
  const cb = await fetch(magic, { redirect: 'manual', headers: { cookie: jar.header() } });
  jar.take(cb);
  const s = await sessionOf(jar);
  check('a tulajdonos belépett a linkkel', loggedIn(s) && s.user.email === E, JSON.stringify(s));
}
const uE = await getUser(E);
check('a támadó jelszava TÖRLŐDÖTT, a fiók megerősített', !uE.passwordHash && !!uE.emailVerified, JSON.stringify(uE));
check('a támadó jelszavával már nem lehet belépni', !loggedIn((await credLogin(E, 'Tamado-Jelszo-777')).session));

section('MEGERŐSÍTETT jelszavas fiók belépő linkkel');
{
  const jar = newJar();
  const csrfToken = await csrf(jar);
  mailsBefore = mails().length;
  const rr = await fetch(BASE + '/api/auth/signin/email', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
    body: new URLSearchParams({ csrfToken, email: B }),
  });
  jar.take(rr);
  const cb = await fetch(linkOf(mails().at(-1)), { redirect: 'manual', headers: { cookie: jar.header() } });
  jar.take(cb);
  check('belépett a linkkel', loggedIn(await sessionOf(jar)));
}
check('a jelszó megmaradt, a jelszavas belépés is megy', !!(await getUser(B)).passwordHash && loggedIn((await credLogin(B, PW_B)).session));

console.log(`\nÖsszesen: ${pass} sikeres, ${fail} hibás`);
await redis.quit();
process.exit(fail ? 1 : 0);
