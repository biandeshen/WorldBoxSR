export function createTerrainLayer(scene, view, tileSize) {
  const graphics = scene.add.graphics();
  graphics.setDepth(0);
  renderTerrain(graphics, view, tileSize);
  return graphics;
}

export function renderTerrain(graphics, view, tileSize) {
  graphics.clear();
  const tileMap = new Map(view.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));

  for (const tile of view.tiles) {
    const px = tile.x * tileSize;
    const py = tile.y * tileSize;

    graphics.fillStyle(tileColor(tile, view.waterLevel), 1);
    graphics.fillRect(px, py, tileSize + 1, tileSize + 1);

    if (tile.biome === 'ocean') {
      drawWaterDetail(graphics, tile, px, py, tileSize, tileMap);
    } else {
      drawLandDetail(graphics, tile, px, py, tileSize, tileMap);
    }
  }
}

function tileColor(tile, waterLevel) {
  if (tile.biome === 'ocean') {
    const normalized = waterLevel > 0 ? Math.max(0, Math.min(1, tile.elevation / waterLevel)) : 0.5;
    if (normalized < 0.3) return 0x163650;
    if (normalized < 0.65) return 0x1d5272;
    return 0x2b7591;
  }

  if (tile.elevation > 0.78) return 0x74725f;
  if (tile.moisture > 0.72) return 0x3d7546;
  if (tile.moisture > 0.48) return 0x55854b;
  if (tile.fertility > 0.55) return 0x71894d;
  return 0x9a8b55;
}

function drawWaterDetail(graphics, tile, px, py, size, tileMap) {
  const phase = hash01(tile.x, tile.y, 17);
  const lineY = py + size * (0.28 + phase * 0.35);
  graphics.fillStyle(0x83c8d9, 0.16 + phase * 0.12);
  graphics.fillRect(px + size * 0.16, lineY, size * 0.42, Math.max(1, size * 0.06));

  if (hasNeighbor(tileMap, tile.x, tile.y, (candidate) => candidate.biome !== 'ocean')) {
    graphics.lineStyle(Math.max(1, size * 0.08), 0x65b7c6, 0.9);
    graphics.strokeRect(px + 1, py + 1, size - 2, size - 2);
  }
}

function drawLandDetail(graphics, tile, px, py, size, tileMap) {
  if (hasNeighbor(tileMap, tile.x, tile.y, (candidate) => candidate.biome === 'ocean')) {
    graphics.lineStyle(Math.max(1, size * 0.08), 0xd6cc83, 0.72);
    graphics.strokeRect(px + 1, py + 1, size - 2, size - 2);
  }

  const detail = hash01(tile.x, tile.y, 43);
  graphics.fillStyle(tile.elevation > 0.78 ? 0x9d9a83 : 0xc3b96f, 0.18);
  graphics.fillCircle(
    px + size * (0.25 + detail * 0.5),
    py + size * (0.28 + hash01(tile.x, tile.y, 59) * 0.45),
    Math.max(0.8, size * 0.035)
  );

  if (tile.vegetationRatio > 0.44 && tile.moisture > 0.35) {
    drawTree(graphics, px, py, size, tile);
  } else if (tile.vegetationRatio > 0.2) {
    drawGrass(graphics, px, py, size, tile);
  }
}

function drawTree(graphics, px, py, size, tile) {
  const jitterX = (hash01(tile.x, tile.y, 71) - 0.5) * size * 0.28;
  const jitterY = (hash01(tile.x, tile.y, 89) - 0.5) * size * 0.22;
  const cx = px + size * 0.52 + jitterX;
  const cy = py + size * 0.55 + jitterY;
  const canopy = Math.max(2, size * (0.13 + tile.vegetationRatio * 0.04));

  graphics.fillStyle(0x5a3c28, 0.9);
  graphics.fillRect(cx - Math.max(1, size * 0.025), cy + canopy * 0.45, Math.max(1, size * 0.05), canopy * 0.9);
  graphics.fillStyle(tile.moisture > 0.68 ? 0x245937 : 0x32683b, 0.96);
  graphics.fillCircle(cx - canopy * 0.38, cy, canopy * 0.72);
  graphics.fillCircle(cx + canopy * 0.36, cy + canopy * 0.06, canopy * 0.68);
  graphics.fillStyle(0x4b7f43, 0.95);
  graphics.fillCircle(cx, cy - canopy * 0.34, canopy * 0.72);
}

function drawGrass(graphics, px, py, size, tile) {
  const x = px + size * (0.3 + hash01(tile.x, tile.y, 103) * 0.4);
  const y = py + size * (0.35 + hash01(tile.x, tile.y, 127) * 0.35);
  graphics.fillStyle(0x365f35, 0.56);
  graphics.fillRect(x, y, Math.max(1, size * 0.04), Math.max(2, size * 0.18));
  graphics.fillRect(x + size * 0.08, y + size * 0.05, Math.max(1, size * 0.035), Math.max(2, size * 0.14));
}

function hasNeighbor(tileMap, x, y, predicate) {
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return offsets.some(([dx, dy]) => {
    const candidate = tileMap.get(`${x + dx},${y + dy}`);
    return candidate ? predicate(candidate) : false;
  });
}

function hash01(x, y, salt) {
  let value = Math.imul((x + 1) ^ salt, 0x45d9f3b) ^ Math.imul((y + 1) + salt, 0x119de1f3);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}
