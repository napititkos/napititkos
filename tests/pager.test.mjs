import test from 'node:test';
import assert from 'node:assert/strict';
import { pageWindow } from '../components/pagerWindow.js';

test('lapozó: kevés oldalnál mind látszik, soknál az első, a környezet és az utolsó', () => {
  assert.deepEqual(pageWindow(2, 5, 7), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(1, 40, 7), [1, 2, 3, 4, '…b', 40]);
  assert.deepEqual(pageWindow(20, 40, 7), [1, '…a', 19, 20, 21, '…b', 40]);
  assert.deepEqual(pageWindow(40, 40, 9), [1, '…a', 35, 36, 37, 38, 39, 40]);
  assert.deepEqual(pageWindow(20, 40, 11), [1, '…a', 17, 18, 19, 20, 21, 22, 23, '…b', 40]);
});
