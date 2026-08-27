import { battleTraceProfile } from './battle_trace_profile.js';
import { polityColor } from './polity_style.js';
import { warbandObjectiveCue, warbandVisualProfile } from './warband_visual_profile.js';

export class WarbandLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.warbands = new Map();
    this.battleTraceGraphics = scene.add.graphics().setDepth(19.2);
  }

  sync(view, now, duration = 180) {
    drawBattleTraces(this.battleTraceGraphics, view.recentBattles ?? [], view.daysPerYear, this.tileSize);
    const active = new Set();
    const settlementById = new Map((view.settlements ?? []).map((settlement) => [settlement.id, settlement]));
    for (const warband of view.warbands ?? []) {
      active.add(warband.id);
      const target = tileCenter(warband.x, warband.y, this.tileSize);
      const targetSettlement = settlementById.get(warband.targetSettlementId) ?? null;
      let visual = this.warbands.get(warband.id);
      if (!visual) {
        visual = createWarbandVisual(this.scene, warband, targetSettlement, target.x, target.y, this.tileSize);
        visual.fromX = target.x;
        visual.fromY = target.y;
        visual.toX = target.x;
        visual.toY = target.y;
        visual.startedAt = now;
        visual.duration = duration;
        this.warbands.set(warband.id, visual);
      } else {
        visual.fromX = visual.container.x;
        visual.fromY = visual.anchorY ?? visual.container.y;
        visual.toX = target.x;
        visual.toY = target.y;
        visual.startedAt = now;
        visual.duration = duration;
      }
      visual.anchorY = target.y;
      updateWarbandState(visual, warband, targetSettlement, this.tileSize);
    }

    for (const [id, visual] of this.warbands) {
      if (active.has(id)) continue;
      destroyVisual(visual);
      this.warbands.delete(id);
    }
  }

  update(now) {
    for (const visual of this.warbands.values()) {
      const elapsed = Math.max(0, now - visual.startedAt);
      const t = visual.duration <= 0 ? 1 : Math.min(1, elapsed / visual.duration);
      const eased = t * (2 - t);
      const moving = t < 1 && (Math.abs(visual.toX - visual.fromX) > 0.01 || Math.abs(visual.toY - visual.fromY) > 0.01);
      const bob = Math.sin(now * 0.007 + visual.bobPhase) * (moving ? 0.7 : 0.28);
      visual.container.x = lerp(visual.fromX, visual.toX, eased);
      visual.container.y = lerp(visual.fromY, visual.toY, eased) + bob;
      visual.container.setDepth(44 + visual.container.y / Math.max(1, this.tileSize));

      const pulse = visual.engaged ? 0.72 + Math.sin(now * 0.012 + visual.bobPhase) * 0.22 : 0;
      visual.engagementRing.setAlpha(visual.engaged ? pulse : 0);
      visual.engagementIcon.setAlpha(visual.engaged ? 1 : 0);
      visual.flag.setScale(moving ? 1 + Math.abs(Math.sin(now * 0.018 + visual.bobPhase)) * 0.08 : 1, 1);
      animateSoldiers(visual, now, moving);
      drawObjectiveCue(visual);
    }
  }

  destroy() {
    this.battleTraceGraphics.destroy();
    for (const visual of this.warbands.values()) destroyVisual(visual);
    this.warbands.clear();
  }
}

function createWarbandVisual(scene, warband, targetSettlement, x, y, tileSize) {
  const color = polityColor(warband.polityColorIndex);
  const baseScale = Math.max(0.92, tileSize / 28);
  const objectiveGraphics = scene.add.graphics().setDepth(43.9);
  const shadow = scene.add.ellipse(1, 7, 25, 7, 0x061015, 0.34);
  const engagementRing = scene.add.circle(0, 0, 14, 0xe75b4d, 0).setStrokeStyle(2, 0xff7668, 0);
  const soldiers = Array.from({ length: 5 }, (_, index) => createSoldier(scene, color, index));
  const pole = scene.add.rectangle(-9.5, -4, 2, 20, 0xd6c49a, 1);
  const flag = scene.add.rectangle(-8.5, -10, 11, 7, color, 1).setOrigin(0, 0.5);
  const flagLight = scene.add.rectangle(-7.5, -11.5, 6, 2, lighten(color), 0.9).setOrigin(0, 0.5);
  const strengthPlate = scene.add.rectangle(10, 7, 17, 10, 0x101820, 0.92).setStrokeStyle(1, color, 1);
  const strength = scene.add.text(10, 7, String(warband.strength), { fontFamily: 'monospace', fontSize: '8px', color: '#f7f1df', fontStyle: 'bold' }).setOrigin(0.5);
  const engagementIcon = scene.add.text(0, -21, '⚔', { fontFamily: 'serif', fontSize: '13px', color: '#ffdf7a', stroke: '#5a1712', strokeThickness: 2 }).setOrigin(0.5).setAlpha(warband.engaged ? 1 : 0);
  const container = scene.add.container(x, y, [shadow, engagementRing, ...soldiers, pole, flag, flagLight, strengthPlate, strength, engagementIcon]);
  container.setScale(baseScale);
  container.setDepth(44 + y / Math.max(1, tileSize));
  const visual = {
    container,
    objectiveGraphics,
    objectiveColor: color,
    objectiveCue: null,
    targetWorldX: null,
    targetWorldY: null,
    shadow,
    engagementRing,
    soldiers,
    pole,
    flag,
    flagLight,
    strengthPlate,
    strength,
    engagementIcon,
    baseScale,
    engaged: Boolean(warband.engaged),
    formation: 'mobilized',
    soldierOffsets: [],
    casualtyRatio: 0,
    bobPhase: warband.id * 1.913,
    anchorY: y
  };
  updateWarbandState(visual, warband, targetSettlement, tileSize);
  return visual;
}

