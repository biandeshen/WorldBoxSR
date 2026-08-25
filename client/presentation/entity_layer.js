import { polityColor } from './polity_style.js';

export class EntityLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.humans = new Map();
    this.creatures = new Map();
  }

  sync(view, now, duration = 140) {
    syncCollection({ scene: this.scene, tileSize: this.tileSize, map: this.humans, rows: view.humans, now, duration, create: createHumanVisual, updateState: updateHumanState });
    syncCollection({ scene: this.scene, tileSize: this.tileSize, map: this.creatures, rows: view.creatures ?? view.grazers ?? [], now, duration, create: createCreatureVisual, updateState: updateCreatureState });
  }

  update(now) {
    updateCollection(this.humans, now, this.tileSize);
    updateCollection(this.creatures, now, this.tileSize);
  }

  destroy() { destroyCollection(this.humans); destroyCollection(this.creatures); }
}

function syncCollection({ scene, tileSize, map, rows, now, duration, create, updateState }) {
  const active = new Set();
  for (const row of rows) {
    active.add(row.id);
    const target = tileCenter(row.x, row.y, tileSize);
    let visual = map.get(row.id);
    if (!visual) {
      visual = create(scene, row, target.x, target.y, tileSize);
      visual.fromX = target.x; visual.fromY = target.y; visual.toX = target.x; visual.toY = target.y; visual.startedAt = now; visual.duration = duration;
      map.set(row.id, visual);
    } else {
      if (visual.species && row.species && visual.species !== row.species) {
        destroyVisual(visual);
        visual = create(scene, row, target.x, target.y, tileSize);
        visual.fromX = target.x; visual.fromY = target.y; visual.toX = target.x; visual.toY = target.y; visual.startedAt = now; visual.duration = duration;
        map.set(row.id, visual);
      } else {
        visual.fromX = visual.container.x;
        visual.fromY = visual.anchorY ?? visual.container.y;
        visual.toX = target.x; visual.toY = target.y; visual.startedAt = now; visual.duration = duration;
        const dx = visual.toX - visual.fromX;
        if (Math.abs(dx) > 0.01) visual.facing = dx < 0 ? -1 : 1;
      }
    }
    visual.anchorY = target.y;
    updateState(visual, row);
  }
  for (const [id, visual] of map) {
    if (active.has(id)) continue;
    destroyVisual(visual); map.delete(id);
  }
}

function updateCollection(map, now, tileSize) {
  for (const visual of map.values()) {
    const elapsed = Math.max(0, now - visual.startedAt);
    const t = visual.duration <= 0 ? 1 : Math.min(1, elapsed / visual.duration);
    const eased = t * (2 - t);
    const moving = t < 1 && (Math.abs(visual.toX - visual.fromX) > 0.01 || Math.abs(visual.toY - visual.fromY) > 0.01);
    const bob = Math.sin(now * visual.bobSpeed + visual.bobPhase) * (moving ? visual.moveBob : visual.idleBob);
    visual.container.x = lerp(visual.fromX, visual.toX, eased);
    visual.container.y = lerp(visual.fromY, visual.toY, eased) + bob;
    visual.container.scaleX = visual.baseScale * visual.facing;
    visual.container.scaleY = visual.baseScale;
    visual.container.setDepth(30 + visual.container.y / Math.max(1, tileSize));
    if (visual.shadow) {
      visual.shadow.scaleX = 1 + (moving ? Math.abs(Math.sin(now * 0.018 + visual.bobPhase)) * 0.08 : 0);
      visual.shadow.alpha = moving ? 0.22 : 0.28;
    }
  }
}

