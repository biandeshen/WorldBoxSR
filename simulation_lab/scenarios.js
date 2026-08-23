import { createWorld, tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

export const SCENARIOS = Object.freeze({
  seed45DemographicCollapse: Object.freeze({
    name: 'seed45-demographic-collapse',
    description: 'Large connected landmass with abundant food but a low-density reproduction collapse.',
    world: Object.freeze({ seed: 45, width: 24, height: 24, population: 30 }),
    checkpointYears: Object.freeze([40, 100, 160, 200])
  })
});

export function runScenario(scenario) {
  const world = createWorld(scenario.world);
  const checkpoints = [];

  for (const year of scenario.checkpointYears) {
    const targetDay = year * world.config.daysPerYear;
    if (targetDay < world.day) throw new RangeError('scenario checkpoint years must be ascending');
    tickWorld(world, targetDay - world.day);
    checkpoints.push(summarizeWorld(world));
  }

  return {
    name: scenario.name,
    description: scenario.description,
    world: { ...scenario.world },
    checkpoints,
    finalSettlements: world.settlements.map((settlement) => ({
      id: settlement.id,
      name: settlement.name,
      foundedYear: settlement.foundedDay / world.config.daysPerYear,
      population: settlement.population,
      x: settlement.x,
      y: settlement.y
    }))
  };
}
