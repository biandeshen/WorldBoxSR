import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

test('same seed and inputs produce byte-identical snapshots', () => {
  const a = createWorld({ seed: 123456, width: 16, height: 16, population: 24 });
  const b = createWorld({ seed: 123456, width: 16, height: 16, population: 24 });

  tickWorld(a, 2_000);
  tickWorld(b, 2_000);

  assert.deepEqual(snapshotWorld(a), snapshotWorld(b));
});

test('different seeds diverge', () => {
  const a = createWorld({ seed: 1, width: 16, height: 16, population: 24 });
  const b = createWorld({ seed: 2, width: 16, height: 16, population: 24 });

  tickWorld(a, 1_000);
  tickWorld(b, 1_000);

  assert.notDeepEqual(summarizeWorld(a), summarizeWorld(b));
});

test('save/load continuation is deterministic', () => {
  const original = createWorld({ seed: 'save-load-case', width: 12, height: 12, population: 18 });
  tickWorld(original, 750);

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(original))));

  tickWorld(original, 1_250);
  tickWorld(restored, 1_250);

  assert.deepEqual(snapshotWorld(original), snapshotWorld(restored));
});
