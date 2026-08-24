import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld, tileAt } from '../engine/core/world.js';
import { summarizeWorld } from '../engine/core/metrics.js';

test('world invariants survive a multi-decade run', () => {
  const world = createWorld({ seed: 42, width: 20, height: 20, population: 40 });
  tickWorld(world, world.config.daysPerYear * 40);

  const humanIds = new Set();
  for (const entity of world.entities) {
    assert.equal(entity.alive, true);
    assert.ok(!humanIds.has(entity.id), `duplicate human entity id ${entity.id}`);
    humanIds.add(entity.id);
    assert.ok(entity.x >= 0 && entity.x < world.width);
    assert.ok(entity.y >= 0 && entity.y < world.height);
    assert.equal(tileAt(world, entity.x, entity.y).passable, true);
    assert.ok(Number.isFinite(entity.hunger) && entity.hunger >= 0 && entity.hunger <= 1);
    assert.ok(Number.isFinite(entity.health) && entity.health > 0 && entity.health <= 1);
    assert.ok(entity.ageDays >= 0);
  }

  const creatureIds = new Set();
  for (const creature of world.creatures) {
    assert.equal(creature.alive, true);
    assert.equal(creature.kind, 'creature');
    assert.equal(creature.species, 'grazer');
    assert.ok(!creatureIds.has(creature.id), `duplicate creature id ${creature.id}`);
    creatureIds.add(creature.id);
    assert.ok(creature.x >= 0 && creature.x < world.width);
    assert.ok(creature.y >= 0 && creature.y < world.height);
    assert.equal(tileAt(world, creature.x, creature.y).passable, true);
    assert.ok(Number.isFinite(creature.hunger) && creature.hunger >= 0 && creature.hunger <= 1);
    assert.ok(Number.isFinite(creature.health) && creature.health > 0 && creature.health <= 1);
    assert.ok(Number.isInteger(creature.ageDays) && creature.ageDays >= 0);
  }

  for (const tile of world.tiles) {
    assert.ok(Number.isFinite(tile.food));
    assert.ok(tile.food >= -1e-10);
    assert.ok(tile.food <= tile.foodCapacity + 1e-10);
    assert.ok(Number.isFinite(tile.vegetation));
    assert.ok(Number.isFinite(tile.vegetationCapacity));
    assert.ok(tile.vegetation >= -1e-10);
    assert.ok(tile.vegetation <= tile.vegetationCapacity + 1e-10);
    assert.equal(tile.passable, tile.biome !== 'ocean');
    if (!tile.passable) {
      assert.equal(tile.foodCapacity, 0);
      assert.equal(tile.vegetationCapacity, 0);
      assert.equal(tile.vegetation, 0);
    }
  }

  const settlementIds = new Set();
  const settlementById = new Map();
  for (const settlement of world.settlements) {
    assert.ok(!settlementIds.has(settlement.id), `duplicate settlement id ${settlement.id}`);
    settlementIds.add(settlement.id);
    settlementById.set(settlement.id, settlement);
    assert.equal(tileAt(world, settlement.x, settlement.y).passable, true);
    assert.equal(settlement.population, settlement.memberIds.length);
    assert.equal(new Set(settlement.memberIds).size, settlement.memberIds.length);
    assert.ok(Number.isInteger(settlement.polityId), `settlement ${settlement.id} missing polity identity`);
  }
  for (const human of world.entities) {
    if (human.settlementId === null) continue;
    const settlement = settlementById.get(human.settlementId);
    assert.ok(settlement, `missing settlement ${human.settlementId}`);
    assert.ok(settlement.memberIds.includes(human.id));
  }

  const polityIds = new Set();
  for (const polity of world.polities) {
    assert.ok(!polityIds.has(polity.id), `duplicate polity id ${polity.id}`);
    polityIds.add(polity.id);
    assert.equal(new Set(polity.settlementIds).size, polity.settlementIds.length);
    assert.ok(polity.settlementIds.includes(polity.capitalSettlementId));
    for (const settlementId of polity.settlementIds) {
      const settlement = settlementById.get(settlementId);
      assert.ok(settlement, `polity ${polity.id} references missing settlement ${settlementId}`);
      assert.equal(settlement.polityId, polity.id);
    }
    if (polity.active) {
      assert.ok(polity.settlementIds.some((id) => settlementById.get(id)?.active), `active polity ${polity.id} has no active settlement`);
    }
  }

  const summary = summarizeWorld(world);
  for (const value of Object.values(summary)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
});

test('event history remains bounded', () => {
  const world = createWorld({
    seed: 77,
    width: 8,
    height: 8,
    population: 50,
    config: { maxEventHistory: 25, birthChancePerEligiblePairPerDay: 0.02 }
  });
  tickWorld(world, 3_000);
  assert.ok(world.history.length <= 25);
});
