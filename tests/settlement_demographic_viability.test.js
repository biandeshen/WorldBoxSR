import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSettlementDemography } from '../engine/analysis/settlement_demography.js';
import { createSettlementDemographicViabilityTracker } from '../engine/core/settlement_demographic_viability.js';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createSettlement } from '../engine/model/settlement.js';
import { createHuman } from '../engine/model/human.js';

const BASE_CONFIG = Object.freeze({
  daysPerYear: 360,
  adultAgeYears: 18,
  femaleFertilityEndYears: 45
});

function human({
  id,
  settlementId = null,
  sex = 'M',
  ageYears = 25,
  x = 1,
  y = 1,
  hunger = 0.2,
  birthCooldownDays = 0,
  parentIds = []
}) {
  return {
    id,
    kind: 'human',
    alive: true,
    settlementId,
    sex,
    ageDays: ageYears * BASE_CONFIG.daysPerYear,
    x,
    y,
    hunger,
    birthCooldownDays,
    parentIds: [...parentIds]
  };
}

function settlement(id, { active = true, abandonedDay = null } = {}) {
  return { id, kind: 'settlement', name: `S${id}`, active, abandonedDay };
}

function world({ day = 30, settlements = [settlement(1)], entities = [] } = {}) {
  return {
    day,
    width: 8,
    height: 8,
    config: { ...BASE_CONFIG },
    settlements,
    entities
  };
}

test('demography uses existing reproduction eligibility and geographic radius-1 opportunity', () => {
  const sample = world({
    settlements: [settlement(1), settlement(2)],
    entities: [
      human({ id: 1, settlementId: 1, sex: 'F', ageYears: 25, x: 1, y: 1 }),
      human({ id: 2, settlementId: 1, sex: 'F', ageYears: 25, x: 6, y: 6 }),
      // Eligible male is assigned to another settlement but is locally usable by
      // the real reproduction rule because partner search ignores settlement ID.
      human({ id: 3, settlementId: 2, sex: 'M', ageYears: 28, x: 2, y: 1 }),
      // Male fertility has no upper-age cutoff in the authoritative rule; keep
      // this eligible older male outside radius1 of both S1 females.
      human({ id: 4, settlementId: 1, sex: 'M', ageYears: 60, x: 3, y: 3 }),
      human({ id: 5, settlementId: 1, sex: 'F', ageYears: 10, x: 4, y: 4 })
    ]
  });

  const rows = deriveSettlementDemography(sample);
  const s1 = rows.find((row) => row.settlementId === 1);
  assert.equal(s1.population, 4);
  assert.equal(s1.minors, 1);
  assert.equal(s1.adults, 3);
  assert.equal(s1.reproductiveAgeFemales, 2);
  assert.equal(s1.adultMales, 1);
  assert.equal(s1.eligibleFemales, 2);
  assert.equal(s1.eligibleMales, 1); // older male remains eligible: no male fertility end exists
  assert.equal(s1.eligibleFemalesWithLocalMaleOpportunity, 1);
  assert.equal(s1.eligibleFemalesWithoutLocalMaleOpportunity, 1);
  assert.equal(s1.localReproductionOpportunityCoverage, 0.5);
  assert.equal(s1.averageLocalEligibleMalesPerEligibleFemale, 0.5);
});

