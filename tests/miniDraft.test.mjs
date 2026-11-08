import test from 'node:test';
import assert from 'node:assert/strict';
import { N, gridWarnings, normWord, numbering, slotKey, slotsOf } from '../lib/miniGrid.js';
import { assemble, draftProgress, sanitizeDraftInput, toPublishable } from '../lib/miniDraft.js';
import { templateGrid } from '../lib/miniGen.js';

const empty = () => Array.from({ length: N }, () => Array(N).fill(''));
const codes = (rows) => gridWarnings(rows).map((w) => w.code);

test('miniGrid: a generátor és a szerkesztő ugyanazt a slotsOf-ot használja', () => {
  const grid = templateGrid(16777216);
  assert.deepEqual(slotsOf(grid), slotsOf(grid.map((r) => [...r])));
  assert.equal(N, 5);
});

test('normWord: érvényes és érvénytelen szavak', () => {
  assert.equal(normWord(' Alma '), 'alma');
  assert.equal(normWord('Ő'), 'ő');
  for (const bad of ['', '  ', 'hosszú', 'ab1', 'a b', 'ab-c', null, undefined, 'abcdef']) assert.equal(normWord(bad), null, String(bad));
});

test('numbering: sorszámok a szavak kezdőnégyzetein', () => {
  const rows = empty();
  rows[0][2] = '#';
  const n = numbering(rows);
  assert.equal(n['0,0'], 1);
  assert.equal(n['0,1'], 2);
  assert.equal(n['0,3'], 3);
  assert.equal(n['0,4'], 4);
  assert.equal(n['1,0'], 5);
  assert.equal(n['0,2'], undefined);
});

test('gridWarnings: a szabályos, üres rács nem ad figyelmeztetést', () => {
  assert.deepEqual(codes(empty()), []);
});

test('gridWarnings: sok fekete négyzet, fekete sor, szétesett terület, rövid szavak', () => {
  let rows = empty();
  for (let c = 0; c < N; c++) rows[2][c] = '#';
  assert.ok(codes(rows).includes('black-line'));
  assert.ok(codes(rows).includes('disconnected'));

  rows = empty();
  let n = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 1 && n++ < 11) rows[r][c] = '#';
  assert.ok(codes(rows).includes('too-many-black'));

  // Két külön egybetűs szó: az (0,0) és a (0,2) vízszintesen magányos, függőlegesen is.
  rows = Array.from({ length: N }, () => Array(N).fill('#'));
  rows[0][0] = '';
  rows[0][2] = '';
  assert.ok(codes(rows).includes('many-1'));

  rows = Array.from({ length: N }, () => Array(N).fill('#'));
  assert.deepEqual(codes(rows), ['all-black']);
});

test('sanitizeDraftInput: érvényes tartalom megtisztítva', () => {
  const rows = empty();
  rows[0][0] = 'Á';
  rows[1][1] = ' # ';
  const clean = sanitizeDraftInput({
    title: '  Teszt   tábla  ',
    rows,
    clues: { 'A:0:0': { clue: '  Kérdés  ', word: 'Alma' }, 'D:4:4': { clue: '' }, 'X:0:0': { clue: 'rossz kulcs' }, 'A:9:9': { clue: 'nincs ilyen' } },
  });
  assert.equal(typeof clean, 'object');
  assert.equal(clean.title, 'Teszt tábla');
  assert.equal(clean.rows[0][0], 'á');
  assert.equal(clean.rows[1][1], '#');
  assert.deepEqual(clean.clues, { 'A:0:0': { clue: 'Kérdés', word: 'alma' } });
});

test('sanitizeDraftInput: hibás rács és betűk elutasítva', () => {
  assert.equal(typeof sanitizeDraftInput(null), 'string');
  assert.equal(typeof sanitizeDraftInput({ rows: [] }), 'string');
  assert.equal(typeof sanitizeDraftInput({ rows: empty().slice(0, 4) }), 'string');
  const short = empty();
  short[2] = ['', '', ''];
  assert.equal(typeof sanitizeDraftInput({ rows: short }), 'string');
  const bad = empty();
  bad[0][0] = 'ab';
  assert.equal(sanitizeDraftInput({ rows: bad }), 'Hibás betű a rácsban.');
  const digit = empty();
  digit[3][3] = '7';
  assert.equal(sanitizeDraftInput({ rows: digit }), 'Hibás betű a rácsban.');
});

