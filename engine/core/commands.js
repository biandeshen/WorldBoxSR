import { createGrazer } from '../model/grazer.js';
import { createHuman } from '../model/human.js';
import { killCreature } from '../model/creature_lifecycle.js';
import { killHuman } from '../model/human_lifecycle.js';
import { commandRef, eventRef, pushEvent, worldSubject } from '../model/events.js';

export const METEOR_RADIUS = 2;
export const RAIN_RADIUS = 2;

export function applyCommand(world, command) {
  if (!command || typeof command.type !== 'string') throw new TypeError('command.type is required');

  switch (command.type) {
    case 'spawn_human':
      return spawnHumans(world, command);
    case 'spawn_creature':
      return spawnCreatures(world, command);
    case 'erase':
      return eraseHumans(world, command);
    case 'lightning':
      return strikeLightning(world, command);
    case 'meteor':
      return strikeMeteor(world, command);
    case 'rain':
      return blessWithRain(world, command);
    default:
      throw new Error(`Unknown command type: ${command.type}`);
  }
}

function spawnHumans(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const count = boundedCount(command.count ?? 1);
  if (!world.tiles[y * world.width + x]?.passable) throw new RangeError('humans cannot spawn on impassable tiles');

  // Allocate command identity only after validation. Rejected input must not
  // perturb the deterministic command sequence.
  const commandId = world.nextCommandId++;
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(createHuman(world, { x, y }).id);
  }
  pushEvent(world, {
    type: 'god.spawn_human',
    subject: worldSubject(),
    causes: [commandRef(commandId, command.type)],
    x,
    y,
    count,
    entityIds: ids
  });
  return ids;
}

function spawnCreatures(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const count = boundedCount(command.count ?? 1);
  if (command.species !== 'grazer') throw new RangeError('species must be grazer');
  if (!world.tiles[y * world.width + x]?.passable) throw new RangeError('creatures cannot spawn on impassable tiles');

  const commandId = world.nextCommandId++;
  const creatureIds = [];
  for (let i = 0; i < count; i += 1) {
    creatureIds.push(createGrazer(world, { x, y }).id);
  }
  pushEvent(world, {
    type: 'god.spawn_creature',
    subject: worldSubject(),
    causes: [commandRef(commandId, command.type)],
    species: command.species,
    x,
    y,
    count,
    creatureIds
  });
  return creatureIds;
}

function eraseHumans(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const targets = livingHumansAtTile(world, x, y);
  const entityIds = targets.map((human) => human.id);

  const commandId = world.nextCommandId++;
  const eraseEvent = pushEvent(world, {
    type: 'god.erase',
    subject: worldSubject(),
    causes: [commandRef(commandId, command.type)],
    x,
    y,
    count: entityIds.length,
    entityIds
  });

  killTargetHumans(world, targets, 'erased', eraseEvent.id);
  return entityIds;
}

function strikeLightning(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const tile = world.tiles[y * world.width + x];
  const targets = livingHumansAtTile(world, x, y);
  const entityIds = targets.map((human) => human.id);
  const vegetationBefore = tile.vegetation;

  const commandId = world.nextCommandId++;
  const lightningEvent = pushEvent(world, {
    type: 'god.lightning',
    subject: worldSubject(),
    causes: [commandRef(commandId, command.type)],
    x,
    y,
    vegetationBefore,
    vegetationAfter: 0,
    count: entityIds.length,
    entityIds
  });

  tile.vegetation = 0;
  killTargetHumans(world, targets, 'lightning', lightningEvent.id);
  return entityIds;
}

