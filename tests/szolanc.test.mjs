import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSzolanc, ladderInfo, shortestPath, isWord, oneLetterApart, szolancLevel } from '../lib/szolanc.js';

const days = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 10, 23 + i)).toISOString().slice(0, 10));

test('szólánc: minden napra van feladvány, a nehézségnek megfelelő; egyetlen út csak 5/5-nél', () => {
  for (const d of days) {
    const p = generateSzolanc(d);
    assert.ok(p, d);
    assert.equal(p.level, szolancLevel(d));
    assert.equal(p.par, p.level <= 2 ? 4 : 5, d);
    assert.ok(p.paths >= (p.level === 5 ? 1 : 2) && p.paths <= 5, `${d}: ${p.paths}`);
    if (p.level === 5) assert.equal(p.paths, 1, 'az 5/5 egyutas');
    const info = ladderInfo(p.start, p.end);
    assert.equal(info.d, p.par, `${d}: a teljes szókincsben sincs rövidebb út`);
    const path = shortestPath(p.start, p.end);
    assert.equal(path.length, p.par + 1);
    for (let i = 1; i < path.length; i++) assert.ok(isWord(path[i]) && oneLetterApart(path[i - 1], path[i]), path.join('-'));
  }
  assert.deepEqual(generateSzolanc(days[0]), generateSzolanc(days[0]), 'ugyanarra a napra ugyanaz');
});

test('szólánc: a Kisokos gyakorló lánca (BOLT → FONT) két úton is megoldható', () => {
  assert.deepEqual(ladderInfo('bolt', 'font'), { d: 2, paths: 2 });
});