test('sampled member flows reconcile death, exit, direct switch, entry, newborn, and external spawn exactly', () => {
  const s1 = settlement(1);
  const s2 = settlement(2);
  const sample = world({
    day: 30,
    settlements: [s1, s2],
    entities: [
      human({ id: 1, settlementId: 1 }), // dies
      human({ id: 2, settlementId: 1 }), // switches to S2
      human({ id: 3, settlementId: null }), // enters S1
      human({ id: 4, settlementId: 2, sex: 'M' }),
      human({ id: 5, settlementId: 1, sex: 'F' }), // mother, stays S1
      human({ id: 8, settlementId: 1 }) // exits to none
    ]
  });
  const tracker = createSettlementDemographicViabilityTracker();
  assert.equal(tracker.observe(sample), true);

  sample.day = 60;
  sample.entities = [
    human({ id: 2, settlementId: 2 }),
    human({ id: 3, settlementId: 1 }),
    human({ id: 4, settlementId: 2, sex: 'M' }),
    human({ id: 5, settlementId: 1, sex: 'F' }),
    human({ id: 8, settlementId: null }),
    human({ id: 6, settlementId: 1, sex: 'F', ageYears: 0, parentIds: [5, 4] }),
    human({ id: 7, settlementId: 1, sex: 'M', parentIds: [] })
  ];
  assert.equal(tracker.observe(sample), true);

  const summary = tracker.summarize(sample);
  assert.equal(summary.reconciliation.errorIntervals, 0);
  assert.equal(summary.reconciliation.maxAbsoluteError, 0);

  const row1 = summary.settlements.find((row) => row.settlementId === 1);
  assert.equal(row1.finalPopulation, 4);
  assert.deepEqual(row1.flowTotals, {
    newbornAdditions: 1,
    externalSpawnAdditions: 1,
    entrantsFromNone: 1,
    switchesIn: 0,
    deaths: 1,
    exitsToNone: 1,
    switchesOut: 1,
    birthsProducedByPriorMembers: 1
  });
  assert.equal(row1.observedPopulationDelta, 0);
  assert.equal(row1.reconciledPopulationDelta, 0);

  const row2 = summary.settlements.find((row) => row.settlementId === 2);
  assert.equal(row2.finalPopulation, 2);
  assert.equal(row2.flowTotals.switchesIn, 1);
  assert.equal(row2.flowTotals.switchesOut, 0);
  assert.equal(row2.observedPopulationDelta, 1);
  assert.equal(row2.reconciledPopulationDelta, 1);
});

test('birth production follows the mother prior-sample settlement while child addition follows current membership', () => {
  const sample = world({
    day: 30,
    settlements: [settlement(1), settlement(2)],
    entities: [
      human({ id: 1, settlementId: 1, sex: 'F' }),
      human({ id: 2, settlementId: 2, sex: 'M' })
    ]
  });
  const tracker = createSettlementDemographicViabilityTracker();
  tracker.observe(sample);

  sample.day = 60;
  sample.entities.push(human({
    id: 3,
    settlementId: 2,
    sex: 'F',
    ageYears: 0,
    parentIds: [1, 2]
  }));
  tracker.observe(sample);

  const summary = tracker.summarize(sample);
  const row1 = summary.settlements.find((row) => row.settlementId === 1);
  const row2 = summary.settlements.find((row) => row.settlementId === 2);
  assert.equal(row1.flowTotals.birthsProducedByPriorMembers, 1);
  assert.equal(row1.flowTotals.newbornAdditions, 0);
  assert.equal(row2.flowTotals.birthsProducedByPriorMembers, 0);
  assert.equal(row2.flowTotals.newbornAdditions, 1);
  assert.equal(summary.reconciliation.errorIntervals, 0);
});

test('zero-opportunity and no-birth episodes use current opportunity but prior-interval reproductive context', () => {
  const sample = world({
    day: 30,
    entities: [
      human({ id: 1, settlementId: 1, sex: 'F', ageYears: 25, x: 1, y: 1 })
    ]
  });
  const tracker = createSettlementDemographicViabilityTracker();
  tracker.observe(sample);

  sample.day = 60;
  tracker.observe(sample);
  let summary = tracker.summarize(sample);
  assert.equal(summary.activeEpisodes.some((episode) => episode.type === 'zeroLocalReproductionOpportunity'), true);
  assert.equal(summary.activeEpisodes.some((episode) => episode.type === 'noBirthReplacement'), true);

  sample.day = 90;
  sample.entities.push(human({ id: 2, settlementId: 1, sex: 'M', ageYears: 25, x: 2, y: 1 }));
  sample.entities.push(human({ id: 3, settlementId: 1, sex: 'F', ageYears: 0, parentIds: [1, 2] }));
  tracker.observe(sample);

  summary = tracker.summarize(sample);
  const zeroOpportunity = summary.retainedCompletedEpisodes.find(
    (episode) => episode.type === 'zeroLocalReproductionOpportunity'
  );
  const noBirth = summary.retainedCompletedEpisodes.find(
    (episode) => episode.type === 'noBirthReplacement'
  );
  assert.equal(zeroOpportunity.startDay, 60);
  assert.equal(zeroOpportunity.endDay, 60);
  assert.equal(noBirth.startDay, 60);
  assert.equal(noBirth.endDay, 60);
});

