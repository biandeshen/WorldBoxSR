import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, worldFromSnapshot } from '../engine/core/world.js';

test('elevation and moisture fields are deterministic and serializable', () => {
  const a = createWorld({ seed: 4242, width: 24, height: 18, population: 0 });
  const b = createWorld({ seed: 4242, width: 24, height: 18, population: 0 });

  const fieldsA = a.tiles.map(({ elevation, moisture }) => ({ elevation, moisture }));
  const fieldsB = b.tiles.map(({ elevation, moisture }) => ({ elevation, moisture }));
  assert.deepEqual(fieldsA, fieldsB);

  for (const tile of a.tiles) {
    assert.ok(tile.elevation >= 0 && tile.elevation <= 1);
    assert.ok(tile.moisture >= 0 && tile.moisture <= 1);
  }

  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(a))));
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(a));
});

test('different seeds generate different world fields', () => {
  const a = createWorld({ seed: 111, width: 16, height: 16, population: 0 });
  const b = createWorld({ seed: 222, width: 16, height: 16, population: 0 });

  assert.notDeepEqual(
    a.tiles.map(({ elevation, moisture }) => [elevation, moisture]),
    b.tiles.map(({ elevation, moisture }) => [elevation, moisture])
  );
});

test('generated fields are spatially coherent rather than white noise', () => {
  const world = createWorld({ seed: 'coherence', width: 32, height: 24, population: 0 });
  let totalDelta = 0;
  let comparisons = 0;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 1; x < world.width; x += 1) {
      const left = world.tiles[y * world.width + x - 1];
      const current = world.tiles[y * world.width + x];
      totalDelta += Math.abs(current.elevation - left.elevation);
      totalDelta += Math.abs(current.moisture - left.moisture);
      comparisons += 2;
    }
  }

  assert.ok(totalDelta / comparisons < 0.12);
});
