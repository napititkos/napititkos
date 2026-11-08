import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, bankStats, buildRows, parseNeedle, queryRows, usageOf } from '../lib/miniBank.js';

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
  assert.deepEqual(words('  asz  '), ['asztal']);
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

test('queryRows: hossz és kezdőbetű szerinti szűrés, a gombokhoz tartozó darabszámokkal', () => {
  const { rows } = fixture();
  const q = (o) => queryRows(rows, { filter: 'all', ...o });
  const words = (o) => q(o).rows.map((r) => r.word).sort();
  assert.deepEqual(words({ len: 4 }), ['alma', 'cipő']);
  assert.deepEqual(words({ len: 2 }), ['kő', 'ló']);
  assert.deepEqual(words({ letter: 'a' }), ['ablak', 'alma', 'asztal']);
  assert.deepEqual(words({ letter: 'a', len: 5 }), ['ablak']);
  assert.equal(q({ len: 3 }).total, 0, 'nincs 3 betűs szó');
  // Érvénytelen érték nem szűr (a 6 betűs "asztal" nem választható hossz).
  assert.equal(q({ len: 6 }).total, 7);
  assert.equal(q({ len: 'x' }).total, 7);
  assert.equal(q({ letter: '1' }).total, 7);
  assert.equal(q({ letter: '' }).letter, '');

  // lenCounts: a kezdőbetűt figyelembe veszi, a hosszt nem.
  assert.deepEqual(q({}).lenCounts, { 2: 2, 4: 2, 5: 2, 6: 1 });
  assert.deepEqual(q({ letter: 'a' }).lenCounts, { 4: 1, 5: 1, 6: 1 });
  assert.deepEqual(q({ letter: 'a', len: 5 }).lenCounts, { 4: 1, 5: 1, 6: 1 }, 'a kiválasztott hossz nem szűkíti a saját gombsorát');
  // letters: a hosszt figyelembe veszi, a kezdőbetűt nem.
  assert.deepEqual(q({}).letters, [['a', 3], ['c', 1], ['k', 1], ['l', 1], ['z', 1]]);
  assert.deepEqual(q({ len: 2 }).letters, [['k', 1], ['l', 1]]);
  assert.deepEqual(q({ len: 2, letter: 'k' }).letters, [['k', 1], ['l', 1]], 'a kiválasztott betű nem szűkíti a saját sávját');
  // A keresés és a szűrő a darabszámokat is szűkíti.
  assert.deepEqual(q({ q: 'alm' }).letters, [['a', 1]]);
  assert.deepEqual(queryRows(rows, { filter: 'clues' }).lenCounts, { 2: 1, 4: 2 });
  assert.equal(q({ len: 4, page: 1 }).len, 4);
});

test('queryRows: az ékezetes kezdőbetű az alapbetű alatt van (Á→A, Ő→O), lapozással együtt működik', () => {
  const rows = buildRows({ dictWords: ['állat', 'alma', 'ősz', 'olló', 'ökör', 'érme', 'egér'] });
  const words = (o) => queryRows(rows, { filter: 'all', ...o }).rows.map((r) => r.word);
  assert.deepEqual(words({ letter: 'a' }), ['állat', 'alma']);
  assert.deepEqual(words({ letter: 'á' }), ['állat', 'alma'], 'az ékezetes betű is az alapbetűt jelenti');
  assert.deepEqual(words({ letter: 'o' }).sort(), ['olló', 'ökör', 'ősz'].sort());
  assert.deepEqual(queryRows(rows, { filter: 'all' }).letters, [['a', 2], ['e', 2], ['o', 3]]);
  const p = queryRows(rows, { filter: 'all', letter: 'o', pageSize: 2, page: 2 });
  assert.equal(p.rows.length, 1);
  assert.equal(p.total, 3);
  assert.equal(p.pages, 2);
});

test('parseNeedle: üres, szöveg és minta (? egy betű, * több betű)', () => {
  assert.equal(parseNeedle('').kind, 'none');
  assert.equal(parseNeedle('   ').kind, 'none');
  assert.equal(parseNeedle(undefined).kind, 'none');
  assert.equal(parseNeedle('alm').kind, 'text');
  assert.equal(parseNeedle('Mi ez?').kind, 'text', 'szóköz miatt szöveg, a ? írásjel');
  assert.equal(parseNeedle('fán-terem?').kind, 'text');
  assert.equal(parseNeedle('a??a').kind, 'pattern');
  assert.equal(parseNeedle('?').kind, 'pattern');
  assert.equal(parseNeedle('Á?*').kind, 'pattern');
  assert.equal(parseNeedle('a'.repeat(30) + '?').kind, 'text', 'túl hosszú minta nem minta');
  assert.equal(parseNeedle('K??').text, 'k??');
  assert.equal(parseNeedle('Ő?').text, 'o?', 'ékezet nélküli alak');
});

