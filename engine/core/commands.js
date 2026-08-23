import { createHuman } from '../model/human.js';
import { pushEvent } from '../model/events.js';

export function applyCommand(world, command) {
  if (!command || typeof command.type !== 'string') throw new TypeError('command.type is required');

  switch (command.type) {
    case 'spawn_human':
      return spawnHumans(world, command);
    default:
      throw new Error(`Unknown command type: ${command.type}`);
  }
}

function spawnHumans(world, command) {
  const x = integerInRange(command.x, 0, world.width - 1, 'x');
  const y = integerInRange(command.y, 0, world.height - 1, 'y');
  const count = command.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new RangeError('count must be an integer from 1 to 1000');

  const ids = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(createHuman(world, { x, y }).id);
  }
  pushEvent(world, { type: 'god.spawn_human', x, y, count, entityIds: ids });
  return ids;
}

function integerInRange(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}
