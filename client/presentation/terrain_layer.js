export function createTerrainLayer(scene, view, tileSize) {
  const base = scene.add.graphics().setDepth(0);
  const waterLight = scene.add.graphics().setDepth(1).setAlpha(0.5);
  const layer = {
    scene,
    base,
    waterLight,
    destroy() {
      scene.tweens.killTweensOf(waterLight);
      base.destroy();
      waterLight.destroy();
    }
  };

  scene.tweens.add({
    targets: waterLight,
    alpha: { from: 0.34, to: 0.72 },
    duration: 2200,
    ease: 'Sine.InOut',
    yoyo: true,
    repeat: -1
  });

  renderTerrain(layer, view, tileSize);
  return layer;
}

export function renderTerrain(layer, view, tileSize) {
  const base = layer.base ?? layer;
  const waterLight = layer.waterLight ?? layer;
  base.clear();
  if (waterLight !== base) waterLight.clear();

  const tileMap = new Map(view.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));

  for (const tile of view.tiles) {
    const px = tile.x * tileSize;
    const py = tile.y * tileSize;
    const shore = tile.biome === 'ocean'
      ? hasNeighbor(tileMap, tile.x, tile.y, (candidate) => candidate.biome !== 'ocean')
      : hasNeighbor(tileMap, tile.x, tile.y, (candidate) => candidate.biome === 'ocean');

    base.fillStyle(tileColor(tile, view.waterLevel, shore), 1);
    base.fillRect(px, py, tileSize + 1, tileSize + 1);

    if (tile.biome === 'ocean') {
      drawWaterDetail(base, waterLight, tile, px, py, tileSize, tileMap, shore);
    } else {
      drawLandDetail(base, tile, px, py, tileSize, tileMap, shore);
    }

    base.lineStyle(Math.max(0.5, tileSize * 0.018), 0x081014, tile.biome === 'ocean' ? 0.08 : 0.055);
    base.strokeRect(px, py, tileSize, tileSize);
  }
}

function tileColor(tile, waterLevel, shore) {
  if (tile.biome === 'ocean') {
    if (shore) return 0x2f8498;
    const normalized = waterLevel > 0 ? clamp01(tile.elevation / waterLevel) : 0.5;
    if (normalized < 0.24) return 0x102f49;
    if (normalized < 0.52) return 0x16445f;
    if (normalized < 0.76) return 0x1d6079;
    return 0x28798f;
  }

  if (tile.elevation > 0.84) return 0x6e6c5d;
  if (tile.elevation > 0.72) return tile.moisture > 0.5 ? 0x657853 : 0x827854;
  if (tile.moisture > 0.78) return 0x356b43;
  if (tile.moisture > 0.58) return 0x477d47;
  if (tile.fertility > 0.62) return 0x65884c;
  if (tile.fertility > 0.38) return 0x7f8b50;
  return 0x9a8853;
}

function drawWaterDetail(base, waterLight, tile, px, py, size, tileMap, shore) {
  const phase = hash01(tile.x, tile.y, 17);
  const waveWidth = size * (0.2 + phase * 0.3);
  const waveX = px + size * (0.12 + hash01(tile.x, tile.y, 21) * 0.48);
  const waveY = py + size * (0.2 + hash01(tile.x, tile.y, 29) * 0.54);

  base.fillStyle(0x082438, 0.1 + (1 - phase) * 0.07);
  base.fillRect(px + size * 0.08, py + size * 0.78, size * 0.84, Math.max(1, size * 0.045));

  waterLight.fillStyle(shore ? 0xb2e5e2 : 0x78bdd0, shore ? 0.36 : 0.2);
  waterLight.fillRect(waveX, waveY, waveWidth, Math.max(1, size * 0.055));
  if (phase > 0.55) {
    waterLight.fillRect(
      px + size * (0.18 + hash01(tile.x, tile.y, 33) * 0.36),
      py + size * (0.52 + hash01(tile.x, tile.y, 37) * 0.2),
      size * 0.18,
      Math.max(1, size * 0.04)
    );
  }

  if (shore) drawShoreFoam(base, tile, px, py, size, tileMap, true);
}

function drawLandDetail(base, tile, px, py, size, tileMap, shore) {
  if (shore) {
    drawBeachEdge(base, tile, px, py, size, tileMap);
    drawShoreFoam(base, tile, px, py, size, tileMap, false);
  }

  drawGroundTexture(base, tile, px, py, size);

  if (tile.elevation > 0.78) {
    drawRock(base, px, py, size, tile);
  }

  if (tile.vegetationRatio > 0.62 && tile.moisture > 0.42) {
    const count = tile.vegetationRatio > 0.84 ? 3 : 2;
    for (let index = 0; index < count; index += 1) drawTree(base, px, py, size, tile, index);
  } else if (tile.vegetationRatio > 0.4 && tile.moisture > 0.34) {
    drawTree(base, px, py, size, tile, 0);
  } else if (tile.vegetationRatio > 0.18) {
    drawGrass(base, px, py, size, tile);
  }
}

function drawBeachEdge(base, tile, px, py, size, tileMap) {
  const thickness = Math.max(2, size * 0.14);
  base.fillStyle(0xc9b36f, 0.92);

  if (isOcean(tileMap, tile.x, tile.y - 1)) base.fillRect(px, py, size, thickness);
  if (isOcean(tileMap, tile.x, tile.y + 1)) base.fillRect(px, py + size - thickness, size, thickness);
  if (isOcean(tileMap, tile.x - 1, tile.y)) base.fillRect(px, py, thickness, size);
  if (isOcean(tileMap, tile.x + 1, tile.y)) base.fillRect(px + size - thickness, py, thickness, size);
}

