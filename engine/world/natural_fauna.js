import { keyedIndex } from '../core/keyed_random.js';
import { createGrazer } from '../model/grazer.js';

export const NATURAL_GRAZER_FOUNDER_COUNT = 10;
export const NATURAL_GRAZER_TILE_POOL = 32;
export const NATURAL_GRAZER_MAX_FOUNDER_AGE_YEARS = 6;
export const NATURAL_GRAZER_INIT_AGE_SALT = 0x1b56c4e9;
export const NATURAL_GRAZER_CONFIG = Object.freeze({
  grazerBirthChancePerEligiblePairPerDay: 0.001,
  grazerOldAgeMortalityEnabled: true
});

/**
 * Exact Sprint 021 natural-fauna initializer promoted for the supported
 * 24x24 Living Ecology preset. This is intentionally not a universal fauna
 * initializer: compact-map behavior remains outside the v0.6 release promise.
 *
 * Founder placement and ages consume no sequential world RNG.
 */
export function initializeValidatedNaturalGrazers(world) {
  validateSupportedWorld(world);

  const spawnTiles = naturalGrazerSpawnPool(world);
  const maxAgeDays = NATURAL_GRAZER_MAX_FOUNDER_AGE_YEARS * world.config.daysPerYear;
  const founders = [];

  for (let index = 0; index < NATURAL_GRAZER_FOUNDER_COUNT; index += 1) {
    const futureCreatureId = world.nextCreatureId;
    const ageDays = keyedIndex(
      world.seed,
      futureCreatureId,
      0,
      NATURAL_GRAZER_INIT_AGE_SALT,
      maxAgeDays + 1
    );
    const tile = spawnTiles[index % spawnTiles.length];
    founders.push(createGrazer(world, {
      x: tile.x,
      y: tile.y,
      ageDays,
      bornDay: -ageDays
    }));
  }

  return founders;
}

export function naturalGrazerSpawnPool(world) {
  if (!world || !Array.isArray(world.tiles)) throw new TypeError('world.tiles is required');
  const pool = [...world.tiles]
    .filter((tile) => tile.passable)
    .sort((a, b) => b.vegetation - a.vegetation || a.y - b.y || a.x - b.x)
    .slice(0, NATURAL_GRAZER_TILE_POOL);
  if (pool.length === 0) throw new Error('supported natural-fauna world has no passable founder tiles');
  return pool;
}

function validateSupportedWorld(world) {
  if (!world || world.width !== 24 || world.height !== 24) {
    throw new RangeError('validated natural grazer initializer supports exactly 24x24 worlds');
  }
  if (world.day !== 0) throw new RangeError('natural grazer founders must initialize at day 0');
  if (!Array.isArray(world.creatures) || world.creatures.length !== 0) {
    throw new RangeError('natural grazer founders require an empty creature domain');
  }
  if (world.config?.grazerBirthChancePerEligiblePairPerDay !== NATURAL_GRAZER_CONFIG.grazerBirthChancePerEligiblePairPerDay
      || world.config?.grazerOldAgeMortalityEnabled !== true) {
    throw new RangeError('world config must enable the validated natural grazer ecology settings');
  }
}
