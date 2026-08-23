import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSpatialKin } from '../engine/core/kin_metrics.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

test('spatial kin metrics measure parent-child proximity deterministically', () => {
  const world = createWorld({ seed: 12, width: 10, height: 10, population: 0 });
  const land = world.tiles.filter((tile) => tile.passable);
  assert.ok(land.length > 4);
  const base = land.find((tile) =>
    world.tiles.some((other) => other.passable && other.x === tile.x + 1 && other.y === tile.y)
  );
  assert.ok(base);
  const adjacent = world.tiles.find((tile) => tile.passable && tile.x === base.x + 1 && tile.y === base.y);
  assert.ok(adjacent);

  const mother = createHuman(world, { x: base.x, y: base.y, sex: 'F', ageYears: 30 });
  const child = createHuman(world, {
    x: adjacent.x,
    y: adjacent.y,
    sex: 'F',
    ageYears: 10,
    lineageId: mother.lineageId,
    parentIds: [mother.id],
    generation: 1
  });
  mother.childIds.push(child.id);

  const metrics = summarizeSpatialKin(world);
  assert.equal(metrics.livingParentChildPairs, 1);
  assert.equal(metrics.parentChildCoLocatedShare, 0);
  assert.equal(metrics.parentChildWithin1Share, 1);
  assert.equal(metrics.parentChildWithin3Share, 1);
  assert.equal(metrics.medianParentChildDistance, 1);
  assert.equal(metrics.humansWithLivingDirectKin, 2);
  assert.equal(metrics.directKinWithin1Share, 1);
  assert.equal(metrics.dependentMinors, 1);
  assert.equal(metrics.minorsWithLivingParent, 1);
  assert.equal(metrics.orphanedMinors, 0);
  assert.equal(metrics.minorsParentWithin1Share, 1);
});

test('orphaned minors are separated from minors with living parents', () => {
  const world = createWorld({ seed: 44, width: 10, height: 10, population: 0 });
  const tile = world.tiles.find((candidate) => candidate.passable);
  const child = createHuman(world, {
    x: tile.x,
    y: tile.y,
    ageYears: 8,
    parentIds: [999, 1000],
    generation: 1
  });
  assert.ok(child);

  const metrics = summarizeSpatialKin(world);
  assert.equal(metrics.dependentMinors, 1);
  assert.equal(metrics.minorsWithLivingParent, 0);
  assert.equal(metrics.orphanedMinors, 1);
  assert.equal(metrics.minorsParentWithin1Share, 0);
});

test('spatial kin accounting is derived-only and consumes no RNG', () => {
  const world = createWorld({ seed: 909, width: 12, height: 12, population: 16 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  summarizeSpatialKin(world);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
