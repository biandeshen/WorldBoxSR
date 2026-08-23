import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlementChurnTracker } from '../engine/core/settlement_churn.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1,2,3,4,5,6,7,8,9,10,45,80,98];
const retentionRadii = [3, 4, 5];

test('temporary 100-year settlement hysteresis distribution scan', () => {
  for (const settlementMembershipRetentionRadius of retentionRadii) {
    const rows = [];
    for (const seed of seeds) {
      const world = createWorld({
        seed,
        width: 24,
        height: 24,
        population: 30,
        config: { settlementMembershipRetentionRadius }
      });
      const churn = createSettlementChurnTracker();
      const days = 100 * world.config.daysPerYear;

      for (let day = 0; day < days; day += 1) {
        churn.observe(world);
        tickWorld(world, 1);
      }

      const s = summarizeWorld(world);
      const female = churn.summarize(world).reproductiveFemales;
      rows.push({
        seed,
        population: s.population,
        births: s.births,
        deaths: s.deaths,
        activeSettlements: s.activeSettlements,
        settledPopulation: s.settledPopulation,
        rfSettledPostFirstJoinShare: female.settledPostFirstJoinShare,
        rfUnsettledPostFirstJoinShare: female.unsettledPostFirstJoinShare,
        rfLeaveEventsPer100PersonYears: female.leaveEventsPer100PersonYears,
        rfMembershipChangesPer100PersonYears: female.membershipChangesPer100PersonYears,
        rfOutsideRadiusShareOfSettledDays: female.outsideRadiusShareOfSettledDays
      });
    }

    console.log(`SETTLEMENT_HYSTERESIS_100Y ${JSON.stringify({
      retentionRadius: settlementMembershipRetentionRadius,
      population: stat(rows.map((row) => row.population)),
      activeSettlements: stat(rows.map((row) => row.activeSettlements)),
      settledPopulation: stat(rows.map((row) => row.settledPopulation)),
      rfSettledPostFirstJoinShare: stat(rows.map((row) => row.rfSettledPostFirstJoinShare)),
      rfUnsettledPostFirstJoinShare: stat(rows.map((row) => row.rfUnsettledPostFirstJoinShare)),
      rfLeaveEventsPer100PersonYears: stat(rows.map((row) => row.rfLeaveEventsPer100PersonYears)),
      seed45: rows.find((row) => row.seed === 45),
      seed80: rows.find((row) => row.seed === 80),
      seed98: rows.find((row) => row.seed === 98),
      rows
    })}`);

    assert.equal(rows.length, seeds.length);
  }
});

function stat(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: sorted.at(-1)
  };
}
