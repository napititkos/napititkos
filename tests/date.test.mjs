import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDateStr, previousDay, todayStr } from '../lib/date.js';

test('a nap budapesti naptári nap, nem UTC (nyári időszámítás)', () => {
  // Szeptemberben Budapest UTC+2: 22:00 UTC már másnap 00:00.
  assert.equal(todayStr(new Date('2026-09-20T21:59:59Z')), '2026-09-20');
  assert.equal(todayStr(new Date('2026-09-20T22:00:00Z')), '2026-09-21');
  assert.equal(todayStr(new Date('2026-09-20T22:30:00Z')), '2026-09-21');
});

test('a nap budapesti naptári nap (téli időszámítás, évforduló)', () => {
  // Télen Budapest UTC+1: 23:00 UTC már másnap 00:00.
  assert.equal(todayStr(new Date('2026-12-31T22:59:59Z')), '2026-12-31');
  assert.equal(todayStr(new Date('2026-12-31T23:00:00Z')), '2027-01-01');
});

test('isValidDateStr', () => {
  assert.equal(isValidDateStr('2026-09-21'), true);
  assert.equal(isValidDateStr('2028-02-29'), true);
  for (const bad of ['2026-02-30', '2026-13-01', '2026-9-1', '', 'x', null, undefined, 20260921, '2026-09-21T00:00', '../etc', 'leaderboard:*']) {
    assert.equal(isValidDateStr(bad), false, String(bad));
  }
});

test('previousDay: hónap-, év- és szökőnap-határ', () => {
  assert.equal(previousDay('2026-09-21'), '2026-09-20');
  assert.equal(previousDay('2026-10-01'), '2026-09-30');
  assert.equal(previousDay('2027-01-01'), '2026-12-31');
  assert.equal(previousDay('2028-03-01'), '2028-02-29');
  assert.equal(previousDay('2027-03-01'), '2027-02-28');
});