function updateWarbandState(visual, warband, targetSettlement, tileSize) {
  const color = polityColor(warband.polityColorIndex);
  const profile = warbandVisualProfile(warband);
  visual.flag.setFillStyle(color, 1);
  visual.flagLight.setFillStyle(lighten(color), 0.9);
  visual.strengthPlate.setStrokeStyle(1, color, 1);
  visual.strength.setText(String(profile.currentStrength));
  visual.engaged = profile.engaged;
  visual.formation = profile.formation;
  visual.soldierOffsets = profile.offsets;
  visual.casualtyRatio = profile.casualtyRatio;
  visual.engagementRing.setStrokeStyle(2, 0xff7668, visual.engaged ? 0.9 : 0);
  visual.container.setAlpha(profile.currentStrength > 0 ? 1 : 0.5);
  visual.objectiveColor = color;
  visual.objectiveCue = warbandObjectiveCue({
    x: warband.x,
    y: warband.y,
    targetX: targetSettlement?.x,
    targetY: targetSettlement?.y,
    movementState: warband.movementState,
    engaged: warband.engaged,
    tileSize
  });
  if (targetSettlement) {
    const target = tileCenter(targetSettlement.x, targetSettlement.y, tileSize);
    visual.targetWorldX = target.x;
    visual.targetWorldY = target.y;
  } else {
    visual.targetWorldX = null;
    visual.targetWorldY = null;
  }

  for (let index = 0; index < visual.soldiers.length; index += 1) {
    const soldier = visual.soldiers[index];
    const offset = profile.offsets[index];
    soldier.setVisible(Boolean(offset));
    if (!offset) continue;
    soldier.x = offset.x;
    soldier.y = offset.y;
    drawSoldier(soldier, color, index, visual.engaged, profile.casualtyRatio);
  }
}

function drawBattleTraces(graphics, traces, daysPerYear, tileSize) {
  graphics.clear();
  if (!Array.isArray(traces) || traces.length === 0) return;
  const scale = Math.max(0.84, tileSize / 24);
  const chronological = [...traces].reverse();
  for (const trace of chronological) {
    const profile = battleTraceProfile({ totalLoss: trace.totalLoss, ageDays: trace.ageDays, daysPerYear });
    if (!profile.visible) continue;
    const center = tileCenter(trace.x, trace.y, tileSize);
    const radius = profile.radius * scale;
    const crossHalf = profile.crossHalf * scale;
    const dotRadius = profile.dotRadius * scale;

    graphics.lineStyle(profile.stroke * scale, 0xa46855, profile.alpha);
    graphics.strokeEllipse(center.x, center.y + scale, radius * 2.15, radius * 1.32);
    graphics.lineStyle(Math.max(1, profile.stroke * 0.9) * scale, 0xd3ad7b, Math.min(0.38, profile.alpha + 0.07));
    graphics.lineBetween(center.x - crossHalf, center.y - crossHalf, center.x + crossHalf, center.y + crossHalf);
    graphics.lineBetween(center.x + crossHalf, center.y - crossHalf, center.x - crossHalf, center.y + crossHalf);
    graphics.fillStyle(0xc38d67, Math.min(0.3, profile.alpha * 0.84));
    graphics.fillCircle(center.x - radius * 0.72, center.y + radius * 0.38, dotRadius);
    graphics.fillCircle(center.x + radius * 0.66, center.y + radius * 0.28, dotRadius * 0.82);
  }
}

