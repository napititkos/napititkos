import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMini, slotsOf, templateGrid } from '../lib/miniGen.js';
import { MINI_TEMPLATES } from '../lib/miniData.js';

test('mini: minden minta megfelel a szabályoknak', () => {
  for (const m of MINI_TEMPLATES) {
    const g = templateGrid(m);
    const blacks = g.flat().filter(Boolean).length;
    assert.ok(blacks <= 10);
    const lens = slotsOf(g).map((s) => s.cells.length);
    assert.ok(lens.filter((x) => x === 1).length <= 1);
    assert.ok(lens.filter((x) => x === 2).length <= 2);
  }
});

test('mini: a generátor érvényes, ismétlés nélküli rácsot ad, a kizárt szavak nélkül', () => {
  for (let s = 1; s <= 8; s++) {
    const p = generateMini({ seed: s, seconds: 4, excluded: ['alma', 'tó'] });
    assert.ok(p, `seed ${s}`);
    const words = p.entries.map((e) => e.word);
    assert.equal(new Set(words).size, words.length);
    assert.ok(!words.includes('alma') && !words.includes('tó'));
    for (const e of p.entries) {
      Array.from(e.word).forEach((ch, k) => assert.equal(p.rows[e.row + (e.dir === 'D' ? k : 0)][e.col + (e.dir === 'A' ? k : 0)], ch));
    }
  }
});

import { completeMini } from '../lib/miniGen.js';

const keepOnlyFirstRow = (rows) => rows.map((r, ri) => r.map((ch) => (ch === '#' || ri === 0 ? ch : '')));

test('mini: a részben kitöltött tábla maradéka kitölthető, a beírtak és a fekete négyzetek nem változnak', () => {
  for (let s = 1; s <= 5; s++) {
    const full = generateMini({ seed: s, seconds: 4 });
    assert.ok(full, `seed ${s}`);
    const partial = keepOnlyFirstRow(full.rows);
    const got = completeMini({ rows: partial, seconds: 5, seed: s + 100 });
    assert.ok(got.rows, `seed ${s}: ${JSON.stringify(got.error)}`);
    partial.forEach((row, r) =>
      row.forEach((ch, c) => {
        if (ch) assert.equal(got.rows[r][c], ch, `(${r},${c}) nem változhat`);
        else assert.ok(got.rows[r][c] && got.rows[r][c] !== '#', `(${r},${c}) üres maradt`);
      })
    );
    const words = got.entries.map((e) => e.word);
    assert.equal(new Set(words).size, words.length, 'nincs ismétlődő szó');
    for (const e of got.entries) {
      Array.from(e.word).forEach((ch, k) => assert.equal(got.rows[e.row + (e.dir === 'D' ? k : 0)][e.col + (e.dir === 'A' ? k : 0)], ch));
    }
  }
});

test('mini: a kézzel beírt, szótárban nem szereplő szó megmarad', () => {
  const B = Array(5).fill('#');
  const rows = [['q', 'x', 'z', 'v', 'w'], [...B], [...B], ['', '', '#', '#', '#'], [...B]];
  const got = completeMini({ rows, seconds: 4, seed: 7 });
  assert.ok(got.rows, JSON.stringify(got.error));
  assert.deepEqual(got.rows[0], ['q', 'x', 'z', 'v', 'w']);
  assert.ok(got.entries.some((e) => e.word === 'qxzvw'));
  assert.ok(got.rows[3][0] && got.rows[3][1]);
});

test('mini: hibás esetek: nincs üres négyzet, ismétlődő beírt szó, lehetetlen kitöltés', () => {
  const full = generateMini({ seed: 3, seconds: 4 });
  assert.deepEqual(completeMini({ rows: full.rows }), { error: 'nothing-to-fill' });

  const B = Array(5).fill('#');
  const dup = [['a', 'b', 'c', '#', '#'], [...B], ['a', 'b', 'c', '#', '#'], [...B], ['#', '#', '#', '#', '']];
  assert.deepEqual(completeMini({ rows: dup, seconds: 2 }), { error: 'duplicate' });

  const impossible = Array.from({ length: 5 }, () => Array(5).fill(''));
  impossible[0][0] = 'q';
  impossible[1][0] = 'x';
  impossible[2][0] = 'q';
  assert.deepEqual(completeMini({ rows: impossible, seconds: 1 }), { error: 'no-fill' });
});
