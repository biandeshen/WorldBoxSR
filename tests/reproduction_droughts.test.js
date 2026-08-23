import test from 'node:test';
import assert from 'node:assert/strict';
import { createReproductionDroughtTracker } from '../engine/core/reproduction_droughts.js';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';

function makeStaticWorld() {
  const world = createWorld({
    seed: 4747,
    width: 8,
    height: 8,
    population: 0,
    config: {
      waterLevel: 0,
      passiveMoveChance: 0,
      hungerPerDay: 0,
      birthChancePerEligiblePairPerDay: 0,
      settlementCheckIntervalDays: 0
    }
  });
  const female = createHuman(world, {
    x: 2,
    y: 2,
    sex: 'F',
    ageYears: 24,
    hunger: 0.1,
    birthCooldownDays: 0
  });
  const male = createHuman(world, {
    x: 3,
    y: 2,
    sex: 'M',
    ageYears: 25,
    hunger: 0.1,
    birthCooldownDays: 0
  });
  return { world, female, male };
}

test('drought tracker measures streaks, wider opportunity, and recent encounter coverage', () => {
  const { world, male } = makeStaticWorld();
  const tracker = createReproductionDroughtTracker({ memoryWindows: [2, 3] });

  tracker.observe(world); // day 0: radius-1 opportunity

  male.x = 5; // distance 3: no radius-1 opportunity but radius-3 still available
  for (let day = 0; day < 3; day += 1) {
    tickWorld(world, 1);
    tracker.observe(world);
  }

  male.x = 3;
  tickWorld(world, 1);
  tracker.observe(world); // closes the 3-day drought

  const summary = tracker.summarize();
  assert.equal(summary.observations, 5);
  assert.equal(summary.eligibleFemaleDays, 5);
  assert.equal(summary.radius1OpportunityFemaleDays, 2);
  assert.equal(summary.radius1NoOpportunityFemaleDays, 3);
  assert.equal(summary.radius3OpportunityFemaleDays, 5);
  assert.equal(summary.priorEncounterShareOfNoOpportunityDays, 1);
  assert.equal(summary.averageDaysSinceLastRadius1Opportunity, 2);
  assert.equal(summary.maxDaysSinceLastRadius1Opportunity, 3);
  assert.equal(summary.memoryCoverageOfNoOpportunityDays[2], 2 / 3);
  assert.equal(summary.memoryCoverageOfNoOpportunityDays[3], 1);
  assert.deepEqual(summary.noOpportunityStreaks, {
    count: 1,
    mean: 3,
    median: 3,
    p90: 3,
    max: 3
  });
});

test('becoming ineligible ends an active opportunity drought rather than extending it through cooldown', () => {
  const { world, female, male } = makeStaticWorld();
  const tracker = createReproductionDroughtTracker();

  male.x = 5;
  tracker.observe(world);
  tickWorld(world, 1);
  tracker.observe(world);

  female.birthCooldownDays = 10;
  tickWorld(world, 1);
  tracker.observe(world);

  const summary = tracker.summarize();
  assert.equal(summary.eligibleFemaleDays, 2);
  assert.equal(summary.radius1NoOpportunityFemaleDays, 2);
  assert.equal(summary.noOpportunityStreaks.count, 1);
  assert.equal(summary.noOpportunityStreaks.max, 2);
});

test('drought observation is derived-only and preserves snapshot and RNG state exactly', () => {
  const { world } = makeStaticWorld();
  const tracker = createReproductionDroughtTracker();
  const snapshotBefore = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  tracker.observe(world);
  tracker.observe(world);

  assert.deepEqual(snapshotWorld(world), snapshotBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