function drawObjectiveCue(visual) {
  const graphics = visual.objectiveGraphics;
  const cue = visual.objectiveCue;
  graphics.clear();
  if (!cue?.visible || !Number.isFinite(visual.targetWorldX) || !Number.isFinite(visual.targetWorldY)) return;

  const dx = visual.targetWorldX - visual.container.x;
  const dy = visual.targetWorldY - visual.container.y;
  const distance = Math.hypot(dx, dy);
  if (!(distance > cue.targetRadius + 2)) return;

  const directionX = dx / distance;
  const directionY = dy / distance;
  const arrowEndDistance = Math.min(cue.arrowEnd, Math.max(cue.arrowStart + 3, distance - cue.targetRadius - 3));
  const startX = visual.container.x + directionX * cue.arrowStart;
  const startY = visual.container.y + directionY * cue.arrowStart;
  const endX = visual.container.x + directionX * arrowEndDistance;
  const endY = visual.container.y + directionY * arrowEndDistance;
  const angle = Math.atan2(directionY, directionX);
  const backAngleA = angle + Math.PI * 0.78;
  const backAngleB = angle - Math.PI * 0.78;

  graphics.lineStyle(1.6, visual.objectiveColor, cue.arrowAlpha);
  graphics.lineBetween(startX, startY, endX, endY);
  graphics.lineBetween(endX, endY, endX + Math.cos(backAngleA) * cue.arrowHead, endY + Math.sin(backAngleA) * cue.arrowHead);
  graphics.lineBetween(endX, endY, endX + Math.cos(backAngleB) * cue.arrowHead, endY + Math.sin(backAngleB) * cue.arrowHead);

  graphics.lineStyle(1.2, visual.objectiveColor, cue.targetAlpha);
  graphics.strokeCircle(visual.targetWorldX, visual.targetWorldY, cue.targetRadius);
  const tick = cue.arrowHead * 0.55;
  graphics.lineBetween(visual.targetWorldX - cue.targetRadius - tick, visual.targetWorldY, visual.targetWorldX - cue.targetRadius + tick, visual.targetWorldY);
  graphics.lineBetween(visual.targetWorldX + cue.targetRadius - tick, visual.targetWorldY, visual.targetWorldX + cue.targetRadius + tick, visual.targetWorldY);
  graphics.lineBetween(visual.targetWorldX, visual.targetWorldY - cue.targetRadius - tick, visual.targetWorldX, visual.targetWorldY - cue.targetRadius + tick);
  graphics.lineBetween(visual.targetWorldX, visual.targetWorldY + cue.targetRadius - tick, visual.targetWorldX, visual.targetWorldY + cue.targetRadius + tick);
}

function animateSoldiers(visual, now, moving) {
  for (let index = 0; index < visual.soldiers.length; index += 1) {
    const soldier = visual.soldiers[index];
    const offset = visual.soldierOffsets[index];
    if (!offset || !soldier.visible) continue;
    const phase = now * (visual.engaged ? 0.024 : moving ? 0.019 : 0.008) + visual.bobPhase + index * 1.17;
    const step = Math.sin(phase);
    soldier.x = offset.x + (visual.engaged ? step * 0.75 : 0);
    soldier.y = offset.y + (moving ? Math.abs(step) * -0.8 : visual.engaged ? step * 0.45 : step * 0.12);
    soldier.angle = visual.engaged ? step * 3.5 : 0;
  }
}

function createSoldier(scene, color, index) {
  const graphics = scene.add.graphics();
  drawSoldier(graphics, color, index, false, 0);
  return graphics;
}

function drawSoldier(graphics, color, index, engaged, casualtyRatio) {
  graphics.clear();
  const bodyColor = mixColor(color, 0x25313a, 0.18 + casualtyRatio * 0.16);
  const shieldColor = lighten(color);
  const legColor = 0x242d33;
  const skin = 0xd9aa82;
  const side = index % 2 === 0 ? 1 : -1;

  graphics.lineStyle(1, 0xbca46f, 0.9);
  graphics.lineBetween(2.5 * side, -6, 2.5 * side, 5);
  graphics.fillStyle(legColor, 1);
  graphics.fillRect(-2.2, 2, 1.5, 4.5);
  graphics.fillRect(0.7, 2, 1.5, 4.5);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRect(-2.8, -3, 5.6, 6);
  graphics.fillStyle(skin, 1);
  graphics.fillCircle(0, -5.1, 2.1);
  graphics.fillStyle(shieldColor, engaged ? 1 : 0.88);
  graphics.fillRoundedRect(-4.2 * side - (side < 0 ? 2.6 : 0), -1.8, 2.6, 4.6, 0.8);
  graphics.lineStyle(0.8, 0xffffff, 0.28);
  graphics.strokeCircle(0, -5.1, 2.1);
}

function tileCenter(x, y, tileSize) {
  return { x: (x + 0.5) * tileSize, y: (y + 0.5) * tileSize };
}

function lighten(color) {
  const r = Math.min(255, ((color >> 16) & 0xff) + 38);
  const g = Math.min(255, ((color >> 8) & 0xff) + 38);
  const b = Math.min(255, (color & 0xff) + 38);
  return (r << 16) | (g << 8) | b;
}

function mixColor(a, b, t) {
  const ar = (a >> 16) & 0xff; const ag = (a >> 8) & 0xff; const ab = a & 0xff;
  const br = (b >> 16) & 0xff; const bg = (b >> 8) & 0xff; const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t); const g = Math.round(ag + (bg - ag) * t); const blue = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | blue;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function destroyVisual(visual) {
  visual.objectiveGraphics?.destroy();
  for (const child of visual.container.list || []) child.destroy();
  visual.container.destroy();
}
