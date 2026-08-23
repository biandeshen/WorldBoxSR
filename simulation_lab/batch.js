#!/usr/bin/env node
import fs from 'node:fs';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { aggregateRuns } from './aggregate.js';
import { runBatchIsolated } from './isolated.js';

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

function parseCli(argv) {
  const out = { startSeed: 1, seeds: 20, years: 100, width: 24, height: 24, population: 30, json: false, workers: null, timeoutMs: 30000, checkpoint: null, resume: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--seeds') out.seeds = int(argv[++i], 'seeds');
    else if (arg === '--start-seed') out.startSeed = int(argv[++i], 'start-seed');
    else if (arg === '--years') out.years = int(argv[++i], 'years');
    else if (arg === '--population') out.population = int(argv[++i], 'population');
    else if (arg === '--width') out.width = int(argv[++i], 'width');
    else if (arg === '--height') out.height = int(argv[++i], 'height');
    else if (arg === '--workers') out.workers = int(argv[++i], 'workers');
    else if (arg === '--timeout-ms') out.timeoutMs = int(argv[++i], 'timeout-ms');
    else if (arg === '--checkpoint') out.checkpoint = argv[++i];
    else if (arg === '--resume') out.resume = true;
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
  console.log(`settlements: historical median=${a.settlements.median.toFixed(1)} active=${a.activeSettlements.median.toFixed(1)} abandoned=${a.abandonedSettlements.median.toFixed(1)}`);
  console.log(`settled pop: median=${a.settledPopulation.median.toFixed(1)} (${(a.settledPopulationShare.median * 100).toFixed(1)}%)`);
  console.log(`territory:   median coverage=${(a.territoryCoverage.median * 100).toFixed(1)}% claimed=${a.claimedTerritoryCells.median.toFixed(1)} cells`);
}

function readCheckpoint(path) {
  if (!fs.existsSync(path)) return [];
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
  const bySeed = new Map();
  for (const line of lines) {
    const result = JSON.parse(line);
    if (Number.isInteger(result?.seed) && typeof result?.ok === 'boolean') bySeed.set(result.seed, result);
  }
  return [...bySeed.values()];
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const cli = parseCli(process.argv.slice(2));
  let isolatedHooks = {};
  if (cli.workers !== null && cli.checkpoint) {
    if (!cli.resume) fs.writeFileSync(cli.checkpoint, '');
    const initialResults = cli.resume ? readCheckpoint(cli.checkpoint) : [];
    isolatedHooks = {
      initialResults,
      onResult(result) {
        fs.appendFileSync(cli.checkpoint, `${JSON.stringify(result)}\n`);
      }
    };
  }
  const result = cli.workers === null
    ? runBatch(cli)
    : await runBatchIsolated({ ...cli, workers: cli.workers, timeoutMs: cli.timeoutMs }, isolatedHooks);
  if (cli.json) console.log(JSON.stringify(result, null, 2));
  else {
    printHuman(result);
    if (result.failures?.length) {
      console.log(`failures:   ${result.failures.length}`);
      for (const failure of result.failures) console.log(`  seed ${failure.seed}: ${failure.error.code} ${failure.error.message}`);
    }
  }
}
