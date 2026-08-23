import { isTilePassable } from '../world/biomes.js';

export function createHuman(world, overrides = {}) {
  const { x, y } = resolveSpawnPosition(world, overrides);
  const ageYears = overrides.ageYears ?? world.rng.range(18, 35);
  const human = {
    id: world.nextEntityId++,
    kind: 'human',
    x,
    y,
    sex: overrides.sex ?? (world.rng.chance(0.5) ? 'F' : 'M'),
    ageDays: Math.floor(ageYears * world.config.daysPerYear),
    hunger: overrides.hunger ?? world.rng.range(0.05, 0.3),
    health: overrides.health ?? 1,
    birthCooldownDays: overrides.birthCooldownDays ?? 0,
    alive: true,
    bornDay: overrides.bornDay ?? world.day,
    causeOfDeath: null
  };
  world.entities.push(human);
  return human;
}

function resolveSpawnPosition(world, overrides) {
  const hasX = overrides.x !== undefined;
  const hasY = overrides.y !== undefined;
  if (hasX !== hasY) throw new TypeError('x and y must be provided together');

  if (hasX) {
    if (!Number.isInteger(overrides.x) || !Number.isInteger(overrides.y) ||
      overrides.x < 0 || overrides.y < 0 || overrides.x >= world.width || overrides.y >= world.height) {
      throw new RangeError('spawn position must be inside the world');
    }
    const tile = world.tiles[overrides.y * world.width + overrides.x];
    if (!isTilePassable(tile)) throw new RangeError('humans cannot spawn on impassable tiles');
    return { x: overrides.x, y: overrides.y };
  }

  const passable = world.tiles.filter(isTilePassable);
  if (passable.length === 0) throw new Error('world has no passable tiles for humans');
  const tile = passable[world.rng.int(passable.length)];
  return { x: tile.x, y: tile.y };
}
