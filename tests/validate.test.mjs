import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanName,
  readJson,
  sanitizeProgress,
  sanitizePuzzle,
  sanitizePuzzleList,
  sanitizeTutorial,
} from '../lib/validate.js';

const okPuzzle = (over = {}) => ({
  id: 'p1',
  clue: 'Szamár kalandozás közben üdítőre szomjazik.',
  answer: 'MÁRKA',
  answerWords: ['MÁRKA'],
  parHints: 2,
  submittedBy: 'Anna',
  submittedByEmail: 'anna@example.hu',
  scheduledDate: '2026-09-21',
  hints: { definicio: { enabled: true, text: 'üdítő' }, betu: { enabled: true } },
  ...over,
});

test('érvényes rejtvény: ismert mezők megmaradnak, ismeretlenek kiesnek', () => {
  const p = sanitizePuzzle({ ...okPuzzle(), extra: 'x', __proto__: { evil: 1 } });
  assert.equal(p.id, 'p1');
  assert.equal(p.answer, 'MÁRKA');
  assert.equal(p.hints.definicio.text, 'üdítő');
  assert.equal(p.hints.betu.text, undefined);
  assert.equal(p.extra, undefined);
});

test('rejtvény: hosszkorlátok és hibás dátum', () => {
  const p = sanitizePuzzle(okPuzzle({ clue: 'x'.repeat(1000), answer: 'y'.repeat(200), scheduledDate: '2026-02-30' }));
  assert.equal(p.clue.length, 400);
  assert.equal(p.answer.length, 60);
  assert.equal(p.scheduledDate, '');
});

test('rejtvénylista: hibás elemek és duplikált azonosítók elutasítva', () => {
  assert.equal(sanitizePuzzleList('nem lista').error, 'invalid-list');
  assert.equal(sanitizePuzzleList([okPuzzle(), null]).error, 'invalid-puzzle');
  assert.equal(sanitizePuzzleList([okPuzzle(), { clue: 'nincs id' }]).index, 1);
  assert.equal(sanitizePuzzleList([okPuzzle(), okPuzzle()]).error, 'duplicate-id');
  assert.equal(sanitizePuzzleList(new Array(2001).fill(0)).error, 'invalid-list');
  assert.equal(sanitizePuzzleList([okPuzzle(), okPuzzle({ id: 'p2' })]).puzzles.length, 2);
  assert.deepEqual(sanitizePuzzleList([]).puzzles, []);
});

test('haladás: ismeretlen kulcsok, rossz típusok és rossz dátumok kiszűrve', () => {
  const p = sanitizeProgress({
    lastDate: '2026-09-20',
    streak: 3,
    best: 1e12,
    totalSolved: -5,
    fastestTime: 'nem szám',
    history: {
      '2026-09-20': { guess: ['A', 'BB', 'CCC'], lockedLetters: [true, 1], revealed: ['definicio', 'hack'], betuCount: 2, correct: true, gaveUp: false, elapsed: 12345, extra: 1 },
      'leaderboard:*': { guess: [] },
      '2026-13-01': { guess: [] },
    },
    unlocked: ['streak_3', 'streak_3', 5],
    isAdmin: true,
  });
  assert.equal(p.best, 100000);
  assert.equal(p.totalSolved, 0);
  assert.equal(p.fastestTime, 0);
  assert.deepEqual(Object.keys(p.history), ['2026-09-20']);
  assert.deepEqual(p.history['2026-09-20'].guess, ['A', 'BB', 'CC']);
  assert.deepEqual(p.history['2026-09-20'].lockedLetters, [true, false]);
  assert.deepEqual(p.history['2026-09-20'].revealed, ['definicio']);
  assert.equal(p.history['2026-09-20'].extra, undefined);
  // Duplikátum és nem szöveges elem kiesik.
  assert.deepEqual(p.unlocked, ['streak_3']);
  assert.equal(p.isAdmin, undefined);
});

test('haladás: a tutorial- és megosztás-jelvény mezői megmaradnak, csak logikai értékként', () => {
  const p = sanitizeProgress({ tutorialDone: true, sharedResult: true });
  assert.equal(p.tutorialDone, true);
  assert.equal(p.sharedResult, true);
  const q = sanitizeProgress({ tutorialDone: 'igen', sharedResult: 1 });
  assert.equal(q.tutorialDone, false);
  assert.equal(q.sharedResult, false);
  assert.equal(sanitizeProgress({}).tutorialDone, false);
});

test('haladás: nem objektum bemenet elutasítva', () => {
  for (const bad of [null, undefined, 'x', 5, [], true]) assert.equal(sanitizeProgress(bad), null);
});

test('tutorial: csak az ismert szakaszok, a maximumra vágva', () => {
  const sections = [{ id: 'a', totalTasks: 2 }, { id: 'b', totalTasks: 1 }];
  assert.deepEqual(sanitizeTutorial({ a: 99, b: -3, c: 1 }, sections), { a: 2, b: 0 });
  assert.equal(sanitizeTutorial([], sections), null);
});

test('cleanName: vezérlő- és láthatatlan karakterek, hossz, üres név', () => {
  assert.equal(cleanName('  Anna' + String.fromCharCode(0x200b, 0x202e) + '  Béla  '), 'Anna Béla');
  assert.equal(cleanName('x'.repeat(100)).length, 30);
  assert.equal(cleanName(''), 'Névtelen');
  assert.equal(cleanName(undefined), 'Névtelen');
  assert.equal(cleanName(12345), 'Névtelen');
  assert.equal(cleanName(String.fromCharCode(0, 1)), 'Névtelen');
});

test('readJson: méretkorlát és hibás JSON', async () => {
  const req = (text, headers = {}) => ({ headers: new Headers(headers), text: async () => text });
  assert.deepEqual(await readJson(req('{"a":1}')), { a: 1 });
  assert.equal(await readJson(req('nem json')), null);
  assert.equal(await readJson(req('{"a":"' + 'x'.repeat(50) + '"}'), 10), null);
  assert.equal(await readJson(req('{}', { 'content-length': '999999' }), 1000), null);
});
