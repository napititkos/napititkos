import test from 'node:test';
import assert from 'node:assert/strict';
import { pickForWeek, planQueue, addWeeks, isMonday } from '../lib/miniSchedule.js';

const W = '2026-11-16';
test('ütemezés: a beütemezett hét elsőbbséget kap, a többi sorban, a jövőbeli ütemezettek kimaradnak', () => {
  const q = [{ id: 'a' }, { id: 'b', scheduledWeek: addWeeks(W, 2) }, { id: 'c' }];
  assert.equal(pickForWeek(q, W), 0);
  assert.equal(pickForWeek(q, addWeeks(W, 2)), 1);
  assert.deepEqual(planQueue(q, W), { a: W, c: addWeeks(W, 1), b: addWeeks(W, 2) });
});
test('ütemezés: üres hét marad, ha csak későbbre ütemezett elem van; elmúlt hétre ütemezett sima elem', () => {
  const q = [{ id: 'x', scheduledWeek: addWeeks(W, 3) }];
  assert.equal(pickForWeek(q, W), -1);
  assert.deepEqual(planQueue(q, W), { x: addWeeks(W, 3) });
  const old = [{ id: 'o', scheduledWeek: addWeeks(W, -2) }, { id: 'n' }];
  assert.equal(pickForWeek(old, W), 0);
  assert.ok(isMonday(W) && !isMonday('2026-11-17'));
});
