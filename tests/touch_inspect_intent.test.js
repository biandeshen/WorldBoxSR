import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTouchPointer,
  pointerDistance,
  TOUCH_INSPECT_HOLD_MS,
  TOUCH_INSPECT_MOVE_THRESHOLD_PX,
  touchInspectIntent
} from '../client/presentation/touch_inspect_intent.js';

test('touch pointer detection accepts browser and Phaser touch facts without classifying mouse', () => {
  assert.equal(isTouchPointer({ event: { pointerType: 'touch' } }), true);
  assert.equal(isTouchPointer({ pointerType: 'touch' }), true);
  assert.equal(isTouchPointer({ wasTouch: true }), true);
  assert.equal(isTouchPointer({ event: { changedTouches: [{}] } }), true);
  assert.equal(isTouchPointer({ event: { pointerType: 'mouse' }, wasTouch: true }), false, 'explicit browser pointer type wins');
  assert.equal(isTouchPointer({ event: { pointerType: 'pen' } }), false);
  assert.equal(isTouchPointer({}), false);
});

test('stationary touch commits inspection only after the bounded hold', () => {
  assert.equal(touchInspectIntent({ touch: true, isDown: true, elapsedMs: TOUCH_INSPECT_HOLD_MS - 1, distancePx: 0 }), 'pending');
  assert.equal(touchInspectIntent({ touch: true, isDown: true, elapsedMs: TOUCH_INSPECT_HOLD_MS, distancePx: 0 }), 'inspect');
  assert.equal(touchInspectIntent({ touch: true, isDown: true, elapsedMs: TOUCH_INSPECT_HOLD_MS + 300, distancePx: TOUCH_INSPECT_MOVE_THRESHOLD_PX }), 'inspect');
});

test('movement beyond the existing five-pixel Scene drag threshold wins over hold', () => {
  assert.equal(touchInspectIntent({ touch: true, isDown: true, elapsedMs: 10, distancePx: TOUCH_INSPECT_MOVE_THRESHOLD_PX + 0.01 }), 'drag');
  assert.equal(touchInspectIntent({ touch: true, isDown: true, elapsedMs: 1000, distancePx: TOUCH_INSPECT_MOVE_THRESHOLD_PX + 1 }), 'drag');
});

test('mouse or released touches never become long-press inspection', () => {
  assert.equal(touchInspectIntent({ touch: false, isDown: true, elapsedMs: 1000, distancePx: 0 }), 'ignore');
  assert.equal(touchInspectIntent({ touch: true, isDown: false, elapsedMs: 1000, distancePx: 0 }), 'ignore');
});

test('pointer distance is exact and invalid coordinates cancel safely', () => {
  assert.equal(pointerDistance({ x: 3, y: 4 }, 0, 0), 5);
  assert.equal(pointerDistance({ x: 10, y: 10 }, 7, 6), 5);
  assert.equal(pointerDistance({ x: Number.NaN, y: 2 }, 0, 0), Number.POSITIVE_INFINITY);
  assert.equal(pointerDistance(null, 0, 0), Number.POSITIVE_INFINITY);
});
