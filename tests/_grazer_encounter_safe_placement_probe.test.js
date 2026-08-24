import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const YEARS = 300;
const SEEDS = Array.from({ length: 60 }, (_, index) => index + 1);
const COUNTS = [2, 4];
const ARMS = ['baseline', 'encounter-safe'];
const INIT_AGE_SALT = 0x1b56c4e9;
const PARTNER_RADIUS = 3;
const SAMPLE_INTERVAL_DAYS = 30;

test('temporary paired encounter-safe compact founder placement A/B', () => {
  const rows = [];
  for (const seed of SEEDS) {
    for (const founders of COUNTS) {
      for (const arm of ARMS) rows.push(runArm(seed, founders, arm));
    }
  }

  const summaries = COUNTS.map((founders) => summarizePairs(rows, founders));
  const harmedCases = [];
  const rescuedCases = [];
  for (const founders of COUNTS) {
    for (const seed of SEEDS) {
      const baseline = rowFor(rows, seed, founders, 'baseline');
      const intervention = rowFor(rows, seed, founders, 'encounter-safe');
      if (baseline.extinctionYear !== null && intervention.extinctionYear === null) {
        rescuedCases.push(pairCase(baseline, intervention));
      }
      if (baseline.extinctionYear === null && intervention.extinctionYear !== null) {
        harmedCases.push(pairCase(baseline, intervention));
      }
    }
  }

  const result = {
    worlds: rows.length,
    summaries,
    decisionPrecheck: {
      count2: summaries.find((s) => s.founders === 2),
      count4: summaries.find((s) => s.founders === 4)
    },
    rescuedCases,
    harmedCases,
    zeroBirthExtinctionCases: rows
      .filter((row) => row.extinctionYear !== null && row.totalBirths === 0)
      .map(compactRow)
  };

  assert.equal(rows.length, SEEDS.length * COUNTS.length * ARMS.length);
  console.log(`GRAZER_ENCOUNTER_SAFE_PLACEMENT_AB ${JSON.stringify(result)}`);
});

function runArm(seed, founders, arm) {
  const world = createWorld({
    seed,
    width: SIZE,
    height: SIZE,
    population: 0,
    config: {
      grazerBirthChancePerEligiblePairPerDay: 0.001,
      grazerOldAgeMortalityEnabled: true
    }
  });
  const selected = seedFounders(world, founders, arm);
  const rngBefore = world.rng.snapshot();
  const totalDays = YEARS * world.config.daysPerYear;
  let firstBirthDay = null;
  let replacementParentBirths = 0;
  let starvationDeaths = 0;
  let oldAgeDeaths = 0;
  let extinctionDay = null;
  let maxLiving = world.creatures.length;
  let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
  let birthsAtYear20 = null;

  for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
    const birthsBefore = world.counters.creatureBirths;
    const deathsBefore = world.counters.creatureDeaths;
    const eventIdBefore = world.nextEventId;
    tickWorld(world, 1);

    const newBirths = world.counters.creatureBirths - birthsBefore;
    const newDeaths = world.counters.creatureDeaths - deathsBefore;
    if (newBirths > 0 && firstBirthDay === null) firstBirthDay = world.day;

    if (newBirths > 0 || newDeaths > 0) {
      for (const event of newEventsSince(world, eventIdBefore)) {
        if (event.type === 'creature.born' && event.parentCreatureIds?.some((id) => id > founders)) {
          replacementParentBirths += 1;
        }
        if (event.type === 'creature.died') {
          if (event.cause === 'starvation') starvationDeaths += 1;
          if (event.cause === 'old_age') oldAgeDeaths += 1;
        }
      }
    }

    maxLiving = Math.max(maxLiving, world.creatures.length);
    if (world.day === 20 * world.config.daysPerYear) birthsAtYear20 = world.counters.creatureBirths;
    if (world.day % SAMPLE_INTERVAL_DAYS === 0) {
      minVegetationUtilization = Math.min(minVegetationUtilization, summarizeWorld(world).vegetationUtilization);
    }
    if (world.creatures.length === 0) {
      extinctionDay = world.day;
      break;
    }
  }

  assert.notEqual(birthsAtYear20, null, `seed ${seed} founders ${founders} ${arm} extinct before year20 measurement`);
  assert.deepEqual(world.rng.snapshot(), rngBefore, `seed ${seed} founders ${founders} ${arm} consumed sequential RNG`);

  const initialGraph = founderGraph(selected);
  return {
    seed,
    founders,
    arm,
    initialPairEdges: initialGraph.edges,
    initialGraphComponents: initialGraph.components,
    initialIsolates: initialGraph.isolates,
    initialMeanLocalVegetationUtilization: round(mean(selected.map((cell) => localVegetationUtilization(world, cell.x, cell.y)))),
    firstBirthYear: firstBirthDay === null ? null : round(firstBirthDay / world.config.daysPerYear),
    birthsByYear20: birthsAtYear20,
    totalBirths: world.counters.creatureBirths,
    replacementParentBirths,
    extinctionYear: extinctionDay === null ? null : round(extinctionDay / world.config.daysPerYear),
    finalPopulation: world.creatures.length,
    starvationDeaths,
    oldAgeDeaths,
    minVegetationUtilization: round(minVegetationUtilization),
    maxLiving
  };
}

