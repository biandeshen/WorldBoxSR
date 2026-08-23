#!/usr/bin/env node
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

export function runBatch({
  startSeed = 1,
  seeds = 20,
  years = 100,
  width = 24,
  height = 24,
  population = 30,
  config = {}
} = {}) {
  const runs = [];
  for (let offset = 0; offset < seeds; offset += 1) {
    const seed = startSeed + offset;
    const world = createWorld({ seed, width, height, population, config });
    tickWorld(world, years * world.config.daysPerYear);
    runs.push(summarizeWorld(world));
  }
  return { parameters: { startSeed, seeds, years, width, height, population }, aggregate: aggregateRuns(runs), runs };
}

export function aggregateRuns(runs) {
  if (runs.length === 0) {
    return { runCount: 0, extinctionRate: 0, population: stats([]), births: stats([]), deaths: stats([]), foodUtilization: stats([]) };
  }
  return {
    runCount: runs.length,
    extinctionRate: runs.filter((run) => run.population === 0).length / runs.length,
    population: stats(runs.map((run) => run.population)),
    births: stats(runs.map((run) => run.births)),
    deaths: stats(runs.map((run) => run.deaths)),
    foodUtilization: stats(runs.map((run) => run.foodUtilization))
  };
}

function stats(values) {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median
  };
}

function parseCli(argv) {
  const out = { startSeed: 1, seeds: 20, years: 100, width: 24, height: 24, population: 30, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--seeds') out.seeds = int(argv[++i], 'seeds');
    else if (arg === '--start-seed') out.startSeed = int(argv[++i], 'start-seed');
    else if (arg === '--years') out.years = int(argv[++i], 'years');
    else if (arg === '--population') out.population = int(argv[++i], 'population');
    else if (arg === '--width') out.width = int(argv[++i], 'width');
    else if (arg === '--height') out.height = int(argv[++i], 'height');
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function int(token, name) {
  const value = Number(token);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}

function printHuman(result) {
  const a = result.aggregate;
  console.log(`worldboxSR Simulation Lab | ${a.runCount} seeds x ${result.parameters.years} years`);
  console.log(`extinction: ${(a.extinctionRate * 100).toFixed(1)}%`);
  console.log(`population: min=${a.population.min} median=${a.population.median.toFixed(1)} mean=${a.population.mean.toFixed(1)} max=${a.population.max}`);
  console.log(`births:     min=${a.births.min} median=${a.births.median.toFixed(1)} mean=${a.births.mean.toFixed(1)} max=${a.births.max}`);
  console.log(`deaths:     min=${a.deaths.min} median=${a.deaths.median.toFixed(1)} mean=${a.deaths.mean.toFixed(1)} max=${a.deaths.max}`);
  console.log(`food left:  median=${(a.foodUtilization.median * 100).toFixed(1)}%`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const cli = parseCli(process.argv.slice(2));
  const result = runBatch(cli);
  if (cli.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
}
