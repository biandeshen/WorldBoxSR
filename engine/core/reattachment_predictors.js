import { deriveSettlementResource } from '../analysis/settlement_resources.js';
import { isEligibleMale } from './reproduction_metrics.js';

const EARLY_WINDOWS = Object.freeze([30, 90]);
const FORMER_HOME_RADII = Object.freeze([4, 6]);

/**
 * Derived-only episode tracker for natural distance-driven settlement leaves.
 *
 * The tracker stores fixed-size early-window accumulators plus one compact row
 * per resolved episode. It never mutates authoritative world state or consumes
 * RNG. Rows can be used to compare fast reattachment against long-tail failure
 * without retaining per-day trajectories.
 */
export function createReattachmentPredictorTracker() {
  const humanStates = new Map();
  const resolvedRows = [];
  let observations = 0;
  let prunedHumanStates = 0;

  function observe(world) {
    observations += 1;
    const settlementById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
    const maleCounts = buildEligibleMaleGrid(world);
    const livingIds = new Set();

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;
      livingIds.add(human.id);

      const currentSettlementId = activeSettlementId(settlementById, human.settlementId);
      let state = humanStates.get(human.id);
      if (!state) {
        state = {
          adultTrackingStarted: isAdult(world, human),
          lastSettlementId: currentSettlementId,
          activeEpisode: null
        };
        humanStates.set(human.id, state);
      }

      if (!state.adultTrackingStarted && isAdult(world, human)) {
        state.adultTrackingStarted = true;
        state.lastSettlementId = currentSettlementId;
      }

      if (state.adultTrackingStarted) {
        processTransition(world, human, state, state.lastSettlementId, currentSettlementId, settlementById);
        recordEarlyFeatures(world, human, state.activeEpisode, currentSettlementId, settlementById, maleCounts);
      }

      state.lastSettlementId = currentSettlementId;
    }

    for (const [humanId, state] of humanStates) {
      if (livingIds.has(humanId)) continue;
      if (state.activeEpisode) {
        resolvedRows.push(finalizeEpisode(state.activeEpisode, 'human_lost', world.day));
      }
      humanStates.delete(humanId);
      prunedHumanStates += 1;
    }
  }

  function processTransition(world, human, state, previousSettlementId, currentSettlementId, settlementById) {
    if (previousSettlementId !== null && currentSettlementId === null) {
      const previous = settlementById.get(previousSettlementId);
      if (previous?.active) {
        state.activeEpisode = startEpisode(world, human, previous);
      }
      return;
    }

    const episode = state.activeEpisode;
    if (!episode || currentSettlementId === null) return;

    const outcome = currentSettlementId === episode.formerSettlementId
      ? classifySameHomeRejoin(world.day - episode.leaveDay)
      : 'other_join';
    resolvedRows.push(finalizeEpisode(episode, outcome, world.day));
    state.activeEpisode = null;
  }

  function recordEarlyFeatures(world, human, episode, currentSettlementId, settlementById, maleCounts) {
    if (!episode || currentSettlementId !== null) return;

    const former = settlementById.get(episode.formerSettlementId);
    if (!former?.active) {
      resolvedRows.push(finalizeEpisode(episode, 'former_abandoned', world.day));
      const state = humanStates.get(human.id);
      if (state) state.activeEpisode = null;
      return;
    }

    const daySinceLeave = Math.max(0, world.day - episode.leaveDay);
    if (daySinceLeave > 90) return;

    const formerDistance = chebyshevDistance(human.x, human.y, former.x, former.y);
    const nearestOtherDistance = nearestOtherSettlementDistance(world, human.x, human.y, episode.formerSettlementId);
    const currentTile = world.tiles[human.y * world.width + human.x];
    const tileFoodFraction = currentTile?.foodCapacity > 0 ? currentTile.food / currentTile.foodCapacity : 0;
    const nonHungry = human.hunger < world.config.hungryThreshold;
    const radius1Male = hasEligibleMale(world, maleCounts, human.x, human.y, 1);
    const radius3Male = radius1Male || hasEligibleMale(world, maleCounts, human.x, human.y, 3);

    for (const windowDays of EARLY_WINDOWS) {
      if (daySinceLeave > windowDays) continue;
      const window = episode.windows[windowDays];
      window.days += 1;
      window.distanceSum += formerDistance;
      window.distanceMin = Math.min(window.distanceMin, formerDistance);
      window.distanceMax = Math.max(window.distanceMax, formerDistance);
      if (formerDistance <= 4) window.within4Days += 1;
      if (formerDistance <= 6) window.within6Days += 1;
      if (nonHungry) window.nonHungryDays += 1;
      if (radius1Male) window.radius1MaleOpportunityDays += 1;
      if (radius3Male) window.radius3MaleOpportunityDays += 1;
      if (Number.isFinite(nearestOtherDistance)) {
        window.nearestOtherSettlementDistanceSum += nearestOtherDistance;
        window.nearestOtherSettlementDistanceDays += 1;
        if (nearestOtherDistance < formerDistance) window.otherSettlementCloserDays += 1;
      }
      window.tileFoodFractionSum += tileFoodFraction;
    }
  }

  function summarize(world) {
    const activeRows = [];
    for (const state of humanStates.values()) {
      if (!state.activeEpisode) continue;
      activeRows.push(finalizeEpisode(state.activeEpisode, 'censored', world.day));
    }
    const rows = [...resolvedRows, ...activeRows];
    return {
      observations,
      rows,
      all: summarizeRows(rows),
      reproductiveFemales: summarizeRows(rows.filter((row) => row.reproductiveFemaleAtLeave)),
      storage: {
        currentHumanStates: humanStates.size,
        activeEpisodes: activeRows.length,
        resolvedEpisodes: resolvedRows.length,
        prunedHumanStates
      }
    };
  }

  return { observe, summarize };
}

