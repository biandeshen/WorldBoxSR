import test from 'node:test';
import assert from 'node:assert/strict';
import { SeededRng } from '../engine/core/rng.js';

test('RNG state can be snapshotted and resumed exactly', () => {
  const rng = new SeededRng('alpha');
  const prefix = Array.from({ length: 10 }, () => rng.nextUint32());
  assert.equal(prefix.length, 10);

  const restored = SeededRng.fromSnapshot(rng.snapshot());
  const a = Array.from({ length: 100 }, () => rng.nextUint32());
  const b = Array.from({ length: 100 }, () => restored.nextUint32());
  assert.deepEqual(a, b);
});
