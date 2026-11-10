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
  const a = generateSzo('2026-12-01', {});
  const b = generateSzo('2026-12-01', {});
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
