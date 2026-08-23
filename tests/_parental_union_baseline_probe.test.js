import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeParentalUnions } from '../engine/core/union_metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,80,98];

test('temporary 13-seed 200-year parental union structural baseline', () => {
  const rows = [];
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    tickWorld(world, 200 * world.config.daysPerYear);
    const u = summarizeParentalUnions(world);
    const population = world.entities.filter((entity) => entity.kind === 'human' && entity.alive).length;
    rows.push({
      seed,
      population,
      births: world.counters.births,
      deaths: world.counters.deaths,
      unions: u.unionCount,
      activeUnions: u.activeUnions,
      endedUnions: u.endedUnions,
      activeShare: round(u.activeUnionShare),
      multiChildShare: round(u.multiChildUnionShare),
      childrenMedian: u.childrenPerUnion.median,
      childrenMean: round(u.childrenPerUnion.mean),
      childrenP90: u.childrenPerUnion.p90,
      childrenMax: u.childrenPerUnion.max,
      formedInSettlementShare: round(u.formedInSettlementShare),
      historicalParticipants: u.historicalUnionParticipants,
      multiUnionHistoricalParticipants: u.multiUnionHistoricalParticipants,
      multiUnionHistoricalShare: round(u.multiUnionHistoricalParticipantShare),
      unionsPerParticipantMedian: u.unionsPerHistoricalParticipant.median,
      unionsPerParticipantMean: round(u.unionsPerHistoricalParticipant.mean),
      unionsPerParticipantP90: u.unionsPerHistoricalParticipant.p90,
      maxUnionsPerParticipant: u.maxUnionsPerHistoricalParticipant,
      livingParticipantShare: round(u.livingUnionParticipantShare),
      multiUnionLivingShare: round(u.multiUnionLivingHumanShare),
      endedDurationMedianYears: round(u.endedUnionDurationDays.median / world.config.daysPerYear),
      endedDurationMeanYears: round(u.endedUnionDurationDays.mean / world.config.daysPerYear),
      endedDurationP90Years: round(u.endedUnionDurationDays.p90 / world.config.daysPerYear),
      endedDurationMaxYears: round(u.endedUnionDurationDays.max / world.config.daysPerYear),
      unionPerBirthRatio: round(u.unionPerBirthRatio),
      unionsPerLivingHuman: round(u.unionsPerLivingHuman)
    });
  }

  const seed45 = rows.find((row) => row.seed === 45);
  assert.deepEqual(
    { population: seed45.population, births: seed45.births, deaths: seed45.deaths },
    { population: 128, births: 184, deaths: 86 }
  );
  assert.equal(rows.length, 13);
  assert.equal(new Set(rows.map((row) => row.seed)).size, 13);

  console.log(`PARENTAL_UNION_BASELINE_200Y ${JSON.stringify({
    rows,
    aggregate: {
      population: stat(rows.map((r) => r.population)),
      unions: stat(rows.map((r) => r.unions)),
      activeShare: stat(rows.map((r) => r.activeShare)),
      multiChildShare: stat(rows.map((r) => r.multiChildShare)),
      childrenMean: stat(rows.map((r) => r.childrenMean)),
      formedInSettlementShare: stat(rows.map((r) => r.formedInSettlementShare)),
      multiUnionHistoricalShare: stat(rows.map((r) => r.multiUnionHistoricalShare)),
      unionsPerParticipantMean: stat(rows.map((r) => r.unionsPerParticipantMean)),
      livingParticipantShare: stat(rows.map((r) => r.livingParticipantShare)),
      multiUnionLivingShare: stat(rows.map((r) => r.multiUnionLivingShare)),
      endedDurationMedianYears: stat(rows.map((r) => r.endedDurationMedianYears)),
      unionPerBirthRatio: stat(rows.map((r) => r.unionPerBirthRatio))
    },
    seed45,
    seed80: rows.find((row) => row.seed === 80),
    seed98: rows.find((row) => row.seed === 98)
  })}`);
});

function stat(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    max: sorted.at(-1)
  };
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
