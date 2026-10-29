import test from 'node:test';
import assert from 'node:assert/strict';
import { tileRows } from '../lib/socialLayout.js';
import { ACHIEVEMENTS, computeNewAchievements } from '../lib/achievements.js';

const total = (r) => r.rows.flat().reduce((a, b) => a + b, 0);
const rowWidth = (r, row) => row.reduce((a, n) => a + n * r.tile + (n - 1) * r.gap, 0) + (row.length - 1) * r.wordGap;

test('posztkép: rövid megfejtés egy sorban, a legnagyobb dobozmérettel', () => {
  const r = tileRows('LATYAK', 1000, 64, 150);
  assert.deepEqual(r.rows, [[6]]);
  assert.equal(r.tile, 64);
});

test('posztkép: több rövid szó (összesen legfeljebb 14 betű) egy sorba kerül', () => {
  const r = tileRows('ALMA FA', 1000, 64, 150);
  assert.deepEqual(r.rows, [[4, 2]]);
});

test('posztkép: 14 betűnél hosszabb szó 12-es darabokra törik, és minden betű megmarad', () => {
  const r = tileRows('LEGESLEGMEGENGESZTELHETETLENEBBEKNEK', 1000, 64, 150);
  assert.equal(total(r), 36);
  assert.ok(r.rows.every((row) => row.every((n) => n <= 12)));
});

test('posztkép: a dobozok szélességben és magasságban is beférnek', () => {
  for (const answer of ['LATYAK', 'NAGYON HOSSZÚ MEGFEJTÉS', 'A'.repeat(44), 'EGY KETTŐ HÁROM NÉGY ÖT HAT HÉT NYOLC']) {
    const r = tileRows(answer, 1000, 64, 150);
    for (const row of r.rows) assert.ok(rowWidth(r, row) <= 1000, answer);
    assert.ok(r.rows.length * r.tile + (r.rows.length - 1) * r.rowGap <= 150, answer);
    assert.equal(total(r), answer.replace(/ /g, '').length);
  }
});

test('posztkép: üres megfejtésnél nincs doboz', () => {
  assert.deepEqual(tileRows('', 1000, 64, 150).rows, []);
});

test('trófeák: elöl a Kisokos bevezetője, majd a teljes Kisokos; az Olvasott megszűnt', () => {
  assert.equal(ACHIEVEMENTS[0].id, 'intro_done');
  assert.equal(ACHIEVEMENTS[0].title, 'Kezdő');
  assert.equal(ACHIEVEMENTS[1].id, 'tutorial_done');
  assert.ok(!ACHIEVEMENTS.some((a) => a.id === 'read_help'));
  assert.equal(ACHIEVEMENTS.length, 20);
});

test('trófeák: a bevezető trófeát a Kezdetek teljesítése adja, a Kisokos megnyitása már nem ad trófeát', () => {
  assert.deepEqual(computeNewAchievements({ introDone: true }, []).newly, ['intro_done']);
  assert.deepEqual(computeNewAchievements({ readHelp: true }, []).newly, []);
  assert.deepEqual(computeNewAchievements({ introDone: true }, ['intro_done']).newly, []);
});
