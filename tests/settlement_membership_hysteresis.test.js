import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { updateSettlementMembership } from '../engine/systems/settlements.js';

function makeWorld(config = {}) {
  return createWorld({
    seed: 5555,
    width: 12,
    height: 8,
    population: 0,
    config: {
      waterLevel: 0,
      passiveMoveChance: 0,
      birthChancePerEligiblePairPerDay: 0,
      settlementCheckIntervalDays: 0,
      settlementMembershipRadius: 3,
      ...config
    }
  });
}

function addSettlement(world, id, x, y, active = true) {
  world.settlements.push({
    id,
    kind: 'settlement',
    name: `S${id}`,
    x,
    y,
    foundedDay: 0,
    active,
    emptyDays: 0,
    abandonedDay: active ? null : world.day,
    population: 0,
    memberIds: []
  });
  world.nextSettlementId = Math.max(world.nextSettlementId, id + 1);
  return world.settlements.at(-1);
}

function behaviorProjection(world) {
  const snapshot = snapshotWorld(world);
  const config = { ...snapshot.config };
  delete config.settlementMembershipRetentionRadius;
  return { ...snapshot, config };
}

test('retention radius 4 intercepts only the baseline settlement-to-null boundary', () => {
  const baseline = makeWorld();
  const hysteresis = makeWorld({ settlementMembershipRetentionRadius: 4 });
  for (const world of [baseline, hysteresis]) {
    addSettlement(world, 1, 2, 2);
    createHuman(world, { x: 6, y: 2, sex: 'F', ageYears: 24, settlementId: 1 });
  }

  updateSettlementMembership(baseline);
  updateSettlementMembership(hysteresis);

  assert.equal(baseline.entities[0].settlementId, null);
  assert.equal(hysteresis.entities[0].settlementId, 1);
  assert.equal(hysteresis.settlements[0].population, 1);
  assert.deepEqual(hysteresis.settlements[0].memberIds, [hysteresis.entities[0].id]);
});

test('normal nearest join and direct switch win before retention is considered', () => {
  const world = makeWorld({ settlementMembershipRetentionRadius: 4 });
  addSettlement(world, 1, 2, 2);
  addSettlement(world, 2, 7, 2);

  const switcher = createHuman(world, { x: 6, y: 2, sex: 'M', ageYears: 30, settlementId: 1 });
  const joiner = createHuman(world, { x: 8, y: 2, sex: 'F', ageYears: 25, settlementId: null });

  updateSettlementMembership(world);

  assert.equal(switcher.settlementId, 2);
  assert.equal(joiner.settlementId, 2);
  assert.deepEqual(world.settlements[0].memberIds, []);
  assert.deepEqual(world.settlements[1].memberIds, [switcher.id, joiner.id]);
});

test('inactive previous settlement is never retained', () => {
  const world = makeWorld({ settlementMembershipRetentionRadius: 5 });
  addSettlement(world, 1, 2, 2, false);
  const human = createHuman(world, { x: 6, y: 2, sex: 'M', ageYears: 30, settlementId: 1 });

  updateSettlementMembership(world);

  assert.equal(human.settlementId, null);
  assert.equal(world.settlements[0].population, 0);
});

test('explicit retention radius 3 preserves baseline behavior and RNG exactly', () => {
  const baseline = createWorld({ seed: 2026, width: 20, height: 20, population: 30 });
  const explicitOff = createWorld({
    seed: 2026,
    width: 20,
    height: 20,
    population: 30,
    config: { settlementMembershipRetentionRadius: 3 }
  });

  tickWorld(baseline, 5000);
  tickWorld(explicitOff, 5000);

  assert.deepEqual(behaviorProjection(explicitOff), behaviorProjection(baseline));
  assert.deepEqual(explicitOff.rng.snapshot(), baseline.rng.snapshot());
});

test('retention radius cannot be smaller than join radius', () => {
  const world = makeWorld({ settlementMembershipRetentionRadius: 2 });
  assert.throws(
    () => updateSettlementMembership(world),
    /settlementMembershipRetentionRadius must be an integer >= settlementMembershipRadius/
  );
});