function createHumanVisual(scene, human, x, y, tileSize) {
  const baseScale = Math.max(0.9, tileSize / 24);
  const shadow = scene.add.ellipse(0, 5.7, 9.5, 3.7, 0x061015, 0.28);
  const backArm = scene.add.rectangle(-4.3, -0.5, 2.2, 6.2, 0xe0ad82, 1);
  const legs = scene.add.rectangle(0, 4, 5, 5.4, 0x26313a, 1);
  const tunic = scene.add.rectangle(0, -0.2, 8, 8.7, humanColor(human), 1);
  const tunicLight = scene.add.rectangle(-1.8, -1.4, 2.4, 5.4, lighten(humanColor(human)), 0.78);
  const belt = scene.add.rectangle(0, 1.8, 8, 1.3, 0xe4c575, 0.88);
  const frontArm = scene.add.rectangle(4.2, -0.2, 2.2, 6, 0xe8b78c, 1);
  const head = scene.add.rectangle(0, -6.4, 6.2, 6.2, 0xe6b58b, 1);
  const hair = scene.add.rectangle(0, -9, 6.6, 2.2, human.sex === 'F' ? 0x5d3546 : 0x3a302a, 1);
  const facePixel = scene.add.rectangle(2.1, -6.1, 1.2, 1.2, 0x51352c, 0.9);
  const status = scene.add.circle(0, -13, 2.1, 0xf1c45d, 0).setStrokeStyle(1, 0x151b20, 0);
  const crown = scene.add.text(0, -18.5, '♛', { fontFamily: 'serif', fontSize: '10px', color: '#ffe276', stroke: '#5a3714', strokeThickness: 2 }).setOrigin(0.5).setAlpha(human.isRuler ? 1 : 0);
  const container = scene.add.container(x, y, [shadow, backArm, legs, tunic, tunicLight, belt, frontArm, head, hair, facePixel, status, crown]);
  container.setScale(baseScale);
  container.setDepth(30 + y / Math.max(1, tileSize));
  return { container, shadow, tunic, tunicLight, status, crown, baseScale, facing: hashFacing(human.id), bobPhase: human.id * 1.731, bobSpeed: 0.009, idleBob: 0.28, moveBob: 0.72, anchorY: y };
}

function createCreatureVisual(scene, creature, x, y, tileSize) {
  if (creature.species === 'wolf') return createWolfVisual(scene, creature, x, y, tileSize);
  return createGrazerVisual(scene, creature, x, y, tileSize);
}

function createGrazerVisual(scene, grazer, x, y, tileSize) {
  const baseScale = Math.max(0.9, tileSize / 24);
  const shadow = scene.add.ellipse(0, 5.2, 13, 3.7, 0x061015, 0.25);
  const rearLeg = scene.add.rectangle(-3.7, 4.5, 2, 5.2, 0x4a3826, 1);
  const frontLeg = scene.add.rectangle(3.4, 4.5, 2, 5.2, 0x4a3826, 1);
  const body = scene.add.rectangle(-0.8, 0, 12, 7.8, 0xc9954d, 1);
  const flank = scene.add.rectangle(-2.2, -1.3, 6.5, 2.8, 0xe4bb70, 0.9);
  const neck = scene.add.rectangle(5.1, -1, 3.2, 5.4, 0xb47d43, 1);
  const head = scene.add.rectangle(7, -2.6, 5.6, 5.2, 0xb47d43, 1);
  const ear = scene.add.rectangle(7.8, -5.5, 3.2, 1.5, 0x69492f, 1);
  const muzzle = scene.add.rectangle(9.1, -1.8, 2.4, 2, 0xd6a466, 1);
  const eye = scene.add.rectangle(7.8, -3.1, 1, 1, 0x211b17, 1);
  const status = scene.add.circle(0, -10.5, 2.1, 0xf1c45d, 0).setStrokeStyle(1, 0x151b20, 0);
  const container = scene.add.container(x, y, [shadow, rearLeg, frontLeg, body, flank, neck, head, ear, muzzle, eye, status]);
  container.setScale(baseScale);
  container.setDepth(30 + y / Math.max(1, tileSize));
  return { species: 'grazer', container, shadow, status, baseScale, facing: hashFacing(grazer.id + 1000), bobPhase: grazer.id * 2.137, bobSpeed: 0.0075, idleBob: 0.18, moveBob: 0.48, anchorY: y };
}

