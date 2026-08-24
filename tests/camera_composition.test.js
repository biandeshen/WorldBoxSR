import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeCameraComposition } from '../client/presentation/camera_composition.js';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('desktop composition reserves UI space and centers the canonical world', () => {
  const layout = computeCameraComposition({
    screenWidth: 1440,
    screenHeight: 900,
    worldWidth: 672,
    worldHeight: 672
  });

  assert.equal(layout.mode, 'desktop');
  assert.deepEqual(layout.viewport, { x: 0, y: 58, width: 1132, height: 754 });
  assert.ok(layout.zoom > 1.05 && layout.zoom < 1.08, `unexpected zoom ${layout.zoom}`);
  assert.deepEqual(layout.center, { x: 336, y: 336 });
  assert.ok(layout.bounds.padX > 180, `expected symmetric horizontal padding, got ${layout.bounds.padX}`);
  assert.ok(layout.bounds.padY > 0, `expected vertical breathing room, got ${layout.bounds.padY}`);
});

test('compact composition fits the whole world without desktop inspector reservation', () => {
  const layout = computeCameraComposition({
    screenWidth: 390,
    screenHeight: 844,
    worldWidth: 672,
    worldHeight: 672
  });

  assert.equal(layout.mode, 'compact');
  assert.deepEqual(layout.viewport, { x: 0, y: 96, width: 390, height: 666 });
  assert.ok(layout.zoom > 0.5 && layout.zoom < 0.54, `unexpected zoom ${layout.zoom}`);
  assert.ok(layout.bounds.padY > 250);
});

test('camera composition rejects nonsensical dimensions', () => {
  assert.throws(() => computeCameraComposition({
    screenWidth: 0,
    screenHeight: 900,
    worldWidth: 672,
    worldHeight: 672
  }), /screenWidth must be positive/);
});

test('browser shell loads the responsive camera runtime after the renderer bootstrap', () => {
  const html = readFileSync(indexPath, 'utf8');
  const bootstrapIndex = html.indexOf('./bootstrap.js');
  const cameraIndex = html.indexOf('./presentation/camera_runtime.js');
  assert.ok(bootstrapIndex >= 0, 'missing renderer bootstrap');
  assert.ok(cameraIndex > bootstrapIndex, 'camera runtime must load after renderer bootstrap');
});
