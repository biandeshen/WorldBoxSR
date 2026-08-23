#!/usr/bin/env node
import { SCENARIOS, runScenario } from './scenarios.js';

const aliases = new Map(Object.values(SCENARIOS).flatMap((scenario) => [
  [scenario.name, scenario],
  [Object.keys(SCENARIOS).find((key) => SCENARIOS[key] === scenario), scenario]
]));

const token = process.argv[2] ?? 'seed45-demographic-collapse';
const scenario = aliases.get(token);
if (!scenario) {
  process.stderr.write(`Unknown scenario: ${token}\nAvailable: ${[...new Set(aliases.keys())].join(', ')}\n`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(runScenario(scenario), null, 2));
}
