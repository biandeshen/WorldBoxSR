export function vegetationCapacityForTile(tile) {
  if (!tile?.passable) return 0;
  return 2 + 8 * clamp01(tile.moisture);
}

export function initialVegetationForTile(tile) {
  const capacity = vegetationCapacityForTile(tile);
  if (capacity === 0) return 0;
  return capacity * (0.35 + 0.65 * clamp01(tile.fertility));
}

export function vegetationRegrowthFactor(tile) {
  if (!tile?.passable) return 0;
  return 0.2 + 0.8 * clamp01(tile.moisture);
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
