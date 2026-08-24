const TOOL_STYLES = Object.freeze({
  spawn_human: { color: 0x8ad6ff, fillAlpha: 0.11, label: 'Create human' },
  spawn_grazer: { color: 0xf0bf68, fillAlpha: 0.11, label: 'Create grazer' },
  erase: { color: 0xff6f6f, fillAlpha: 0.09, label: 'Erase humans' },
  lightning: { color: 0xffdf68, fillAlpha: 0.13, label: 'Lightning' }
});

export function targetStyle(tool, tile) {
  const base = TOOL_STYLES[tool] || TOOL_STYLES.spawn_human;
  const spawnTool = tool === 'spawn_human' || tool === 'spawn_grazer';
  const invalid = Boolean(spawnTool && tile && tile.passable === false);
  return {
    ...base,
    invalid,
    color: invalid ? 0xff6f6f : base.color,
    label: invalid ? `${base.label} · needs land` : base.label
  };
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