test('already abandoned settlements stop accumulating empty post-abandonment intervals', () => {
  const sample = world({
    day: 30,
    entities: [human({ id: 1, settlementId: 1 })]
  });
  const tracker = createSettlementDemographicViabilityTracker();
  tracker.observe(sample);

  sample.day = 60;
  sample.entities = [];
  sample.settlements[0].active = false;
  sample.settlements[0].abandonedDay = 60;
  tracker.observe(sample);
  let row = tracker.summarize(sample).settlements[0];
  assert.equal(row.intervalsObserved, 1);
  assert.equal(row.abandoned, true);
  assert.equal(row.finalPopulation, 0);
  assert.equal(row.flowTotals.deaths, 1);

  sample.day = 90;
  tracker.observe(sample);
  row = tracker.summarize(sample).settlements[0];
  assert.equal(row.intervalsObserved, 1);
  assert.equal(row.flowTotals.deaths, 1);
});

test('completed demographic episode rows are bounded while aggregate episode counts remain exact', () => {
  const sample = world({
    day: 30,
    entities: [human({ id: 1, settlementId: 1, sex: 'F', ageYears: 25 })]
  });
  const tracker = createSettlementDemographicViabilityTracker({ maxCompletedEpisodes: 2 });
  tracker.observe(sample);

  for (let cycle = 0; cycle < 4; cycle += 1) {
    sample.day += 30;
    tracker.observe(sample); // zero opportunity + no birth
    sample.day += 30;
    sample.entities[0].birthCooldownDays = 1; // temporarily makes female ineligible; closes zero-opportunity
    tracker.observe(sample);
    sample.entities[0].birthCooldownDays = 0;
  }

  const summary = tracker.summarize(sample);
  assert.equal(summary.episodeTypes.zeroLocalReproductionOpportunity.completedEpisodes, 4);
  assert.equal(summary.storage.retainedCompletedEpisodes, 2);
  assert.ok(summary.storage.completedEpisodeEvictions >= 2);
});

test('demographic derivation and flow observation are exact snapshot and RNG neutral', () => {
  const sample = createWorld({ seed: 83, width: 8, height: 8, population: 0 });
  const tile = sample.tiles.find((candidate) => candidate.passable);
  assert.ok(tile);
  const home = createSettlement(sample, { x: tile.x, y: tile.y });
  const female = createHuman(sample, {
    x: tile.x,
    y: tile.y,
    sex: 'F',
    ageYears: 25,
    hunger: 0.2,
    birthCooldownDays: 0
  });
  female.settlementId = home.id;
  home.population = 1;
  home.memberIds = [female.id];
  sample.day = 30;

  const before = snapshotWorld(sample);
  const rngBefore = sample.rng.snapshot();
  const tracker = createSettlementDemographicViabilityTracker();
  deriveSettlementDemography(sample);
  tracker.observe(sample);
  tracker.summarize(sample);

  assert.deepEqual(snapshotWorld(sample), before);
  assert.deepEqual(sample.rng.snapshot(), rngBefore);
});

test('demographic tracker validates cadence/cap and monotonic observation time', () => {
  assert.throws(() => createSettlementDemographicViabilityTracker({ sampleIntervalDays: 0 }), /sampleIntervalDays/);
  assert.throws(() => createSettlementDemographicViabilityTracker({ maxCompletedEpisodes: 0 }), /maxCompletedEpisodes/);

  const sample = world({ day: 30, entities: [] });
  const tracker = createSettlementDemographicViabilityTracker();
  assert.equal(tracker.observe(sample), true);
  assert.equal(tracker.observe(sample), false);
  sample.day = 29;
  assert.throws(() => tracker.observe(sample), /monotonic/);
});
