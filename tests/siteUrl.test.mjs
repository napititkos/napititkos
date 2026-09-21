import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getSiteUrl } from '../lib/siteUrl.js';

const ENV_KEYS = ['SITE_URL', 'AUTH_URL', 'VERCEL_ENV', 'VERCEL_URL', 'NODE_ENV'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

test('a SITE_URL az elsőbbséget élvezi, a záró perjel nélkül', () => {
  process.env.SITE_URL = 'https://www.napititkos.hu/';
  process.env.AUTH_URL = 'https://masik.example';
  assert.equal(getSiteUrl(), 'https://www.napititkos.hu');
});

test('SITE_URL hiányában az AUTH_URL', () => {
  process.env.AUTH_URL = 'https://auth.example///';
  assert.equal(getSiteUrl(), 'https://auth.example');
});

test('preview környezetben a deployment címe', () => {
  process.env.VERCEL_ENV = 'preview';
  process.env.VERCEL_URL = 'napititkos-git-x-napititkos.vercel.app';
  assert.equal(getSiteUrl(), 'https://napititkos-git-x-napititkos.vercel.app');
});

test('élesben, beállítás nélkül a végleges cím', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(getSiteUrl(), 'https://www.napititkos.hu');
});

test('fejlesztéskor localhost', () => {
  process.env.NODE_ENV = 'development';
  assert.equal(getSiteUrl(), 'http://localhost:3000');
});
