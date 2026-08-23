import { isEligibleFemale, isEligibleMale } from './reproduction_metrics.js';

const DEFAULT_MEMORY_WINDOWS = Object.freeze([30, 90, 180]);

/**
 * Stateful research observer for start-of-day reproduction opportunity.
 *
 * The tracker stores its own history only. observe(world) never mutates the
 * authoritative world, entities, snapshot fields, counters, or RNG state.
 */
export function createReproductionDroughtTracker({ memoryWindows = DEFAULT_MEMORY_WINDOWS } = {}) {
  const windows = [...new Set(memoryWindows.map((value) => Math.max(1, Math.floor(value))))].sort((a, b) => a - b);
  const lastRadius1OpportunityDay = new Map();
  const activeNoOpportunityStreaks = new Map();
  const completedNoOpportunityStreaks = [];
  const memoryCoveredNoOpportunityDays = new Map(windows.map((window) => [window, 0]));

  let observations = 0;
  let eligibleFemaleDays = 0;
  let radius1OpportunityFemaleDays = 0;
  let radius3OpportunityFemaleDays = 0;
  let radius1NoOpportunityFemaleDays = 0;
  let radius1NoOpportunityWithPriorEncounterDays = 0;
  let daysSinceLastOpportunitySum = 0;
  let daysSinceLastOpportunityMax = 0;

  function observe(world) {
    observations += 1;

    const eligibleFemales = [];
    const maleCounts = new Uint32Array(world.width * world.height);
    for (const human of world.entities) {
      if (isEligibleMale(world, human)) {
        maleCounts[human.y * world.width + human.x] += 1;
      } else if (isEligibleFemale(world, human)) {
        eligibleFemales.push(human);
      }
    }

    const eligibleIds = new Set(eligibleFemales.map((human) => human.id));
    for (const [humanId, streak] of activeNoOpportunityStreaks) {
      if (!eligibleIds.has(humanId)) {
        completedNoOpportunityStreaks.push(streak);
        activeNoOpportunityStreaks.delete(humanId);
      }
    }

    for (const female of eligibleFemales) {
      eligibleFemaleDays += 1;
      const hasRadius1 = hasEligibleMale(world, maleCounts, female.x, female.y, 1);
      const hasRadius3 = hasRadius1 || hasEligibleMale(world, maleCounts, female.x, female.y, 3);

      if (hasRadius3) radius3OpportunityFemaleDays += 1;

      if (hasRadius1) {
        radius1OpportunityFemaleDays += 1;
        lastRadius1OpportunityDay.set(female.id, world.day);
        const streak = activeNoOpportunityStreaks.get(female.id);
        if (streak !== undefined) {
          completedNoOpportunityStreaks.push(streak);
          activeNoOpportunityStreaks.delete(female.id);
        }
        continue;
      }

      radius1NoOpportunityFemaleDays += 1;
      activeNoOpportunityStreaks.set(female.id, (activeNoOpportunityStreaks.get(female.id) ?? 0) + 1);

      const lastOpportunityDay = lastRadius1OpportunityDay.get(female.id);
      if (lastOpportunityDay === undefined) continue;

      const daysSince = world.day - lastOpportunityDay;
      radius1NoOpportunityWithPriorEncounterDays += 1;
      daysSinceLastOpportunitySum += daysSince;
      daysSinceLastOpportunityMax = Math.max(daysSinceLastOpportunityMax, daysSince);
      for (const window of windows) {
        if (daysSince <= window) {
          memoryCoveredNoOpportunityDays.set(window, memoryCoveredNoOpportunityDays.get(window) + 1);
        }
      }
    }
  }

  function summarize() {
    const streaks = [...completedNoOpportunityStreaks, ...activeNoOpportunityStreaks.values()];
    return {
      observations,
      eligibleFemaleDays,
      radius1OpportunityFemaleDays,
      radius1NoOpportunityFemaleDays,
      radius3OpportunityFemaleDays,
      radius1OpportunityShare: ratio(radius1OpportunityFemaleDays, eligibleFemaleDays),
      radius1NoOpportunityShare: ratio(radius1NoOpportunityFemaleDays, eligibleFemaleDays),
      radius3OpportunityShare: ratio(radius3OpportunityFemaleDays, eligibleFemaleDays),
      radius1NoOpportunityWithPriorEncounterDays,
      priorEncounterShareOfNoOpportunityDays: ratio(
        radius1NoOpportunityWithPriorEncounterDays,
        radius1NoOpportunityFemaleDays
      ),
      averageDaysSinceLastRadius1Opportunity: ratio(
        daysSinceLastOpportunitySum,
        radius1NoOpportunityWithPriorEncounterDays
      ),
      maxDaysSinceLastRadius1Opportunity: daysSinceLastOpportunityMax,
      memoryCoverageOfNoOpportunityDays: Object.fromEntries(
        windows.map((window) => [
          window,
          ratio(memoryCoveredNoOpportunityDays.get(window), radius1NoOpportunityFemaleDays)
        ])
      ),
      noOpportunityStreaks: summarizeStreaks(streaks)
    };
  }

  return { observe, summarize };
}

function hasEligibleMale(world, maleCounts, x, y, radius) {
  const minX = Math.max(0, x - radius);
  const maxX = Math.min(world.width - 1, x + radius);
  const minY = Math.max(0, y - radius);
  const maxY = Math.min(world.height - 1, y + radius);

  for (let ny = minY; ny <= maxY; ny += 1) {
    const rowOffset = ny * world.width;
    for (let nx = minX; nx <= maxX; nx += 1) {
      if (maleCounts[rowOffset + nx] > 0) return true;
    }
  }
  return false;
}

function summarizeStreaks(streaks) {
  if (streaks.length === 0) {
    return { count: 0, mean: 0, median: 0, p90: 0, max: 0 };
  }

  const sorted = [...streaks].sort((a, b) => a - b);
  return {
    count: sorted.length,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    max: sorted.at(-1)
  };
}

function percentile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
