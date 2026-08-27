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

test('focus preserving scroll solves the camera transform directly at the new zoom', () => {
  const worldPoint = { x: 174, y: 320 };
  const screenPoint = { x: 120, y: 410 };
  const zoom = 1.27;
  const scroll = focusPreservingScroll({
    worldPoint,
    screenPoint,
    viewportX: 0,
    viewportY: 96,
    viewportWidth: 430,
    viewportHeight: 642,
    originX: 0.5,
    originY: 0.5,
    zoom
  });

  assert.ok(scroll);
  const originPxX = 430 * 0.5;
  const originPxY = 642 * 0.5;
  const reconstructed = {
    x: scroll.x + originPxX + ((screenPoint.x - originPxX) / zoom),
    y: scroll.y + originPxY + (((screenPoint.y - 96) - originPxY) / zoom)
  };
  assert.ok(Math.abs(reconstructed.x - worldPoint.x) < 1e-12);
  assert.ok(Math.abs(reconstructed.y - worldPoint.y) < 1e-12);
});

test('focus preserving scroll rejects invalid camera geometry instead of guessing', () => {
  const base = {
    worldPoint: { x: 100, y: 100 },
    screenPoint: { x: 50, y: 50 },
    viewportX: 0,
    viewportY: 0,
    viewportWidth: 430,
    viewportHeight: 642,
    originX: 0.5,
    originY: 0.5,
    zoom: 1
  };
  assert.equal(focusPreservingScroll({ ...base, worldPoint: null }), null);
  assert.equal(focusPreservingScroll({ ...base, viewportWidth: 0 }), null);
  assert.equal(focusPreservingScroll({ ...base, zoom: 0 }), null);
  assert.equal(focusPreservingScroll({ ...base, originX: Number.NaN }), null);
});
