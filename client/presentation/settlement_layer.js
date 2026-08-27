import { polityColor } from './polity_style.js';
import { populationTier, settlementVisualProfile } from './settlement_visual_profile.js';

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
  return [settlement.name, settlement.active ? 'active' : 'abandoned', populationTier(settlement.population), settlement.population, settlement.polityId ?? 'none', settlement.polityName ?? 'none', settlement.polityColorIndex ?? 'none', settlement.polityBannerStyle ?? 'none', settlement.rulerId ?? 'vacant', settlement.isCapital ? 'capital' : 'member', settlement.relationStance ?? 'none', settlement.atWar ? 'war' : 'peace'].join('|');
}

function createSettlementVisual(scene, settlement, tileSize) {
  const x = (settlement.x + 0.5) * tileSize;
  const y = (settlement.y + 0.5) * tileSize;
  const scale = Math.max(0.86, tileSize / 24);
  const profile = settlementVisualProfile(settlement.population, { isCapital: settlement.isCapital });
  const tier = profile.tier;
  const color = polityColor(settlement.polityColorIndex ?? Math.max(0, settlement.id - 1));
  const children = [];

  const ground = scene.add.ellipse(
    0,
    4,
    profile.groundWidth,
    profile.groundHeight,
    settlement.active ? 0x9b8451 : 0x68645b,
    settlement.active ? 0.21 : 0.12
  );
  ground.setStrokeStyle(
    tier >= 3 ? 1.5 : 1.2,
    settlement.atWar ? 0xd35a4a : (settlement.active ? color : 0x80796e),
    settlement.atWar ? 0.92 : (settlement.active ? 0.52 : 0.2)
  );
  children.push(ground);

  if (profile.capitalEmphasis && settlement.active) {
    children.push(
      scene.add.ellipse(0, -4, 27 * profile.civicScale, 20 * profile.civicScale, color, 0.08)
        .setStrokeStyle(1.2, lighten(color), 0.5)
    );
  }

  if (settlement.atWar && settlement.active) {
    children.push(
      scene.add.ellipse(0, 4, profile.groundWidth + 9, profile.groundHeight + 8, 0x000000, 0)
        .setStrokeStyle(1.6, 0xe16b58, 0.75)
    );
    children.push(
      scene.add.text(-profile.groundWidth / 2 + 5, -profile.groundHeight / 2 - 5, '⚔', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '11px', color: '#ff8b76', stroke: '#10151c', strokeThickness: 3
      }).setOrigin(0.5)
    );
  }

  const roadColor = settlement.active ? 0xbba56c : 0x777168;
  children.push(
    scene.add.rectangle(0, 4, profile.roadWidth, tier >= 3 ? 3.8 : 3.2, roadColor, 0.58),
    scene.add.rectangle(0, 4, tier >= 3 ? 3.8 : 3.2, profile.roadHeight, roadColor, 0.58)
  );
  if (tier >= 3) {
    children.push(scene.add.rectangle(0, -9, profile.roadWidth * 0.72, 2.4, roadColor, 0.38));
  }
  if (tier >= 4) {
    children.push(scene.add.rectangle(-15, 4, 2.4, profile.roadHeight * 0.78, roadColor, 0.34));
    children.push(scene.add.rectangle(15, 4, 2.4, profile.roadHeight * 0.78, roadColor, 0.34));
  }

  for (let index = 0; index < profile.farmOffsets.length; index += 1) {
    const [dx, dy] = profile.farmOffsets[index];
    children.push(...createField(scene, dx, dy, settlement.active, index));
  }

  for (let index = 0; index < profile.houseOffsets.length; index += 1) {
    const [dx, dy] = profile.houseOffsets[index];
    children.push(...createHouse(scene, dx, dy, settlement.active, color, index));
  }

  if (profile.hall) {
    const hall = createHall(scene, 0, -4, settlement.active, color);
    for (const part of hall) part.setScale(profile.civicScale);
    children.push(...hall);
  }

  if (settlement.active) {
    children.push(...createBanner(scene, settlement, profile, color));
  }

  const primaryName = settlement.isCapital && settlement.polityName ? `♛ ${settlement.polityName}` : settlement.name;
  const rulerText = Number.isInteger(settlement.rulerId) ? `♔ #${settlement.rulerId}` : '♔ vacant';
  const diplomacyText = settlement.atWar ? ` · ⚔ ${settlement.relationCounterpartName ?? 'war'}` : '';
  const secondaryText = settlement.polityName
    ? (settlement.isCapital ? `${rulerText} · ${settlement.name} · ⌂ ${settlement.population}${diplomacyText}` : `${settlement.polityName} · ⌂ ${settlement.population}${diplomacyText}`)
    : `⌂ ${settlement.population}`;
  const label = scene.add.text(0, -profile.labelOffset, primaryName, {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: tier >= 3 ? '11px' : '10px',
    fontStyle: 'bold',
    color: settlement.active ? '#fff2bf' : '#b9b1a2',
    stroke: '#10151c',
    strokeThickness: 3,
    align: 'center'
  }).setOrigin(0.5, 1);
  const population = scene.add.text(0, -profile.labelOffset + 3, secondaryText, {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '8px',
    color: settlement.atWar ? '#ffb4a7' : (settlement.active ? '#d8e1cd' : '#938d84'),
    stroke: '#10151c',
    strokeThickness: 2,
    align: 'center'
  }).setOrigin(0.5, 0);
  children.push(label, population);

  if (!settlement.active) {
    children.push(scene.add.text(0, 0, '×', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '18px', color: '#a9a39a', stroke: '#202020', strokeThickness: 2
    }).setOrigin(0.5));
  }

  const container = scene.add.container(x, y, children);
  container.setScale(scale);
  container.setAlpha(settlement.active ? 1 : 0.48);
  container.setDepth(20 + y / Math.max(1, tileSize));
  return container;
}

