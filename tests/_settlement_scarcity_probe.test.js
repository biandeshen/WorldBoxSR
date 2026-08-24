import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { deriveSettlementScarcity } from '../engine/analysis/settlement_scarcity.js';
import { createSettlementScarcityEpisodeTracker } from '../engine/core/settlement_scarcity_episodes.js';

const seeds = [1, 4, 9, 45, 80, 98];
const YEARS = 200;
const CHECKPOINT_YEARS = new Set([100, 120, 140, 160, 180, 200]);

test('temporary 6-seed 200-year settlement scarcity episode probe', () => {
  const rows = [];

  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createSettlementScarcityEpisodeTracker({
      sampleIntervalDays: 30,
      maxCompletedEpisodes: 20000
    });
    let year100 = new Map();
    const pinefordCheckpoints = [];

    for (let day = 30; day <= YEARS * world.config.daysPerYear; day += 30) {
      tickWorld(world, 30);
      tracker.observe(world);

      if (world.day === 100 * world.config.daysPerYear) {
        const summary = tracker.summarize(world);
        const byId = new Map(summary.settlements.map((settlement) => [settlement.settlementId, settlement]));
        year100 = new Map(
          world.settlements
            .filter((settlement) => settlement.active)
            .map((settlement) => [settlement.id, {
              population: settlement.population,
              tracker: byId.get(settlement.id) ?? null
            }])
        );
      }

      const year = world.day / world.config.daysPerYear;
      if (seed === 98 && CHECKPOINT_YEARS.has(year)) {
        const scarcity = deriveSettlementScarcity(world).find((row) => row.settlementId === 5) ?? null;
        pinefordCheckpoints.push(scarcity ? {
          year,
          active: scarcity.active,
          population: scarcity.population,
          foodRemainingFraction: round(scarcity.foodRemainingFraction),
          foodPerMember: roundNullable(scarcity.foodPerMember),
          mealCoveragePerMember: roundNullable(scarcity.territorialMealCoveragePerMember),
          hungryMembers: scarcity.hungryMembers,
          blockedHungryMembers: scarcity.blockedHungryMembers,
          blockedHungryShare: roundNullable(scarcity.blockedHungryShare),
          territorialShortage: scarcity.oneMealTerritorialShortage,
          localBlockage: scarcity.localMealPathBlocked,
          accessMismatch: scarcity.accessMismatch
        } : { year, missing: true });
      }
    }

    const trackerSummary = tracker.summarize(world);
    assert.equal(trackerSummary.storage.completedEpisodeEvictions, 0, `seed ${seed} episode cap truncated`);
    const finalById = new Map(trackerSummary.settlements.map((settlement) => [settlement.settlementId, settlement]));
    const year100Cohort = [];

    for (const [settlementId, start] of year100) {
      const finalSettlement = world.settlements.find((settlement) => settlement.id === settlementId);
      const finalTracker = finalById.get(settlementId);
      if (!finalSettlement || !finalTracker || !start.tracker) continue;
      const postSamples = finalTracker.samplesObserved - start.tracker.samplesObserved;
      const postCounts = {
        territorialShortage: finalTracker.sampleCounts.territorialShortage - start.tracker.sampleCounts.territorialShortage,
        localBlockage: finalTracker.sampleCounts.localBlockage - start.tracker.sampleCounts.localBlockage,
        accessMismatch: finalTracker.sampleCounts.accessMismatch - start.tracker.sampleCounts.accessMismatch
      };
      const finalPopulation = finalSettlement.active ? finalSettlement.population : 0;
      year100Cohort.push({
        settlementId,
        startPopulation: start.population,
        finalPopulation,
        populationDelta: finalPopulation - start.population,
        abandoned: !finalSettlement.active,
        post100Samples: postSamples,
        shortageShare: share(postCounts.territorialShortage, postSamples),
        blockageShare: share(postCounts.localBlockage, postSamples),
        mismatchShare: share(postCounts.accessMismatch, postSamples)
      });
    }

    const worldSummary = summarizeWorld(world);
    rows.push({
      seed,
      final: {
        population: worldSummary.population,
        settlements: worldSummary.settlements,
        activeSettlements: worldSummary.activeSettlements,
        abandonedSettlements: worldSummary.abandonedSettlements
      },
      samples: {
        activeSettlementSamples: trackerSummary.activeSettlementSamples,
        territorialShortageShare: round(trackerSummary.territorialShortageSampleShare),
        localBlockageShare: round(trackerSummary.localBlockageSampleShare),
        accessMismatchShare: round(trackerSummary.accessMismatchSampleShare),
        accessMismatchShareOfLocalBlockage: round(trackerSummary.accessMismatchShareOfLocalBlockageSamples)
      },
      episodes: {
        territorialShortage: compactEpisodeType(trackerSummary.episodeTypes.territorialShortage),
        localBlockage: compactEpisodeType(trackerSummary.episodeTypes.localBlockage),
        accessMismatch: compactEpisodeType(trackerSummary.episodeTypes.accessMismatch)
      },
      year100Cohort: summarizeOutcomeGroups(year100Cohort),
      pinefordCheckpoints,
      pinefordEpisodes: seed === 98
        ? trackerSummary.retainedCompletedEpisodes
          .filter((episode) => episode.settlementId === 5)
          .map(compactEpisode)
        : []
    });
  }

  const aggregate = {
    medianTerritorialShortageShare: median(rows.map((row) => row.samples.territorialShortageShare)),
    medianLocalBlockageShare: median(rows.map((row) => row.samples.localBlockageShare)),
    medianAccessMismatchShare: median(rows.map((row) => row.samples.accessMismatchShare)),
    medianAccessMismatchShareOfLocalBlockage: median(rows.map((row) => row.samples.accessMismatchShareOfLocalBlockage)),
    totalAbandonedSettlements: rows.reduce((sum, row) => sum + row.final.abandonedSettlements, 0)
  };

  console.log('SETTLEMENT_SCARCITY_6SEED_200Y', JSON.stringify({ aggregate, rows }));
});

