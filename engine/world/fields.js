const UINT32_RANGE = 0x100000000;

/**
 * Generate smooth, deterministic scalar fields without consuming the world's
 * sequential RNG stream. Keeping field generation coordinate-addressable means
 * adding/removing a sampled tile cannot silently shift unrelated entity RNG.
 */
export function generateWorldFields({ seed, width, height }) {
  const elevation = new Float64Array(width * height);
  const moisture = new Float64Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const nx = width === 1 ? 0.5 : x / (width - 1);
      const ny = height === 1 ? 0.5 : y / (height - 1);

      const elevationNoise = fractalValueNoise(seed, nx, ny, 0x6d2b79f5);
      const moistureNoise = fractalValueNoise(seed, nx, ny, 0x9e3779b9);

      // A gentle island falloff gives the next biome slice useful geography
      // without deciding the land/water threshold in this module.
      const dx = nx * 2 - 1;
      const dy = ny * 2 - 1;
      const radialDistance = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const island = 1 - smoothstep(radialDistance);

      elevation[index] = clamp01(elevationNoise * 0.75 + island * 0.4 - 0.2);
      moisture[index] = clamp01(moistureNoise);
    }
  }

  return { elevation, moisture };
}

function fractalValueNoise(seed, nx, ny, salt) {
  const scales = [2, 4, 8];
  const weights = [0.55, 0.3, 0.15];
  let value = 0;

  for (let octave = 0; octave < scales.length; octave += 1) {
    value += valueNoise(seed, nx, ny, scales[octave], salt + octave * 0x85ebca6b) * weights[octave];
  }

  return value;
}

function valueNoise(seed, nx, ny, scale, salt) {
  const gx = nx * scale;
  const gy = ny * scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(gx - x0);
  const ty = smoothstep(gy - y0);

  const a = hashUnit(seed, x0, y0, salt);
  const b = hashUnit(seed, x1, y0, salt);
  const c = hashUnit(seed, x0, y1, salt);
  const d = hashUnit(seed, x1, y1, salt);

  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function hashUnit(seed, x, y, salt) {
  let h = (seed ^ salt) >>> 0;
  h ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h ^= Math.imul(y + 0x165667b1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / UINT32_RANGE;
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
