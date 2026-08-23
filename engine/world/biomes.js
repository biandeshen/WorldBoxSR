export const BIOME_OCEAN = 'ocean';
export const BIOME_LAND = 'land';

export function classifyTileBiome(tile, config) {
  return tile.elevation < config.waterLevel ? BIOME_OCEAN : BIOME_LAND;
}

export function isTilePassable(tile) {
  return tile?.passable === true;
}
