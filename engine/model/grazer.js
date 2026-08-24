import { isTilePassable } from '../world/biomes.js';

export function createGrazer(world, {
  x,
  y,
  ageDays = 0,
  hunger = 0.1,
  health = 1,
  bornDay = world.day,
  lastBirthDay = null
} = {}) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= world.width || y >= world.height) {
    throw new RangeError('grazer position must be inside the world');
  }
  const tile = world.tiles[y * world.width + x];
  if (!isTilePassable(tile)) throw new RangeError('grazers cannot spawn on impassable tiles');
  if (!Number.isInteger(ageDays) || ageDays < 0) throw new RangeError('ageDays must be a non-negative integer');
  if (!Number.isFinite(hunger) || hunger < 0 || hunger > 1) throw new RangeError('hunger must be from 0 to 1');
  if (!Number.isFinite(health) || health <= 0 || health > 1) throw new RangeError('health must be > 0 and <= 1');
  if (lastBirthDay !== null && (!Number.isInteger(lastBirthDay) || lastBirthDay < 0)) {
    throw new RangeError('lastBirthDay must be null or a non-negative integer');
  }

  const grazer = {
    id: world.nextCreatureId++,
    kind: 'creature',
    species: 'grazer',
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
  world.creatures.push(grazer);
  return grazer;
}
