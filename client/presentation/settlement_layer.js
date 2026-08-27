import { polityColor } from './polity_style.js';
import { settlementAmbientPose } from './settlement_ambient.js';
import { settlementPoliticalStatusProfile } from './settlement_political_status.js';
import { settlementRuinsProfile } from './settlement_ruins_profile.js';
import { populationTier, settlementVisualProfile } from './settlement_visual_profile.js';

export class SettlementLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.visuals = new Map();
    scene.events.on('update', (time) => this.update(time));
  }

  sync(view) {
    const activeIds = new Set();
    for (const settlement of view.settlements) {
      activeIds.add(settlement.id);
      const ruinsProfile = settlementRuinsProfile({
        active: settlement.active,
        abandonedDay: settlement.abandonedDay,
        worldDay: view.day,
        daysPerYear: view.daysPerYear
      });
      const politicalStatus = settlementPoliticalStatusProfile({
        active: settlement.active,
        polityId: settlement.polityId,
        previousPolityId: settlement.previousPolityId,
        lastConqueredByPolityId: settlement.lastConqueredByPolityId,
        occupationStartedDay: settlement.occupationStartedDay,
        lastRebelledDay: settlement.lastRebelledDay,
        worldDay: view.day,
        daysPerYear: view.daysPerYear
      });
      const signature = settlementSignature(settlement, ruinsProfile, politicalStatus);
      const current = this.visuals.get(settlement.id);
      if (current?.signature === signature) continue;
      if (current) destroyContainer(current.container);
      this.visuals.set(settlement.id, {
        signature,
        ...createSettlementVisual(this.scene, settlement, this.tileSize, ruinsProfile, politicalStatus)
      });
    }
    for (const [id, visual] of this.visuals) {
      if (activeIds.has(id)) continue;
      destroyContainer(visual.container);
      this.visuals.delete(id);
    }
  }

  update(now) {
    for (const visual of this.visuals.values()) updateSettlementAmbient(visual, now);
  }

  destroy() {
    for (const visual of this.visuals.values()) destroyContainer(visual.container);
    this.visuals.clear();
  }
}

function settlementSignature(settlement, ruinsProfile, politicalStatus) {
  const sizeSignature = settlement.active ? populationTier(settlement.population) : 'ruins';
  const lifecycleSignature = settlement.active ? 'active' : `abandoned:${ruinsProfile.ageBand}:${ruinsProfile.ageLabel}`;
  const politicalSignature = politicalStatus.visible
    ? `${politicalStatus.kind}:${politicalStatus.ageLabel}:${settlement.previousPolityColorIndex ?? 'none'}:${settlement.lastRebelledFromPolityColorIndex ?? 'none'}`
    : 'political:none';
  return [settlement.name, lifecycleSignature, politicalSignature, sizeSignature, settlement.active ? settlement.population : 0, settlement.polityId ?? 'none', settlement.polityName ?? 'none', settlement.polityColorIndex ?? 'none', settlement.polityBannerStyle ?? 'none', settlement.rulerId ?? 'vacant', settlement.isCapital ? 'capital' : 'member', settlement.relationStance ?? 'none', settlement.atWar ? 'war' : 'peace'].join('|');
}

