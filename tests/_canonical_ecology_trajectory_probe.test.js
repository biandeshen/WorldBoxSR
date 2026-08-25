import test from 'node:test';
import assert from 'node:assert/strict';
import { tickWorld } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createShowcaseWorld } from '../client/presentation/world_adapter.js';

test('probe canonical seed45 Living Ecology vegetation trajectory', () => {
  const world = createShowcaseWorld(45, 'living_ecology');
  const rows = [];
  const deaths = { starvation: 0, oldAge: 0, predation: 0, other: 0 };
  let lastEventId = 0;

  sample(0);
  for (let year = 1; year <= 120; year += 1) {
    tickWorld(world, world.config.daysPerYear);
    for (const event of world.history) {
      if (event.id <= lastEventId || event.type !== 'creature.died') continue;
      if (event.cause === 'starvation') deaths.starvation += 1;
      else if (event.cause === 'old_age') deaths.oldAge += 1;
      else if (event.cause === 'predation') deaths.predation += 1;
      else deaths.other += 1;
    }
    lastEventId = world.history.at(-1)?.id ?? lastEventId;
    sample(year);
  }

  console.log(`CANONICAL_ECOLOGY_TRAJECTORY ${JSON.stringify({ rows })}`);
  assert.equal(rows[0].grazers, 10);
  assert.ok(rows.some((row) => row.births > 0), 'probe expects natural births');
  assert.equal(world.history.some((event) => event.type === 'god.spawn_creature'), false);

  function sample(year) {
    const summary = summarizeWorld(world);
    rows.push({
      year,
      day: world.day,
      grazers: summary.grazers,
      vegetation: Number(summary.vegetationUtilization.toFixed(4)),
      births: world.counters.creatureBirths,
      deaths: world.counters.creatureDeaths,
      starvationDeaths: deaths.starvation,
      oldAgeDeaths: deaths.oldAge,
      predationDeaths: deaths.predation
    });
  }
});
