import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlementChurnTracker } from '../engine/core/settlement_churn.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year settlement membership churn probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createSettlementChurnTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const churn = tracker.summarize(world);
    const summary = summarizeWorld(world);
    const firstSettlementDay = world.settlements.length
      ? Math.min(...world.settlements.map((settlement) => settlement.foundedDay))
      : null;

    console.log(`SETTLEMENT_CHURN_100Y ${JSON.stringify({
      seed,
      population: summary.population,
      births: summary.births,
      deaths: summary.deaths,
      activeSettlements: summary.activeSettlements,
      firstSettlementYear: firstSettlementDay === null ? null : firstSettlementDay / world.config.daysPerYear,
      adults: project(churn.adults),
      reproductiveFemales: project(churn.reproductiveFemales),
      storage: churn.storage
    })}`);

    assert.equal(churn.observations, days);
  }
});

function project(view) {
  return {
    personDays: view.personDays,
    settledShare: view.settledShare,
    humansEverJoined: view.humansEverJoined,
    settledPostFirstJoinShare: view.settledPostFirstJoinShare,
    unsettledPostFirstJoinShare: view.unsettledPostFirstJoinShare,
    outsideRadiusShareOfSettledDays: view.outsideRadiusShareOfSettledDays,
    joinEvents: view.joinEvents,
    firstJoinEvents: view.firstJoinEvents,
    leaveEvents: view.leaveEvents,
    switchEvents: view.switchEvents,
    rejoinSameEvents: view.rejoinSameEvents,
    rejoinOtherEvents: view.rejoinOtherEvents,
    sameSettlementRejoinShare: view.sameSettlementRejoinShare,
    distanceDrivenLeaves: view.distanceDrivenLeaves,
    abandonmentLeaves: view.abandonmentLeaves,
    distanceDrivenLeaveShare: view.distanceDrivenLeaveShare,
    leaveEventsPer100PersonYears: view.leaveEventsPer100PersonYears,
    membershipChangesPer100PersonYears: view.membershipChangesPer100PersonYears,
    homeDistance: view.homeDistance,
    preLossDistance: view.preLossDistance,
    lossDistance: view.lossDistance,
    settledEpisodes: view.settledEpisodes,
    unsettledEpisodesAfterJoin: view.unsettledEpisodesAfterJoin
  };
}
