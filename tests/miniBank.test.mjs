import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, bankStats, buildRows, queryRows, usageOf } from '../lib/miniBank.js';

const fixture = () => {
  const bank = {
    alma: [
      { id: '1', clue: 'Gyümölcs.', at: '2026-10-01T10:00:00Z' },
      { id: '2', clue: 'Piros vagy zöld, fán terem.', at: '2026-10-05T10:00:00Z' },
    ],
    kő: [{ id: '3', clue: 'Kemény ásvány', at: '2026-11-01T10:00:00Z' }],
  };
  const titkos = { alma: ['Régi titkosírás az almáról.'], cipő: ['Régi titkosírás a cipőről.'] };
  const rows = buildRows({
    dictWords: ['alma', 'ablak', 'asztal', 'ló'],
    bank,
    titkos,
    excluded: ['ló', 'zzzzz'],
    usage: { alma: { count: 3, lastWeek: '2026-10-26' }, kő: { count: 1, lastWeek: null } },
  });
  return { rows, by: Object.fromEntries(rows.map((r) => [r.word, r])) };
};

test('buildRows: a szótár, a bank, a titkosírások és a kizártak uniója, szavanként egy sor', () => {
  const { rows, by } = fixture();
  assert.deepEqual(new Set(rows.map((r) => r.word)), new Set(['alma', 'ablak', 'asztal', 'ló', 'kő', 'cipő', 'zzzzz']));
  assert.equal(rows.length, 7);
  assert.equal(by.alma.inDict, true);
  assert.equal(by['kő'].inDict, false);
  assert.equal(by['ló'].excluded, true);
  assert.equal(by.zzzzz.excluded, true);
  assert.equal(by.alma.len, 4);
});

test('buildRows: a kézi kérdések a legújabbal kezdve, utánuk a titkosírásból származók', () => {
  const { by } = fixture();
  assert.deepEqual(by.alma.clues.map((c) => [c.src, c.clue]), [
    ['kézi', 'Piros vagy zöld, fán terem.'],
    ['kézi', 'Gyümölcs.'],
    ['titkosírás', 'Régi titkosírás az almáról.'],
  ]);
  assert.equal(by.alma.ownCount, 2);
  assert.equal(by.alma.lastAt, '2026-10-05T10:00:00Z');
  assert.equal(by.alma.used, 3);
  assert.equal(by.alma.lastWeek, '2026-10-26');
  assert.equal(by.ablak.clues.length, 0);
  assert.equal(by.ablak.used, 0);
});

test('bankStats: összesítők', () => {
  const { rows } = fixture();
  assert.deepEqual(bankStats(rows, ['ló', 'zzzzz']), {
    words: 7,
    bankWords: 2,
    bankClues: 3,
    titkosWords: 2,
    withClues: 3,
    noClue: 4,
    dictWords: 4,
    excluded: 2,
  });
});

test('queryRows: szűrők', () => {
  const { rows } = fixture();
  const words = (o) => queryRows(rows, o).rows.map((r) => r.word);
  assert.deepEqual(words({ filter: 'clues' }).sort(), ['alma', 'cipő', 'kő']);
  assert.deepEqual(words({ filter: 'bank' }).sort(), ['alma', 'kő']);
  assert.deepEqual(words({ filter: 'titkos' }).sort(), ['alma', 'cipő']);
  assert.deepEqual(words({ filter: 'noclue' }).sort(), ['ablak', 'asztal', 'zzzzz', 'ló'].sort());
  assert.deepEqual(words({ filter: 'excluded' }).sort(), ['zzzzz', 'ló'].sort());
  assert.equal(words({ filter: 'all' }).length, 7);
  assert.equal(queryRows(rows, {}).filter, 'clues', 'alapértelmezett szűrő');
  assert.equal(queryRows(rows, { filter: 'hamis', sort: 'hamis' }).filter, 'clues');
  assert.equal(queryRows(rows, { filter: 'hamis', sort: 'hamis' }).sort, 'word');
});

test('queryRows: keresés a szóban és a kérdés szövegében, kis- és nagybetűre érzéketlenül', () => {
  const { rows } = fixture();
  const words = (q, filter = 'all') => queryRows(rows, { q, filter }).rows.map((r) => r.word).sort();
  assert.deepEqual(words('ALM'), ['alma']);
  assert.deepEqual(words('ásvány'), ['kő']);
  assert.deepEqual(words('TITKOSÍRÁS'), ['alma', 'cipő']);
  assert.deepEqual(words('  as  '), ['asztal']);
  assert.deepEqual(words('nincs-ilyen'), []);
  assert.deepEqual(words(''), words(undefined));
});

