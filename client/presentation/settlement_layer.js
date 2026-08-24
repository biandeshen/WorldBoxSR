import { polityColor } from './polity_style.js';

export class SettlementLayer {
  constructor(scene, tileSize) { this.scene = scene; this.tileSize = tileSize; this.visuals = new Map(); }
  sync(view) {
    const activeIds = new Set();
    for (const settlement of view.settlements) {
      activeIds.add(settlement.id);
      const signature = settlementSignature(settlement);
      const current = this.visuals.get(settlement.id);
      if (current?.signature === signature) continue;
      if (current) destroyContainer(current.container);
      this.visuals.set(settlement.id, { signature, container: createSettlementVisual(this.scene, settlement, this.tileSize) });
    }
    for (const [id, visual] of this.visuals) {
      if (activeIds.has(id)) continue;
      destroyContainer(visual.container); this.visuals.delete(id);
    }
  }
  destroy() { for (const visual of this.visuals.values()) destroyContainer(visual.container); this.visuals.clear(); }
}

function settlementSignature(settlement) {
  return [settlement.name, settlement.active ? 'active' : 'abandoned', populationTier(settlement.population), settlement.population, settlement.polityId ?? 'none', settlement.polityName ?? 'none', settlement.polityColorIndex ?? 'none', settlement.polityBannerStyle ?? 'none', settlement.rulerId ?? 'vacant', settlement.isCapital ? 'capital' : 'member'].join('|');
}

function createSettlementVisual(scene, settlement, tileSize) {
  const x = (settlement.x + 0.5) * tileSize;
  const y = (settlement.y + 0.5) * tileSize;
  const scale = Math.max(0.86, tileSize / 24);
  const tier = populationTier(settlement.population);
  const color = polityColor(settlement.polityColorIndex ?? Math.max(0, settlement.id - 1));
  const children = [];
  const ground = scene.add.ellipse(0, 3, 36 + tier * 5, 25 + tier * 4, settlement.active ? 0x9b8451 : 0x68645b, settlement.active ? 0.22 : 0.12);
  ground.setStrokeStyle(1.2, settlement.active ? color : 0x80796e, settlement.active ? 0.48 : 0.2); children.push(ground);
  const roadColor = settlement.active ? 0xbba56c : 0x777168;
  children.push(scene.add.rectangle(0, 3, 30 + tier * 3, 3.2, roadColor, 0.58), scene.add.rectangle(0, 3, 3.2, 21 + tier * 3, roadColor, 0.58));
  const houseCount = Math.max(1, Math.min(6, tier + 1));
  const offsets = [[-8, 5], [7.5, 5], [-7, -6], [7.2, -6], [-14, -1], [14, -1]];
  for (let index = 0; index < houseCount; index += 1) { const [dx, dy] = offsets[index]; children.push(...createHouse(scene, dx, dy, settlement.active, color, index)); }
  if (tier >= 3) children.push(...createHall(scene, 0, -5, settlement.active, color));
  if (tier >= 2 && settlement.active) {
    children.push(scene.add.rectangle(-15, 9, 7, 5, 0x7f8445, 0.8).setStrokeStyle(1, 0xd1bb72, 0.34), scene.add.rectangle(15, 9, 7, 5, 0x748044, 0.8).setStrokeStyle(1, 0xd1bb72, 0.34), scene.add.rectangle(-15, 8.2, 5.5, 0.8, 0xd0bd5c, 0.72), scene.add.rectangle(15, 8.2, 5.5, 0.8, 0xd0bd5c, 0.72));
  }
  if (settlement.active) children.push(...createBanner(scene, settlement, tier, color));

  const primaryName = settlement.isCapital && settlement.polityName ? `♛ ${settlement.polityName}` : settlement.name;
  const rulerText = Number.isInteger(settlement.rulerId) ? `♔ #${settlement.rulerId}` : '♔ vacant';
  const secondaryText = settlement.polityName
    ? (settlement.isCapital ? `${rulerText} · ${settlement.name} · ⌂ ${settlement.population}` : `${settlement.polityName} · ⌂ ${settlement.population}`)
    : `⌂ ${settlement.population}`;
  const label = scene.add.text(0, -28 - tier, primaryName, { fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: tier >= 3 ? '11px' : '10px', fontStyle: 'bold', color: settlement.active ? '#fff2bf' : '#b9b1a2', stroke: '#10151c', strokeThickness: 3, align: 'center' }).setOrigin(0.5, 1);
  const population = scene.add.text(0, -25 - tier, secondaryText, { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '8px', color: settlement.active ? '#d8e1cd' : '#938d84', stroke: '#10151c', strokeThickness: 2, align: 'center' }).setOrigin(0.5, 0);
  children.push(label, population);
  if (!settlement.active) children.push(scene.add.text(0, 0, '×', { fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '18px', color: '#a9a39a', stroke: '#202020', strokeThickness: 2 }).setOrigin(0.5));
  const container = scene.add.container(x, y, children); container.setScale(scale); container.setAlpha(settlement.active ? 1 : 0.48); container.setDepth(20 + y / Math.max(1, tileSize)); return container;
}

