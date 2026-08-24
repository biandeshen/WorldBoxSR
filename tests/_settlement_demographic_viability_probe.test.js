import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { deriveSettlementDemography } from '../engine/analysis/settlement_demography.js';
import { createSettlementDemographicViabilityTracker } from '../engine/core/settlement_demographic_viability.js';

const SEEDS = [1, 4, 9, 45, 80, 98];
const YEARS = 200;
const CHECKPOINT_YEARS = new Set([100, 120, 140, 160, 180, 200]);

const FLOW_KEYS = Object.freeze([
  'newbornAdditions',
  'externalSpawnAdditions',
  'entrantsFromNone',
  'switchesIn',
  'deaths',
  'exitsToNone',
  'switchesOut',
  'birthsProducedByPriorMembers'
]);

const CONDITION_KEYS = Object.freeze([
  'zeroLocalReproductionOpportunity',
  'noBirthReplacement',
  'netMembershipOutflow',
  'naturalReplacementDeficit'
]);

test('temporary 6-seed 200-year settlement demographic viability probe', () => {
  const rows = [];
  const allYear100Cohort = [];

  for (const seed of SEEDS) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createSettlementDemographicViabilityTracker({
      sampleIntervalDays: 30,
      maxCompletedEpisodes: 50000
    });
    let year100Baseline = new Map();
    let previousPinefordFlow = null;
    const pinefordCheckpoints = [];

    for (let day = 30; day <= YEARS * world.config.daysPerYear; day += 30) {
      tickWorld(world, 30);
      tracker.observe(world);

      const year = world.day / world.config.daysPerYear;
      if (year === 100) {
        const summary = tracker.summarize(world);
        const byId = new Map(summary.settlements.map((settlement) => [settlement.settlementId, settlement]));
        const demography = new Map(
          deriveSettlementDemography(world).map((row) => [row.settlementId, compactDemography(row)])
        );
        year100Baseline = new Map(
          world.settlements
            .filter((settlement) => settlement.active)
            .map((settlement) => {
              const tracked = byId.get(settlement.id);
              return [settlement.id, {
                settlementId: settlement.id,
                name: settlement.name,
                population: settlement.population,
                flowTotals: cloneFlow(tracked?.flowTotals),
                conditionSamples: cloneConditions(tracked?.conditionSamples),
                activeIntervalsObserved: tracked?.activeIntervalsObserved ?? 0,
                demography: demography.get(settlement.id) ?? null
              }];
            })
        );
      }

      if (seed === 98 && CHECKPOINT_YEARS.has(year)) {
        const summary = tracker.summarize(world);
        const tracked = summary.settlements.find((settlement) => settlement.settlementId === 5) ?? null;
        const demographic = deriveSettlementDemography(world).find((row) => row.settlementId === 5) ?? null;
        const cumulativeFlow = cloneFlow(tracked?.flowTotals);
        const intervalFlow = previousPinefordFlow === null
          ? zeroFlow()
          : subtractFlow(cumulativeFlow, previousPinefordFlow);
        previousPinefordFlow = cumulativeFlow;

        pinefordCheckpoints.push({
          year,
          active: demographic?.active ?? false,
          population: demographic?.population ?? 0,
          demography: demographic ? compactDemography(demographic) : null,
          flowSincePreviousCheckpoint: intervalFlow,
          cumulativeFlow,
          conditionShares: tracked ? compactConditionShares(tracked.conditionShares) : null,
          abandonedDay: tracked?.abandonedDay ?? null
        });
      }
    }

    const final = tracker.summarize(world);
    assert.equal(final.reconciliation.errorIntervals, 0, `seed ${seed} has flow reconciliation errors`);
    assert.equal(final.reconciliation.maxAbsoluteError, 0, `seed ${seed} has non-zero reconciliation error`);
    assert.equal(final.storage.completedEpisodeEvictions, 0, `seed ${seed} demographic episode cap truncated`);

    const finalById = new Map(final.settlements.map((settlement) => [settlement.settlementId, settlement]));
    const cohort = [];
    for (const [settlementId, start] of year100Baseline) {
      const tracked = finalById.get(settlementId);
      const settlement = world.settlements.find((candidate) => candidate.id === settlementId);
      if (!tracked || !settlement) continue;

      const post100Flow = subtractFlow(tracked.flowTotals, start.flowTotals);
      const post100Conditions = subtractConditions(tracked.conditionSamples, start.conditionSamples);
      const post100Intervals = tracked.activeIntervalsObserved - start.activeIntervalsObserved;
      const finalPopulation = settlement.active ? settlement.population : 0;
      const stockNaturalReplacementBalance = post100Flow.newbornAdditions - post100Flow.deaths;
      const nonDeathMembershipBalance =
        post100Flow.entrantsFromNone + post100Flow.switchesIn -
        post100Flow.exitsToNone - post100Flow.switchesOut;
      const populationDelta = finalPopulation - start.population;
      const expectedPopulationDelta =
        stockNaturalReplacementBalance +
        nonDeathMembershipBalance +
        post100Flow.externalSpawnAdditions;
      assert.equal(
        expectedPopulationDelta,
        populationDelta,
        `seed ${seed} settlement ${settlementId} post100 stock flow does not reconcile`
      );

      const item = {
        seed,
        settlementId,
        name: start.name,
        startPopulation: start.population,
        finalPopulation,
        populationDelta,
        abandoned: !settlement.active,
        post100Intervals,
        post100Flow,
        stockNaturalReplacementBalance,
        producedNewbornBalance: post100Flow.birthsProducedByPriorMembers - post100Flow.deaths,
        newbornAssignmentBalance:
          post100Flow.newbornAdditions - post100Flow.birthsProducedByPriorMembers,
        nonDeathMembershipBalance,
        conditionShares: Object.fromEntries(
          CONDITION_KEYS.map((key) => [key, share(post100Conditions[key], post100Intervals)])
        ),
        startDemography: start.demography,
        finalDemography: tracked.lastDemography ? compactDemography(tracked.lastDemography) : null
      };
      cohort.push(item);
      allYear100Cohort.push(item);
    }

    rows.push({
      seed,
      final: {
        population: world.entities.filter((entity) => entity.kind === 'human' && entity.alive).length,
        settlements: world.settlements.length,
        activeSettlements: world.settlements.filter((settlement) => settlement.active).length,
        abandonedSettlements: world.settlements.filter((settlement) => !settlement.active).length
      },
      reconciliation: final.reconciliation,
      year100Cohort: summarizeOutcomeGroups(cohort),
      pinefordCheckpoints,
      pinefordPost100: seed === 98 ? cohort.find((item) => item.settlementId === 5) ?? null : null
    });
  }

  const pineford = allYear100Cohort.find((item) => item.seed === 98 && item.settlementId === 5);
  assert.ok(pineford, 'seed98 Pineford #5 missing from year100 cohort');
  assert.equal(pineford.abandoned, true, 'seed98 Pineford #5 should abandon in baseline');

  const recoveryComparator = chooseRecoveryComparator(allYear100Cohort, pineford);
  assert.ok(recoveryComparator, 'no growing small-settlement comparator found');

  console.log('SETTLEMENT_DEMOGRAPHIC_VIABILITY_6SEED_200Y', JSON.stringify({
    rows,
    pineford,
    recoveryComparator,
    aggregate: summarizeAllOutcomeGroups(allYear100Cohort)
  }));
});

