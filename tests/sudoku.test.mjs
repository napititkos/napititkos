import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSudoku, countSolutions, conflicts, solvableWith, solvableAdvanced, sudokuLevel, PEERS } from '../lib/sudokuGen.js';

const week = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];

test('sudoku: nehézség a hét napja szerint (h, k: 1 · sze, cs: 2 · p: 3 · szo: 4 · v: 5)', () => {
  assert.deepEqual(week.map(sudokuLevel), [1, 1, 2, 2, 3, 4, 5]);
});

test('sudoku: minden nap egyedi megoldású, szabályos rejtvény, ugyanarra a napra ugyanaz', () => {
  for (const d of [...week, '2026-12-24', '2027-01-01', '2027-03-15']) {
    const p = generateSudoku(d);
    assert.equal(p.givens.length, 36);
    assert.equal(countSolutions(p.givens, 3), 1, d);
    assert.equal(conflicts(p.solution).size, 0, d);
    assert.ok(p.givens.every((g, i) => !g || g === p.solution[i]), d);
    assert.deepEqual(generateSudoku(d).givens, p.givens);
  }
});

test('sudoku: meredek nehézség – kevesebb szám és nehezebb lépések a hét vége felé', () => {
  const ps = week.map((d) => generateSudoku(d));
  const clues = ps.map((p) => p.clues);
  for (let i = 1; i < 7; i++) assert.ok(clues[i] <= clues[i - 1], JSON.stringify(clues));
  assert.ok(clues[0] >= 20 && clues[6] <= 10, JSON.stringify(clues));
  // hétfő–csütörtök: csupasz egyesekkel; péntek–szombat: rejtett egyesek kellenek; vasárnap: egyesekkel nem, csak haladó lépésekkel
  for (const i of [0, 1, 2, 3]) assert.ok(solvableWith(ps[i].givens, { hidden: false }), week[i]);
  for (const i of [4, 5]) assert.ok(!solvableWith(ps[i].givens, { hidden: false }) && solvableWith(ps[i].givens), week[i]);
  assert.ok(!solvableWith(ps[6].givens) && solvableAdvanced(ps[6].givens), week[6]);
});

test('sudoku: újragenerálásnál más rejtvény, ugyanazzal a nehézséggel', () => {
  const a = generateSudoku('2026-11-22');
  const b = generateSudoku('2026-11-22', { salt: 'x' });
  assert.notDeepEqual(a.givens, b.givens);
  assert.equal(a.level, b.level);
  assert.equal(countSolutions(b.givens, 3), 1);
});

test('sudoku: ütközésvizsgálat (sor, oszlop, 2x3-as doboz)', () => {
  const g = Array(36).fill(0);
  g[0] = 3; g[5] = 3; // azonos sor
  assert.deepEqual([...conflicts(g)].sort((a, b) => a - b), [0, 5]);
  const h = Array(36).fill(0);
  h[0] = 4; h[8] = 4; // azonos doboz (0. és 1. sor, 0–2. oszlop)
  assert.deepEqual([...conflicts(h)].sort((a, b) => a - b), [0, 8]);
  const k = Array(36).fill(0);
  k[0] = 4; k[9] = 4; // más doboz, más sor, más oszlop
  assert.equal(conflicts(k).size, 0);
  assert.equal(PEERS[0].length, 12);
});
