import test from 'node:test';
import { createShowcaseWorld, SHOWCASE } from '../client/presentation/world_adapter.js';
import { tickWorld } from '../engine/core/world.js';
import { evaluateCivilizationCollisionGate } from '../client/presentation/civilization_gate.js';

test('temporary probe: report seed45 public showcase civilization gate', () => {
  const world = createShowcaseWorld(SHOWCASE.defaultSeed);
  tickWorld(world, SHOWCASE.warmupYears * world.config.daysPerYear);
  const gate = evaluateCivilizationCollisionGate(world);
  const storyCounts = Object.fromEntries([
    'polity.founded',
    'polity.ruler_appointed',
    'polity.war_started',
    'polity.peace_made',
    'warband.engaged',
    'settlement.conquered',
    'settlement.rebelled'
  ].map((type) => [type, world.history.filter((event) => event.type === type).length]));
  console.log(`V03_SHOWCASE_PROBE ${JSON.stringify({ year: world.day / world.config.daysPerYear, gate, storyCounts, activePolities: world.polities.filter((polity) => polity.active).length })}`);
});