function compactEpisodeType(type) {
  return {
    completedEpisodes: type.completedEpisodes,
    activeEpisodes: type.activeEpisodes,
    completedBeforeSettlementAbandonment: type.completedBeforeSettlementAbandonment,
    durationMedianDays: roundNullable(type.observedDurationDays.median),
    durationMaxDays: roundNullable(type.observedDurationDays.max),
    populationDeltaMedian: roundNullable(type.populationDelta.median),
    minMealCoverageMedian: roundNullable(type.minimumTerritorialMealCoveragePerMember.median),
    maxBlockedShareMedian: roundNullable(type.maximumBlockedHungryShare.median)
  };
}

function compactEpisode(episode) {
  return {
    type: episode.type,
    startDay: episode.startDay,
    endDay: episode.endDay,
    observedDurationDays: episode.observedDurationDays,
    samplesObserved: episode.samplesObserved,
    populationStart: episode.populationStart,
    populationEnd: episode.populationEnd,
    populationDelta: episode.populationDelta,
    minMealCoverage: roundNullable(episode.minTerritorialMealCoveragePerMember),
    maxBlockedShare: roundNullable(episode.maxBlockedHungryShare),
    settlementAbandonedLater: episode.settlementAbandonedLater
  };
}

function summarizeOutcomeGroups(cohort) {
  return {
    count: cohort.length,
    abandoned: summarizeGroup(cohort.filter((row) => row.abandoned)),
    declinedActive: summarizeGroup(cohort.filter((row) => !row.abandoned && row.populationDelta < 0)),
    nonDeclined: summarizeGroup(cohort.filter((row) => !row.abandoned && row.populationDelta >= 0))
  };
}

function summarizeGroup(rows) {
  return {
    count: rows.length,
    populationDeltaMedian: medianNullable(rows.map((row) => row.populationDelta)),
    shortageShareMedian: medianNullable(rows.map((row) => row.shortageShare)),
    blockageShareMedian: medianNullable(rows.map((row) => row.blockageShare)),
    mismatchShareMedian: medianNullable(rows.map((row) => row.mismatchShare))
  };
}

function share(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function medianNullable(values) {
  return values.length ? median(values) : null;
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
  return value === null ? null : round(value);
}
