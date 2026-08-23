import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeParentalUnions } from '../engine/core/union_metrics.js';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import {
  addChildToParentalUnion,
  endParentalUnionsForHuman,
  ensureParentalUnion
} from '../engine/model/parental_union.js';

function makeBirthWorld(seed = 6501) {
  return createWorld({
    seed,
    width: 10,
    height: 10,
    population: 0,
    config: {
      waterLevel: 0,
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 1,
      settlementCheckIntervalDays: 0
    }
  });
}

function addParents(world) {
  const tile = world.tiles.find((candidate) => candidate.passable);
  const mother = createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 24, hunger: 0.1 });
  const father = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 25, hunger: 0.1 });
  return { tile, mother, father };
}

test('first shared child creates one deterministic parental union and later children reuse it', () => {
  const world = makeBirthWorld();
  const { mother, father } = addParents(world);

  tickWorld(world, 1);

  assert.equal(world.unions.length, 1);
  assert.equal(world.nextUnionId, 2);
  const union = world.unions[0];
  assert.deepEqual(union.partnerIds, [mother.id, father.id].sort((a, b) => a - b));
  assert.deepEqual(mother.unionIds, [union.id]);
  assert.deepEqual(father.unionIds, [union.id]);
  assert.equal(union.childIds.length, 1);
  assert.equal(union.foundedDay, 0);
  assert.equal(union.lastChildDay, 0);
  assert.equal(union.active, true);

  const firstBorn = world.history.find((event) => event.type === 'human.born');
  assert.ok(firstBorn);
  assert.equal(firstBorn.unionId, union.id);
  assert.equal(world.history.filter((event) => event.type === 'union.founded').length, 1);

  mother.birthCooldownDays = 0;
  father.birthCooldownDays = 0;
  tickWorld(world, 1);

  assert.equal(world.unions.length, 1);
  assert.equal(union.childIds.length, 2);
  assert.equal(union.lastChildDay, 1);
  assert.equal(world.history.filter((event) => event.type === 'union.founded').length, 1);
  assert.deepEqual(
    world.history.filter((event) => event.type === 'human.born').map((event) => event.unionId),
    [union.id, union.id]
  );
});

test('a human can participate in multiple parental unions without exclusivity behavior', () => {
  const world = makeBirthWorld(6502);
  const { tile, mother, father: firstFather } = addParents(world);

  tickWorld(world, 1);
  const firstUnionId = world.unions[0].id;

  mother.birthCooldownDays = 0;
  firstFather.birthCooldownDays = 999;
  const secondFather = createHuman(world, {
    x: tile.x,
    y: tile.y,
    sex: 'M',
    ageYears: 27,
    hunger: 0.1,
    birthCooldownDays: 0
  });
  tickWorld(world, 1);

  assert.equal(world.unions.length, 2);
  const secondUnion = world.unions.find((union) => union.id !== firstUnionId);
  assert.ok(secondUnion);
  assert.deepEqual(mother.unionIds, [firstUnionId, secondUnion.id]);
  assert.deepEqual(firstFather.unionIds, [firstUnionId]);
  assert.deepEqual(secondFather.unionIds, [secondUnion.id]);
});

test('partner death ends active parental unions while preserving historical identity', () => {
  const world = makeBirthWorld(6503);
  const { mother, father } = addParents(world);
  tickWorld(world, 1);
  const union = world.unions[0];
  const childIds = [...union.childIds];

  father.ageDays = world.config.hardMaxAgeYears * world.config.daysPerYear - 1;
  tickWorld(world, 1);

  assert.equal(world.entities.some((human) => human.id === father.id), false);
  assert.equal(union.active, false);
  assert.equal(union.endReason, 'partner_death');
  assert.equal(union.endedByHumanId, father.id);
  assert.equal(union.endedDay, 1);
  assert.deepEqual(union.partnerIds, [mother.id, father.id].sort((a, b) => a - b));
  assert.deepEqual(union.childIds, childIds);
  assert.deepEqual(mother.unionIds, [union.id]);
  assert.equal(world.history.filter((event) => event.type === 'union.ended').length, 1);
});

test('parental union state survives deterministic save/load continuation', () => {
  const world = createWorld({ seed: 6504, width: 14, height: 14, population: 18 });
  tickWorld(world, 1000);
  const restored = worldFromSnapshot(JSON.parse(JSON.stringify(snapshotWorld(world))));
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));

  tickWorld(world, 500);
  tickWorld(restored, 500);
  assert.deepEqual(snapshotWorld(restored), snapshotWorld(world));
});

test('union bookkeeping and metrics consume no RNG', () => {
  const world = makeBirthWorld(6505);
  const { mother, father } = addParents(world);
  const rngBefore = world.rng.snapshot();

  const { union, founded } = ensureParentalUnion(world, mother, father);
  assert.equal(founded, true);
  addChildToParentalUnion(world, union, 999);
  const summaryBefore = snapshotWorld(world);
  const metrics = summarizeParentalUnions(world);
  endParentalUnionsForHuman(world, father.id);

  assert.deepEqual(world.rng.snapshot(), rngBefore);
  assert.equal(metrics.unionCount, 1);
  assert.equal(metrics.activeUnions, 1);
  assert.equal(metrics.singleChildUnions, 1);
  assert.equal(metrics.livingUnionParticipants, 2);
  assert.deepEqual(summaryBefore.unions[0].childIds, [999]);
});

test('parental union metrics are derived-only and expose multi-union structure', () => {
  const world = makeBirthWorld(6506);
  const { tile, mother, father } = addParents(world);
  const first = ensureParentalUnion(world, mother, father).union;
  addChildToParentalUnion(world, first, 901);
  addChildToParentalUnion(world, first, 902);

  const otherFather = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 30, hunger: 0.1 });
  const second = ensureParentalUnion(world, mother, otherFather).union;
  addChildToParentalUnion(world, second, 903);

  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const summary = summarizeParentalUnions(world);

  assert.equal(summary.unionCount, 2);
  assert.equal(summary.activeUnions, 2);
  assert.equal(summary.endedUnions, 0);
  assert.equal(summary.singleChildUnions, 1);
  assert.equal(summary.multiChildUnions, 1);
  assert.equal(summary.averageChildrenPerUnion, 1.5);
  assert.equal(summary.maxChildrenPerUnion, 2);
  assert.equal(summary.livingUnionParticipants, 3);
  assert.equal(summary.multiUnionLivingHumans, 1);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
