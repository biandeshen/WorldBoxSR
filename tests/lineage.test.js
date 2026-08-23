import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLineages } from '../engine/core/lineage_metrics.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

test('founders receive deterministic persistent lineages without RNG side effects', () => {
  const world = createWorld({ seed: 1234, width: 12, height: 12, population: 4 });
  assert.equal(world.lineages.length, 4);
  assert.equal(world.nextLineageId, 5);

  for (const human of world.entities) {
    const lineage = world.lineages.find((candidate) => candidate.id === human.lineageId);
    assert.ok(lineage);
    assert.deepEqual(human.parentIds, []);
    assert.deepEqual(human.childIds, []);
    assert.equal(human.generation, 0);
    assert.deepEqual(lineage.founderIds, [human.id]);
    assert.deepEqual(lineage.memberIds, [human.id]);
  }
});

test('birth records two-parent ancestry and inherits the maternal lineage', () => {
  const world = createWorld({
    seed: 99,
    width: 10,
    height: 10,
    population: 0,
    config: {
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 1,
      settlementCheckIntervalDays: 0
    }
  });
  const tile = world.tiles.find((candidate) => candidate.passable);
  const mother = createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 24, hunger: 0.1 });
  const father = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 25, hunger: 0.1 });
  const maternalLineageId = mother.lineageId;

  tickWorld(world, 1);

  const child = world.entities.find((human) => human.parentIds.length === 2);
  assert.ok(child);
  assert.deepEqual(child.parentIds, [mother.id, father.id]);
  assert.equal(child.lineageId, maternalLineageId);
  assert.equal(child.generation, 1);
  assert.ok(mother.childIds.includes(child.id));
  assert.ok(father.childIds.includes(child.id));

  const lineage = world.lineages.find((candidate) => candidate.id === maternalLineageId);
  assert.ok(lineage.memberIds.includes(child.id));
  assert.equal(lineage.maxGeneration, 1);
});

test('lineage state survives deterministic save/load continuation', () => {
  const world = createWorld({ seed: 707, width: 12, height: 12, population: 12 });
  tickWorld(world, 400);
  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));

  tickWorld(world, 120);
  tickWorld(restored, 120);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('lineage metrics are derived-only and preserve world and RNG state', () => {
  const world = createWorld({ seed: 314, width: 12, height: 12, population: 8 });
  tickWorld(world, 100);
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const summary = summarizeLineages(world);

  assert.equal(summary.lineageCount, world.lineages.length);
  assert.ok(summary.maxGeneration >= 0);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