function startEpisode(world, human, formerSettlement) {
  const resource = deriveSettlementResource(world, formerSettlement.id);
  const ageYears = human.ageDays / world.config.daysPerYear;
  const reproductiveFemaleAtLeave = human.sex === 'F' &&
    ageYears >= world.config.adultAgeYears &&
    ageYears <= world.config.femaleFertilityEndYears;

  return {
    humanId: human.id,
    formerSettlementId: formerSettlement.id,
    leaveDay: world.day,
    leaveDistance: chebyshevDistance(human.x, human.y, formerSettlement.x, formerSettlement.y),
    ageYearsAtLeave: ageYears,
    reproductiveFemaleAtLeave,
    remainingFemaleReproductiveYears: reproductiveFemaleAtLeave
      ? Math.max(0, world.config.femaleFertilityEndYears - ageYears)
      : null,
    formerSettlementPopulation: formerSettlement.population,
    formerSettlementOwnedCells: resource?.ownedCells ?? 0,
    formerSettlementFoodRemainingFraction: resource?.foodRemainingFraction ?? 0,
    formerSettlementFoodCapacityPerMember: resource?.foodCapacityPerMember ?? null,
    formerSettlementFoodPerMember: resource?.foodPerMember ?? null,
    formerSettlementLocalPassableShare: localPassableShare(world, formerSettlement.x, formerSettlement.y, 3),
    windows: Object.fromEntries(EARLY_WINDOWS.map((days) => [days, createWindow()]))
  };
}

function createWindow() {
  return {
    days: 0,
    distanceSum: 0,
    distanceMin: Infinity,
    distanceMax: 0,
    within4Days: 0,
    within6Days: 0,
    nonHungryDays: 0,
    radius1MaleOpportunityDays: 0,
    radius3MaleOpportunityDays: 0,
    nearestOtherSettlementDistanceSum: 0,
    nearestOtherSettlementDistanceDays: 0,
    otherSettlementCloserDays: 0,
    tileFoodFractionSum: 0
  };
}

