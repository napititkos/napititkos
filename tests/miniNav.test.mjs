import test from 'node:test';
import assert from 'node:assert/strict';
import { afterType, arrowStep, backspaceStep, clickCell, jumpWord, navModel } from '../lib/miniNav.js';

// #KOS#
// OKOS.
// .....
const rows = [
  ['#', 'k', 'o', 's', '#'],
  ['o', 'k', 'o', 's', 'a'],
  ['s', 'o', 'k', 'a', 'k'],
  ['o', 'k', 'o', 's', 'a'],
  ['#', 'o', 'k', 'o', '#'],
];
const m = navModel(rows);
const empty = rows.map((r) => r.map((ch) => (ch === '#' ? '#' : '')));

test('miniNav: kattintás – új négyzet az aktuális irányban, ugyanaz újra irányt vált', () => {
  let cur = clickCell(m, { r: 0, c: 1, dir: 'A' }, 1, 2);
  assert.deepEqual(cur, { r: 1, c: 2, dir: 'A' });
  cur = clickCell(m, cur, 1, 2);
  assert.equal(cur.dir, 'D');
  assert.deepEqual(clickCell(m, cur, 0, 0), cur, 'fekete négyzetre nem lép');
});

test('miniNav: gépelés után a szó következő üres négyzete, betelt szó után a következő szó', () => {
  const f = empty.map((r) => [...r]);
  f[0][1] = 'K';
  assert.deepEqual(afterType(m, f, { r: 0, c: 1, dir: 'A' }), { r: 0, c: 2, dir: 'A' });
  f[0][2] = 'O';
  f[0][3] = 'S';
  const nx = afterType(m, f, { r: 0, c: 3, dir: 'A' });
  assert.deepEqual(nx, { r: 1, c: 0, dir: 'A' }, 'a 2. vízszintes szó eleje');
  // kitöltött négyzetet átugrik
  const g = empty.map((r) => [...r]);
  g[1][0] = 'O';
  g[1][1] = 'K';
  g[1][2] = 'O';
  assert.deepEqual(afterType(m, g, { r: 1, c: 0, dir: 'A' }), { r: 1, c: 3, dir: 'A' });
});

test('miniNav: Backspace – betűt töröl; üresen visszalép; szó elején az előző szóra', () => {
  const f = empty.map((r) => [...r]);
  f[1][1] = 'K';
  assert.deepEqual(backspaceStep(m, f, { r: 1, c: 1, dir: 'A' }), { clear: [1, 1], cur: { r: 1, c: 1, dir: 'A' } });
  assert.deepEqual(backspaceStep(m, f, { r: 1, c: 2, dir: 'A' }), { clear: [1, 1], cur: { r: 1, c: 1, dir: 'A' } });
  const b = backspaceStep(m, f, { r: 1, c: 0, dir: 'A' });
  assert.deepEqual(b.cur, { r: 0, c: 3, dir: 'A' }, 'az előző (1.) vízszintes szó vége');
});

test('miniNav: nyíl – ellentétes irány először vált, utána lép; feketén átugrik', () => {
  let cur = arrowStep(m, { r: 1, c: 1, dir: 'A' }, 1, 0);
  assert.deepEqual(cur, { r: 1, c: 1, dir: 'D' });
  cur = arrowStep(m, cur, 1, 0);
  assert.deepEqual(cur, { r: 2, c: 1, dir: 'D' });
  assert.deepEqual(arrowStep(m, { r: 1, c: 1, dir: 'A' }, 0, 1), { r: 1, c: 2, dir: 'A' });
});

test('miniNav: Tab – következő szó, a végén körbe', () => {
  const f = empty.map((r) => [...r]);
  const last = m.words[m.order[m.order.length - 1]];
  const firstW = m.words[m.order[0]];
  assert.deepEqual(jumpWord(m, f, { r: last.cells[0][0], c: last.cells[0][1], dir: last.dir }, 1), { r: firstW.cells[0][0], c: firstW.cells[0][1], dir: firstW.dir });
});
