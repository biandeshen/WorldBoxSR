import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../engine/core/world.js';
import { initializeValidatedNaturalGrazers, NATURAL_GRAZER_CONFIG } from '../engine/world/natural_fauna.js';

const MAX_YEARS = 120;
const PRESSURE_DROP = 0.05;
const RECOVERY_RISE = 0.03;

function canonicalWorld() {
  const world = createWorld({
    seed: 45,
    width: 24,
    height: 24,
    population: 30,
    config: NATURAL_GRAZER_CONFIG
  });
  initializeValidatedNaturalGrazers(world);
  return world;
}

function checkpoint(world, year) {
  const vegetation = world.tiles.reduce((sum, tile) => sum + tile.vegetation, 0);
  const capacity = world.tiles.reduce((sum, tile) => sum + tile.vegetationCapacity, 0);
  return {
    year,
    vegetationUtilization: capacity > 0 ? vegetation / capacity : 0,
    grazers: world.creatures.filter((creature) => creature.alive && creature.species === 'grazer').length,
    naturalBirths: world.counters.creatureBirths,
    godCreatureSpawns: world.history.filter((event) => event.type === 'god.spawn_creature').length
  };
}

function firstRecoveryWindow(checkpoints) {
  // "First" means earliest recovery year C, then earliest trough year B,
  // then earliest prior reference year A. The gate never searches for a
  // prettier/larger rebound once an earlier qualifying factual window exists.
  for (let c = 2; c < checkpoints.length; c += 1) {
    const C = checkpoints[c];
    if (C.grazers < 1 || C.naturalBirths < 1 || C.godCreatureSpawns !== 0) continue;
    for (let b = 1; b < c; b += 1) {
      const B = checkpoints[b];
      if (C.year - B.year < 1) continue;
      if (C.vegetationUtilization - B.vegetationUtilization < RECOVERY_RISE) continue;
      if (C.grazers >= B.grazers) continue;
      for (let a = 0; a < b; a += 1) {
        const A = checkpoints[a];
        if (A.vegetationUtilization - B.vegetationUtilization < PRESSURE_DROP) continue;
        if (A.godCreatureSpawns !== 0 || B.godCreatureSpawns !== 0) continue;
        return { A, B, C };
      }
    }
  }
  return null;
}

test('canonical seed45 Living Ecology has a yearly vegetation pressure → lower-grazer recovery window without reseeding', () => {
  const world = canonicalWorld();
  const checkpoints = [checkpoint(world, 0)];

  for (let year = 1; year <= MAX_YEARS; year += 1) {
    tickWorld(world, world.config.daysPerYear);
    checkpoints.push(checkpoint(world, year));
  }

  const window = firstRecoveryWindow(checkpoints);
  assert.ok(window, `seed45 failed preregistered recovery hypothesis through Y${MAX_YEARS}: ${JSON.stringify(checkpoints)}`);
  assert.ok(window.A.vegetationUtilization - window.B.vegetationUtilization >= PRESSURE_DROP);
  assert.ok(window.C.vegetationUtilization - window.B.vegetationUtilization >= RECOVERY_RISE);
  assert.ok(window.C.grazers < window.B.grazers);
  assert.ok(window.C.naturalBirths > 0);
  assert.equal(window.A.godCreatureSpawns, 0);
  assert.equal(window.B.godCreatureSpawns, 0);
  assert.equal(window.C.godCreatureSpawns, 0);

  console.log(`Canonical ecology recovery: Y${window.A.year} ${(window.A.vegetationUtilization * 100).toFixed(1)}% / ${window.A.grazers} grazers → Y${window.B.year} ${(window.B.vegetationUtilization * 100).toFixed(1)}% / ${window.B.grazers} → Y${window.C.year} ${(window.C.vegetationUtilization * 100).toFixed(1)}% / ${window.C.grazers}; natural births ${window.C.naturalBirths}; no god creature spawns`);
});
