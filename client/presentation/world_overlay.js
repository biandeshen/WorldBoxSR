import { godPowerMeta, godPowerTargetRadius } from './god_power_catalog.js';

export function targetStyle(tool, tile) {
  const meta = godPowerMeta(tool);
  const invalid = Boolean(meta.requiresPassable && tile && tile.passable === false);
  return {
    color: invalid ? 0xff6f6f : meta.targetColor,
    fillAlpha: meta.targetFillAlpha,
    label: invalid ? `${meta.label} · needs land` : meta.label,
    invalid
  };
}

export function toolTargetRadius(tool) {
  return godPowerTargetRadius(tool);
}

export function targetFootprint(tool, centerX, centerY, width, height) {
  if (![centerX, centerY, width, height].every(Number.isInteger)) return [];
  if (width < 1 || height < 1 || centerX < 0 || centerY < 0 || centerX >= width || centerY >= height) return [];
  const radius = toolTargetRadius(tool);
  const cells = [];
  for (let y = Math.max(0, centerY - radius); y <= Math.min(height - 1, centerY + radius); y += 1) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(width - 1, centerX + radius); x += 1) {
      cells.push({ x, y, center: x === centerX && y === centerY });
    }
  }
  return cells;
}

export function territoryCells(view) {
  if (!view?.tiles || !Number.isInteger(view.width) || !Number.isInteger(view.height)) return [];
  const settlementById = new Map((view.settlements || []).map((settlement) => [settlement.id, settlement]));
  const polityById = new Map((view.polities || []).map((polity) => [polity.id, polity]));
  const politicalOwner = (tile) => {
    const settlement = Number.isInteger(tile?.ownerSettlementId) ? settlementById.get(tile.ownerSettlementId) : null;
    return Number.isInteger(settlement?.polityId) ? settlement.polityId : (tile?.ownerSettlementId ?? null);
  };
  const cells = [];

  for (const tile of view.tiles) {
    if (!Number.isInteger(tile.ownerSettlementId) || tile.ownerSettlementId < 1) continue;
    const ownerPolityId = politicalOwner(tile);
    const polity = Number.isInteger(ownerPolityId) ? polityById.get(ownerPolityId) : null;
    cells.push({
      x: tile.x,
      y: tile.y,
      ownerSettlementId: tile.ownerSettlementId,
      ownerPolityId,
      colorIndex: polity?.colorIndex ?? Math.max(0, tile.ownerSettlementId - 1),
      edges: {
        left: ownerAt(view, settlementById, tile.x - 1, tile.y) !== ownerPolityId,
        right: ownerAt(view, settlementById, tile.x + 1, tile.y) !== ownerPolityId,
        top: ownerAt(view, settlementById, tile.x, tile.y - 1) !== ownerPolityId,
        bottom: ownerAt(view, settlementById, tile.x, tile.y + 1) !== ownerPolityId
      }
    });
  }
  return cells;
}

export function territorySignature(view) {
  let hash = 2166136261;
  for (const cell of territoryCells(view)) {
    hash ^= (cell.ownerPolityId ?? 0) + Math.imul(cell.colorIndex + 1, 17) + Math.imul(cell.x + 1, 31) + Math.imul(cell.y + 1, 131);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ownerAt(view, settlementById, x, y) {
  if (x < 0 || y < 0 || x >= view.width || y >= view.height) return null;
  const tile = view.tiles[y * view.width + x];
  if (!Number.isInteger(tile?.ownerSettlementId)) return null;
  const settlement = settlementById.get(tile.ownerSettlementId);
  return Number.isInteger(settlement?.polityId) ? settlement.polityId : tile.ownerSettlementId;
}
