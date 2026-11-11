import test from 'node:test';
import assert from 'node:assert/strict';
import { NEIGHBORS, generateSzo, solveGrid } from '../lib/szoGen.js';
import { SZO_PROFANE } from '../lib/szoData.js';

const adj = (a, b) => NEIGHBORS[a].includes(b);

test('szókereső: a napi szó az összes négyzetet használja, szomszédos lépésekkel', () => {
  for (const d of ['2026-11-10', '2026-11-11', '2026-11-12']) {
    const p = generateSzo(d, {});
    assert.equal(Array.from(p.word).length, 9);
    assert.equal(new Set(p.path).size, 9);
    p.path.forEach((c, i) => assert.equal(p.grid[c], Array.from(p.word)[i]));
    for (let i = 1; i < 9; i++) assert.ok(adj(p.path[i - 1], p.path[i]));
    assert.ok(p.required.length >= 5, `${d}: ${p.required.length}`);
  }
});

test('szókereső: minden szó útja érvényes (szomszédos, egyszer használt négyzetek, a betűk egyeznek)', () => {
  const p = generateSzo('2026-11-20', {});
  for (const w of [...p.required, ...p.bonus]) {
    const path = p.paths[w];
    assert.equal(path.map((i) => p.grid[i]).join(''), w);
    assert.equal(new Set(path).size, path.length);
    for (let i = 1; i < path.length; i++) assert.ok(adj(path[i - 1], path[i]));
    assert.ok(Array.from(w).length >= 3);
  }
});

test('szókereső: ugyanarra a napra ugyanazt generálja; trágár és tiltott szó nincs, a hozzáadott szó kötelező', () => {
  const a = generateSzo('2026-12-01', { seconds: 60 });
  const b = generateSzo('2026-12-01', { seconds: 60 });
  assert.deepEqual(a.grid, b.grid);
  const grid = Array.from('faszkalap'); // a rácsba betett trágár szó sem jelenhet meg
  const s = solveGrid(grid, {});
  for (const w of SZO_PROFANE) assert.ok(!s.required.includes(w) && !s.bonus.includes(w), w);
  const some = a.required[0];
  const s2 = solveGrid(a.grid, { banned: [some], added: ['xyz'] });
  assert.ok(!s2.required.includes(some) && !s2.bonus.includes(some));
});

test('szókereső pontozás: 3→3, 4→5, 5→10, 6→15, 7→25, 8→40, 9→65', async () => {
  const { szoPointsOf, szoPointsTotal } = await import('../lib/szoPoints.js');
  assert.deepEqual(['kos', 'okos', 'kosok', 'szelet', 'kosaras', 'kosarazó', 'készenlét'].map(szoPointsOf), [3, 5, 10, 15, 25, 40, 65]);
  assert.equal(szoPointsTotal(['kos', 'cs', 'szék']), 3 + 0 + 5); // a „szék” 4 betű (sz = 2 négyzet)
});

test('ISO-hét a heti minikhez', async () => {
  const { isoWeek, weekLabel } = await import('../lib/isoWeek.js');
  assert.deepEqual(isoWeek('2026-11-09'), { year: 2026, week: 46 });
  assert.deepEqual(isoWeek('2026-01-01'), { year: 2026, week: 1 });
  assert.deepEqual(isoWeek('2027-01-01'), { year: 2026, week: 53 });
  assert.equal(weekLabel('2026-11-09'), '2026. 46. hét');
});

test('szókereső nehézség: hétfőn a legkevesebb, vasárnap a legtöbb kötelező szó', async () => {
  const { generateSzo, szoDayTarget } = await import('../lib/szoGen.js');
  const week = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
  const counts = week.map((d) => generateSzo(d, { seconds: 60 }).required.length);
  for (let i = 1; i < 7; i++) assert.ok(counts[i] > counts[i - 1], JSON.stringify(counts));
  week.forEach((d, i) => assert.ok(Math.abs(counts[i] - szoDayTarget(d)) <= 3, `${d}: ${counts[i]}`));
  // újragenerálásnál (más „salt”) is a nap célértéke körül marad
  const again = generateSzo('2026-11-22', { seconds: 60, salt: 'x' }).required.length;
  assert.ok(Math.abs(again - szoDayTarget('2026-11-22')) <= 3, String(again));
});
