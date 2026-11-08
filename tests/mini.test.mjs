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