function createBanner(scene, settlement, profile, color) {
  const x = profile.groundWidth / 2 - 7;
  const scale = profile.bannerScale;
  const pole = scene.add.rectangle(x, -10, 1.2, 17, 0x59432f, 1).setScale(scale);
  const flag = scene.add.rectangle(x + 4.2 * scale, -16, 8.5, 5.2, color, 1).setScale(scale);
  const accent = lighten(color);
  const parts = [pole, flag];
  const style = settlement.polityBannerStyle || 'plain';
  if (style === 'stripe') parts.push(scene.add.rectangle(x + 4.2 * scale, -16, 8.5, 1.2, accent, 0.92).setScale(scale));
  else if (style === 'split') parts.push(scene.add.rectangle(x + 6.2 * scale, -16, 4, 5.2, accent, 0.6).setScale(scale));
  else if (style === 'cross') {
    parts.push(scene.add.rectangle(x + 4.2 * scale, -16, 1.2, 5.2, accent, 0.9).setScale(scale));
    parts.push(scene.add.rectangle(x + 4.2 * scale, -16, 8.5, 1.1, accent, 0.9).setScale(scale));
  } else if (style === 'chevron') {
    parts.push(scene.add.triangle(x + 2.8 * scale, -16, -2, -2.1, -2, 2.1, 1.7, 0, accent, 0.92).setScale(scale));
  } else {
    parts.push(scene.add.rectangle(x + 2.6 * scale, -17, 3, 1.2, accent, 0.72).setScale(scale));
  }
  return parts;
}

function createHouse(scene, dx, dy, active, polityColorValue, index) {
  const wallColor = active ? (index % 2 === 0 ? 0xd3b174 : 0xc59a65) : 0x716d66;
  const roofColor = active ? mixColor(0x8c4638, polityColorValue, 0.2) : 0x514f4d;
  return [
    scene.add.ellipse(dx, dy + 5.8, 10, 3.6, 0x071015, 0.24),
    scene.add.rectangle(dx, dy + 1.7, 8.5, 7.4, wallColor, 1),
    scene.add.rectangle(dx - 2.2, dy + 0.7, 2.2, 4.5, lighten(wallColor), active ? 0.42 : 0.15),
    scene.add.triangle(dx, dy - 4, -5.4, 4, 5.4, 4, 0, -3.8, roofColor, 1),
    scene.add.rectangle(dx, dy + 3, 2.5, 4.5, 0x5a3d2c, 1),
    scene.add.rectangle(dx + 2.4, dy + 0.8, 1.4, 1.5, active ? 0xf4d77a : 0x4f4b45, active ? 0.85 : 0.35)
  ];
}

function createField(scene, dx, dy, active, index) {
  const fieldColor = active ? (index % 2 === 0 ? 0x7f8445 : 0x748044) : 0x625f54;
  const cropColor = active ? 0xd0bd5c : 0x777166;
  return [
    scene.add.rectangle(dx, dy, 11, 7, fieldColor, active ? 0.78 : 0.36).setStrokeStyle(1, active ? 0xd1bb72 : 0x817b70, active ? 0.32 : 0.18),
    scene.add.rectangle(dx, dy - 1.7, 8, 0.8, cropColor, active ? 0.72 : 0.28),
    scene.add.rectangle(dx, dy + 0.6, 8, 0.8, cropColor, active ? 0.62 : 0.24)
  ];
}

function createHall(scene, dx, dy, active, polityColorValue) {
  return [
    scene.add.ellipse(dx, dy + 7.5, 16, 5, 0x071015, 0.28),
    scene.add.rectangle(dx, dy + 1.5, 13, 10, active ? 0xd8bd82 : 0x716d66, 1),
    scene.add.triangle(dx, dy - 5.5, -8, 4.5, 8, 4.5, 0, -5, active ? mixColor(0x713b35, polityColorValue, 0.28) : 0x4c4b48, 1),
    scene.add.rectangle(dx, dy + 3.8, 3.2, 5.4, 0x513628, 1),
    scene.add.rectangle(dx, dy - 2.8, 3, 3, active ? polityColorValue : 0x6d6861, 1)
  ];
}

function lighten(color) {
  const r = Math.min(255, ((color >> 16) & 0xff) + 34);
  const g = Math.min(255, ((color >> 8) & 0xff) + 34);
  const b = Math.min(255, (color & 0xff) + 34);
  return (r << 16) | (g << 8) | b;
}

function mixColor(a, b, t) {
  const ar = (a >> 16) & 0xff; const ag = (a >> 8) & 0xff; const ab = a & 0xff;
  const br = (b >> 16) & 0xff; const bg = (b >> 8) & 0xff; const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t); const g = Math.round(ag + (bg - ag) * t); const blue = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | blue;
}

function destroyContainer(container) {
  for (const child of container.list || []) child.destroy();
  container.destroy();
}
