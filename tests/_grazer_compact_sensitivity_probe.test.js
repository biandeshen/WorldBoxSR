import test from 'node:test';
import assert from 'node:assert/strict';
import { keyedIndex } from '../engine/core/keyed_random.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, passableNeighbors8, tickWorld, tileAt } from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';

const SIZE = 16;
const SEEDS = Array.from({ length: 30 }, (_, index) => index + 1);
const COUNTS = [2, 4, 6, 8, 10];
const YEARS = 120;
const FINAL_WINDOW_YEARS = 20;
const INIT_AGE_SALT = 0x1b56c4e9;
const TARGET_SEEDS = new Set([2, 6, 7, 10, 24]);
const DESCRIPTOR_KEYS = [
  'landComponentCount',
  'largestLandComponentShare',
  'founderCoveredLandShare',
  'founderDistinctCells',
  'founderPairEdges',
  'founderGraphComponents',
  'founderLargestGraphComponent',
  'isolatedFounders',
  'meanNearestFounderDistance',
  'founderBoundingBoxArea',
  'meanFounderLocalVegetationUtilization'
];


test('temporary compact founder-count/spatial sensitivity response surface', () => {
  const rows = [];

  for (const count of COUNTS) {
    for (const seed of SEEDS) {
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
      seedNaturalFounders(world, count);
      const descriptors = initialDescriptors(world, count);
      const rngBefore = world.rng.snapshot();
      const totalDays = YEARS * world.config.daysPerYear;
      const finalWindowStart = (YEARS - FINAL_WINDOW_YEARS) * world.config.daysPerYear;
      let birthsAtFinalWindowStart = null;
      let replacementParentBirths = 0;
      let maxLiving = world.creatures.length;
      let minLivingAfterYear20 = Infinity;
      let minVegetationUtilization = summarizeWorld(world).vegetationUtilization;
      let everExtinct = false;

      for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
        const eventIdBefore = world.nextEventId;
        tickWorld(world, 1);
        maxLiving = Math.max(maxLiving, world.creatures.length);
        if (world.day >= 20 * world.config.daysPerYear) {
          minLivingAfterYear20 = Math.min(minLivingAfterYear20, world.creatures.length);
        }
        if (world.creatures.length === 0) everExtinct = true;
        if (world.day === finalWindowStart) birthsAtFinalWindowStart = world.counters.creatureBirths;
        replacementParentBirths += countReplacementBirths(world, eventIdBefore, count);
        if (world.day % 30 === 0) {
          minVegetationUtilization = Math.min(
            minVegetationUtilization,
            summarizeWorld(world).vegetationUtilization
          );
        }
      }

      assert.notEqual(birthsAtFinalWindowStart, null);
      assert.deepEqual(world.rng.snapshot(), rngBefore, `count ${count} seed ${seed} consumed sequential RNG`);
      const summary = summarizeWorld(world);
      const birthsFinal20Years = summary.creatureBirths - birthsAtFinalWindowStart;
      const passesGate = (
        !everExtinct
        && summary.grazers >= 10
        && birthsFinal20Years >= 5
        && replacementParentBirths > 0
        && maxLiving < descriptors.passableLandCells
      );

      rows.push({
        seed,
        founders: count,
        ...descriptors,
        finalPopulation: summary.grazers,
        minLivingAfterYear20: Number.isFinite(minLivingAfterYear20) ? minLivingAfterYear20 : null,
        maxLiving,
        totalBirths: summary.creatureBirths,
        birthsFinal20Years,
        replacementParentBirths,
        creatureDeaths: summary.creatureDeaths,
        finalVegetationUtilization: round(summary.vegetationUtilization),
        minVegetationUtilization: round(minVegetationUtilization),
        everExtinct,
        passesGate
      });
    }
  }

  const countSummaries = COUNTS.map((count) => summarizeCount(rows.filter((row) => row.founders === count), count));
  const universalCounts = countSummaries.filter((entry) => entry.passCount === SEEDS.length).map((entry) => entry.founders);
  const perSeed = SEEDS.map((seed) => {
    const seedRows = COUNTS.map((count) => rows.find((row) => row.seed === seed && row.founders === count));
    const passes = seedRows.map((row) => row.passesGate);
    return {
      seed,
      passingCounts: seedRows.filter((row) => row.passesGate).map((row) => row.founders),
      passPattern: passes.map((value) => value ? '1' : '0').join(''),
      transitionCount: adjacentTransitions(passes),
      finals: seedRows.map((row) => [row.founders, row.finalPopulation]),
      finalWindowBirths: seedRows.map((row) => [row.founders, row.birthsFinal20Years])
    };
  });
  const transitionSeeds = perSeed.filter((entry) => entry.transitionCount > 0);
  const targetRows = rows.filter((row) => TARGET_SEEDS.has(row.seed));
  const descriptorContrasts = COUNTS.map((count) => descriptorContrast(rows.filter((row) => row.founders === count), count));

  assert.equal(rows.length, SEEDS.length * COUNTS.length);
  console.log(`GRAZER_COMPACT_SENSITIVITY_STAGE1 ${JSON.stringify({
    universalCounts,
    countSummaries,
    perSeed,
    transitionSeeds,
    targetRows,
    descriptorContrasts,
    rows
  })}`);
});

