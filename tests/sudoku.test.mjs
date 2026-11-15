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

test('sudoku 9x9: egyedi megoldású, szabályos, a 6x6-ossal azonos nehézség, ugyanarra a napra ugyanaz', () => {
  const week9 = week.map((d) => generateSudoku(d, { size: 9 }));
  week9.forEach((p, i) => {
    assert.equal(p.size, 9);
    assert.equal(p.givens.length, 81);
    assert.equal(p.level, sudokuLevel(week[i]));
    assert.equal(countSolutions(p.givens, 2), 1, week[i]);
    assert.equal(conflicts(p.solution).size, 0, week[i]);
    assert.ok(p.givens.every((g, k) => !g || g === p.solution[k]), week[i]);
  });
  assert.deepEqual(generateSudoku(week[0], { size: 9 }).givens, week9[0].givens);
  const clues = week9.map((p) => p.clues);
  for (let i = 1; i < 7; i++) assert.ok(clues[i] <= clues[i - 1], JSON.stringify(clues));
  assert.ok(solvableWith(week9[0].givens, { hidden: false }), 'hétfő: csupasz egyesekkel');
  assert.ok(!solvableWith(week9[6].givens) && solvableAdvanced(week9[6].givens), 'vasárnap: csak haladó lépésekkel');
});

test('sudoku 9x9: ütközés a 3x3-as dobozban', () => {
  const g = Array(81).fill(0);
  g[0] = 7; g[20] = 7; // 0. sor 0. oszlop és 2. sor 2. oszlop: azonos doboz
  assert.deepEqual([...conflicts(g)].sort((a, b) => a - b), [0, 20]);
  const h = Array(81).fill(0);
  h[0] = 7; h[30] = 7; // 3. sor 3. oszlop: más doboz
  assert.equal(conflicts(h).size, 0);
});
