import { isEligibleFemale, isEligibleMale } from '../engine/core/reproduction_metrics.js';
import { tickWorld } from '../engine/core/world.js';

export function observeReproductionFrame(world) {
  const maleCounts = new Uint16Array(world.tiles.length);
  const livingFemales = [];

  for (const human of world.entities) {
    if (human.kind !== 'human' || !human.alive) continue;
    if (isEligibleMale(world, human)) {
      maleCounts[human.y * world.width + human.x] += 1;
    }
    if (human.sex === 'F') livingFemales.push(human);
  }

  return livingFemales.map((female) => {
    const ageYears = female.ageDays / world.config.daysPerYear;
    const encounterTrackable = ageYears >= world.config.adultAgeYears &&
      ageYears <= world.config.femaleFertilityEndYears &&
      female.hunger < 0.55;
    return {
      id: female.id,
      eligible: isEligibleFemale(world, female),
      encounterTrackable,
      radius1MaleCount: countMales(world, maleCounts, female.x, female.y, 1),
      radius3MaleCount: countMales(world, maleCounts, female.x, female.y, 3)
    };
  });
}

export function runReproductionDroughtStudy(world, days, { memoryWindows = [30, 90, 180] } = {}) {
  if (!Number.isInteger(days) || days < 0) throw new RangeError('days must be a non-negative integer');
  const windows = [...new Set(memoryWindows)].sort((a, b) => a - b);
  for (const window of windows) {
    if (!Number.isInteger(window) || window < 1) throw new RangeError('memory windows must be positive integers');
  }

  const states = new Map();
  const droughtLengths = [];
  const memoryCoveredDays = Object.fromEntries(windows.map((window) => [window, 0]));
  const startPopulation = livingPopulation(world);
  const startBirths = world.counters.births;
  const startDeaths = world.counters.deaths;
  const startDay = world.day;

  let eligibleFemaleDays = 0;
  let localOpportunityDays = 0;
  let radius3OpportunityDays = 0;
  let noLocalOpportunityDays = 0;
  let noLocalButRadius3Days = 0;
  let noLocalWithoutPriorOpportunityDays = 0;

  for (let step = 0; step < days; step += 1) {
    const frame = observeReproductionFrame(world);
    const livingFemaleIds = new Set();

    for (const female of frame) {
      livingFemaleIds.add(female.id);
      let state = states.get(female.id);
      if (!state) {
        state = { lastLocalOpportunityDay: null, currentDrought: 0 };
        states.set(female.id, state);
      }

      if (female.encounterTrackable && female.radius1MaleCount > 0) {
        state.lastLocalOpportunityDay = world.day;
      }

      if (!female.eligible) {
        finishDrought(state, droughtLengths);
        continue;
      }

      eligibleFemaleDays += 1;
      if (female.radius1MaleCount > 0) {
        localOpportunityDays += 1;
        finishDrought(state, droughtLengths);
      } else {
        noLocalOpportunityDays += 1;
        state.currentDrought += 1;
        if (female.radius3MaleCount > 0) noLocalButRadius3Days += 1;

        if (state.lastLocalOpportunityDay === null) {
          noLocalWithoutPriorOpportunityDays += 1;
        } else {
          const sinceLast = world.day - state.lastLocalOpportunityDay;
          for (const window of windows) {
            if (sinceLast <= window) memoryCoveredDays[window] += 1;
          }
        }
      }

      if (female.radius3MaleCount > 0) radius3OpportunityDays += 1;
    }

    // Finalize droughts for females that died during the previous tick and no
    // longer appear in the living frame. We retain their last-opportunity data
    // only long enough to record the completed drought length.
    for (const [femaleId, state] of states) {
      if (!livingFemaleIds.has(femaleId) && state.currentDrought > 0) {
        finishDrought(state, droughtLengths);
      }
    }

    tickWorld(world, 1);
  }

  for (const state of states.values()) finishDrought(state, droughtLengths);

  const noLocalWithPrior = noLocalOpportunityDays - noLocalWithoutPriorOpportunityDays;
  return {
    startDay,
    endDay: world.day,
    days,
    startPopulation,
    endPopulation: livingPopulation(world),
    birthsAdded: world.counters.births - startBirths,
    deathsAdded: world.counters.deaths - startDeaths,
    femalesObserved: states.size,
    eligibleFemaleDays,
    localOpportunityDays,
    localOpportunityShare: ratio(localOpportunityDays, eligibleFemaleDays),
    radius3OpportunityDays,
    radius3OpportunityShare: ratio(radius3OpportunityDays, eligibleFemaleDays),
    noLocalOpportunityDays,
    noLocalOpportunityShare: ratio(noLocalOpportunityDays, eligibleFemaleDays),
    noLocalButRadius3Days,
    noLocalButRadius3Share: ratio(noLocalButRadius3Days, noLocalOpportunityDays),
    noLocalWithoutPriorOpportunityDays,
    noLocalWithoutPriorOpportunityShare: ratio(noLocalWithoutPriorOpportunityDays, noLocalOpportunityDays),
    memoryCoverage: Object.fromEntries(windows.map((window) => [
      window,
      {
        coveredDays: memoryCoveredDays[window],
        shareOfAllNoLocalDays: ratio(memoryCoveredDays[window], noLocalOpportunityDays),
        shareOfNoLocalDaysWithPriorOpportunity: ratio(memoryCoveredDays[window], noLocalWithPrior)
      }
    ])),
    droughts: distribution(droughtLengths)
  };
}

function countMales(world, counts, x, y, radius) {
  let total = 0;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      total += counts[ny * world.width + nx];
    }
  }
  return total;
}

function finishDrought(state, lengths) {
  if (state.currentDrought > 0) lengths.push(state.currentDrought);
  state.currentDrought = 0;
}

function livingPopulation(world) {
  return world.entities.filter((entity) => entity.kind === 'human' && entity.alive).length;
}

function distribution(values) {
  if (values.length === 0) {
    return { count: 0, min: 0, median: 0, mean: 0, p90: 0, p95: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    min: sorted[0],
    median: percentile(sorted, 0.5),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1)
  };
}

function percentile(sorted, fraction) {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
