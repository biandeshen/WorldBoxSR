import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeSeparatedPair(supplementalReproductionRadius, distance = 2) {
  const world = createWorld({
    seed: 6060,
    width: 10,
    height: 10,
    population: 0,
    config: {
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 1,
      settlementCheckIntervalDays: 0,
      supplementalReproductionRadius
    }
  });
  const [a, b] = findPassablePair(world, distance);
  const mother = createHuman(world, { x: a.x, y: a.y, sex: 'F', ageYears: 24, hunger: 0.1 });
  const father = createHuman(world, { x: b.x, y: b.y, sex: 'M', ageYears: 25, hunger: 0.1 });
  return { world, mother, father };
}

function findPassablePair(world, distance) {
  const passable = world.tiles.filter((tile) => tile.passable);
  for (const a of passable) {
    const b = passable.find((candidate) =>
      Math.max(Math.abs(candidate.x - a.x), Math.abs(candidate.y - a.y)) === distance
    );
    if (b) return [a, b];
  }
  throw new Error(`no passable tile pair at distance ${distance}`);
}

function behaviorProjection(world) {
  const snapshot = snapshotWorld(world);
  const config = { ...snapshot.config };
  delete config.supplementalReproductionRadius;
  return { ...snapshot, config };
}

test('default-off supplemental radius preserves baseline world behavior exactly', () => {
  const baseline = createWorld({ seed: 2026, width: 16, height: 16, population: 30 });
  const explicitOff = createWorld({
    seed: 2026,
    width: 16,
    height: 16,
    population: 30,
    config: { supplementalReproductionRadius: 1 }
  });

  tickWorld(baseline, 2000);
  tickWorld(explicitOff, 2000);

  assert.deepEqual(behaviorProjection(explicitOff), behaviorProjection(baseline));
});

test('supplemental radius can create a birth when baseline radius has no eligible male', () => {
  const baseline = makeSeparatedPair(1, 2);
  const supplemental = makeSeparatedPair(2, 2);
  const baselineRngBefore = baseline.world.rng.snapshot();
  const supplementalRngBefore = supplemental.world.rng.snapshot();
  assert.deepEqual(supplementalRngBefore, baselineRngBefore);

  tickWorld(baseline.world, 1);
  tickWorld(supplemental.world, 1);

  assert.equal(baseline.world.counters.births, 0);
  assert.equal(supplemental.world.counters.births, 1);
  assert.equal(supplemental.world.entities.length, 3);
  assert.deepEqual(supplemental.world.rng.snapshot(), baseline.world.rng.snapshot());

  const child = supplemental.world.entities.find((human) => human.parentIds.length === 2);
  assert.ok(child);
  assert.deepEqual(child.parentIds, [supplemental.mother.id, supplemental.father.id]);
  const event = supplemental.world.history.find((candidate) => candidate.type === 'human.born');
  assert.equal(event.supplementalReproductionRadius, 2);
});

test('supplemental path does nothing when no eligible male exists inside its radius', () => {
  const { world } = makeSeparatedPair(2, 3);
  tickWorld(world, 1);
  assert.equal(world.counters.births, 0);
});

test('local radius-1 opportunity keeps the original sequential reproduction path', () => {
  const local = makeSeparatedPair(1, 1);
  const supplementalEnabled = makeSeparatedPair(3, 1);

  tickWorld(local.world, 1);
  tickWorld(supplementalEnabled.world, 1);

  assert.equal(local.world.counters.births, 1);
  assert.equal(supplementalEnabled.world.counters.births, 1);
  assert.deepEqual(supplementalEnabled.world.rng.snapshot(), local.world.rng.snapshot());
  assert.deepEqual(
    supplementalEnabled.world.entities.map(({ id, sex, x, y, parentIds }) => ({ id, sex, x, y, parentIds })),
    local.world.entities.map(({ id, sex, x, y, parentIds }) => ({ id, sex, x, y, parentIds }))
  );
});