function strikeMeteor(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const tiles = impactTiles(world, x, y, METEOR_RADIUS);
  const impacted = new Set(tiles.map((tile) => tileKey(tile.x, tile.y)));
  const humanTargets = world.entities
    .filter((entity) => entity.kind === 'human' && entity.alive && impacted.has(tileKey(entity.x, entity.y)))
    .sort((a, b) => a.id - b.id);
  const creatureTargets = world.creatures
    .filter((creature) => creature.alive && impacted.has(tileKey(creature.x, creature.y)))
    .sort((a, b) => a.id - b.id);
  const entityIds = humanTargets.map((human) => human.id);
  const creatureIds = creatureTargets.map((creature) => creature.id);
  const passableTiles = tiles.filter((tile) => tile.passable);
  const vegetationRemoved = passableTiles.reduce((sum, tile) => sum + tile.vegetation, 0);
  const noEffect = entityIds.length === 0 && creatureIds.length === 0 && vegetationRemoved <= 1e-12;

  const commandId = world.nextCommandId++;
  const meteorEvent = pushEvent(world, {
    type: 'god.meteor',
    subject: worldSubject(),
    causes: [commandRef(commandId, command.type)],
    x,
    y,
    radius: METEOR_RADIUS,
    impactedTileCount: tiles.length,
    passableTileCount: passableTiles.length,
    vegetationRemoved,
    humanCount: entityIds.length,
    creatureCount: creatureIds.length,
    entityIds,
    creatureIds,
    noEffect
  });

  for (const tile of passableTiles) tile.vegetation = 0;
  killTargetHumans(world, humanTargets, 'meteor', meteorEvent.id);
  for (const creature of creatureTargets) {
    killCreature(world, creature, { cause: 'meteor', causes: [eventRef(meteorEvent.id)] });
  }
  world.creatures = world.creatures.filter((creature) => creature.alive);

  return {
    x,
    y,
    radius: METEOR_RADIUS,
    impactedTileCount: tiles.length,
    passableTileCount: passableTiles.length,
    vegetationRemoved,
    humanIds: entityIds,
    creatureIds,
    noEffect,
    eventId: meteorEvent.id
  };
}

function blessWithRain(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const tiles = impactTiles(world, x, y, RAIN_RADIUS);
  const passableTiles = tiles.filter((tile) => tile.passable);
  let vegetationAdded = 0;
  let foodAdded = 0;

  for (const tile of passableTiles) {
    vegetationAdded += Math.max(0, tile.vegetationCapacity - tile.vegetation);
    foodAdded += Math.max(0, tile.foodCapacity - tile.food);
  }
  const noEffect = vegetationAdded <= 1e-12 && foodAdded <= 1e-12;

  const commandId = world.nextCommandId++;
  const rainEvent = pushEvent(world, {
    type: 'god.rain',
    subject: worldSubject(),
    causes: [commandRef(commandId, command.type)],
    x,
    y,
    radius: RAIN_RADIUS,
    impactedTileCount: tiles.length,
    passableTileCount: passableTiles.length,
    vegetationAdded,
    foodAdded,
    noEffect
  });

  for (const tile of passableTiles) {
    tile.vegetation = tile.vegetationCapacity;
    tile.food = tile.foodCapacity;
  }

  return {
    x,
    y,
    radius: RAIN_RADIUS,
    impactedTileCount: tiles.length,
    passableTileCount: passableTiles.length,
    vegetationAdded,
    foodAdded,
    noEffect,
    eventId: rainEvent.id
  };
}

export function impactTiles(world, x, y, radius = METEOR_RADIUS) {
  integerInRange(x, 0, world.width - 1, 'x');
  integerInRange(y, 0, world.height - 1, 'y');
  if (!Number.isInteger(radius) || radius < 0) throw new RangeError('radius must be a non-negative integer');
  const tiles = [];
  const minY = Math.max(0, y - radius);
  const maxY = Math.min(world.height - 1, y + radius);
  const minX = Math.max(0, x - radius);
  const maxX = Math.min(world.width - 1, x + radius);
  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      tiles.push(world.tiles[tileY * world.width + tileX]);
    }
  }
  return tiles;
}

function livingHumansAtTile(world, x, y) {
  return world.entities
    .filter((entity) => entity.kind === 'human' && entity.alive && entity.x === x && entity.y === y)
    .sort((a, b) => a.id - b.id);
}

function killTargetHumans(world, targets, cause, causeEventId) {
  for (const human of targets) {
    killHuman(world, human, {
      cause,
      causes: [eventRef(causeEventId)]
    });
  }
  world.entities = world.entities.filter((entity) => entity.alive);
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function boundedCount(value) {
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new RangeError('count must be an integer from 1 to 1000');
  }
  return value;
}

function integerInRange(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}