function finalizeEpisode(episode, outcome, endDay) {
  const durationDays = Math.max(0, endDay - episode.leaveDay);
  return {
    humanId: episode.humanId,
    formerSettlementId: episode.formerSettlementId,
    leaveDay: episode.leaveDay,
    endDay,
    durationDays,
    outcome,
    ...pickLeaveFeatures(episode),
    first30: summarizeWindow(episode.windows[30]),
    first90: summarizeWindow(episode.windows[90])
  };
}

function pickLeaveFeatures(episode) {
  return {
    leaveDistance: episode.leaveDistance,
    ageYearsAtLeave: episode.ageYearsAtLeave,
    reproductiveFemaleAtLeave: episode.reproductiveFemaleAtLeave,
    remainingFemaleReproductiveYears: episode.remainingFemaleReproductiveYears,
    formerSettlementPopulation: episode.formerSettlementPopulation,
    formerSettlementOwnedCells: episode.formerSettlementOwnedCells,
    formerSettlementFoodRemainingFraction: episode.formerSettlementFoodRemainingFraction,
    formerSettlementFoodCapacityPerMember: episode.formerSettlementFoodCapacityPerMember,
    formerSettlementFoodPerMember: episode.formerSettlementFoodPerMember,
    formerSettlementLocalPassableShare: episode.formerSettlementLocalPassableShare
  };
}

function summarizeWindow(window) {
  return {
    days: window.days,
    meanFormerHomeDistance: ratio(window.distanceSum, window.days),
    minFormerHomeDistance: window.days ? window.distanceMin : 0,
    maxFormerHomeDistance: window.distanceMax,
    within4Share: ratio(window.within4Days, window.days),
    within6Share: ratio(window.within6Days, window.days),
    nonHungryShare: ratio(window.nonHungryDays, window.days),
    radius1MaleOpportunityShare: ratio(window.radius1MaleOpportunityDays, window.days),
    radius3MaleOpportunityShare: ratio(window.radius3MaleOpportunityDays, window.days),
    meanNearestOtherSettlementDistance: ratio(
      window.nearestOtherSettlementDistanceSum,
      window.nearestOtherSettlementDistanceDays
    ),
    otherSettlementCloserShare: ratio(window.otherSettlementCloserDays, window.days),
    meanTileFoodFraction: ratio(window.tileFoodFractionSum, window.days)
  };
}

export function summarizeRows(rows) {
  const byOutcome = {};
  for (const row of rows) {
    if (!byOutcome[row.outcome]) byOutcome[row.outcome] = [];
    byOutcome[row.outcome].push(row);
  }

  return {
    episodes: rows.length,
    outcomes: Object.fromEntries(
      Object.entries(byOutcome).map(([outcome, outcomeRows]) => [outcome, outcomeRows.length])
    ),
    fastVsLong: {
      fastSameHome: summarizeFeatureGroup(byOutcome.fast_same_rejoin ?? []),
      longSameHome: summarizeFeatureGroup(byOutcome.long_same_rejoin ?? []),
      unresolved180Plus: summarizeFeatureGroup(
        (byOutcome.censored ?? []).filter((row) => row.durationDays > 180)
      )
    }
  };
}

