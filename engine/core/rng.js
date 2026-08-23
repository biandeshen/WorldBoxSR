export class SeededRng {
  constructor(seed = 1, state = null) {
    this.seed = normalizeSeed(seed);
    this.state = state === null ? this.seed : (state >>> 0);
  }

  nextUint32() {
    // Numerical Recipes LCG. Small, deterministic, serializable, and adequate
    // for simulation prototyping. Not suitable for cryptography.
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state;
  }

  float() {
    return this.nextUint32() / 0x100000000;
  }

  int(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('maxExclusive must be a positive integer');
    }
    return Math.floor(this.float() * maxExclusive);
  }

  range(min, max) {
    return min + (max - min) * this.float();
  }

  chance(probability) {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.float() < probability;
  }

  snapshot() {
    return { seed: this.seed, state: this.state };
  }

  static fromSnapshot(snapshot) {
    return new SeededRng(snapshot.seed, snapshot.state);
  }
}

export function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    const normalized = Math.trunc(seed) >>> 0;
    return normalized === 0 ? 0x6d2b79f5 : normalized;
  }

  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash >>>= 0;
  return hash === 0 ? 0x6d2b79f5 : hash;
}
