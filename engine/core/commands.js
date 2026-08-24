import { createHuman } from '../model/human.js';
import { killHuman } from '../model/human_lifecycle.js';
import { commandRef, eventRef, pushEvent, worldSubject } from '../model/events.js';

export function applyCommand(world, command) {
  if (!command || typeof command.type !== 'string') throw new TypeError('command.type is required');

  switch (command.type) {
    case 'spawn_human':
      return spawnHumans(world, command);
    case 'erase':
      return eraseHumans(world, command);
    case 'lightning':
      return strikeLightning(world, command);
    default:
      throw new Error(`Unknown command type: ${command.type}`);
  }
}

function spawnHumans(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const count = command.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new RangeError('count must be an integer from 1 to 1000');
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

function integerInRange(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}
