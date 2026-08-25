import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../engine/core/commands.js';
import { snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createShowcaseWorld } from '../client/presentation/world_adapter.js';

test('probe one fixed Y50 Wolf setup that requires movement before predation', () => {
  const base = createShowcaseWorld(45, 'living_ecology');
  tickWorld(base, 50 * base.config.daysPerYear);
  const snapshot = snapshotWorld(base);
  const grazers = base.creatures.filter((creature) => creature.alive && creature.species === 'grazer');
  const occupied = new Set([
    ...base.entities.filter((entity) => entity.kind === 'human' && entity.alive).map((entity) => `${entity.x},${entity.y}`),
    ...base.creatures.filter((creature) => creature.alive).map((creature) => `${creature.x},${creature.y}`),
    ...(base.warbands ?? []).filter((warband) => warband.active).map((warband) => `${warband.x},${warband.y}`)
  ]);
  const candidates = base.tiles
    .filter((tile) => tile.passable && !occupied.has(`${tile.x},${tile.y}`))
    .map((tile) => ({
      x: tile.x,
      y: tile.y,
      nearest: grazers.reduce((min, grazer) => Math.min(min, Math.max(Math.abs(tile.x - grazer.x), Math.abs(tile.y - grazer.y))), Infinity)
    }))
    .filter((tile) => tile.nearest >= 2 && tile.nearest <= base.config.wolfPreySearchRadius)
    .sort((a, b) => b.nearest - a.nearest || a.y - b.y || a.x - b.x);

  const results = [];
  let accepted = null;
  for (const candidate of candidates) {
    const world = worldFromSnapshot(snapshot);
    const [wolfId] = applyCommand(world, { type: 'spawn_creature', species: 'wolf', x: candidate.x, y: candidate.y, count: 1 });
    let moved = false;
    let firstMove = null;
    let predation = null;
    for (let day = 1; day <= 140; day += 1) {
      const wolfBefore = world.creatures.find((creature) => creature.alive && creature.id === wolfId);
      if (!wolfBefore) break;
      const from = { x: wolfBefore.x, y: wolfBefore.y };
      tickWorld(world, 1);
      const wolfAfter = world.creatures.find((creature) => creature.alive && creature.id === wolfId);
      if (!wolfAfter) break;
      if (!moved && (wolfAfter.x !== from.x || wolfAfter.y !== from.y)) {
        moved = true;
        firstMove = { day, from, to: { x: wolfAfter.x, y: wolfAfter.y } };
      }
      predation = world.history.findLast((event) => event.type === 'creature.predated' && event.predatorCreatureId === wolfId) ?? null;
      if (predation) break;
    }
    const result = { ...candidate, moved, firstMove, predationEventId: predation?.id ?? null, preyId: predation?.preyCreatureId ?? null };
    results.push(result);
    if (moved && predation) { accepted = result; break; }
  }

  console.log(`CANONICAL_WOLF_SETUP_PROBE ${JSON.stringify({ accepted, tried: results.slice(0, 20) })}`);
  assert.ok(accepted, 'Y50 must have at least one fixed clear setup tile yielding Wolf movement + predation with frozen mechanics');
});
