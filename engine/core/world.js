import { SeededRng } from './rng.js';
import { mergeConfig } from '../model/config.js';
import { createHuman } from '../model/human.js';
import { pushEvent, worldSubject } from '../model/events.js';
import { regenerateFood, regenerateVegetation } from '../systems/environment.js';
import { updateGrazerReproduction, updateGrazers } from '../systems/grazers.js';
import { updateHumans } from '../systems/humans.js';
import { generateWorldFields } from '../world/fields.js';
import { classifyTileBiome, isTilePassable } from '../world/biomes.js';
import { initialVegetationForTile, vegetationCapacityForTile } from '../world/vegetation.js';
import { updateSettlements } from '../systems/settlements.js';

export const SNAPSHOT_VERSION = 11;
const PREVIOUS_SNAPSHOT_VERSION = 10;

export function createWorld({ seed = 1, width = 32, height = 32, population = 20, config = {} } = {}) {
  assertWorldSize(width, height);
  const rng = new SeededRng(seed);
  const world = {
    snapshotVersion: SNAPSHOT_VERSION,
    seed: rng.seed,
    rng,
    width,
    height,
    day: 0,
    nextEntityId: 1,
    nextCreatureId: 1,
    nextSettlementId: 1,
    nextLineageId: 1,
    nextUnionId: 1,
    nextEventId: 1,
    nextCommandId: 1,
    config: mergeConfig(config),
    tiles: [],
    entities: [],
    creatures: [],
    settlements: [],
    lineages: [],
    unions: [],
    history: [],
    counters: { births: 0, deaths: 0, meals: 0, creatureMeals: 0, creatureDeaths: 0, creatureBirths: 0 }
  };

  const fields = generateWorldFields({ seed: world.seed, width, height });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fertilitySample = rng.range(0.2, 1.0);
      const initialFoodRatio = rng.range(0.35, 1.0);
      const index = y * width + x;
      const elevation = fields.elevation[index];
      const moisture = fields.moisture[index];
      const biome = classifyTileBiome({ elevation, moisture }, world.config);
      const passable = biome !== 'ocean';
      const fertility = passable ? fertilitySample : 0;
      const capacity = passable ? 1.5 + fertility * 8.5 : 0;
      const tile = {
        x,
        y,
        elevation,
        moisture,
        biome,
        passable,
        fertility,
        foodCapacity: capacity,
        food: capacity * initialFoodRatio,
        vegetationCapacity: 0,
        vegetation: 0,
        settlementCandidateDays: 0,
        ownerSettlementId: null
      };
      tile.vegetationCapacity = vegetationCapacityForTile(tile);
      tile.vegetation = initialVegetationForTile(tile);
      world.tiles.push(tile);
    }
  }

  const founderSpawnTiles = population > 0 ? world.tiles.filter(isTilePassable) : null;
  for (let i = 0; i < population; i += 1) createHuman(world, {}, { passableTiles: founderSpawnTiles });
  pushEvent(world, { type: 'world.created', subject: worldSubject(), seed: world.seed, population });
  return world;
}

export function tickWorld(world, ticks = 1) {
  if (!Number.isInteger(ticks) || ticks < 0) throw new RangeError('ticks must be a non-negative integer');
  for (let i = 0; i < ticks; i += 1) {
    regenerateFood(world);
    regenerateVegetation(world);
    updateGrazers(world);
    updateHumans(world);
    world.day += 1;
    updateGrazerReproduction(world);
    updateSettlements(world);
  }
  return world;
}

export function tileAt(world, x, y) {
  return world.tiles[y * world.width + x];
}

export function neighbors8(world, x, y) {
  const cells = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < world.width && ny < world.height) {
        cells.push(tileAt(world, nx, ny));
      }
    }
  }
  return cells;
}

export function passableNeighbors8(world, x, y) {
  return neighbors8(world, x, y).filter(isTilePassable);
}

export function snapshotWorld(world) {
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    seed: world.seed,
    rng: world.rng.snapshot(),
    width: world.width,
    height: world.height,
    day: world.day,
    nextEntityId: world.nextEntityId,
    nextCreatureId: world.nextCreatureId,
    nextSettlementId: world.nextSettlementId,
    nextLineageId: world.nextLineageId,
    nextUnionId: world.nextUnionId,
    nextEventId: world.nextEventId,
    nextCommandId: world.nextCommandId,
    config: { ...world.config },
    tiles: world.tiles.map((tile) => ({ ...tile })),
    entities: world.entities.map((entity) => ({
      ...entity,
      parentIds: [...entity.parentIds],
      childIds: [...entity.childIds],
      unionIds: [...entity.unionIds]
    })),
    creatures: world.creatures.map((creature) => ({ ...creature })),
    settlements: world.settlements.map((settlement) => ({ ...settlement, memberIds: [...settlement.memberIds] })),
    lineages: world.lineages.map((lineage) => ({
      ...lineage,
      memberIds: [...lineage.memberIds],
      founderIds: [...lineage.founderIds]
    })),
    unions: world.unions.map((union) => ({
      ...union,
      partnerIds: [...union.partnerIds],
      childIds: [...union.childIds]
    })),
    history: world.history.map((event) => ({ ...event })),
    counters: { ...world.counters }
  };
}

export function worldFromSnapshot(snapshot) {
  if (snapshot.snapshotVersion !== SNAPSHOT_VERSION && snapshot.snapshotVersion !== PREVIOUS_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.snapshotVersion}`);
  }
  const migratingV10 = snapshot.snapshotVersion === PREVIOUS_SNAPSHOT_VERSION;
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    seed: snapshot.seed,
    rng: SeededRng.fromSnapshot(snapshot.rng),
    width: snapshot.width,
    height: snapshot.height,
    day: snapshot.day,
    nextEntityId: snapshot.nextEntityId,
    nextCreatureId: snapshot.nextCreatureId,
    nextSettlementId: snapshot.nextSettlementId,
    nextLineageId: snapshot.nextLineageId,
    nextUnionId: snapshot.nextUnionId,
    nextEventId: snapshot.nextEventId,
    nextCommandId: snapshot.nextCommandId,
    config: mergeConfig(snapshot.config),
    tiles: snapshot.tiles.map((tile) => ({ ...tile })),
    entities: snapshot.entities.map((entity) => ({
      ...entity,
      parentIds: [...entity.parentIds],
      childIds: [...entity.childIds],
      unionIds: [...entity.unionIds]
    })),
    creatures: snapshot.creatures.map((creature) => ({
      ...creature,
      lastBirthDay: migratingV10 ? null : (creature.lastBirthDay ?? null)
    })),
    settlements: snapshot.settlements.map((settlement) => ({ ...settlement, memberIds: [...settlement.memberIds] })),
    lineages: snapshot.lineages.map((lineage) => ({
      ...lineage,
      memberIds: [...lineage.memberIds],
      founderIds: [...lineage.founderIds]
    })),
    unions: snapshot.unions.map((union) => ({
      ...union,
      partnerIds: [...union.partnerIds],
      childIds: [...union.childIds]
    })),
    history: snapshot.history.map((event) => ({ ...event })),
    counters: {
      ...snapshot.counters,
      creatureBirths: migratingV10 ? 0 : (snapshot.counters.creatureBirths ?? 0)
    }
  };
}

function assertWorldSize(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4) {
    throw new RangeError('world width and height must be integers >= 4');
  }
}
