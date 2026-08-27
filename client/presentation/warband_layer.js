import { polityColor } from './polity_style.js';
import { warbandVisualProfile } from './warband_visual_profile.js';

export class WarbandLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.warbands = new Map();
  }

  sync(view, now, duration = 180) {
    const active = new Set();
    for (const warband of view.warbands ?? []) {
      active.add(warband.id);
      const target = tileCenter(warband.x, warband.y, this.tileSize);
      let visual = this.warbands.get(warband.id);
      if (!visual) {
        visual = createWarbandVisual(this.scene, warband, target.x, target.y, this.tileSize);
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
      updateWarbandState(visual, warband);
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
    }
  }

  destroy() {
    for (const visual of this.warbands.values()) destroyVisual(visual);
    this.warbands.clear();
  }
}

function createWarbandVisual(scene, warband, x, y, tileSize) {
  const color = polityColor(warband.polityColorIndex);
  const baseScale = Math.max(0.92, tileSize / 28);
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
  updateWarbandState(visual, warband);
  return visual;
}

function updateWarbandState(visual, warband) {
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
  for (const child of visual.container.list || []) child.destroy();
  visual.container.destroy();
}