function compactDemography(row) {
  return {
    population: row.population,
    minors: row.minors,
    adults: row.adults,
    reproductiveAgeFemales: row.reproductiveAgeFemales,
    adultMales: row.adultMales,
    eligibleFemales: row.eligibleFemales,
    eligibleMales: row.eligibleMales,
    eligibleFemalesWithLocalMaleOpportunity: row.eligibleFemalesWithLocalMaleOpportunity,
    eligibleFemalesWithoutLocalMaleOpportunity: row.eligibleFemalesWithoutLocalMaleOpportunity,
    localReproductionOpportunityCoverage: roundNullable(row.localReproductionOpportunityCoverage),
    meanAgeYears: roundNullable(row.meanAgeYears),
    medianAgeYears: roundNullable(row.medianAgeYears),
    ageBuckets: { ...row.ageBuckets }
  };
}

function compactConditionShares(shares) {
  return Object.fromEntries(CONDITION_KEYS.map((key) => [key, round(shares[key] ?? 0)]));
}

function summarizeOutcomeGroups(cohort) {
  return {
    count: cohort.length,
    abandoned: summarizeGroup(cohort.filter((item) => item.abandoned)),
    declinedActive: summarizeGroup(cohort.filter((item) => !item.abandoned && item.populationDelta < 0)),
    nonDeclined: summarizeGroup(cohort.filter((item) => !item.abandoned && item.populationDelta >= 0))
  };
}

