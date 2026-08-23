import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeParentalUnions } from '../engine/core/union_metrics.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import {
  addChildToParentalUnion,
  ensureParentalUnion,
  recordParentalUnionPartnerDeath
} from '../engine/model/parental_union.js';

test('extended union metrics describe repeated parenting, multi-union participation, formation context, and first-partner death', () => {
  const world = createWorld({ seed: 6701, width: 10, height: 10, population: 0, config: { waterLevel: 0 } });
  const tile = world.tiles.find((candidate) => candidate.passable);
  const mother = createHuman(world, { x: tile.x, y: tile.y, sex: 'F', ageYears: 25, settlementId: 1 });
  const firstFather = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 26, settlementId: 1 });
  const secondFather = createHuman(world, { x: tile.x, y: tile.y, sex: 'M', ageYears: 27, settlementId: null });

  const first = ensureParentalUnion(world, mother, firstFather).union;
  addChildToParentalUnion(world, first, 101);
  addChildToParentalUnion(world, first, 102);
  const second = ensureParentalUnion(world, mother, secondFather).union;
  addChildToParentalUnion(world, second, 103);
  world.counters.births = 3;

  world.day = 100;
  recordParentalUnionPartnerDeath(world, firstFather.id);

  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  const summary = summarizeParentalUnions(world);

  assert.equal(summary.unionCount, 2);
  assert.equal(summary.bothPartnersLivingUnions, 1);
  assert.equal(summary.partnerDeathRecordedUnions, 1);
  assert.equal(summary.bothPartnersLivingShare, 0.5);
  assert.equal(summary.singleChildUnions, 1);
  assert.equal(summary.multiChildUnions, 1);
  assert.equal(summary.multiChildUnionShare, 0.5);
  assert.deepEqual(summary.childrenPerUnion, { count: 2, min: 1, median: 1, mean: 1.5, p90: 2, max: 2 });
  assert.equal(summary.formedInSettlement, 1);
  assert.equal(summary.formedInSettlementShare, 0.5);
  assert.equal(summary.historicalUnionParticipants, 3);
  assert.equal(summary.multiUnionHistoricalParticipants, 1);
  assert.equal(summary.multiUnionHistoricalParticipantShare, 1 / 3);
  assert.equal(summary.unionsPerHistoricalParticipant.median, 1);
  assert.equal(summary.unionsPerHistoricalParticipant.max, 2);
  assert.equal(summary.maxUnionsPerHistoricalParticipant, 2);
  assert.equal(summary.livingUnionParticipants, 3);
  assert.equal(summary.multiUnionLivingHumans, 1);
  assert.equal(summary.livingUnionParticipantShare, 1);
  assert.equal(summary.multiUnionLivingHumanShare, 1 / 3);
  assert.deepEqual(summary.firstPartnerDeathDurationDays, { count: 1, min: 100, median: 100, mean: 100, p90: 100, max: 100 });
  assert.equal(summary.unionPerBirthRatio, 2 / 3);
  assert.equal(summary.unionsPerLivingHuman, 2 / 3);

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