test('queryRows: ékezetfüggetlen keresés (a szóban és a kérdésben is)', () => {
  const { rows } = fixture();
  const words = (q) => queryRows(rows, { q, filter: 'all' }).rows.map((r) => r.word).sort();
  assert.ok(words('ko').includes('kő'), 'ko → kő');
  assert.deepEqual(words('KŐ'), words('ko'), 'az ékezetes és az ékezet nélküli keresés ugyanazt adja');
  assert.deepEqual(words('lo'), ['ló']);
  assert.deepEqual(words('cipo'), ['cipő']);
  assert.deepEqual(words('asvany'), ['kő'], 'a kérdés szövegében is: ásvány');
  assert.deepEqual(words('gyumolcs'), ['alma']);
  assert.deepEqual(words('almarol'), ['alma'], 'almáról');
});

test('queryRows: mintakeresés (? egy betű, * bármennyi), teljes szóra, ékezetfüggetlenül', () => {
  const rows = buildRows({ dictWords: ['alma', 'anya', 'akna', 'ablak', 'ajak', 'ló', 'kő', 'kó', 'lány', 'lánya', 'a'], bank: { alma: [{ id: '1', clue: 'Mi az? Gyümölcs.', at: '2026-01-01T00:00:00Z' }] } });
  const words = (q, extra = {}) => queryRows(rows, { q, filter: 'all', ...extra }).rows.map((r) => r.word).sort();
  assert.deepEqual(words('a??a'), ['akna', 'alma', 'anya']);
  assert.deepEqual(words('A??A'), ['akna', 'alma', 'anya']);
  assert.deepEqual(words('a*a'), ['akna', 'alma', 'anya']);
  assert.deepEqual(words('?'), ['a']);
  assert.deepEqual(words('??'), ['kó', 'kő', 'ló']);
  assert.deepEqual(words('k?'), ['kó', 'kő']);
  assert.deepEqual(words('ko?'), []);
  assert.deepEqual(words('l?'), ['ló']);
  assert.deepEqual(words('lan*'), ['lány', 'lánya']);
  assert.deepEqual(words('lany?'), ['lánya']);
  assert.deepEqual(words('*ak'), ['ajak', 'ablak'].sort());
  assert.deepEqual(words('*'), words('', {}), 'a * minden szót hoz');
  // Mintára csak a szavakban keres, a kérdések "?" jele nem számít.
  assert.deepEqual(words('al?'), []);
  assert.deepEqual(words('a?a?'), ['ajak']);
  assert.deepEqual(words('abl??'), ['ablak']);
  // Hosszal és kezdőbetűvel együtt, és a darabszámokat is szűkíti.
  const r = queryRows(rows, { q: 'a??a', filter: 'all', len: 4 });
  assert.equal(r.total, 3);
  assert.deepEqual(queryRows(rows, { q: 'a??a', filter: 'all' }).lenCounts, { 4: 3 });
  // Speciális regex-karakterek nem mintaként értelmeződnek, nem okoznak hibát.
  assert.deepEqual(words('a.*'), []);
  assert.doesNotThrow(() => queryRows(rows, { q: '(((' }));
  assert.doesNotThrow(() => queryRows(rows, { q: '[a-' }));
});

test('queryRows: találati sorrend (rel): pontos, szó eleje, szó belseje, kérdés', () => {
  const rows = buildRows({
    dictWords: ['alma', 'almás', 'palma', 'kalmár', 'alm', 'csalma', 'mese'],
    bank: { mese: [{ id: '1', clue: 'Alma a fán.', at: '2026-01-01T00:00:00Z' }] },
  });
  const order = (q, sort = 'rel') => queryRows(rows, { q, filter: 'all', sort }).rows.map((r) => r.word);
  // pontos (alma) > szó eleje (alm, almás: rövidebb elöl) > belseje: korábbi helyen előbb (palma 1., kalmár 2., csalma 2.) > kérdés (mese)
  assert.deepEqual(order('alma'), ['alma', 'almás', 'palma', 'kalmár', 'csalma', 'mese']);
  assert.deepEqual(order('alm'), ['alm', 'alma', 'almás', 'palma', 'kalmár', 'csalma', 'mese']);
  assert.deepEqual(order('alm', 'word'), ['alm', 'alma', 'almás', 'csalma', 'kalmár', 'mese', 'palma'], 'a sima ábécé rendezés nem rangsorol');
  assert.equal(queryRows(rows, { q: 'alm', sort: 'rel' }).sort, 'rel');
  // Keresés nélkül a rel ábécé szerint rendez.
  assert.deepEqual(order('', 'rel'), queryRows(rows, { filter: 'all', sort: 'word' }).rows.map((r) => r.word));
  // Mintakeresésnél is ábécé.
  assert.deepEqual(order('a?m*', 'rel'), ['alm', 'alma', 'almás']);
});