function createSettlementVisual(scene, settlement, tileSize, ruinsProfile, politicalStatus) {
  if (!settlement.active) return createSettlementRuinsVisual(scene, settlement, tileSize, ruinsProfile);

  const x = (settlement.x + 0.5) * tileSize;
  const y = (settlement.y + 0.5) * tileSize;
  const scale = Math.max(0.86, tileSize / 24);
  const profile = settlementVisualProfile(settlement.population, { isCapital: settlement.isCapital });
  const tier = profile.tier;
  const color = polityColor(settlement.polityColorIndex ?? Math.max(0, settlement.id - 1));
  const children = [];
  let bannerMotion = null;
  let smokeMotion = null;

  const ground = scene.add.ellipse(
    0,
    4,
    profile.groundWidth,
    profile.groundHeight,
    0x9b8451,
    0.21
  );
  ground.setStrokeStyle(
    tier >= 3 ? 1.5 : 1.2,
    settlement.atWar ? 0xd35a4a : color,
    settlement.atWar ? 0.92 : 0.52
  );
  children.push(ground);

  if (profile.capitalEmphasis) {
    children.push(
      scene.add.ellipse(0, -4, 27 * profile.civicScale, 20 * profile.civicScale, color, 0.08)
        .setStrokeStyle(1.2, lighten(color), 0.5)
    );
  }

  if (settlement.atWar) {
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

  if (politicalStatus.visible) {
    children.push(...createPoliticalStatusMarker(scene, settlement, profile, politicalStatus));
  }

  const roadColor = 0xbba56c;
  children.push(
    scene.add.rectangle(0, 4, profile.roadWidth, tier >= 3 ? 3.8 : 3.2, roadColor, 0.58),
    scene.add.rectangle(0, 4, tier >= 3 ? 3.8 : 3.2, profile.roadHeight, roadColor, 0.58)
  );
  if (tier >= 3) children.push(scene.add.rectangle(0, -9, profile.roadWidth * 0.72, 2.4, roadColor, 0.38));
  if (tier >= 4) {
    children.push(scene.add.rectangle(-15, 4, 2.4, profile.roadHeight * 0.78, roadColor, 0.34));
    children.push(scene.add.rectangle(15, 4, 2.4, profile.roadHeight * 0.78, roadColor, 0.34));
  }

  for (let index = 0; index < profile.farmOffsets.length; index += 1) {
    const [dx, dy] = profile.farmOffsets[index];
    children.push(...createField(scene, dx, dy, true, index));
  }

  for (let index = 0; index < profile.houseOffsets.length; index += 1) {
    const [dx, dy] = profile.houseOffsets[index];
    children.push(...createHouse(scene, dx, dy, true, color, index));
  }

  if (profile.hall) {
    const hall = createHall(scene, 0, -4, true, color);
    for (const part of hall) part.setScale(profile.civicScale);
    children.push(...hall);
  }

  if (tier >= 2) {
    const hearth = createHearthAmbience(scene, profile);
    children.push(...hearth.parts);
    smokeMotion = hearth.motion;
  }

  const banner = createBanner(scene, settlement, profile, color);
  children.push(...banner.parts);
  bannerMotion = banner.motion;

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
    color: '#fff2bf',
    stroke: '#10151c',
    strokeThickness: 3,
    align: 'center'
  }).setOrigin(0.5, 1);
  const population = scene.add.text(0, -profile.labelOffset + 3, secondaryText, {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '8px',
    color: settlement.atWar ? '#ffb4a7' : '#d8e1cd',
    stroke: '#10151c',
    strokeThickness: 2,
    align: 'center'
  }).setOrigin(0.5, 0);
  children.push(label, population);

  const container = scene.add.container(x, y, children);
  container.setScale(scale);
  container.setDepth(20 + y / Math.max(1, tileSize));
  return {
    container,
    settlementId: settlement.id,
    active: true,
    tier,
    bannerMotion,
    smokeMotion
  };
}

function createPoliticalStatusMarker(scene, settlement, profile, politicalStatus) {
  const historicalColorIndex = politicalStatus.kind === 'occupied'
    ? settlement.previousPolityColorIndex
    : settlement.lastRebelledFromPolityColorIndex;
  const historicalColor = Number.isInteger(historicalColorIndex) ? polityColor(historicalColorIndex) : 0xa98f75;
  const badgeColor = politicalStatus.kind === 'occupied' ? '#e8c68d' : '#f0a39a';
  const badgeY = -profile.labelOffset - 9;
  return [
    scene.add.ellipse(0, 4, profile.groundWidth + 15, profile.groundHeight + 14, 0x000000, 0)
      .setStrokeStyle(1.3, historicalColor, politicalStatus.ringAlpha),
    scene.add.text(0, badgeY, politicalStatus.badgeText, {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '7px',
      fontStyle: 'bold',
      color: badgeColor,
      stroke: '#10151c',
      strokeThickness: 2,
      align: 'center'
    }).setOrigin(0.5, 1).setAlpha(politicalStatus.badgeAlpha)
  ];
}

function createSettlementRuinsVisual(scene, settlement, tileSize, ruinsProfile) {
  const x = (settlement.x + 0.5) * tileSize;
  const y = (settlement.y + 0.5) * tileSize;
  const scale = Math.max(0.86, tileSize / 24);
  const children = [];

  const foundation = scene.add.ellipse(0, 4, 31, 19, 0x565550, ruinsProfile.foundationAlpha)
    .setStrokeStyle(1.1, 0xaaa28f, Math.min(0.42, ruinsProfile.foundationAlpha + 0.1));
  const shadow = scene.add.ellipse(1, 7, 24, 7, 0x071015, 0.2);
  const leftWall = scene.add.rectangle(-6.5, 0.5, 6.5, 7, 0x7c776d, ruinsProfile.stoneAlpha).setAngle(-5);
  const rightWall = scene.add.rectangle(6.8, 2.2, 5.8, 5.2, 0x68665f, ruinsProfile.stoneAlpha * 0.9).setAngle(7);
  const rearStone = scene.add.rectangle(1, -4.5, 7.5, 3.2, 0x898174, ruinsProfile.stoneAlpha * 0.74).setAngle(-4);
  const fallenStone = scene.add.rectangle(-0.5, 6.2, 8.5, 2.6, 0x625f59, ruinsProfile.stoneAlpha * 0.8).setAngle(4);
  const beam = scene.add.rectangle(2, -1.2, 13, 2.1, 0x554538, ruinsProfile.beamAlpha).setAngle(19);
  const rubbleA = scene.add.rectangle(-10, 5.5, 3, 2.2, 0x716e66, ruinsProfile.stoneAlpha * 0.68).setAngle(-12);
  const rubbleB = scene.add.rectangle(10.2, 5.8, 2.6, 2, 0x716e66, ruinsProfile.stoneAlpha * 0.62).setAngle(15);
  children.push(foundation, shadow, leftWall, rightWall, rearStone, fallenStone, beam, rubbleA, rubbleB);

  const label = scene.add.text(0, -18, settlement.name, {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '10px',
    fontStyle: 'bold',
    color: '#c2baaa',
    stroke: '#10151c',
    strokeThickness: 3,
    align: 'center'
  }).setOrigin(0.5, 1).setAlpha(ruinsProfile.labelAlpha);
  const age = scene.add.text(0, -15, `RUINS · ${ruinsProfile.ageLabel}`, {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '8px',
    color: '#9f988b',
    stroke: '#10151c',
    strokeThickness: 2,
    align: 'center'
  }).setOrigin(0.5, 0).setAlpha(ruinsProfile.labelAlpha);
  children.push(label, age);

  const container = scene.add.container(x, y, children);
  container.setScale(scale);
  container.setDepth(20 + y / Math.max(1, tileSize));
  return {
    container,
    settlementId: settlement.id,
    active: false,
    tier: 0,
    bannerMotion: null,
    smokeMotion: null
  };
}