test('queryRows: rendezések (magyar ábécé, hossz, legutóbbi, használat)', () => {
  const { rows } = fixture();
  const order = (sort, filter = 'all') => queryRows(rows, { sort, filter }).rows.map((r) => r.word);
  assert.deepEqual(order('word').slice(0, 3), ['ablak', 'alma', 'asztal']);
  assert.ok(order('word').indexOf('cipő') < order('word').indexOf('kő'));
  assert.ok(order('word').indexOf('kő') < order('word').indexOf('ló'));
  // Hossz szerint növekvő; az azonos hosszúak ábécé szerint (kő, ló a 2 betűsek).
  assert.deepEqual(order('len').slice(0, 2), ['kő', 'ló']);
  const lens = order('len').map((w) => Array.from(w).length);
  assert.deepEqual(lens, [...lens].sort((a, b) => a - b));
  assert.deepEqual(order('recent', 'bank'), ['kő', 'alma']);
  assert.deepEqual(order('used', 'all').slice(0, 2), ['alma', 'kő']);
});

test('queryRows: lapozás, a határokon belül marad', () => {
  const many = buildRows({ dictWords: Array.from({ length: 120 }, (_, i) => `w${String(i).padStart(3, '0')}`) });
  const p1 = queryRows(many, { filter: 'all' });
  assert.equal(p1.rows.length, PAGE_SIZE);
  assert.equal(p1.pageSize, PAGE_SIZE);
  assert.equal(p1.total, 120);
  assert.equal(p1.pages, 3);
  assert.equal(p1.page, 1);
  assert.equal(queryRows(many, { filter: 'all', page: 3 }).rows.length, 20);
  assert.equal(queryRows(many, { filter: 'all', page: 99 }).page, 3);
  assert.equal(queryRows(many, { filter: 'all', page: 0 }).page, 1);
  assert.equal(queryRows(many, { filter: 'all', page: -4 }).page, 1);
  assert.equal(queryRows(many, { filter: 'all', page: 'x' }).page, 1);
  const empty = queryRows(many, { filter: 'all', q: 'nincs' });
  assert.deepEqual([empty.total, empty.pages, empty.page, empty.rows.length], [0, 1, 1, 0]);
});

test('usageOf: hányszor és melyik héten szerepelt (a várólistán lévőnek nincs hete)', () => {
  const u = usageOf([
    { week: '2026-10-05', entries: [{ word: 'alma' }, { word: 'kő' }] },
    { week: '2026-10-26', entries: [{ word: 'alma' }] },
    { week: '2026-10-12', entries: [{ word: 'alma' }] },
    { entries: [{ word: 'alma' }, { word: 'ló' }] },
    null,
    { week: '2026-11-02' },
  ]);
  assert.deepEqual(u.alma, { count: 4, lastWeek: '2026-10-26' });
  assert.deepEqual(u['kő'], { count: 1, lastWeek: '2026-10-05' });
  assert.deepEqual(u['ló'], { count: 1, lastWeek: null });
  assert.deepEqual(usageOf(), {});
});

import { MAX_CLUE, addVariant, cleanClue, deleteVariant, editVariant } from '../lib/miniBank.js';

const bankOf = () => ({
  alma: [
    { id: 'a1', clue: 'Gyümölcs.', at: '2026-10-01T10:00:00Z' },
    { id: 'a2', clue: 'Fán terem.', at: '2026-10-05T10:00:00Z' },
  ],
  kő: [{ id: 'k1', clue: 'Kemény ásvány', at: '2026-11-01T10:00:00Z' }],
});

test('buildRows: a kézi kérdéseknek van azonosítójuk (szerkesztéshez), a titkosírásból származóknak nincs', () => {
  const rows = buildRows({ bank: { alma: [{ id: 'a1', clue: 'Gyümölcs.', at: '2026-10-01T10:00:00Z', editedAt: '2026-10-02T10:00:00Z' }] }, titkos: { alma: ['Régi'] } });
  const alma = rows.find((r) => r.word === 'alma');
  assert.deepEqual(alma.clues.map((c) => [c.src, c.id]), [['kézi', 'a1'], ['titkosírás', null]]);
  assert.equal(alma.clues[0].editedAt, '2026-10-02T10:00:00Z');
});

