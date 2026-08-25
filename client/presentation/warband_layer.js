import { polityColor } from './polity_style.js';

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
  const shadow = scene.add.ellipse(1, 6.5, 18, 5, 0x061015, 0.34);
  const engagementRing = scene.add.circle(0, 0, 11, 0xe75b4d, 0).setStrokeStyle(2, 0xff7668, 0);
  const pole = scene.add.rectangle(-4.5, -4, 2, 20, 0xd6c49a, 1);
  const flag = scene.add.rectangle(0, -10, 11, 7, color, 1).setOrigin(0, 0.5);
  const flagLight = scene.add.rectangle(1, -11.5, 6, 2, lighten(color), 0.9).setOrigin(0, 0.5);
  const strengthPlate = scene.add.rectangle(4, 2.5, 17, 10, 0x101820, 0.9).setStrokeStyle(1, color, 1);
  const strength = scene.add.text(4, 2.5, String(warband.strength), { fontFamily: 'monospace', fontSize: '8px', color: '#f7f1df', fontStyle: 'bold' }).setOrigin(0.5);
  const engagementIcon = scene.add.text(0, -20, '⚔', { fontFamily: 'serif', fontSize: '13px', color: '#ffdf7a', stroke: '#5a1712', strokeThickness: 2 }).setOrigin(0.5).setAlpha(warband.engaged ? 1 : 0);
  const container = scene.add.container(x, y, [shadow, engagementRing, pole, flag, flagLight, strengthPlate, strength, engagementIcon]);
  container.setScale(baseScale);
  container.setDepth(44 + y / Math.max(1, tileSize));
  return {
    container,
    shadow,
    engagementRing,
    pole,
    flag,
    flagLight,
    strengthPlate,
    strength,
    engagementIcon,
    baseScale,
    engaged: Boolean(warband.engaged),
    bobPhase: warband.id * 1.913,
    anchorY: y
  };
}

function updateWarbandState(visual, warband) {
  const color = polityColor(warband.polityColorIndex);
  visual.flag.setFillStyle(color, 1);
  visual.flagLight.setFillStyle(lighten(color), 0.9);
  visual.strengthPlate.setStrokeStyle(1, color, 1);
  visual.strength.setText(String(warband.strength));
  visual.engaged = Boolean(warband.engaged);
  visual.engagementRing.setStrokeStyle(2, 0xff7668, visual.engaged ? 0.9 : 0);
  visual.container.setAlpha(warband.strength > 0 ? 1 : 0.5);
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function destroyVisual(visual) {
  for (const child of visual.container.list || []) child.destroy();
  visual.container.destroy();
}
