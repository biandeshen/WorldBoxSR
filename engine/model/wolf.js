import { isTilePassable } from '../world/biomes.js';

/**
 * Capability 2 Wolf identity only. Wolves deliberately have no autonomous
 * system behavior until the dedicated predation slice owns movement, hunger,
 * hunting, feeding, mortality and any reproduction decisions.
 */
export function createWolf(world, {
  x,
  y,
  ageDays = 0,
  hunger = 0.1,
  health = 1,
  bornDay = world.day,
  lastBirthDay = null
} = {}) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= world.width || y >= world.height) {
    throw new RangeError('wolf position must be inside the world');
  }
  const tile = world.tiles[y * world.width + x];
  if (!isTilePassable(tile)) throw new RangeError('wolves cannot spawn on impassable tiles');
  if (!Number.isInteger(ageDays) || ageDays < 0) throw new RangeError('ageDays must be a non-negative integer');
  if (!Number.isFinite(hunger) || hunger < 0 || hunger > 1) throw new RangeError('hunger must be from 0 to 1');
  if (!Number.isFinite(health) || health <= 0 || health > 1) throw new RangeError('health must be > 0 and <= 1');
  if (lastBirthDay !== null && (!Number.isInteger(lastBirthDay) || lastBirthDay < 0 || lastBirthDay > world.day)) {
    throw new RangeError('lastBirthDay must be null or a non-negative integer no later than world.day');
  }

  const wolf = {
    id: world.nextCreatureId++,
    kind: 'creature',
    species: 'wolf',
    x,
    y,
    ageDays,
    hunger,
    health,
    alive: true,
    bornDay,
    lastBirthDay,
    causeOfDeath: null
  };
  world.creatures.push(wolf);
  return wolf;
}
