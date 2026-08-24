import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveSelection, selectionColor, selectionDescriptor } from '../client/presentation/selection_highlight.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/selection_highlight_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('selection descriptors keep stable identity rather than presentation coordinates', () => {
  assert.deepEqual(selectionDescriptor({ kind: 'human', value: { id: 7, x: 2, y: 3 } }), { kind: 'human', id: 7 });
  assert.deepEqual(selectionDescriptor({ kind: 'tile', value: { x: 4, y: 5 } }), { kind: 'tile', x: 4, y: 5 });
});

test('moving selected entities resolve to their latest authoritative presentation coordinates', () => {
  const descriptor = { kind: 'human', id: 7 };
  const first = resolveSelection({ humans: [{ id: 7, x: 2, y: 3 }], grazers: [], settlements: [], tiles: [] }, descriptor);
  const moved = resolveSelection({ humans: [{ id: 7, x: 5, y: 6 }], grazers: [], settlements: [], tiles: [] }, descriptor);
  assert.deepEqual(first, { kind: 'human', id: 7, x: 2, y: 3 });
  assert.deepEqual(moved, { kind: 'human', id: 7, x: 5, y: 6 });
  assert.equal(resolveSelection({ humans: [], grazers: [], settlements: [], tiles: [] }, descriptor), null);
});

test('selection color communicates target kind', () => {
  assert.notEqual(selectionColor('human'), selectionColor('creature'));
  assert.notEqual(selectionColor('settlement'), selectionColor('tile'));
});

test('selection runtime is presentation-only and loaded after renderer bootstrap', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const html = readFileSync(indexPath, 'utf8');
  assert.doesNotMatch(runtime, /engine\//);
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|pushEvent/);
  assert.match(runtime, /selectionAt\(scene\.world/);
  const bootstrapIndex = html.indexOf('./bootstrap.js');
  const selectionIndex = html.indexOf('./presentation/selection_highlight_runtime.js');
  assert.ok(bootstrapIndex >= 0);
  assert.ok(selectionIndex > bootstrapIndex);
});