function seedNaturalFounders(world, count) {
  const spawnTiles = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, 32);
  assert.ok(spawnTiles.length > 0);
  const maxAgeDays = 6 * world.config.daysPerYear;

  for (let index = 0; index < count; index += 1) {
    const futureCreatureId = world.nextCreatureId;
    const ageDays = keyedIndex(world.seed, futureCreatureId, 0, INIT_AGE_SALT, maxAgeDays + 1);
    const tile = spawnTiles[index % spawnTiles.length];
    createGrazer(world, { x: tile.x, y: tile.y, ageDays, bornDay: -ageDays });
  }
}

function initialDescriptors(world, founderCount) {
  const land = connectedLandComponents(world);
  const founders = world.creatures.slice(0, founderCount);
  const founderComponentIds = new Set(founders.map((grazer) => land.componentByTile[grazer.y * world.width + grazer.x]));
  const coveredLand = [...founderComponentIds]
    .filter((id) => id !== null && id !== undefined)
    .reduce((sum, id) => sum + land.componentSizes[id], 0);
  const graph = founderGraph(founders);
  const xs = founders.map((grazer) => grazer.x);
  const ys = founders.map((grazer) => grazer.y);
  const bboxArea = founders.length === 0
    ? 0
    : (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  const meanLocalVegetation = mean(founders.map((grazer) => localVegetationUtilization(world, grazer.x, grazer.y)));

  return {
    passableLandCells: land.passableLandCells,
    landComponentCount: land.componentSizes.length,
    largestLandComponentSize: Math.max(...land.componentSizes),
    largestLandComponentShare: round(Math.max(...land.componentSizes) / land.passableLandCells),
    founderCoveredLandCells: coveredLand,
    founderCoveredLandShare: round(coveredLand / land.passableLandCells),
    founderDistinctCells: new Set(founders.map((grazer) => `${grazer.x},${grazer.y}`)).size,
    founderPairEdges: graph.edgeCount,
    founderGraphComponents: graph.componentSizes.length,
    founderLargestGraphComponent: Math.max(...graph.componentSizes),
    isolatedFounders: graph.isolatedCount,
    meanNearestFounderDistance: round(meanNearestDistance(founders)),
    founderBoundingBoxArea: bboxArea,
    meanFounderLocalVegetationUtilization: round(meanLocalVegetation)
  };
}

function connectedLandComponents(world) {
  const componentByTile = Array(world.tiles.length).fill(null);
  const componentSizes = [];
  let passableLandCells = 0;

  for (let index = 0; index < world.tiles.length; index += 1) {
    if (!world.tiles[index].passable) continue;
    passableLandCells += 1;
    if (componentByTile[index] !== null) continue;

    const componentId = componentSizes.length;
    let size = 0;
    const queue = [index];
    componentByTile[index] = componentId;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      size += 1;
      const tile = world.tiles[current];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const x = tile.x + dx;
          const y = tile.y + dy;
          if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
          const neighborIndex = y * world.width + x;
          if (!world.tiles[neighborIndex].passable || componentByTile[neighborIndex] !== null) continue;
          componentByTile[neighborIndex] = componentId;
          queue.push(neighborIndex);
        }
      }
    }
    componentSizes.push(size);
  }

  assert.ok(passableLandCells > 0);
  return { componentByTile, componentSizes, passableLandCells };
}