function summarizeFeatureGroup(rows) {
  return {
    episodes: rows.length,
    durationDays: stats(rows.map((row) => row.durationDays)),
    ageYearsAtLeave: stats(rows.map((row) => row.ageYearsAtLeave)),
    remainingFemaleReproductiveYears: stats(rows.map((row) => row.remainingFemaleReproductiveYears).filter(Number.isFinite)),
    formerSettlementPopulation: stats(rows.map((row) => row.formerSettlementPopulation)),
    formerSettlementFoodRemainingFraction: stats(rows.map((row) => row.formerSettlementFoodRemainingFraction)),
    formerSettlementFoodCapacityPerMember: stats(rows.map((row) => row.formerSettlementFoodCapacityPerMember).filter(Number.isFinite)),
    formerSettlementLocalPassableShare: stats(rows.map((row) => row.formerSettlementLocalPassableShare)),
    first30MeanFormerHomeDistance: stats(rows.map((row) => row.first30.meanFormerHomeDistance)),
    first30Within4Share: stats(rows.map((row) => row.first30.within4Share)),
    first30Within6Share: stats(rows.map((row) => row.first30.within6Share)),
    first30Radius1MaleOpportunityShare: stats(rows.map((row) => row.first30.radius1MaleOpportunityShare)),
    first30Radius3MaleOpportunityShare: stats(rows.map((row) => row.first30.radius3MaleOpportunityShare)),
    first30OtherSettlementCloserShare: stats(rows.map((row) => row.first30.otherSettlementCloserShare)),
    first30MeanTileFoodFraction: stats(rows.map((row) => row.first30.meanTileFoodFraction)),
    first90MeanFormerHomeDistance: stats(rows.map((row) => row.first90.meanFormerHomeDistance)),
    first90Within6Share: stats(rows.map((row) => row.first90.within6Share)),
    first90Radius3MaleOpportunityShare: stats(rows.map((row) => row.first90.radius3MaleOpportunityShare)),
    first90OtherSettlementCloserShare: stats(rows.map((row) => row.first90.otherSettlementCloserShare))
  };
}

function buildEligibleMaleGrid(world) {
  const counts = new Uint32Array(world.width * world.height);
  for (const human of world.entities) {
    if (!isEligibleMale(world, human)) continue;
    counts[human.y * world.width + human.x] += 1;
  }
  return counts;
}

function hasEligibleMale(world, maleCounts, x, y, radius) {
  const minX = Math.max(0, x - radius);
  const maxX = Math.min(world.width - 1, x + radius);
  const minY = Math.max(0, y - radius);
  const maxY = Math.min(world.height - 1, y + radius);
  for (let ny = minY; ny <= maxY; ny += 1) {
    const offset = ny * world.width;
    for (let nx = minX; nx <= maxX; nx += 1) {
      if (maleCounts[offset + nx] > 0) return true;
    }
  }
  return false;
}

function nearestOtherSettlementDistance(world, x, y, formerSettlementId) {
  let best = Infinity;
  for (const settlement of world.settlements) {
    if (!settlement.active || settlement.id === formerSettlementId) continue;
    best = Math.min(best, chebyshevDistance(x, y, settlement.x, settlement.y));
  }
  return best;
}

function localPassableShare(world, x, y, radius) {
  let cells = 0;
  let passable = 0;
  const minX = Math.max(0, x - radius);
  const maxX = Math.min(world.width - 1, x + radius);
  const minY = Math.max(0, y - radius);
  const maxY = Math.min(world.height - 1, y + radius);
  for (let ny = minY; ny <= maxY; ny += 1) {
    for (let nx = minX; nx <= maxX; nx += 1) {
      cells += 1;
      if (world.tiles[ny * world.width + nx].passable) passable += 1;
    }
  }
  return ratio(passable, cells);
}

function classifySameHomeRejoin(durationDays) {
  if (durationDays <= 90) return 'fast_same_rejoin';
  if (durationDays <= 180) return 'medium_same_rejoin';
  return 'long_same_rejoin';
}

function activeSettlementId(settlementById, settlementId) {
  if (settlementId === null || settlementId === undefined) return null;
  const settlement = settlementById.get(settlementId);
  return settlement?.active ? settlement.id : null;
}

function isAdult(world, human) {
  return human.ageDays / world.config.daysPerYear >= world.config.adultAgeYears;
}

function chebyshevDistance(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function stats(values) {
  if (values.length === 0) return { count: 0, min: 0, median: 0, mean: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    count: values.length,
    min: sorted[0],
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: sorted.at(-1)
  };
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
