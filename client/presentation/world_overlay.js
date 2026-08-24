const SETTLEMENT_COLORS = [0xd85f55, 0x5e8bd8, 0xe1b453, 0x6eb878, 0x9a72cc, 0xd679b0];

const TOOL_STYLES = Object.freeze({
  spawn_human: { color: 0x8ad6ff, fillAlpha: 0.11, label: 'Create human' },
  spawn_grazer: { color: 0xf0bf68, fillAlpha: 0.11, label: 'Create grazer' },
  erase: { color: 0xff6f6f, fillAlpha: 0.09, label: 'Erase humans' },
  lightning: { color: 0xffdf68, fillAlpha: 0.13, label: 'Lightning' }
});

export function settlementColor(id) {
  if (!Number.isInteger(id) || id < 1) return 0x8c8c8c;
  return SETTLEMENT_COLORS[(id - 1) % SETTLEMENT_COLORS.length];
}

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
  const cells = [];
  for (const tile of view.tiles) {
    const owner = tile.ownerSettlementId;
    if (!Number.isInteger(owner) || owner < 1) continue;
    cells.push({
      x: tile.x,
      y: tile.y,
      ownerSettlementId: owner,
      edges: {
        left: ownerAt(view, tile.x - 1, tile.y) !== owner,
        right: ownerAt(view, tile.x + 1, tile.y) !== owner,
        top: ownerAt(view, tile.x, tile.y - 1) !== owner,
        bottom: ownerAt(view, tile.x, tile.y + 1) !== owner
      }
    });
  }
  return cells;
}

export function territorySignature(view) {
  let hash = 2166136261;
  for (const tile of view?.tiles || []) {
    const owner = Number.isInteger(tile.ownerSettlementId) ? tile.ownerSettlementId : 0;
    hash ^= owner + Math.imul(tile.x + 1, 31) + Math.imul(tile.y + 1, 131);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ownerAt(view, x, y) {
  if (x < 0 || y < 0 || x >= view.width || y >= view.height) return null;
  return view.tiles[y * view.width + x]?.ownerSettlementId ?? null;
}
