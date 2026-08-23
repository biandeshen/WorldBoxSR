#!/usr/bin/env node
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createWorld, tickWorld } from '../engine/core/world.js';

export const DEFAULT_BENCHMARK_OPTIONS = Object.freeze({
  populations: Object.freeze([1000, 10000]),
  repetitions: 5,
  warmupTicks: 5,
  measuredTicks: 30,
  width: 64,
  height: 64,
  seed: 20260823
});

export function runBenchmark(options = {}) {
  const config = normalizeOptions(options);
  const scenarios = [];

  for (const population of config.populations) {
    const samples = [];
    for (let repetition = 0; repetition < config.repetitions; repetition += 1) {
      samples.push(runSample({ ...config, population, repetition }));
    }
    scenarios.push(summarizeScenario(population, samples));
  }

  return {
    benchmarkVersion: 1,
    environment: environmentInfo(),
    parameters: config,
    scenarios
  };
}

function runSample({ population, warmupTicks, measuredTicks, width, height, seed, repetition }) {
  const creationStart = performance.now();
  const world = createWorld({ seed, width, height, population });
  const creationMs = performance.now() - creationStart;

  const warmupStart = performance.now();
  tickWorld(world, warmupTicks);
  const warmupMs = performance.now() - warmupStart;

  const measuredStart = performance.now();
  tickWorld(world, measuredTicks);
  const measuredMs = performance.now() - measuredStart;
  const memory = process.memoryUsage();

  return {
    repetition,
    creationMs,
    warmupMs,
    measuredMs,
    msPerTick: measuredMs / measuredTicks,
    ticksPerSecond: measuredTicks * 1000 / measuredMs,
    initialPopulation: population,
    finalPopulation: world.entities.length,
    rssMB: bytesToMiB(memory.rss),
    heapUsedMB: bytesToMiB(memory.heapUsed)
  };
}

function summarizeScenario(population, samples) {
  const msPerTick = stats(samples.map((sample) => sample.msPerTick));
  const creationMs = stats(samples.map((sample) => sample.creationMs));
  const rssMB = stats(samples.map((sample) => sample.rssMB));
  const heapUsedMB = stats(samples.map((sample) => sample.heapUsedMB));
  return {
    population,
    samples,
    creationMs,
    msPerTick,
    ticksPerSecond: {
      best: 1000 / msPerTick.min,
      median: 1000 / msPerTick.median,
      worst: 1000 / msPerTick.max
    },
    rssMB,
    heapUsedMB
  };
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    min: sorted[0],
    median,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    max: sorted.at(-1)
  };
}

function normalizeOptions(options) {
  const populations = options.populations ?? [...DEFAULT_BENCHMARK_OPTIONS.populations];
  const normalized = {
    populations: populations.map((population) => positiveInteger(population, 'population')),
    repetitions: positiveInteger(options.repetitions ?? DEFAULT_BENCHMARK_OPTIONS.repetitions, 'repetitions'),
    warmupTicks: nonNegativeInteger(options.warmupTicks ?? DEFAULT_BENCHMARK_OPTIONS.warmupTicks, 'warmupTicks'),
    measuredTicks: positiveInteger(options.measuredTicks ?? DEFAULT_BENCHMARK_OPTIONS.measuredTicks, 'measuredTicks'),
    width: positiveInteger(options.width ?? DEFAULT_BENCHMARK_OPTIONS.width, 'width'),
    height: positiveInteger(options.height ?? DEFAULT_BENCHMARK_OPTIONS.height, 'height'),
    seed: options.seed ?? DEFAULT_BENCHMARK_OPTIONS.seed
  };
  if (normalized.populations.length === 0) throw new RangeError('at least one population is required');
  return normalized;
}

function environmentInfo() {
  const cpus = os.cpus();
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    logicalCpus: cpus.length,
    cpuModel: cpus[0]?.model ?? 'unknown'
  };
}

function parseCli(argv) {
  const options = {};
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--populations') options.populations = argv[++i].split(',').map((value) => Number(value));
    else if (arg === '--repetitions') options.repetitions = Number(argv[++i]);
    else if (arg === '--warmup-ticks') options.warmupTicks = Number(argv[++i]);
    else if (arg === '--ticks') options.measuredTicks = Number(argv[++i]);
    else if (arg === '--width') options.width = Number(argv[++i]);
    else if (arg === '--height') options.height = Number(argv[++i]);
    else if (arg === '--seed') options.seed = numericOrString(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { options, json };
}

function printHuman(result) {
  console.log(`WorldBoxSR benchmark | Node ${result.environment.node} | ${result.environment.cpuModel}`);
  console.log(`${result.parameters.repetitions} samples · ${result.parameters.warmupTicks} warmup ticks · ${result.parameters.measuredTicks} measured ticks`);
  for (const scenario of result.scenarios) {
    console.log(`${scenario.population.toLocaleString()} agents:`);
    console.log(`  create median ${scenario.creationMs.median.toFixed(2)} ms`);
    console.log(`  tick median   ${scenario.msPerTick.median.toFixed(3)} ms (${scenario.ticksPerSecond.median.toFixed(1)} ticks/s)`);
    console.log(`  tick range    ${scenario.msPerTick.min.toFixed(3)}–${scenario.msPerTick.max.toFixed(3)} ms`);
    console.log(`  RSS median    ${scenario.rssMB.median.toFixed(1)} MiB`);
  }
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
  return value;
}

function nonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return value;
}

function numericOrString(value) {
  return /^[-+]?\d+$/.test(value) ? Number(value) : value;
}

function bytesToMiB(bytes) {
  return bytes / 1024 / 1024;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const cli = parseCli(process.argv.slice(2));
  const result = runBenchmark(cli.options);
  if (cli.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
}
