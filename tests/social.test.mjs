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
  assert.equal(ACHIEVEMENTS.length, 32);
  assert.equal(ACHIEVEMENTS.filter((a) => !a.game).length, 22);
});

test('trófeák: a bevezető trófeát a Kezdetek teljesítése adja, a Kisokos megnyitása már nem ad trófeát', () => {
  assert.deepEqual(computeNewAchievements({ introDone: true }, []).newly, ['intro_done']);
  assert.deepEqual(computeNewAchievements({ readHelp: true }, []).newly, []);
  assert.deepEqual(computeNewAchievements({ introDone: true }, ['intro_done']).newly, []);
});

test('posztkép témája: páratlan napon világos, párosan sötét', async () => {
  const { themeForDay } = await import('../lib/socialTheme.js');
  assert.equal(themeForDay(1), 'light');
  assert.equal(themeForDay(2), 'dark');
  assert.equal(themeForDay(37), 'light');
});

test('rejtvény mentése: a nehézség 1-5, minden más értéknél 0 (nincs megadva)', async () => {
  const { sanitizePuzzle } = await import('../lib/validate.js');
  const base = { id: 'x1', clue: 'Szöveg', answer: 'ALMA' };
  assert.equal(sanitizePuzzle({ ...base, difficulty: 3 }).difficulty, 3);
  assert.equal(sanitizePuzzle({ ...base, difficulty: '5' }).difficulty, 5);
  for (const bad of [0, 6, -1, 2.5, 'nehéz', null, undefined]) assert.equal(sanitizePuzzle({ ...base, difficulty: bad }).difficulty, 0, String(bad));
});

test('trófeák: a megfejtésszámba a korábbi titkosírások megfejtései is beleszámítanak', async () => {
  const { computeNewAchievements, achievementProgress } = await import('../lib/achievements.js');
  const r = computeNewAchievements({ totalSolved: 30, archiveSolved: 20 }, []);
  for (const id of ['solved_1', 'solved_5', 'solved_10', 'solved_20', 'solved_50']) assert.ok(r.newly.includes(id), id);
  assert.ok(!computeNewAchievements({ totalSolved: 30, archiveSolved: 19 }, []).newly.includes('solved_50'));
  assert.deepEqual(achievementProgress({ totalSolved: 30, archiveSolved: 7 }).solved_50, [37, 50]);
});

test('trófeák: 1, 5 és 10 közösségi megfejtés', async () => {
  const { computeNewAchievements, achievementProgress } = await import('../lib/achievements.js');
  assert.deepEqual(computeNewAchievements({ communitySolvedCount: 4 }, []).newly.filter((x) => x.startsWith('community')), ['community_solve']);
  assert.deepEqual(computeNewAchievements({ communitySolvedCount: 10 }, []).newly.filter((x) => x.startsWith('community')), ['community_solve', 'community_5', 'community_10']);
  assert.deepEqual(computeNewAchievements({ communitySolved: true }, []).newly, ['community_solve']);
  assert.deepEqual(achievementProgress({ communitySolvedCount: 3 }).community_10, [3, 10]);
  assert.deepEqual(achievementProgress({ streak: 2, best: 4 }).streak_5, [4, 5]);
});

test('reakciók: régi sorszámos és új emojis tárolás együtt, sorrend', async () => {
  const { normalizeReaction, tallyReactions, orderedEmojis, PRESET_EMOJIS } = await import('../lib/emojis.js');
  assert.equal(normalizeReaction('8'), '😤');
  assert.equal(normalizeReaction('🦄'), '🦄');
  assert.equal(normalizeReaction('99'), null);
  const t = tallyReactions({ 'u:1': '0', 'd:a': '😍', 'd:b': '🦄', 'd:c': '8' }, 'd:c');
  assert.deepEqual(t.counts, { '😍': 2, '🦄': 1, '😤': 1 });
  assert.equal(t.mine, '😤');
  const o = orderedEmojis({ '🦄': 1, '😤': 3, '😍': 2 });
  assert.deepEqual(o.slice(0, 10), PRESET_EMOJIS);
  assert.deepEqual(o.slice(10), ['😤', '🦄']);
  assert.ok(!PRESET_EMOJIS.includes('😤') && PRESET_EMOJIS.length === 10);
});
