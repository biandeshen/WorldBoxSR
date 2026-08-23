export function regenerateFood(world) {
  const base = world.config.foodRegrowthPerDay;
  for (const tile of world.tiles) {
    tile.food = Math.min(tile.foodCapacity, tile.food + base * tile.fertility);
  }
}