function founderGraph(founders) {
  const adjacency = founders.map(() => []);
  let edgeCount = 0;
  for (let i = 0; i < founders.length; i += 1) {
    for (let j = i + 1; j < founders.length; j += 1) {
      if (chebyshev(founders[i], founders[j]) > 3) continue;
      adjacency[i].push(j);
      adjacency[j].push(i);
      edgeCount += 1;
    }
  }

  const seen = new Set();
  const componentSizes = [];
  for (let i = 0; i < founders.length; i += 1) {
    if (seen.has(i)) continue;
    const stack = [i];
    seen.add(i);
    let size = 0;
    while (stack.length > 0) {
      const node = stack.pop();
      size += 1;
      for (const neighbor of adjacency[node]) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
    componentSizes.push(size);
  }

  return {
    edgeCount,
    componentSizes,
    isolatedCount: adjacency.filter((neighbors) => neighbors.length === 0).length
  };
}

function meanNearestDistance(founders) {
  if (founders.length < 2) return 0;
  return mean(founders.map((founder, index) => {
    let nearest = Infinity;
    for (let other = 0; other < founders.length; other += 1) {
      if (other === index) continue;
      nearest = Math.min(nearest, chebyshev(founder, founders[other]));
    }
    return nearest;
  }));
}

function localVegetationUtilization(world, x, y) {
  const cells = [tileAt(world, x, y), ...passableNeighbors8(world, x, y)].filter((tile) => tile.passable);
  const vegetation = cells.reduce((sum, tile) => sum + tile.vegetation, 0);
  const capacity = cells.reduce((sum, tile) => sum + tile.vegetationCapacity, 0);
  return capacity > 0 ? vegetation / capacity : 0;
}

function countReplacementBirths(world, eventIdBefore, founderCount) {
  let count = 0;
  for (let index = world.history.length - 1; index >= 0; index -= 1) {
    const event = world.history[index];
    if (event.id < eventIdBefore) break;
    if (event.type === 'creature.born' && event.parentCreatureIds?.some((id) => id > founderCount)) count += 1;
  }
  return count;
}

function summarizeCount(rows, founders) {
  return {
    founders,
    passCount: rows.filter((row) => row.passesGate).length,
    extinctionCount: rows.filter((row) => row.everExtinct).length,
    passingSeeds: rows.filter((row) => row.passesGate).map((row) => row.seed),
    failingSeeds: rows.filter((row) => !row.passesGate).map((row) => row.seed),
    minFinalPopulation: Math.min(...rows.map((row) => row.finalPopulation)),
    medianFinalPopulation: median(rows.map((row) => row.finalPopulation)),
    minFinalWindowBirths: Math.min(...rows.map((row) => row.birthsFinal20Years)),
    medianFinalWindowBirths: median(rows.map((row) => row.birthsFinal20Years))
  };
}

function descriptorContrast(rows, founders) {
  const passed = rows.filter((row) => row.passesGate);
  const failed = rows.filter((row) => !row.passesGate);
  const result = { founders, passCount: passed.length, failCount: failed.length, descriptors: {} };
  for (const key of DESCRIPTOR_KEYS) {
    result.descriptors[key] = {
      passMedian: passed.length > 0 ? round(median(passed.map((row) => row[key]))) : null,
      failMedian: failed.length > 0 ? round(median(failed.map((row) => row[key]))) : null
    };
  }
  return result;
}

function adjacentTransitions(values) {
  let count = 0;
  for (let i = 1; i < values.length; i += 1) if (values[i] !== values[i - 1]) count += 1;
  return count;
}

function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function mean(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values) {
  assert.ok(values.length > 0);
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
