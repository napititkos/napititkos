// Futtatás: npm test   (Node 22.7+ vagy 20.19+ kell, mert a lib fájlok ESM szintaxist használnak)
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SESSION_SECONDS,
  adminCookieName,
  createAdminToken,
  passwordMatches,
  verifyAdminToken,
} from '../lib/adminSession.js';

const ENV_KEYS = ['AUTH_SECRET', 'ADMIN_SESSION_SECRET', 'ADMIN_PASSWORD', 'NODE_ENV'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.AUTH_SECRET = 'teszt-titok';
  process.env.ADMIN_PASSWORD = 'admin-jelszo-1';
  delete process.env.ADMIN_SESSION_SECRET;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);

test('a frissen létrehozott token érvényes', () => {
  assert.equal(verifyAdminToken(createAdminToken(NOW), NOW), true);
});

test('a token nem tartalmazza a jelszót', () => {
  const token = createAdminToken(NOW);
  const payload = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');
  assert.ok(!token.includes('admin-jelszo-1'));
  assert.ok(!payload.includes('admin-jelszo-1'));
});

test('a token a lejárat előtt érvényes, utána nem', () => {
  const token = createAdminToken(NOW);
  assert.equal(verifyAdminToken(token, NOW + (ADMIN_SESSION_SECONDS - 5) * 1000), true);
  assert.equal(verifyAdminToken(token, NOW + (ADMIN_SESSION_SECONDS + 5) * 1000), false);
});

test('a módosított tartalom (lejárat) érvénytelenné teszi a tokent', () => {
  const [payload, sig] = createAdminToken(NOW).split('.');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  data.exp += 10 * 24 * 3600;
  const forged = Buffer.from(JSON.stringify(data)).toString('base64url');
  assert.equal(verifyAdminToken(`${forged}.${sig}`, NOW), false);
});

test('a módosított aláírás érvénytelen', () => {
  const [payload, sig] = createAdminToken(NOW).split('.');
  const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  assert.equal(verifyAdminToken(`${payload}.${flipped}`, NOW), false);
  assert.equal(verifyAdminToken(`${payload}.`, NOW), false);
});

test('hibás formátumú bemenetek elutasítva', () => {
  for (const bad of [undefined, null, '', 'abc', 'a.b.c', '.', 42, {}, 'admin-jelszo-1']) {
    assert.equal(verifyAdminToken(bad, NOW), false, `elfogadta: ${String(bad)}`);
  }
});

test('az admin jelszó cseréje érvényteleníti a meglévő tokent', () => {
  const token = createAdminToken(NOW);
  process.env.ADMIN_PASSWORD = 'admin-jelszo-2';
  assert.equal(verifyAdminToken(token, NOW), false);
});

test('az AUTH_SECRET cseréje érvényteleníti a meglévő tokent', () => {
  const token = createAdminToken(NOW);
  process.env.AUTH_SECRET = 'mas-titok';
  assert.equal(verifyAdminToken(token, NOW), false);
});

test('az ADMIN_SESSION_SECRET felülírja az AUTH_SECRET-et', () => {
  const token = createAdminToken(NOW);
  process.env.ADMIN_SESSION_SECRET = 'kulon-titok';
  assert.equal(verifyAdminToken(token, NOW), false);
});

test('beállítás nélkül nincs belépés (fail closed)', () => {
  const token = createAdminToken(NOW);
  delete process.env.ADMIN_PASSWORD;
  assert.equal(verifyAdminToken(token, NOW), false);
  assert.throws(() => createAdminToken(NOW));
  process.env.ADMIN_PASSWORD = 'admin-jelszo-1';
  delete process.env.AUTH_SECRET;
  assert.equal(verifyAdminToken(token, NOW), false);
  assert.throws(() => createAdminToken(NOW));
});

test('két token nem egyezik meg (véletlen komponens)', () => {
  assert.notEqual(createAdminToken(NOW), createAdminToken(NOW));
});

test('passwordMatches: helyes, hibás, üres és nem szöveges bemenet', () => {
  assert.equal(passwordMatches('admin-jelszo-1', 'admin-jelszo-1'), true);
  assert.equal(passwordMatches('admin-jelszo-2', 'admin-jelszo-1'), false);
  assert.equal(passwordMatches('rovid', 'admin-jelszo-1'), false);
  assert.equal(passwordMatches('', 'admin-jelszo-1'), false);
  assert.equal(passwordMatches(undefined, 'admin-jelszo-1'), false);
  assert.equal(passwordMatches(12345, '12345'), false);
  assert.equal(passwordMatches('x', undefined), false);
});

test('a süti neve élesben __Host- előtagú', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(adminCookieName(), '__Host-admin_session');
  process.env.NODE_ENV = 'development';
  assert.equal(adminCookieName(), 'admin_session');
});