test('cleanClue: levágja a szóközöket és a hosszt', () => {
  assert.equal(cleanClue('  Kérdés  '), 'Kérdés');
  assert.equal(cleanClue('x'.repeat(1000)).length, MAX_CLUE);
  assert.equal(cleanClue(undefined), '');
  assert.equal(cleanClue(null), '');
  assert.equal(cleanClue(42), '42');
});

test('addVariant: egy szóhoz több, különböző kérdés; az ismétlődő és az üres nem fogadható el', () => {
  const bank = bankOf();
  const before = JSON.stringify(bank);
  const r = addVariant(bank, 'alma', '  Piros, zöld vagy sárga.  ', { id: 'a3', at: 'T' });
  assert.deepEqual(r.bank.alma.map((x) => x.id), ['a1', 'a2', 'a3']);
  assert.equal(r.bank.alma[2].clue, 'Piros, zöld vagy sárga.');
  assert.equal(JSON.stringify(bank), before, 'a bemenet nem módosul');
  assert.deepEqual(addVariant(bank, 'alma', 'Gyümölcs.', { id: 'x', at: 'T' }), { error: 'duplicate' });
  assert.deepEqual(addVariant(bank, 'alma', '   ', { id: 'x', at: 'T' }), { error: 'missing-clue' });
  const fresh = addVariant(bank, 'ló', 'Patás állat.', { id: 'l1', at: 'T' });
  assert.deepEqual(fresh.bank['ló'], [{ id: 'l1', clue: 'Patás állat.', at: 'T' }]);
  assert.ok(bank['ló'] === undefined);
});

test('editVariant: átírja a szöveget, a létrehozás idejét megőrzi, a szerkesztését rögzíti', () => {
  const bank = bankOf();
  const before = JSON.stringify(bank);
  const r = editVariant(bank, 'alma', 'a1', ' Édes gyümölcs. ', { at: 'EDIT' });
  const a1 = r.bank.alma.find((x) => x.id === 'a1');
  assert.deepEqual([a1.clue, a1.at, a1.editedAt], ['Édes gyümölcs.', '2026-10-01T10:00:00Z', 'EDIT']);
  assert.deepEqual(r.bank.alma.map((x) => x.id), ['a1', 'a2'], 'a sorrend nem változik');
  assert.equal(JSON.stringify(bank), before, 'a bemenet nem módosul');
  assert.equal(editVariant(bank, 'alma', 'a1', 'Gyümölcs.', { at: 'EDIT' }).bank, bank, 'változatlan szövegnél nincs módosítás');
  assert.deepEqual(editVariant(bank, 'alma', 'a1', 'Fán terem.', { at: 'EDIT' }), { error: 'duplicate' });
  assert.deepEqual(editVariant(bank, 'alma', 'a1', '', { at: 'EDIT' }), { error: 'missing-clue' });
  assert.deepEqual(editVariant(bank, 'alma', 'nincs', 'x', { at: 'EDIT' }), { error: 'not-found' });
  assert.deepEqual(editVariant(bank, 'nincs', 'a1', 'x', { at: 'EDIT' }), { error: 'not-found' });
  assert.deepEqual(editVariant(bank, 'kő', 'a1', 'x', { at: 'EDIT' }), { error: 'not-found' }, 'más szó azonosítója nem használható');
});

test('deleteVariant: egy változat törlése; az utolsó törlésekor a szó kikerül a bankból', () => {
  const bank = bankOf();
  const before = JSON.stringify(bank);
  const one = deleteVariant(bank, 'alma', 'a1');
  assert.deepEqual(one.bank.alma.map((x) => x.id), ['a2']);
  const last = deleteVariant(one.bank, 'alma', 'a2');
  assert.ok(!('alma' in last.bank));
  assert.deepEqual(Object.keys(last.bank), ['kő']);
  assert.equal(JSON.stringify(bank), before, 'a bemenet nem módosul');
  assert.deepEqual(deleteVariant(bank, 'alma', 'nincs'), { error: 'not-found' });
  assert.deepEqual(deleteVariant(bank, 'nincs', 'a1'), { error: 'not-found' });
});
