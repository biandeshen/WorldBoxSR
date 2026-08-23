const UINT32_RANGE = 0x100000000;

/**
 * Stateless deterministic randomness for optional mechanics that must not
 * perturb the world's authoritative sequential RNG stream.
 */
export function keyedUint32(seed, a, b, salt = 0) {
  let h = (seed ^ salt) >>> 0;
  h ^= Math.imul((a >>> 0) + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h ^= Math.imul((b >>> 0) + 0x165667b1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

export function keyedUnit(seed, a, b, salt = 0) {
  return keyedUint32(seed, a, b, salt) / UINT32_RANGE;
}

export function keyedChance(seed, a, b, salt, probability) {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return keyedUnit(seed, a, b, salt) < probability;
}

export function keyedIndex(seed, a, b, salt, length) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError('length must be a positive integer');
  return Math.floor(keyedUnit(seed, a, b, salt) * length);
}
