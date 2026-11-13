import test from 'node:test';
import assert from 'node:assert/strict';
import { minimalCells } from '../lib/szoCells.js';

test('két O: a szükségtelen négyzet kifakul, minden szó kirakható marad', () => {
  // szó1 csak az 1-es O-n át, szó2 az 1-es vagy a 2-es O-n át
  const routes = [[[0, 1, 4]], [[3, 1], [3, 2]].map((r) => r)];
  const kept = minimalCells(routes, null, 'x');
  assert.deepEqual([...kept].sort(), [0, 1, 3, 4]);
});

test('két egyenértékű választás: véletlenszerű, de ugyanarra a magra állandó, és az előzőhöz igazodik', () => {
  const routes = [[[0, 1], [0, 2]]];
  const a = minimalCells(routes, null, 'nap-1');
  const b = minimalCells(routes, null, 'nap-1');
  assert.deepEqual([...a], [...b]);
  assert.equal(a.size, 2);
  const keepPrev = minimalCells(routes, new Set([0, 2, 5]), 'mas-mag');
  assert.deepEqual([...keepPrev].sort(), [0, 2]);
});

test('minden szónak marad teljes útja', () => {
  const routes = [[[0, 1, 2], [0, 4, 2]], [[4, 5]], [[6, 7], [8, 7]]];
  const kept = minimalCells(routes, null, 's');
  for (const rs of routes) assert.ok(rs.some((r) => r.every((i) => kept.has(i))));
  assert.equal(kept.size, 6);
});

test('üres lista: nincs megtartott négyzet', () => {
  assert.equal(minimalCells([], null, 's').size, 0);
});
