import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyDone, markAllDoneToday, weekStartOf } from '../lib/dailyDone.js';
import { computeNewAchievements, statsFromProgress } from '../lib/achievements.js';

const D = '2026-11-18';
const full = () => ({ history: { [D]: { correct: true } }, szoFullDays: [D], sudokuDays: [D], sudoku9Days: [D], miniWeeks: [weekStartOf(D)] });

test('teljes nap: csak ha minden napi rejtvény kész (titkosírás, szókereső, 6x6, 9x9, heti mini)', () => {
  assert.equal(weekStartOf(D), '2026-11-16');
  assert.ok(Object.values(dailyDone(full(), D)).every(Boolean));
  for (const k of ['szoFullDays', 'sudokuDays', 'sudoku9Days', 'miniWeeks']) {
    const p = full();
    p[k] = [];
    assert.equal(markAllDoneToday(p, D), false, k);
    assert.ok(!(p.allDoneDays || []).includes(D));
  }
  const p = full();
  assert.equal(markAllDoneToday(p, D), true);
  assert.deepEqual(p.allDoneDays, [D]);
  assert.equal(markAllDoneToday(p, D), false, 'másodszor már nem kerül be');
});

test('teljes nap trófeák 1/5/10, és a már megszerzett nem vész el', () => {
  const prog = { allDoneDays: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'] };
  const { unlocked } = computeNewAchievements(statsFromProgress(prog), []);
  assert.ok(unlocked.includes('all_day_1') && unlocked.includes('all_day_5') && !unlocked.includes('all_day_10'));
  // egy új játék miatt ma nincs teljes nap: a korábbi napok és a trófeák megmaradnak
  const p2 = { ...prog, history: {} };
  assert.equal(markAllDoneToday(p2, D), false);
  assert.equal(p2.allDoneDays.length, 5);
  assert.ok(computeNewAchievements(statsFromProgress(p2), unlocked).unlocked.includes('all_day_5'));
});

test('Következő játék: a főoldal sorrendjében az első még nem teljesített (a mostani kihagyva)', async () => {
  const { nextGameHref } = await import('../lib/dailyDone.js');
  const w = weekStartOf(D);
  assert.equal(nextGameHref({}, 'titkos', D), '/szokereso');
  assert.equal(nextGameHref({ szoFullDays: [D] }, 'titkos', D), '/sudoku');
  // 9x9 után, ha a 6x6 még nincs meg: a 6x6-ra
  assert.equal(nextGameHref({ history: { [D]: { correct: true } }, szoFullDays: [D], sudoku9Days: [D] }, 'sudoku9', D), '/sudoku');
  // 6x6 után a 9x9-re
  assert.equal(nextGameHref({ history: { [D]: { correct: true } }, szoFullDays: [D], sudokuDays: [D] }, 'sudoku6', D), '/sudoku?m=9');
  // a mini után felülről: a még meg nem fejtett titkosírás
  assert.equal(nextGameHref({ miniWeeks: [w] }, 'mini', D), '/titkosiras');
  // minden kész: a közösségi rejtvények
  assert.equal(nextGameHref(full(), 'mini', D), '/kozossegi');
});

test('A Régész: a korábbi rejtvények meglátogatásáért, visszamenőleges beszámítás nélkül', () => {
  const un = (p) => computeNewAchievements(statsFromProgress(p), []).unlocked;
  assert.ok(!un({ archiveSolved: Array.from({ length: 60 }, (_, i) => `t${i}`) }).includes('archaeologist'));
  assert.ok(un({ visitedArchive: true }).includes('archaeologist'));
});
