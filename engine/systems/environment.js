import { vegetationRegrowthFactor } from '../world/vegetation.js';

export function regenerateFood(world) {
  const base = world.config.foodRegrowthPerDay;
  for (const tile of world.tiles) {
    tile.food = Math.min(tile.foodCapacity, tile.food + base * tile.fertility);
  }
}

export function regenerateVegetation(world) {
  const base = world.config.vegetationRegrowthPerDay;
  for (const tile of world.tiles) {
    if (!tile.passable) {
      tile.vegetation = 0;
      continue;
    }
    tile.vegetation = Math.min(
      tile.vegetationCapacity,
      tile.vegetation + base * vegetationRegrowthFactor(tile)
    );
  }
}
