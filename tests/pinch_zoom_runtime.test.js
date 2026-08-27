import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/pinch_zoom_runtime.js', import.meta.url));
const touchRuntimePath = fileURLToPath(new URL('../client/presentation/touch_inspect_runtime.js', import.meta.url));
const mobileCssPath = fileURLToPath(new URL('../client/mobile_hud.css', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('pinch runtime reuses existing camera composition bounds and never wraps tool authority', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /from '\.\/camera_composition\.js'/, 'pinch must depend directly on the shared camera composition API');
  assert.match(source, /refreshCameraBoundsForZoom/);
  assert.doesNotMatch(source, /from '\.\/camera_runtime\.js'/, 'camera runtime is not a public geometry module');
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

test('pinch preserves live midpoint without reading Phaser 4 stale post-zoom matrices', () => {
  const source = readFileSync(runtimePath, 'utf8');
  const worldPointReads = source.match(/camera\.getWorldPoint\(midpoint\.x, midpoint\.y\)/g) ?? [];
  assert.equal(worldPointReads.length, 1, 'only the pre-zoom rendered camera matrix may be read');
  assert.match(source, /focusPreservingScroll\(\{/);
  assert.match(source, /viewportX: camera\.x/);
  assert.match(source, /viewportWidth: camera\.width/);
  assert.match(source, /originX: camera\.originX/);
  assert.match(source, /zoom: targetZoom/);
  assert.match(source, /camera\.clampX\(desiredScroll\.x\)/);
  assert.match(source, /camera\.clampY\(desiredScroll\.y\)/);
});

test('pinch suppresses remaining finger until all touches clear', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /suppressUntilClear = true/);
  assert.match(source, /if \(state\.suppressUntilClear\) scene\.drag = null/);
  assert.match(source, /if \(state\.touches\.size === 0\)/);
  assert.match(source, /state\.suppressUntilClear = false/);
});

test('coarse pointer presentation appends pinch without rewriting existing touch hint truth', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const css = readFileSync(mobileCssPath, 'utf8');
  assert.doesNotMatch(runtime, /hint\.textContent/, 'pinch runtime should not own the existing touch hint text');
  assert.match(css, /@media \(max-width: 650px\) and \(hover: none\) and \(pointer: coarse\)/);
  assert.match(css, /#hint::after \{ content: ' · Pinch: zoom'; \}/);
});

test('production shell loads pinch after touch inspector so the cancellation seam exists', () => {
  const index = readFileSync(indexPath, 'utf8');
  const touchIndex = index.indexOf('./presentation/touch_inspect_runtime.js');
  const pinchIndex = index.indexOf('./presentation/pinch_zoom_runtime.js');
  assert.ok(touchIndex >= 0, 'touch inspector must remain loaded');
  assert.ok(pinchIndex > touchIndex, 'pinch runtime must be loaded after touch inspector');
});
