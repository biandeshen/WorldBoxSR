#!/usr/bin/env node
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

export function runSeed({ seed, years, width, height, population, config = {} }) {
  const world = createWorld({ seed, width, height, population, config });
  tickWorld(world, years * world.config.daysPerYear);
  return summarizeWorld(world);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const payload = JSON.parse(process.argv[2] ?? '{}');
    process.stdout.write(`${JSON.stringify(runSeed(payload))}\n`);
  } catch (error) {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  }
}
