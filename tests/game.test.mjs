import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { hintsUsedOf, issueGameToken, pickLetterHint, publicPuzzle, readGameToken } from '../lib/game.js';

let saved;
beforeEach(() => {
  saved = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'teszt-titok';
});
afterEach(() => {
  if (saved === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = saved;
});

const NOW = Date.UTC(2026, 8, 21, 10, 0, 0);

test('a játék tokenje visszaolvasható', () => {
  const tok = issueGameToken('p1', '2026-09-21', NOW);
  assert.deepEqual(readGameToken(tok, NOW + 5000), { p: 'p1', d: '2026-09-21', t: NOW });
});

test('a token nem hamisítható és nem használható más titokkal', () => {
  const tok = issueGameToken('p1', '2026-09-21', NOW);
  const [payload, sig] = tok.split('.');
  const forged = Buffer.from(JSON.stringify({ p: 'masik', d: '2026-09-21', t: NOW })).toString('base64url');
  assert.equal(readGameToken(`${forged}.${sig}`, NOW), null);
  assert.equal(readGameToken(`${payload}.AAAA`, NOW), null);
  process.env.AUTH_SECRET = 'mas-titok';
  assert.equal(readGameToken(tok, NOW), null);
});

test('lejárt vagy jövőbeli token elutasítva, hibás bemenet is', () => {
  const tok = issueGameToken('p1', '2026-09-21', NOW);
  assert.ok(readGameToken(tok, NOW + 35 * 3600 * 1000));
  assert.equal(readGameToken(tok, NOW + 37 * 3600 * 1000), null);
  assert.equal(readGameToken(tok, NOW - 10 * 60 * 1000), null);
  for (const bad of [undefined, null, '', 'abc', 'a.b.c', 5, {}, 'x'.repeat(500)]) assert.equal(readGameToken(bad, NOW), null);
});

test('AUTH_SECRET nélkül nem lehet tokent kiadni', () => {
  delete process.env.AUTH_SECRET;
  assert.throws(() => issueGameToken('p1', '2026-09-21', NOW));
});

test('a kliensnek kiadott rejtvény nem tartalmazza a megfejtést, a tipp-szövegeket és az e-mailt', () => {
  const p = publicPuzzle({
    id: 'p1',
    clue: 'Kérdés',
    answer: 'ALMA FA',
    parHints: 2,
    submittedBy: 'Anna',
    submittedByEmail: 'anna@example.hu',
    scheduledDate: '2026-09-21',
    hints: { definicio: { enabled: true, text: 'titok-tipp' }, betu: { enabled: false } },
  });
  const json = JSON.stringify(p);
  assert.equal(p.mask, '____ __');
  assert.ok(!json.includes('ALMA'));
  assert.ok(!json.includes('titok-tipp'));
  assert.ok(!json.includes('anna@example.hu'));
  assert.ok(!json.includes('2026-09-21'));
  assert.equal(p.hints.definicio.enabled, true);
  assert.equal(p.hints.indikator.enabled, false);
  assert.equal(p.hints.betu.enabled, false);
  assert.equal(publicPuzzle({ id: 'x', clue: 'y', answer: 'AB' }).hints.betu.enabled, true);
});

test('a tippek száma: szöveges tippek + betűk + feladás', () => {
  assert.equal(hintsUsedOf({}), 0);
  assert.equal(hintsUsedOf({ hints: 'definicio,fodder', betu: '2' }), 4);
  assert.equal(hintsUsedOf({ hints: 'definicio', status: 'gaveup' }), 2);
});

test('betű-tipp: csak hibás vagy üres pozíciót választ, szóközt soha', () => {
  for (let i = 0; i < 50; i++) {
    const pick = pickLetterHint('AB CD', ['A', '', ' ', 'X', 'D']);
    assert.ok([1, 3].includes(pick.pos), `pozíció: ${pick.pos}`);
    assert.equal(pick.letter, pick.pos === 1 ? 'B' : 'C');
  }
  assert.equal(pickLetterHint('AB', ['A', 'B']), null);
  assert.equal(pickLetterHint('AB', ['a', 'b']), null);
  assert.ok(pickLetterHint('AB', undefined));
});
