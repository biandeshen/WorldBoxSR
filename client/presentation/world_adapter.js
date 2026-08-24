import { applyCommand } from '../../engine/core/commands.js';
import { summarizeWorld } from '../../engine/core/metrics.js';
import { createWorld, tickWorld } from '../../engine/core/world.js';

export const SHOWCASE = Object.freeze({
  width: 24,
  height: 24,
  population: 30,
  warmupYears: 40,
  warmupChunkYears: 2,
  defaultSeed: 45,
  grazerCount: 8
});

export function normalizeSeed(seedToken) {
  const value = String(seedToken ?? '').trim() || String(SHOWCASE.defaultSeed);
  return /^[-+]?\d+$/.test(value) ? Number(value) : value;
}

export function createShowcaseWorld(seedToken = SHOWCASE.defaultSeed) {
  return createWorld({
    seed: normalizeSeed(seedToken),
    width: SHOWCASE.width,
    height: SHOWCASE.height,
    population: SHOWCASE.population
  });
}

export async function evolveShowcaseWorld(world, {
  years = SHOWCASE.warmupYears,
  chunkYears = SHOWCASE.warmupChunkYears,
  onProgress = null
} = {}) {
  if (!Number.isFinite(years) || years < 0) throw new RangeError('showcase years must be non-negative');
  if (!Number.isFinite(chunkYears) || chunkYears <= 0) throw new RangeError('showcase chunkYears must be positive');

  const targetDays = Math.round(years * world.config.daysPerYear);
  const chunkDays = Math.max(1, Math.round(chunkYears * world.config.daysPerYear));

  while (world.day < targetDays) {
    const remaining = targetDays - world.day;
    tickWorld(world, Math.min(chunkDays, remaining));
    onProgress?.({
      day: world.day,
      year: world.day / world.config.daysPerYear,
      targetYear: years
    });
    await yieldToBrowser();
  }

  seedShowcaseGrazers(world);
  return world;
}

export function seedShowcaseGrazers(world) {
  if (world.creatures.some((creature) => creature.alive && creature.species === 'grazer')) return;

  const candidates = world.tiles
    .filter((tile) => tile.passable)
    .sort((a, b) =>
      (b.vegetation - a.vegetation) ||
      (b.moisture - a.moisture) ||
      (a.y - b.y) ||
      (a.x - b.x)
    )
    .slice(0, Math.max(1, SHOWCASE.grazerCount));

  for (let index = 0; index < SHOWCASE.grazerCount; index += 1) {
    const tile = candidates[index % candidates.length];
    applyCommand(world, {
      type: 'spawn_creature',
      species: 'grazer',
      x: tile.x,
      y: tile.y,
      count: 1
    });
  }
}

export function advanceWorld(world, days) {
  tickWorld(world, days);
}

export function applyGodTool(world, tool, x, y, count = 1) {
  if (tool === 'erase') {
    applyCommand(world, { type: 'erase', x, y });
    return { accepted: true, effect: 'erase' };
  }

  if (tool === 'lightning') {
    applyCommand(world, { type: 'lightning', x, y });
    return { accepted: true, effect: 'lightning' };
  }

  if (tool === 'spawn_grazer') {
    applyCommand(world, { type: 'spawn_creature', species: 'grazer', x, y, count });
    return { accepted: true, effect: 'spawn_grazer' };
  }

  applyCommand(world, { type: 'spawn_human', x, y, count });
  return { accepted: true, effect: 'spawn_human' };
}

export function worldView(world) {
  return {
    width: world.width,
    height: world.height,
    waterLevel: world.config.waterLevel,
    daysPerYear: world.config.daysPerYear,
    tiles: world.tiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      biome: tile.biome,
      passable: tile.passable,
      elevation: tile.elevation,
      moisture: tile.moisture,
      fertility: tile.fertility,
      foodRatio: tile.foodCapacity ? tile.food / tile.foodCapacity : 0,
      vegetationRatio: tile.vegetationCapacity ? tile.vegetation / tile.vegetationCapacity : 0
    })),
    humans: world.entities
      .filter((entity) => entity.kind === 'human')
      .map((human) => ({
        id: human.id,
        x: human.x,
        y: human.y,
        sex: human.sex,
        ageDays: human.ageDays,
        hunger: human.hunger,
        health: human.health,
        settlementId: human.settlementId
      })),
    grazers: world.creatures
      .filter((creature) => creature.alive && creature.species === 'grazer')
      .map((creature) => ({
        id: creature.id,
        x: creature.x,
        y: creature.y,
        ageDays: creature.ageDays,
        hunger: creature.hunger,
        health: creature.health
      })),
    settlements: world.settlements.map((settlement) => ({
      id: settlement.id,
      name: settlement.name,
      x: settlement.x,
      y: settlement.y,
      active: settlement.active,
      population: settlement.population,
      foundedDay: settlement.foundedDay
    }))
  };
}

export function worldSummary(world) {
  return summarizeWorld(world);
}

export function selectionAt(world, x, y) {
  const human = world.entities
    .filter((entity) => entity.kind === 'human' && entity.x === x && entity.y === y)
    .sort((a, b) => a.id - b.id)[0];
  if (human) return { kind: 'human', value: human };

  const grazer = world.creatures
    .filter((creature) => creature.alive && creature.x === x && creature.y === y)
    .sort((a, b) => a.id - b.id)[0];
  if (grazer) return { kind: 'creature', value: grazer };

  const settlement = world.settlements
    .filter((candidate) => candidate.x === x && candidate.y === y)
    .sort((a, b) => a.id - b.id)[0];
  if (settlement) return { kind: 'settlement', value: settlement };

  const tile = world.tiles.find((candidate) => candidate.x === x && candidate.y === y);
  return tile ? { kind: 'tile', value: tile } : null;
}

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
