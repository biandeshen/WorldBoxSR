import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/touch_inspect_runtime.js', import.meta.url));

test('touch inspector composes with existing Scene pointer state instead of wrapping tools', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.doesNotMatch(source, /scene\.useTool\s*=/, 'touch inspect must not wrap the authoritative God Power / Scenario tool delegation');
  assert.match(source, /scene\.drag = null/, 'committed long-press must clear the existing pointer gesture so pointerup cannot use a tool');
  assert.match(source, /scene\.inspectTile\(tile\.x, tile\.y\)/, 'inspection must reuse the existing Inspector authority');
});

test('touch runtime listens to existing Phaser pointer lifecycle and leaves drag cancellation at five pixels', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /scene\.input\.on\('pointerdown'/);
  assert.match(source, /scene\.input\.on\('pointermove'/);
  assert.match(source, /scene\.input\.on\('pointerup'/);
  assert.match(source, /TOUCH_INSPECT_MOVE_THRESHOLD_PX/);
  assert.match(source, /intent === 'drag' \|\| intent === 'ignore'/);
  assert.match(source, /cancelTouchHold\(state\)/);
});

test('coarse-pointer hint changes only when media query says touch-style input', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /matchMedia\?\.\('\(hover: none\) and \(pointer: coarse\)'\)/);
  assert.match(source, /Tap: use selected tool · Hold: inspect · Drag: pan/);
});
