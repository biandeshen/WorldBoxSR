import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { deriveSettlementDemography } from '../engine/analysis/settlement_demography.js';
import { createSettlementDemographicViabilityTracker } from '../engine/core/settlement_demographic_viability.js';

const SEEDS = [49, 62, 98];
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

test('temporary all-abandonment-seed female replacement pipeline audit', () => {
  const rows = [];
  const allSettlementPipelineRows = [];

  for (const seed of SEEDS) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createSettlementDemographicViabilityTracker({
      sampleIntervalDays: 30,
      maxCompletedEpisodes: 50000
    });
    const pipeline = new Map();
    const checkpoints = new Map();

    for (let day = 30; day <= YEARS * world.config.daysPerYear; day += 30) {
      tickWorld(world, 30);
      tracker.observe(world);

      const demographyRows = deriveSettlementDemography(world);
      const trackedById = new Map(
        tracker.summarize(world).settlements.map((settlement) => [settlement.settlementId, settlement])
      );

      for (const demographic of demographyRows) {
        if (!demographic.active) continue;
        let state = pipeline.get(demographic.settlementId);
        if (!state) {
          state = {
            settlementId: demographic.settlementId,
            activeSamples: 0,
            noReproductiveAgeFemaleSamples: 0,
            noFemalePipelineSamples: 0,
            firstNoFemalePipelineDay: null,
            currentNoPipelineStartDay: null,
            longestNoPipelineObservedSpanDays: 0,
            minimumFemalePipelineMembers: null
          };
          pipeline.set(demographic.settlementId, state);
        }

        state.activeSamples += 1;
        if (demographic.reproductiveAgeFemales === 0) state.noReproductiveAgeFemaleSamples += 1;
        if (demographic.femaleReplacementPipelineMembers === 0) {
          state.noFemalePipelineSamples += 1;
          if (state.firstNoFemalePipelineDay === null) state.firstNoFemalePipelineDay = world.day;
          if (state.currentNoPipelineStartDay === null) state.currentNoPipelineStartDay = world.day;
          state.longestNoPipelineObservedSpanDays = Math.max(
            state.longestNoPipelineObservedSpanDays,
            world.day - state.currentNoPipelineStartDay
          );
        } else {
          state.currentNoPipelineStartDay = null;
        }
        state.minimumFemalePipelineMembers = state.minimumFemalePipelineMembers === null
          ? demographic.femaleReplacementPipelineMembers
          : Math.min(state.minimumFemalePipelineMembers, demographic.femaleReplacementPipelineMembers);
      }

      const year = world.day / world.config.daysPerYear;
      if (CHECKPOINT_YEARS.has(year)) {
        for (const demographic of demographyRows) {
          let list = checkpoints.get(demographic.settlementId);
          if (!list) checkpoints.set(demographic.settlementId, list = []);
          const tracked = trackedById.get(demographic.settlementId);
          list.push({
            year,
            active: demographic.active,
            population: demographic.population,
            femalePipelineMembers: demographic.femaleReplacementPipelineMembers,
            minorFemales: demographic.minorFemales,
            reproductiveAgeFemales: demographic.reproductiveAgeFemales,
            laterAdultFemales: demographic.laterAdultFemales,
            reproductiveAgeMales: demographic.reproductiveAgeMales,
            laterAdultMales: demographic.laterAdultMales,
            eligibleFemales: demographic.eligibleFemales,
            eligibleMales: demographic.eligibleMales,
            localOpportunityCoverage: roundNullable(demographic.localReproductionOpportunityCoverage),
            meanAgeYears: roundNullable(demographic.meanAgeYears),
            medianAgeYears: roundNullable(demographic.medianAgeYears),
            cumulativeFlow: cloneFlow(tracked?.flowTotals),
            abandonedDay: tracked?.abandonedDay ?? null
          });
        }
      }
    }

    const final = tracker.summarize(world);
    assert.equal(final.reconciliation.errorIntervals, 0, `seed ${seed} has reconciliation errors`);
    assert.equal(final.reconciliation.maxAbsoluteError, 0, `seed ${seed} has non-zero reconciliation error`);
    assert.equal(final.storage.completedEpisodeEvictions, 0, `seed ${seed} episode cap truncated`);

    const finalById = new Map(final.settlements.map((settlement) => [settlement.settlementId, settlement]));
    const settlementRows = world.settlements.map((settlement) => {
      const pipe = pipeline.get(settlement.id) ?? emptyPipeline(settlement.id);
      const tracked = finalById.get(settlement.id);
      const row = {
        seed,
        settlementId: settlement.id,
        name: settlement.name,
        foundedDay: settlement.foundedDay,
        active: settlement.active,
        abandonedDay: settlement.abandonedDay,
        finalPopulation: settlement.active ? settlement.population : 0,
        activeSamples: pipe.activeSamples,
        noReproductiveAgeFemaleShare: share(pipe.noReproductiveAgeFemaleSamples, pipe.activeSamples),
        noFemaleReplacementPipelineShare: share(pipe.noFemalePipelineSamples, pipe.activeSamples),
        firstNoFemalePipelineDay: pipe.firstNoFemalePipelineDay,
        longestNoPipelineObservedSpanDays: pipe.longestNoPipelineObservedSpanDays,
        minimumFemalePipelineMembers: pipe.minimumFemalePipelineMembers,
        cumulativeFlow: cloneFlow(tracked?.flowTotals),
        checkpoints: checkpoints.get(settlement.id) ?? []
      };
      allSettlementPipelineRows.push(row);
      return row;
    });

    const abandoned = settlementRows.filter((row) => !row.active);
    assert.equal(abandoned.length, 1, `seed ${seed} should have exactly one abandoned settlement in baseline`);
    rows.push({
      seed,
      historicalSettlements: world.settlements.length,
      abandoned: abandoned[0],
      finalActiveSummary: summarizePipelineGroup(settlementRows.filter((row) => row.active))
    });
  }

  const abandonedRows = allSettlementPipelineRows.filter((row) => !row.active);
  const activeRows = allSettlementPipelineRows.filter((row) => row.active);
  assert.equal(abandonedRows.length, 3, 'expected all three known natural abandonments');

  console.log('SETTLEMENT_FEMALE_REPLACEMENT_ALL_ABANDONMENTS', JSON.stringify({
    abandonedSummary: summarizePipelineGroup(abandonedRows),
    activeSummary: summarizePipelineGroup(activeRows),
    rows
  }));
});

