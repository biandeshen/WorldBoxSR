export class EntityLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.humans = new Map();
    this.grazers = new Map();
  }

  sync(view, now, duration = 140) {
    syncCollection({
      scene: this.scene,
      tileSize: this.tileSize,
      map: this.humans,
      rows: view.humans,
      now,
      duration,
      create: createHumanVisual
    });

    syncCollection({
      scene: this.scene,
      tileSize: this.tileSize,
      map: this.grazers,
      rows: view.grazers,
      now,
      duration,
      create: createGrazerVisual
    });
  }

  update(now) {
    updateCollection(this.humans, now, this.tileSize);
    updateCollection(this.grazers, now, this.tileSize);
  }

  destroy() {
    destroyCollection(this.humans);
    destroyCollection(this.grazers);
  }
}

function syncCollection({ scene, tileSize, map, rows, now, duration, create }) {
  const active = new Set();

  for (const row of rows) {
    const id = row.id;
    active.add(id);
    const target = tileCenter(row.x, row.y, tileSize);
    let visual = map.get(id);

    if (!visual) {
      const container = create(scene, row, target.x, target.y, tileSize);
      visual = {
        container,
        fromX: target.x,
        fromY: target.y,
        toX: target.x,
        toY: target.y,
        startedAt: now,
        duration
      };
      map.set(id, visual);
    } else {
      visual.fromX = visual.container.x;
      visual.fromY = visual.container.y;
      visual.toX = target.x;
      visual.toY = target.y;
      visual.startedAt = now;
      visual.duration = duration;
    }

    visual.container.setAlpha(row.health < 0.35 ? 0.62 : 1);
  }

  for (const [id, visual] of map) {
    if (active.has(id)) continue;
    destroyVisual(visual);
    map.delete(id);
  }
}

function updateCollection(map, now, tileSize) {
  for (const visual of map.values()) {
    const elapsed = Math.max(0, now - visual.startedAt);
    const t = visual.duration <= 0 ? 1 : Math.min(1, elapsed / visual.duration);
    const eased = t * (2 - t);
    visual.container.x = lerp(visual.fromX, visual.toX, eased);
    visual.container.y = lerp(visual.fromY, visual.toY, eased);
    visual.container.setDepth(30 + visual.container.y / Math.max(1, tileSize));
  }
}

function createHumanVisual(scene, human, x, y, tileSize) {
  const scale = Math.max(0.82, tileSize / 24);
  const shadow = scene.add.ellipse(0, 5, 9, 4, 0x071015, 0.28);
  const legs = scene.add.rectangle(0, 3.5, 4.5, 5, 0x27303a, 1);
  const bodyColor = human.sex === 'F' ? 0xd6657d : 0x4f82b7;
  const body = scene.add.rectangle(0, -0.5, 7, 8, bodyColor, 1);
  const belt = scene.add.rectangle(0, 1.5, 7, 1.5, 0xe7c36a, 0.88);
  const head = scene.add.circle(0, -6.2, 3, 0xe6b98e, 1);
  const hair = scene.add.rectangle(0, -8, 5.5, 1.8, human.sex === 'F' ? 0x603849 : 0x3b312b, 1);
  const container = scene.add.container(x, y, [shadow, legs, body, belt, head, hair]);
  container.setScale(scale);
  container.setDepth(30 + y / Math.max(1, tileSize));
  return container;
}

function createGrazerVisual(scene, grazer, x, y, tileSize) {
  const scale = Math.max(0.82, tileSize / 24);
  const shadow = scene.add.ellipse(0, 4.5, 12, 4, 0x071015, 0.25);
  const leg1 = scene.add.rectangle(-3.2, 4.2, 2, 5, 0x493824, 1);
  const leg2 = scene.add.rectangle(3.2, 4.2, 2, 5, 0x493824, 1);
  const body = scene.add.rectangle(-0.7, 0, 11, 7, 0xc89a52, 1);
  const flank = scene.add.rectangle(-1.8, -1, 6, 2.4, 0xe3bb70, 0.88);
  const head = scene.add.circle(6, -1.8, 3.2, 0xb98245, 1);
  const ear = scene.add.rectangle(7.7, -4.4, 3.2, 1.4, 0x6b4a2d, 1);
  const container = scene.add.container(x, y, [shadow, leg1, leg2, body, flank, head, ear]);
  container.setScale(scale);
  container.setDepth(30 + y / Math.max(1, tileSize));
  return container;
}

function tileCenter(x, y, tileSize) {
  return {
    x: (x + 0.5) * tileSize,
    y: (y + 0.5) * tileSize
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function destroyCollection(map) {
  for (const visual of map.values()) destroyVisual(visual);
  map.clear();
}

function destroyVisual(visual) {
  for (const child of visual.container.list || []) child.destroy();
  visual.container.destroy();
}