function createBanner(scene, settlement, tier, color) {
  const x = 15 + tier * 1.4; const pole = scene.add.rectangle(x, -10, 1.2, 16, 0x59432f, 1); const flag = scene.add.rectangle(x + 4, -15.5, 8, 5, color, 1); const accent = lighten(color); const parts = [pole, flag]; const style = settlement.polityBannerStyle || 'plain';
  if (style === 'stripe') parts.push(scene.add.rectangle(x + 4, -15.5, 8, 1.2, accent, 0.92));
  else if (style === 'split') parts.push(scene.add.rectangle(x + 6, -15.5, 4, 5, accent, 0.6));
  else if (style === 'cross') { parts.push(scene.add.rectangle(x + 4, -15.5, 1.2, 5, accent, 0.9)); parts.push(scene.add.rectangle(x + 4, -15.5, 8, 1.1, accent, 0.9)); }
  else if (style === 'chevron') parts.push(scene.add.triangle(x + 2.6, -15.5, -2, -2.1, -2, 2.1, 1.7, 0, accent, 0.92));
  else parts.push(scene.add.rectangle(x + 2.4, -16.5, 3, 1.2, accent, 0.72));
  return parts;
}
function createHouse(scene, dx, dy, active, polityColorValue, index) {
  const wallColor = active ? (index % 2 === 0 ? 0xd3b174 : 0xc59a65) : 0x716d66; const roofColor = active ? mixColor(0x8c4638, polityColorValue, 0.2) : 0x514f4d;
  return [scene.add.ellipse(dx, dy + 5.8, 10, 3.6, 0x071015, 0.24), scene.add.rectangle(dx, dy + 1.7, 8.5, 7.4, wallColor, 1), scene.add.rectangle(dx - 2.2, dy + 0.7, 2.2, 4.5, lighten(wallColor), active ? 0.42 : 0.15), scene.add.triangle(dx, dy - 4, -5.4, 4, 5.4, 4, 0, -3.8, roofColor, 1), scene.add.rectangle(dx, dy + 3, 2.5, 4.5, 0x5a3d2c, 1), scene.add.rectangle(dx + 2.4, dy + 0.8, 1.4, 1.5, active ? 0xf4d77a : 0x4f4b45, active ? 0.85 : 0.35)];
}
function createHall(scene, dx, dy, active, polityColorValue) { return [scene.add.ellipse(dx, dy + 7.5, 16, 5, 0x071015, 0.28), scene.add.rectangle(dx, dy + 1.5, 13, 10, active ? 0xd8bd82 : 0x716d66, 1), scene.add.triangle(dx, dy - 5.5, -8, 4.5, 8, 4.5, 0, -5, active ? mixColor(0x713b35, polityColorValue, 0.28) : 0x4c4b48, 1), scene.add.rectangle(dx, dy + 3.8, 3.2, 5.4, 0x513628, 1), scene.add.rectangle(dx, dy - 2.8, 3, 3, active ? polityColorValue : 0x6d6861, 1)]; }
function populationTier(population) { if (population >= 45) return 4; if (population >= 25) return 3; if (population >= 10) return 2; return 1; }
function lighten(color) { const r = Math.min(255, ((color >> 16) & 0xff) + 34); const g = Math.min(255, ((color >> 8) & 0xff) + 34); const b = Math.min(255, (color & 0xff) + 34); return (r << 16) | (g << 8) | b; }
function mixColor(a, b, t) { const ar = (a >> 16) & 0xff; const ag = (a >> 8) & 0xff; const ab = a & 0xff; const br = (b >> 16) & 0xff; const bg = (b >> 8) & 0xff; const bb = b & 0xff; const r = Math.round(ar + (br - ar) * t); const g = Math.round(ag + (bg - ag) * t); const blue = Math.round(ab + (bb - ab) * t); return (r << 16) | (g << 8) | blue; }
function destroyContainer(container) { for (const child of container.list || []) child.destroy(); container.destroy(); }