function updateSettlementAmbient(visual, now) {
  if (!visual.active) return;
  const pose = settlementAmbientPose({ nowMs: now, settlementId: visual.settlementId, tier: visual.tier, active: true });

  if (visual.bannerMotion) {
    for (const tracked of visual.bannerMotion.cloth) {
      tracked.node.setAngle(tracked.baseAngle + pose.flagAngle);
      tracked.node.y = tracked.baseY + pose.flagLift;
      tracked.node.scaleX = tracked.baseScaleX * pose.flagScaleX;
      tracked.node.scaleY = tracked.baseScaleY;
    }
  }

  if (visual.smokeMotion) {
    for (let index = 0; index < visual.smokeMotion.puffs.length; index += 1) {
      const tracked = visual.smokeMotion.puffs[index];
      const puff = pose.smoke[index];
      if (!puff) {
        tracked.node.setAlpha(0);
        continue;
      }
      tracked.node.x = tracked.baseX + puff.x;
      tracked.node.y = tracked.baseY + puff.y;
      tracked.node.setAlpha(puff.alpha);
      tracked.node.setScale(tracked.baseScale * puff.scale);
    }
  }
}

function createBanner(scene, settlement, profile, color) {
  const x = profile.groundWidth / 2 - 7;
  const scale = profile.bannerScale;
  const pole = scene.add.rectangle(x, -10, 1.2, 17, 0x59432f, 1).setScale(scale);
  const flag = scene.add.rectangle(x + 4.2 * scale, -16, 8.5, 5.2, color, 1).setScale(scale);
  const accent = lighten(color);
  const parts = [pole, flag];
  const cloth = [flag];
  const style = settlement.polityBannerStyle || 'plain';
  let decoration = null;
  if (style === 'stripe') decoration = scene.add.rectangle(x + 4.2 * scale, -16, 8.5, 1.2, accent, 0.92).setScale(scale);
  else if (style === 'split') decoration = scene.add.rectangle(x + 6.2 * scale, -16, 4, 5.2, accent, 0.6).setScale(scale);
  else if (style === 'cross') {
    const vertical = scene.add.rectangle(x + 4.2 * scale, -16, 1.2, 5.2, accent, 0.9).setScale(scale);
    const horizontal = scene.add.rectangle(x + 4.2 * scale, -16, 8.5, 1.1, accent, 0.9).setScale(scale);
    parts.push(vertical, horizontal);
    cloth.push(vertical, horizontal);
  } else if (style === 'chevron') decoration = scene.add.triangle(x + 2.8 * scale, -16, -2, -2.1, -2, 2.1, 1.7, 0, accent, 0.92).setScale(scale);
  else decoration = scene.add.rectangle(x + 2.6 * scale, -17, 3, 1.2, accent, 0.72).setScale(scale);
  if (decoration) {
    parts.push(decoration);
    cloth.push(decoration);
  }

  return {
    parts,
    motion: {
      cloth: cloth.map((node) => ({
        node,
        baseY: node.y,
        baseAngle: node.angle,
        baseScaleX: node.scaleX,
        baseScaleY: node.scaleY
      }))
    }
  };
}

function createHearthAmbience(scene, profile) {
  const source = profile.hall
    ? { x: 4, y: -12 }
    : { x: profile.houseOffsets[0][0] + 3, y: profile.houseOffsets[0][1] - 8 };
  const chimney = scene.add.rectangle(source.x, source.y + 2.5, 2.2, 5.2, 0x4d4036, 0.9);
  const puffs = [
    scene.add.circle(source.x, source.y, 1.8, 0xcbd4d0, 0),
    scene.add.circle(source.x, source.y, 2.1, 0xc1ccc9, 0),
    scene.add.circle(source.x, source.y, 2.4, 0xb7c5c2, 0)
  ];
  return {
    parts: [chimney, ...puffs],
    motion: {
      puffs: puffs.map((node, index) => ({
        node,
        baseX: source.x,
        baseY: source.y,
        baseScale: 0.86 + index * 0.08
      }))
    }
  };
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
