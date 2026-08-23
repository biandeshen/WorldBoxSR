import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormerHomeRecoveryTracker } from '../engine/core/former_home_recovery.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year former-home recovery probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createFormerHomeRecoveryTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const worldSummary = summarizeWorld(world);
    const female = tracker.summarize(world).reproductiveFemales;
    console.log(`FORMER_HOME_RECOVERY ${JSON.stringify({
      seed,
      population: worldSummary.population,
      births: worldSummary.births,
      deaths: worldSummary.deaths,
      activeSettlements: worldSummary.activeSettlements,
      settledPopulation: worldSummary.settledPopulation,
      leaves: female.distanceDrivenLeavesTracked,
      postLeaveDays: female.postLeaveUnsettledPersonDays,
      within4: female.withinFormerHomeRadiusShare[4],
      within5: female.withinFormerHomeRadiusShare[5],
      within6: female.withinFormerHomeRadiusShare[6],
      exactly4: female.exactlyDistance4Share,
      nonHungry: female.nonHungryShare,
      distance: female.distance,
      w0_30: female.elapsedWindows['0-30'],
      w31_90: female.elapsedWindows['31-90'],
      w91_180: female.elapsedWindows['91-180'],
      w181_360: female.elapsedWindows['181-360'],
      wOver360: female.elapsedWindows['>360'],
      longTail: female.longTailOver180Days,
      sameRejoins: female.sameRejoins,
      otherJoins: female.otherJoins,
      sameRejoinShare: female.sameRejoinShareOfResolvedJoins,
      sameRejoinsPer100Leaves: female.sameRejoinsPer100TrackedLeaves,
      rejoinDurations: female.rejoinDurations,
      formerAbandonments: female.formerAbandonments,
      humanLost: female.humanLostEpisodes
    })}`);

    assert.ok(female.postLeaveUnsettledPersonDays >= 0);
  }
});
