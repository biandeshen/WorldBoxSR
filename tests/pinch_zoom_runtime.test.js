import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/pinch_zoom_runtime.js', import.meta.url));
const touchRuntimePath = fileURLToPath(new URL('../client/presentation/touch_inspect_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('pinch runtime reuses existing camera bounds and never wraps tool authority', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /refreshCameraBoundsForZoom/);
  assert.doesNotMatch(source, /setBounds\(/, 'pinch runtime must not duplicate camera bound math');
  assert.doesNotMatch(source, /scene\.useTool\s*=/, 'pinch must not wrap God Power / Scenario commands');
  assert.match(source, /scene\.drag = null/, 'pinch must suppress existing single-touch pointerup/tool and pan state');
});

test('pinch start explicitly cancels long-press inspection and ensures multi-pointer delivery', () => {
  const source = readFileSync(runtimePath, 'utf8');
  const touchSource = readFileSync(touchRuntimePath, 'utf8');
  assert.match(source, /scene\.input\.addPointer\?\.\(2\)/);
  assert.match(source, /scene\.touchInspect\?\.cancel\?\.\(\)/);
  assert.match(touchSource, /state\.cancel = \(\) => cancelTouchHold\(state\)/, 'touch inspector must expose a presentation-only cancellation hook');
});

test('pinch preserves live midpoint focus and suppresses remaining finger until all touches clear', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /camera\.getWorldPoint\(midpoint\.x, midpoint\.y\)/);
  assert.match(source, /focusPreservingScroll/);
  assert.match(source, /suppressUntilClear = true/);
  assert.match(source, /if \(state\.suppressUntilClear\) scene\.drag = null/);
  assert.match(source, /if \(state\.touches\.size === 0\)/);
  assert.match(source, /state\.suppressUntilClear = false/);
});

test('coarse pointer hint exposes pinch while desktop markup remains untouched', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /matchMedia\?\.\('\(hover: none\) and \(pointer: coarse\)'\)/);
  assert.match(source, /Tap: tool · Hold: inspect · Drag: pan · Pinch: zoom/);
});

test('production shell loads pinch after touch inspector so the cancellation seam exists', () => {
  const index = readFileSync(indexPath, 'utf8');
  const touchIndex = index.indexOf('./presentation/touch_inspect_runtime.js');
  const pinchIndex = index.indexOf('./presentation/pinch_zoom_runtime.js');
  assert.ok(touchIndex >= 0, 'touch inspector must remain loaded');
  assert.ok(pinchIndex > touchIndex, 'pinch runtime must be loaded after touch inspector');
});