function summarizePipelineGroup(rows) {
  return {
    count: rows.length,
    noReproductiveAgeFemaleShareMedian: medianNullable(
      rows.map((row) => row.noReproductiveAgeFemaleShare)
    ),
    noFemaleReplacementPipelineShareMedian: medianNullable(
      rows.map((row) => row.noFemaleReplacementPipelineShare)
    ),
    longestNoPipelineObservedSpanDaysMedian: medianNullable(
      rows.map((row) => row.longestNoPipelineObservedSpanDays)
    ),
    minimumFemalePipelineMembersMedian: medianNullable(
      rows.map((row) => row.minimumFemalePipelineMembers ?? 0)
    )
  };
}

function emptyPipeline(settlementId) {
  return {
    settlementId,
    activeSamples: 0,
    noReproductiveAgeFemaleSamples: 0,
    noFemalePipelineSamples: 0,
    firstNoFemalePipelineDay: null,
    currentNoPipelineStartDay: null,
    longestNoPipelineObservedSpanDays: 0,
    minimumFemalePipelineMembers: null
  };
}

function cloneFlow(flow) {
  return Object.fromEntries(FLOW_KEYS.map((key) => [key, flow?.[key] ?? 0]));
}

function share(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function medianNullable(values) {
  if (values.length === 0) return null;
  return round(median(values));
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
