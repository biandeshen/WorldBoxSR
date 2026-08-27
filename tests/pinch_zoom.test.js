import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  focusPreservingScroll,
  pinchDistance,
  pinchMidpoint,
  pinchZoom
} from '../client/presentation/pinch_zoom.js';

test('pinch geometry computes exact distance and midpoint', () => {
  assert.equal(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.deepEqual(pinchMidpoint({ x: 2, y: 4 }, { x: 8, y: 10 }), { x: 5, y: 7 });
  assert.ok(Number.isNaN(pinchDistance(null, { x: 1, y: 1 })));
  assert.equal(pinchMidpoint({ x: Number.NaN, y: 0 }, { x: 1, y: 1 }), null);
});

test('pinch zoom uses the same 0.55 through 2.6 camera limits as wheel zoom', () => {
  assert.equal(pinchZoom({ startZoom: 1, startDistance: 100, currentDistance: 150 }), 1.5);
  assert.equal(pinchZoom({ startZoom: 1, startDistance: 100, currentDistance: 10 }), CAMERA_MIN_ZOOM);
  assert.equal(pinchZoom({ startZoom: 2, startDistance: 100, currentDistance: 300 }), CAMERA_MAX_ZOOM);
});

test('pinch zoom safely rejects invalid or zero distance geometry', () => {
  assert.equal(pinchZoom({ startZoom: 1, startDistance: 0, currentDistance: 100 }), null);
  assert.equal(pinchZoom({ startZoom: 1, startDistance: 100, currentDistance: 0 }), null);
  assert.equal(pinchZoom({ startZoom: Number.NaN, startDistance: 100, currentDistance: 120 }), null);
  assert.equal(pinchZoom({ startZoom: 1, startDistance: 100, currentDistance: 120, minZoom: 3, maxZoom: 2 }), null);
});

test('focus preserving scroll exactly cancels world-point drift from zoom', () => {
  const scroll = focusPreservingScroll({
    scrollX: 120,
    scrollY: 80,
    worldBefore: { x: 300, y: 220 },
    worldAfter: { x: 270, y: 205 }
  });
  assert.deepEqual(scroll, { x: 150, y: 95 });
  assert.equal(focusPreservingScroll({ scrollX: 0, scrollY: 0, worldBefore: null, worldAfter: { x: 0, y: 0 } }), null);
});
