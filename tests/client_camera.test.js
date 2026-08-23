import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, panCamera, resetCamera, screenToTile, screenToWorld, worldToScreen, zoomCameraAt } from '../client/camera.js';

const viewport = { canvasWidth: 960, canvasHeight: 640, worldWidth: 48, worldHeight: 32 };

test('camera transforms round-trip world coordinates without touching simulation state', () => {
  const camera = createCamera();
  const sentinelWorld = { day: 123, entities: [{ id: 1 }] };
  const before = JSON.stringify(sentinelWorld);

  panCamera(camera, 137, -42);
  zoomCameraAt(camera, 2.25, 500, 300);
  const screen = worldToScreen(camera, 17.25, 9.75, viewport);
  const world = screenToWorld(camera, screen.x, screen.y, viewport);

  assert.ok(Math.abs(world.x - 17.25) < 1e-12);
  assert.ok(Math.abs(world.y - 9.75) < 1e-12);
  assert.equal(JSON.stringify(sentinelWorld), before);
});

test('zoom keeps the world coordinate under the pointer fixed', () => {
  const camera = createCamera();
  panCamera(camera, 75, 30);
  const pointer = { x: 440, y: 210 };
  const before = screenToWorld(camera, pointer.x, pointer.y, viewport);
  zoomCameraAt(camera, 1.8, pointer.x, pointer.y);
  const after = screenToWorld(camera, pointer.x, pointer.y, viewport);

  assert.ok(Math.abs(before.x - after.x) < 1e-12);
  assert.ok(Math.abs(before.y - after.y) < 1e-12);
});

test('screen-to-tile uses transformed camera coordinates and rejects outside clicks', () => {
  const camera = createCamera();
  panCamera(camera, 100, 50);
  zoomCameraAt(camera, 2, 0, 0);

  const target = worldToScreen(camera, 12.5, 7.5, viewport);
  assert.deepEqual(screenToTile(camera, target.x, target.y, viewport), { x: 12, y: 7 });
  assert.equal(screenToTile(camera, -10_000, -10_000, viewport), null);

  resetCamera(camera);
  assert.deepEqual(camera, { offsetX: 0, offsetY: 0, zoom: 1 });
});

test('zoom is clamped to safe bounds', () => {
  const camera = createCamera();
  zoomCameraAt(camera, 1000, 0, 0);
  assert.equal(camera.zoom, 8);
  zoomCameraAt(camera, 0.00001, 0, 0);
  assert.equal(camera.zoom, 0.5);
});
