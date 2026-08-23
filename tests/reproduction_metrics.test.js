import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReproductionOpportunity } from '../engine/core/reproduction_metrics.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

test('reproduction opportunity distinguishes local, wider, and settlement social pools', () => {
  const world = createWorld({ seed: 5150, width: 10, height: 10, population: 0, config: { waterLevel: 0 } });
  world.settlements.push({ id: 1, active: true });

  const female = createHuman(world, { x: 1, y: 1, sex: 'F', ageYears: 24, hunger: 0.1, settlementId: 1 });
  const localMale = createHuman(world, { x: 2, y: 2, sex: 'M', ageYears: 25, hunger: 0.1, settlementId: 1 });
  const widerMale = createHuman(world, { x: 4, y: 1, sex: 'M', ageYears: 26, hunger: 0.1, settlementId: 1 });
  createHuman(world, { x: 8, y: 8, sex: 'F', ageYears: 24, hunger: 0.1, settlementId: 1 });
  createHuman(world, { x: 1, y: 2, sex: 'M', ageYears: 25, hunger: 0.9, settlementId: 1 });
  createHuman(world, { x: 1, y: 2, sex: 'F', ageYears: 50, hunger: 0.1, settlementId: 1 });

  const metrics = summarizeReproductionOpportunity(world);
  assert.equal(metrics.eligibleFemales, 2);
  assert.equal(metrics.eligibleMales, 2);
  assert.equal(metrics.femaleOpportunityRadius1Share, 0.5);
  assert.equal(metrics.femaleOpportunityRadius3Share, 0.5);
  assert.equal(metrics.femaleOpportunityRadius5Share, 0.5);
  assert.equal(metrics.femaleOpportunitySameSettlementShare, 1);
  assert.equal(metrics.activeSettlementsWithEligibleFemales, 1);
  assert.equal(metrics.activeSettlementsWithEligibleFemalesAndNoMales, 0);
  assert.ok(metrics.averageEligibleMalesRadius1 < metrics.averageEligibleMalesSameSettlement);
  assert.ok(female.lineageId !== localMale.lineageId);
  assert.ok(localMale.lineageId !== widerMale.lineageId);
});

test('settlement pool reports eligible-female settlements with no eligible males', () => {
  const world = createWorld({ seed: 5151, width: 8, height: 8, population: 0, config: { waterLevel: 0 } });
  world.settlements.push({ id: 7, active: true });
  createHuman(world, { x: 2, y: 2, sex: 'F', ageYears: 30, hunger: 0.1, settlementId: 7 });

  const metrics = summarizeReproductionOpportunity(world);
  assert.equal(metrics.activeSettlementsWithEligibleFemales, 1);
  assert.equal(metrics.activeSettlementsWithEligibleFemalesAndNoMales, 1);
  assert.equal(metrics.settlementFemalePoolWithoutMaleShare, 1);
  assert.equal(metrics.femaleOpportunitySameSettlementShare, 0);
});

test('reproduction opportunity accounting is derived-only and consumes no RNG', () => {
  const world = createWorld({ seed: 5152, width: 12, height: 12, population: 20 });
  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  summarizeReproductionOpportunity(world);

  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
