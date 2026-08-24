import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { summarizeWorld } from '../engine/core/metrics.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const SEEDS = [1, 4, 9];
const DENSITIES = [0, 5, 20];
const YEARS = 2;

test('temporary default-parameter grazer density probe', () => {
  const rows = [];

  for (const seed of SEEDS) {
    for (const density of DENSITIES) {
      const world = createWorld({ seed, width: 24, height: 24, population: 0 });
      const spawnTile = [...world.tiles]
        .filter((tile) => tile.passable)
        .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)[0];
      assert.ok(spawnTile, `seed ${seed} must contain land`);

      if (density > 0) {
        applyCommand(world, {
          type: 'spawn_creature',
          species: 'grazer',
          x: spawnTile.x,
          y: spawnTile.y,
          count: density
        });
      }

      const rngBefore = world.rng.snapshot();
      tickWorld(world, YEARS * world.config.daysPerYear);
      const summary = summarizeWorld(world);
      rows.push({
        seed,
        density,
        vegetation: round(summary.vegetation),
        vegetationCapacity: round(summary.vegetationCapacity),
        vegetationUtilization: round(summary.vegetationUtilization),
        survivingGrazers: summary.grazers,
        creatureMeals: summary.creatureMeals,
        creatureDeaths: summary.creatureDeaths,
        rngUnchanged: JSON.stringify(world.rng.snapshot()) === JSON.stringify(rngBefore)
      });
    }
  }

  for (const seed of SEEDS) {
    const group = rows.filter((row) => row.seed === seed);
    assert.equal(group.length, DENSITIES.length);
    assert.ok(group[0].vegetation >= group[1].vegetation, `seed ${seed}: 5 grazers should not increase biomass`);
    assert.ok(group[1].vegetation >= group[2].vegetation, `seed ${seed}: 20 grazers should not increase biomass`);
    assert.ok(group.every((row) => row.rngUnchanged), `seed ${seed}: grazer loop consumed sequential RNG`);
  }

  console.log(`GRAZER_DENSITY_DEFAULT_2Y ${JSON.stringify({ rows })}`);
});

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}