function summarizePairs(rows, founders) {
  let rescued = 0;
  let harmed = 0;
  let bothExtinct = 0;
  let bothAlive = 0;
  let baselineZeroBirthExtinctions = 0;
  let interventionZeroBirthExtinctions = 0;
  let baselineInitialZeroPair = 0;
  let interventionInitialZeroPair = 0;
  const firstBirthDeltas = [];
  const baselineMinVegetation = [];
  const interventionMinVegetation = [];
  const baselineStarvation = [];
  const interventionStarvation = [];

  for (const seed of SEEDS) {
    const baseline = rowFor(rows, seed, founders, 'baseline');
    const intervention = rowFor(rows, seed, founders, 'encounter-safe');
    const baselineExtinct = baseline.extinctionYear !== null;
    const interventionExtinct = intervention.extinctionYear !== null;

    if (baselineExtinct && !interventionExtinct) rescued += 1;
    else if (!baselineExtinct && interventionExtinct) harmed += 1;
    else if (baselineExtinct && interventionExtinct) bothExtinct += 1;
    else bothAlive += 1;

    if (baselineExtinct && baseline.totalBirths === 0) baselineZeroBirthExtinctions += 1;
    if (interventionExtinct && intervention.totalBirths === 0) interventionZeroBirthExtinctions += 1;
    if (baseline.initialPairEdges === 0) baselineInitialZeroPair += 1;
    if (intervention.initialPairEdges === 0) interventionInitialZeroPair += 1;
    if (baseline.firstBirthYear !== null && intervention.firstBirthYear !== null) {
      firstBirthDeltas.push(intervention.firstBirthYear - baseline.firstBirthYear);
    }
    baselineMinVegetation.push(baseline.minVegetationUtilization);
    interventionMinVegetation.push(intervention.minVegetationUtilization);
    baselineStarvation.push(baseline.starvationDeaths);
    interventionStarvation.push(intervention.starvationDeaths);
  }

  return {
    founders,
    rescued,
    harmed,
    bothExtinct,
    bothAlive,
    baselineExtinctions: rescued + bothExtinct,
    interventionExtinctions: harmed + bothExtinct,
    baselineZeroBirthExtinctions,
    interventionZeroBirthExtinctions,
    baselineInitialZeroPair,
    interventionInitialZeroPair,
    medianFirstBirthDeltaYears: firstBirthDeltas.length ? round(median(firstBirthDeltas)) : null,
    medianMinVegetationBaseline: round(median(baselineMinVegetation)),
    medianMinVegetationIntervention: round(median(interventionMinVegetation)),
    medianStarvationDeathsBaseline: round(median(baselineStarvation)),
    medianStarvationDeathsIntervention: round(median(interventionStarvation))
  };
}

