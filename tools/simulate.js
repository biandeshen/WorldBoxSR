#!/usr/bin/env node
import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

const args = parseArgs(process.argv.slice(2));
const world = createWorld({
  seed: args.seed,
  width: args.width,
  height: args.height,
  population: args.population
});

const totalDays = args.years * world.config.daysPerYear;
const reportEveryYears = args.reportEvery ?? Math.max(1, Math.ceil(args.years / 10));
const reportEveryDays = reportEveryYears * world.config.daysPerYear;

if (!args.json && !args.quiet) {
  console.log(`worldboxSR | seed=${world.seed} | ${world.width}x${world.height} | founders=${args.population}`);
}

for (let elapsed = 0; elapsed < totalDays; elapsed += 1) {
  tickWorld(world);
  if (!args.json && !args.quiet && (world.day % reportEveryDays === 0 || world.day === totalDays)) {
    printSummary(summarizeWorld(world));
  }
}

const summary = summarizeWorld(world);
if (args.json) console.log(JSON.stringify(summary, null, 2));
else if (args.quiet) console.log(JSON.stringify(summary));
else {
  console.log('\nFinal:');
  printSummary(summary);
  const recentMajor = world.history.filter((event) => event.type === 'human.died').slice(-5);
  if (recentMajor.length) {
    console.log('Recent deaths:');
    for (const event of recentMajor) {
      console.log(`  year ${(event.day / world.config.daysPerYear).toFixed(1)}: #${event.entityId} ${event.cause} age=${event.ageYears.toFixed(1)}`);
    }
  }
}

function printSummary(s) {
  console.log(
    `year=${s.year.toFixed(1).padStart(6)} pop=${String(s.population).padStart(5)} ` +
    `births=${String(s.births).padStart(5)} deaths=${String(s.deaths).padStart(5)} ` +
    `avgAge=${s.averageAgeYears.toFixed(1).padStart(5)} food=${(s.foodUtilization * 100).toFixed(1).padStart(5)}%`
  );
}

function parseArgs(argv) {
  const result = { seed: 42, years: 100, population: 30, width: 32, height: 32, json: false, quiet: false, reportEvery: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') result.json = true;
    else if (arg === '--quiet') result.quiet = true;
    else if (arg.startsWith('--seed=')) result.seed = value(arg);
    else if (arg === '--seed') result.seed = argv[++i];
    else if (arg.startsWith('--years=')) result.years = numberValue(arg, 'years');
    else if (arg === '--years') result.years = numberToken(argv[++i], 'years');
    else if (arg.startsWith('--population=')) result.population = integerValue(arg, 'population');
    else if (arg === '--population') result.population = integerToken(argv[++i], 'population');
    else if (arg.startsWith('--width=')) result.width = integerValue(arg, 'width');
    else if (arg === '--width') result.width = integerToken(argv[++i], 'width');
    else if (arg.startsWith('--height=')) result.height = integerValue(arg, 'height');
    else if (arg === '--height') result.height = integerToken(argv[++i], 'height');
    else if (arg.startsWith('--report-every=')) result.reportEvery = integerValue(arg, 'report-every');
    else if (arg === '--report-every') result.reportEvery = integerToken(argv[++i], 'report-every');
    else if (arg === '--help' || arg === '-h') helpAndExit();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (result.years < 0 || result.population < 0) throw new Error('years and population must be >= 0');
  return result;
}

function value(token) { return token.slice(token.indexOf('=') + 1); }
function numberValue(token, name) { return numberToken(value(token), name); }
function integerValue(token, name) { return integerToken(value(token), name); }
function numberToken(token, name) {
  const n = Number(token);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
}
function integerToken(token, name) {
  const n = numberToken(token, name);
  if (!Number.isInteger(n)) throw new Error(`${name} must be an integer`);
  return n;
}
function helpAndExit() {
  console.log('Usage: node tools/simulate.js [--seed N] [--years N] [--population N] [--width N] [--height N] [--report-every N] [--json|--quiet]');
  process.exit(0);
}