test('sanitizeDraftInput: hosszkorlátok, idegen típusok', () => {
  const clean = sanitizeDraftInput({ title: 'x'.repeat(200), rows: empty(), clues: { 'A:0:0': { clue: 'k'.repeat(1000), word: 'a' } } });
  assert.equal(clean.title.length, 60);
  assert.equal(clean.clues['A:0:0'].clue.length, 300);
  assert.deepEqual(sanitizeDraftInput({ rows: empty(), clues: [1, 2] }).clues, {});
  assert.deepEqual(sanitizeDraftInput({ rows: empty(), clues: 'x' }).clues, {});
  assert.equal(sanitizeDraftInput({ rows: empty(), title: 12345 }).title, '12345');
});

// Egy teljesen kitöltött, szabályos rács a következő tesztekhez:
//   A L M A #
//   L . . . #   (a többi négyzet a kereszteződések miatt a szavakból adódik)
function fullRows() {
  const rows = Array.from({ length: N }, () => Array(N).fill('#'));
  // egy vízszintes és egy függőleges szó: "alma" a 0. sorban, "ló" a 0. oszlopban lefelé
  ['a', 'l', 'm', 'a'].forEach((ch, c) => (rows[0][c] = ch));
  rows[1][0] = 'l';
  rows[2][0] = 'ó';
  return rows;
}

test('assemble: kész és hiányos szavak, elavult kérdés', () => {
  const rows = fullRows();
  const all = assemble(rows, {});
  const alma = all.find((s) => s.key === slotKey('A', 0, 0));
  assert.deepEqual({ word: alma.word, complete: alma.complete, len: alma.len }, { word: 'alma', complete: true, len: 4 });
  const loo = all.find((s) => s.key === slotKey('D', 0, 0));
  assert.equal(loo.word, 'aló');

  rows[1][0] = '';
  const part = assemble(rows, {}).find((s) => s.key === slotKey('D', 0, 0));
  assert.deepEqual({ complete: part.complete, word: part.word }, { complete: false, word: '' });

  const withClue = assemble(fullRows(), { 'A:0:0': { clue: 'Gyümölcs', word: 'alma' } }).find((s) => s.key === 'A:0:0');
  assert.equal(withClue.stale, false);
  const stale = assemble(fullRows(), { 'A:0:0': { clue: 'Gyümölcs', word: 'alom' } }).find((s) => s.key === 'A:0:0');
  assert.equal(stale.stale, true);
  const legacy = assemble(fullRows(), { 'A:0:0': { clue: 'Gyümölcs', word: '' } }).find((s) => s.key === 'A:0:0');
  assert.equal(legacy.stale, false);
});

test('draftProgress és toPublishable: a beemelés csak teljes, kérdéses, nem elavult táblát enged', () => {
  const rows = fullRows();
  const clues = {};
  const keys = assemble(rows, {}).map((s) => s.key);
  let p = draftProgress({ rows, clues });
  assert.deepEqual(p, { total: keys.length, complete: keys.length, clued: 0 });
  assert.match(toPublishable({ rows, clues }), /nincs kérdés/);

  keys.forEach((k) => (clues[k] = { clue: `Kérdés ${k}`, word: assemble(rows, {}).find((s) => s.key === k).word }));
  p = draftProgress({ rows, clues });
  assert.equal(p.clued, keys.length);
  const pub = toPublishable({ rows, clues });
  assert.equal(typeof pub, 'object');
  assert.equal(pub.entries.length, keys.length);
  assert.ok(pub.entries.every((e) => e.clue && e.word && e.len === Array.from(e.word).length));

  const stale = { ...clues, 'A:0:0': { clue: 'x', word: 'alom' } };
  assert.match(toPublishable({ rows, clues: stale }), /megváltozott/);
  assert.equal(draftProgress({ rows, clues: stale }).clued, keys.length - 1);

  const partial = fullRows();
  partial[1][0] = '';
  assert.equal(toPublishable({ rows: partial, clues }), 'Nincs minden négyzet kitöltve.');
  assert.equal(toPublishable({ rows: Array.from({ length: N }, () => Array(N).fill('#')), clues: {} }), 'A tábla üres.');
});