function drawShoreFoam(base, tile, px, py, size, tileMap, waterSide) {
  const width = Math.max(1, size * 0.055);
  base.fillStyle(waterSide ? 0xc3ece7 : 0xf1e0a6, waterSide ? 0.62 : 0.28);

  const targetOcean = !waterSide;
  if (neighborMatches(tileMap, tile.x, tile.y - 1, targetOcean)) base.fillRect(px + size * 0.08, py, size * 0.84, width);
  if (neighborMatches(tileMap, tile.x, tile.y + 1, targetOcean)) base.fillRect(px + size * 0.08, py + size - width, size * 0.84, width);
  if (neighborMatches(tileMap, tile.x - 1, tile.y, targetOcean)) base.fillRect(px, py + size * 0.08, width, size * 0.84);
  if (neighborMatches(tileMap, tile.x + 1, tile.y, targetOcean)) base.fillRect(px + size - width, py + size * 0.08, width, size * 0.84);
}

function drawGroundTexture(base, tile, px, py, size) {
  const dry = tile.moisture < 0.42;
  const detailColor = tile.elevation > 0.75 ? 0xa29b78 : dry ? 0xd0bd72 : 0xa8bc66;
  base.fillStyle(detailColor, tile.elevation > 0.75 ? 0.16 : 0.12);

  const dots = tile.fertility > 0.5 ? 3 : 2;
  for (let index = 0; index < dots; index += 1) {
    const x = px + size * (0.16 + hash01(tile.x, tile.y, 41 + index * 11) * 0.68);
    const y = py + size * (0.17 + hash01(tile.x, tile.y, 47 + index * 13) * 0.66);
    const dot = Math.max(1, Math.round(size * (0.025 + hash01(tile.x, tile.y, 53 + index * 7) * 0.02)));
    base.fillRect(x, y, dot, dot);
  }
}

function drawTree(base, px, py, size, tile, index) {
  const salt = 71 + index * 41;
  const cx = px + size * (0.24 + hash01(tile.x, tile.y, salt) * 0.54);
  const cy = py + size * (0.3 + hash01(tile.x, tile.y, salt + 9) * 0.48);
  const canopy = Math.max(2, size * (0.11 + tile.vegetationRatio * 0.025));
  const trunkW = Math.max(1, Math.round(size * 0.045));

  base.fillStyle(0x16251b, 0.2);
  base.fillRect(cx - canopy * 0.72, cy + canopy * 0.72, canopy * 1.5, Math.max(1, canopy * 0.36));
  base.fillStyle(0x62442c, 0.98);
  base.fillRect(cx - trunkW / 2, cy + canopy * 0.3, trunkW, canopy * 1.08);

  const dark = tile.moisture > 0.7 ? 0x1f5235 : 0x285f37;
  const mid = tile.moisture > 0.7 ? 0x2d6b3c : 0x397441;
  const light = tile.moisture > 0.7 ? 0x4d8248 : 0x5a8b4d;
  base.fillStyle(dark, 1);
  base.fillRect(cx - canopy, cy - canopy * 0.35, canopy * 2, canopy * 1.15);
  base.fillStyle(mid, 1);
  base.fillRect(cx - canopy * 0.72, cy - canopy * 0.95, canopy * 1.48, canopy * 1.1);
  base.fillStyle(light, 0.9);
  base.fillRect(cx - canopy * 0.45, cy - canopy * 0.82, canopy * 0.72, canopy * 0.38);
}

function drawGrass(base, px, py, size, tile) {
  const x = px + size * (0.22 + hash01(tile.x, tile.y, 103) * 0.5);
  const y = py + size * (0.34 + hash01(tile.x, tile.y, 127) * 0.34);
  const blade = Math.max(1, Math.round(size * 0.04));
  base.fillStyle(tile.moisture > 0.55 ? 0x2c6037 : 0x536b39, 0.62);
  base.fillRect(x, y, blade, Math.max(2, size * 0.18));
  base.fillRect(x + size * 0.08, y + size * 0.04, blade, Math.max(2, size * 0.14));
  base.fillRect(x - size * 0.07, y + size * 0.08, blade, Math.max(2, size * 0.11));
}

function drawRock(base, px, py, size, tile) {
  const x = px + size * (0.22 + hash01(tile.x, tile.y, 149) * 0.46);
  const y = py + size * (0.3 + hash01(tile.x, tile.y, 157) * 0.4);
  const w = size * (0.14 + hash01(tile.x, tile.y, 163) * 0.08);
  const h = w * 0.7;
  base.fillStyle(0x45483f, 0.35);
  base.fillRect(x + size * 0.04, y + h * 0.55, w, h * 0.45);
  base.fillStyle(0x918e79, 0.78);
  base.fillRect(x, y, w, h);
  base.fillStyle(0xb0aa8d, 0.5);
  base.fillRect(x + w * 0.16, y + h * 0.14, w * 0.42, Math.max(1, h * 0.18));
}

function isOcean(tileMap, x, y) {
  const tile = tileMap.get(`${x},${y}`);
  return tile?.biome === 'ocean';
}

function neighborMatches(tileMap, x, y, targetOcean) {
  const tile = tileMap.get(`${x},${y}`);
  if (!tile) return false;
  return targetOcean ? tile.biome === 'ocean' : tile.biome !== 'ocean';
}

function hasNeighbor(tileMap, x, y, predicate) {
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return offsets.some(([dx, dy]) => {
    const candidate = tileMap.get(`${x + dx},${y + dy}`);
    return candidate ? predicate(candidate) : false;
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hash01(x, y, salt) {
  let value = Math.imul((x + 1) ^ salt, 0x45d9f3b) ^ Math.imul((y + 1) + salt, 0x119de1f3);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}
