import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtDHM, fmtHMS, msUntilMidnight, msUntilMonday } from '../lib/budapestClock.js';

test('visszaszámlálók budapesti idő szerint', () => {
  // 2026-11-09 hétfő 10:00 Budapest (CET, UTC+1) = 09:00 UTC
  const mon10 = new Date('2026-11-09T09:00:00Z');
  assert.equal(msUntilMidnight(mon10), 14 * 3600 * 1000);
  assert.equal(msUntilMonday(mon10), (7 * 24 - 10) * 3600 * 1000);
  // vasárnap 23:30 Budapest -> fél óra
  const sun = new Date('2026-11-15T22:30:00Z');
  assert.equal(msUntilMonday(sun), 30 * 60 * 1000);
  // nyári időszámítás: 2026-07-01 00:00 Budapest (CEST, UTC+2) = 06-30 22:00 UTC -> 24 óra
  assert.equal(msUntilMidnight(new Date('2026-06-30T22:00:00Z')), 24 * 3600 * 1000);
  assert.equal(fmtHMS(3723000), '1:02:03');
  assert.equal(fmtDHM((2 * 1440 + 5 * 60 + 7) * 60000), '2 nap 5 óra 7 perc');
});