function summarizeAllOutcomeGroups(cohort) {
  return summarizeOutcomeGroups(cohort);
}

function summarizeGroup(items) {
  return {
    count: items.length,
    startPopulationMedian: medianNullable(items.map((item) => item.startPopulation)),
    populationDeltaMedian: medianNullable(items.map((item) => item.populationDelta)),
    deathsMedian: medianNullable(items.map((item) => item.post100Flow.deaths)),
    survivingNewbornAdditionsMedian: medianNullable(items.map((item) => item.post100Flow.newbornAdditions)),
    stockNaturalReplacementBalanceMedian: medianNullable(
      items.map((item) => item.stockNaturalReplacementBalance)
    ),
    survivingNewbornProductionMedian: medianNullable(
      items.map((item) => item.post100Flow.birthsProducedByPriorMembers)
    ),
    producedNewbornBalanceMedian: medianNullable(items.map((item) => item.producedNewbornBalance)),
    newbornAssignmentBalanceMedian: medianNullable(items.map((item) => item.newbornAssignmentBalance)),
    entrantsMedian: medianNullable(items.map((item) => item.post100Flow.entrantsFromNone + item.post100Flow.switchesIn)),
    outflowMedian: medianNullable(items.map((item) => item.post100Flow.exitsToNone + item.post100Flow.switchesOut)),
    nonDeathMembershipBalanceMedian: medianNullable(items.map((item) => item.nonDeathMembershipBalance)),
    zeroOpportunityShareMedian: medianNullable(
      items.map((item) => item.conditionShares.zeroLocalReproductionOpportunity)
    ),
    noBirthReplacementShareMedian: medianNullable(
      items.map((item) => item.conditionShares.noBirthReplacement)
    ),
    netOutflowShareMedian: medianNullable(items.map((item) => item.conditionShares.netMembershipOutflow)),
    naturalDeficitShareMedian: medianNullable(
      items.map((item) => item.conditionShares.naturalReplacementDeficit)
    )
  };
}

function chooseRecoveryComparator(cohort, pineford) {
  const growing = cohort.filter((item) =>
    !item.abandoned &&
    item.populationDelta > 0 &&
    !(item.seed === pineford.seed && item.settlementId === pineford.settlementId)
  );
  growing.sort((a, b) =>
    Math.abs(a.startPopulation - pineford.startPopulation) - Math.abs(b.startPopulation - pineford.startPopulation) ||
    a.startPopulation - b.startPopulation ||
    b.populationDelta - a.populationDelta ||
    a.seed - b.seed ||
    a.settlementId - b.settlementId
  );
  return growing[0] ?? null;
}

function cloneFlow(flow) {
  if (!flow) return zeroFlow();
  return Object.fromEntries(FLOW_KEYS.map((key) => [key, flow[key] ?? 0]));
}

function zeroFlow() {
  return Object.fromEntries(FLOW_KEYS.map((key) => [key, 0]));
}

function subtractFlow(after, before) {
  return Object.fromEntries(FLOW_KEYS.map((key) => [key, (after?.[key] ?? 0) - (before?.[key] ?? 0)]));
}

function cloneConditions(conditions) {
  if (!conditions) return Object.fromEntries(CONDITION_KEYS.map((key) => [key, 0]));
  return Object.fromEntries(CONDITION_KEYS.map((key) => [key, conditions[key] ?? 0]));
}

function subtractConditions(after, before) {
  return Object.fromEntries(
    CONDITION_KEYS.map((key) => [key, (after?.[key] ?? 0) - (before?.[key] ?? 0)])
  );
}

function share(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function medianNullable(values) {
  return values.length > 0 ? round(median(values)) : null;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

function roundNullable(value) {
  return value === null || value === undefined ? null : round(value);
}