function createWolfVisual(scene, wolf, x, y, tileSize) {
  const baseScale = Math.max(0.9, tileSize / 24);
  const shadow = scene.add.ellipse(0, 5.2, 13.5, 3.8, 0x061015, 0.3);
  const tail = scene.add.rectangle(-7.4, -0.9, 7.2, 2.3, 0x4b5560, 1).setAngle(-24);
  const rearLeg = scene.add.rectangle(-3.8, 4.4, 2, 5.4, 0x353c43, 1);
  const frontLeg = scene.add.rectangle(3.3, 4.4, 2, 5.4, 0x353c43, 1);
  const body = scene.add.rectangle(-0.7, 0, 12.6, 7.1, 0x59636d, 1);
  const back = scene.add.rectangle(-1.7, -2.1, 8.7, 2, 0x78838c, 0.95);
  const chest = scene.add.rectangle(4.5, 0.1, 3.2, 5.8, 0x444d55, 1);
  const head = scene.add.rectangle(6.5, -2.8, 6.2, 5.4, 0x505a63, 1);
  const leftEar = scene.add.triangle(4.6, -6.7, 0, 4, 2.2, 0, 4.2, 4, 0x3c444b, 1);
  const rightEar = scene.add.triangle(7.7, -6.7, 0, 4, 2.2, 0, 4.2, 4, 0x3c444b, 1);
  const muzzle = scene.add.rectangle(9.1, -1.9, 3.5, 2.4, 0x858c91, 1);
  const nose = scene.add.rectangle(10.6, -1.9, 1.2, 1.4, 0x171b1e, 1);
  const eye = scene.add.rectangle(7.3, -3.4, 1.1, 1.1, 0xf0b65a, 1);
  const status = scene.add.circle(0, -10.5, 2.1, 0xf1c45d, 0).setStrokeStyle(1, 0x151b20, 0);
  const container = scene.add.container(x, y, [shadow, tail, rearLeg, frontLeg, body, back, chest, head, leftEar, rightEar, muzzle, nose, eye, status]);
  container.setScale(baseScale);
  container.setDepth(30 + y / Math.max(1, tileSize));
  return { species: 'wolf', container, shadow, status, baseScale, facing: hashFacing(wolf.id + 2000), bobPhase: wolf.id * 2.491, bobSpeed: 0.007, idleBob: 0.14, moveBob: 0.44, anchorY: y };
}

function updateHumanState(visual, human) {
  const color = humanColor(human);
  visual.tunic.setFillStyle(color, 1);
  visual.tunicLight.setFillStyle(lighten(color), 0.78);
  visual.crown?.setAlpha(human.isRuler ? 1 : 0);
  updateStatus(visual, human.health, human.hunger);
}

function updateCreatureState(visual, creature) { updateStatus(visual, creature.health, creature.hunger); }

function updateStatus(visual, health, hunger) {
  if (health < 0.42) {
    visual.status.setFillStyle(0xe65d57, 0.95).setStrokeStyle(1, 0x151b20, 0.8); visual.container.setAlpha(0.72); return;
  }
  if (hunger > 0.68) {
    visual.status.setFillStyle(0xf0c35f, 0.92).setStrokeStyle(1, 0x151b20, 0.78); visual.container.setAlpha(1); return;
  }
  visual.status.setFillStyle(0xffffff, 0).setStrokeStyle(1, 0xffffff, 0); visual.container.setAlpha(1);
}

function humanColor(human) {
  if (Number.isInteger(human.polityColorIndex)) return polityColor(human.polityColorIndex);
  if (human.settlementId !== null && human.settlementId !== undefined) {
    const colors = [0xb84f48, 0x4779b7, 0xc99b40, 0x4e9764, 0x825fb1, 0xb45d8b];
    return colors[(Math.max(1, human.settlementId) - 1) % colors.length];
  }
  return human.sex === 'F' ? 0xc96d83 : 0x668db9;
}

function lighten(color) {
  const r = Math.min(255, ((color >> 16) & 0xff) + 34);
  const g = Math.min(255, ((color >> 8) & 0xff) + 34);
  const b = Math.min(255, (color & 0xff) + 34);
  return (r << 16) | (g << 8) | b;
}
function hashFacing(id) { return (Math.imul(id, 2654435761) >>> 0) % 2 === 0 ? 1 : -1; }
function tileCenter(x, y, tileSize) { return { x: (x + 0.5) * tileSize, y: (y + 0.5) * tileSize }; }
function lerp(a, b, t) { return a + (b - a) * t; }
function destroyCollection(map) { for (const visual of map.values()) destroyVisual(visual); map.clear(); }
function destroyVisual(visual) { for (const child of visual.container.list || []) child.destroy(); visual.container.destroy(); }