function seedFounders(world, count, arm) {
  const candidates = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(candidates.length >= count);
  const selected = arm === 'baseline'
    ? candidates.slice(0, count)
    : selectEncounterSafe(candidates, count);
  const maxAgeDays = 6 * world.config.daysPerYear;

  for (const tile of selected) {
    const futureCreatureId = world.nextCreatureId;
    const ageDays = keyedIndex(world.seed, futureCreatureId, 0, INIT_AGE_SALT, maxAgeDays + 1);
    createGrazer(world, { x: tile.x, y: tile.y, ageDays, bornDay: -ageDays });
  }
  return selected.map((tile) => ({ x: tile.x, y: tile.y }));
}

function selectEncounterSafe(candidates, count) {
  if (count === 1) return [candidates[0]];
  let pair = null;
  for (let i = 0; i < candidates.length && pair === null; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      if (chebyshev(candidates[i], candidates[j]) <= PARTNER_RADIUS) {
        pair = [candidates[i], candidates[j]];
        break;
      }
    }
  }
  const selected = pair ?? [candidates[0], candidates[1]];
  const selectedSet = new Set(selected);

  while (selected.length < count) {
    let next = candidates.find((candidate) => (
      !selectedSet.has(candidate)
      && selected.some((cell) => chebyshev(cell, candidate) <= PARTNER_RADIUS)
    ));
    if (!next) next = candidates.find((candidate) => !selectedSet.has(candidate));
    assert.ok(next);
    selected.push(next);
    selectedSet.add(next);
  }
  return selected;
}

function founderGraph(cells) {
  const adjacency = cells.map(() => []);
  let edges = 0;
  for (let i = 0; i < cells.length; i += 1) {
    for (let j = i + 1; j < cells.length; j += 1) {
      if (chebyshev(cells[i], cells[j]) <= PARTNER_RADIUS) {
        adjacency[i].push(j);
        adjacency[j].push(i);
        edges += 1;
      }
    }
  }
  const visited = new Set();
  let components = 0;
  for (let start = 0; start < cells.length; start += 1) {
    if (visited.has(start)) continue;
    components += 1;
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const current = stack.pop();
      for (const neighbor of adjacency[current]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
  }
  return { edges, components, isolates: adjacency.filter((neighbors) => neighbors.length === 0).length };
}

function pairCase(baseline, intervention) {
  return { baseline: compactRow(baseline), intervention: compactRow(intervention) };
}

function compactRow(row) {
  return {
    seed: row.seed,
    founders: row.founders,
    arm: row.arm,
    initialPairEdges: row.initialPairEdges,
    initialGraphComponents: row.initialGraphComponents,
    initialIsolates: row.initialIsolates,
    firstBirthYear: row.firstBirthYear,
    birthsByYear20: row.birthsByYear20,
    totalBirths: row.totalBirths,
    extinctionYear: row.extinctionYear,
    finalPopulation: row.finalPopulation,
    starvationDeaths: row.starvationDeaths,
    oldAgeDeaths: row.oldAgeDeaths,
    minVegetationUtilization: row.minVegetationUtilization,
    maxLiving: row.maxLiving
  };
}

function rowFor(rows, seed, founders, arm) {
  return rows.find((row) => row.seed === seed && row.founders === founders && row.arm === arm);
}

function newEventsSince(world, eventIdBefore) {
  const events = [];
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    events.push(event);
  }
  return events;
}

function localVegetationUtilization(world, x, y) {
  const cells = [tileAt(world, x, y), ...passableNeighbors8(world, x, y)].filter((tile) => tile.passable);
  const vegetation = cells.reduce((sum, tile) => sum + tile.vegetation, 0);
  const capacity = cells.reduce((sum, tile) => sum + tile.vegetationCapacity, 0);
  return capacity > 0 ? vegetation / capacity : 0;
}

function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function median(values) {
  assert.ok(values.length > 0);
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
