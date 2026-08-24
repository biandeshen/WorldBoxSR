export class SettlementLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.visuals = new Map();
  }

  sync(view) {
    const activeIds = new Set();

    for (const settlement of view.settlements) {
      activeIds.add(settlement.id);
      const signature = settlementSignature(settlement);
      const current = this.visuals.get(settlement.id);

      if (current?.signature === signature) continue;
      if (current) destroyContainer(current.container);

      this.visuals.set(settlement.id, {
        signature,
        container: createSettlementVisual(this.scene, settlement, this.tileSize)
      });
    }

    for (const [id, visual] of this.visuals) {
      if (activeIds.has(id)) continue;
      destroyContainer(visual.container);
      this.visuals.delete(id);
    }
  }

  destroy() {
    for (const visual of this.visuals.values()) destroyContainer(visual.container);
    this.visuals.clear();
  }
}

function settlementSignature(settlement) {
  return [
    settlement.name,
    settlement.active ? 'active' : 'abandoned',
    populationTier(settlement.population),
    settlement.population
  ].join('|');
}

function createSettlementVisual(scene, settlement, tileSize) {
  const x = (settlement.x + 0.5) * tileSize;
  const y = (settlement.y + 0.5) * tileSize;
  const scale = Math.max(0.86, tileSize / 24);
  const tier = populationTier(settlement.population);
  const color = colorForSettlement(settlement.id);
  const children = [];

  const ground = scene.add.ellipse(0, 3, 36 + tier * 5, 25 + tier * 4, settlement.active ? 0x9b8451 : 0x68645b, settlement.active ? 0.22 : 0.12);
  ground.setStrokeStyle(1.2, settlement.active ? color : 0x80796e, settlement.active ? 0.42 : 0.2);
  children.push(ground);

  const roadColor = settlement.active ? 0xbba56c : 0x777168;
  const roadH = scene.add.rectangle(0, 3, 30 + tier * 3, 3.2, roadColor, 0.58);
  const roadV = scene.add.rectangle(0, 3, 3.2, 21 + tier * 3, roadColor, 0.58);
  children.push(roadH, roadV);

  const houseCount = Math.max(1, Math.min(6, tier + 1));
  const offsets = [
    [-8, 5],
    [7.5, 5],
    [-7, -6],
    [7.2, -6],
    [-14, -1],
    [14, -1]
  ];

  for (let index = 0; index < houseCount; index += 1) {
    const [dx, dy] = offsets[index];
    children.push(...createHouse(scene, dx, dy, settlement.active, color, index));
  }

  if (tier >= 3) {
    children.push(...createHall(scene, 0, -5, settlement.active, color));
  }

  if (tier >= 2 && settlement.active) {
    const fieldLeft = scene.add.rectangle(-15, 9, 7, 5, 0x7f8445, 0.8).setStrokeStyle(1, 0xd1bb72, 0.34);
    const fieldRight = scene.add.rectangle(15, 9, 7, 5, 0x748044, 0.8).setStrokeStyle(1, 0xd1bb72, 0.34);
    const cropA = scene.add.rectangle(-15, 8.2, 5.5, 0.8, 0xd0bd5c, 0.72);
    const cropB = scene.add.rectangle(15, 8.2, 5.5, 0.8, 0xd0bd5c, 0.72);
    children.push(fieldLeft, fieldRight, cropA, cropB);
  }

  if (settlement.active) {
    const pole = scene.add.rectangle(15 + tier * 1.4, -10, 1.2, 16, 0x59432f, 1);
    const flag = scene.add.rectangle(19 + tier * 1.4, -15.5, 8, 5, color, 1);
    const flagLight = scene.add.rectangle(17.4 + tier * 1.4, -16.5, 3, 1.2, lighten(color), 0.72);
    children.push(pole, flag, flagLight);
  }

  const label = scene.add.text(0, -27 - tier, settlement.name, {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: tier >= 3 ? '11px' : '10px',
    fontStyle: 'bold',
    color: settlement.active ? '#fff2bf' : '#b9b1a2',
    stroke: '#10151c',
    strokeThickness: 3,
    align: 'center'
  });
  label.setOrigin(0.5, 1);

  const population = scene.add.text(0, -24 - tier, `⌂ ${settlement.population}`, {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '8px',
    color: settlement.active ? '#d8e1cd' : '#938d84',
    stroke: '#10151c',
    strokeThickness: 2,
    align: 'center'
  });
  population.setOrigin(0.5, 0);
  children.push(label, population);

  if (!settlement.active) {
    const ruinMark = scene.add.text(0, 0, '×', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '18px',
      color: '#a9a39a',
      stroke: '#202020',
      strokeThickness: 2
    }).setOrigin(0.5);
    children.push(ruinMark);
  }

  const container = scene.add.container(x, y, children);
  container.setScale(scale);
  container.setAlpha(settlement.active ? 1 : 0.48);
  container.setDepth(20 + y / Math.max(1, tileSize));
  return container;
}

function createHouse(scene, dx, dy, active, settlementColor, index) {
  const wallColor = active ? (index % 2 === 0 ? 0xd3b174 : 0xc59a65) : 0x716d66;
  const roofColor = active ? mixColor(0x8c4638, settlementColor, 0.2) : 0x514f4d;
  const shadow = scene.add.ellipse(dx, dy + 5.8, 10, 3.6, 0x071015, 0.24);
  const wall = scene.add.rectangle(dx, dy + 1.7, 8.5, 7.4, wallColor, 1);
  const wallLight = scene.add.rectangle(dx - 2.2, dy + 0.7, 2.2, 4.5, lighten(wallColor), active ? 0.42 : 0.15);
  const roof = scene.add.triangle(dx, dy - 4, -5.4, 4, 5.4, 4, 0, -3.8, roofColor, 1);
  const door = scene.add.rectangle(dx, dy + 3, 2.5, 4.5, 0x5a3d2c, 1);
  const windowLight = scene.add.rectangle(dx + 2.4, dy + 0.8, 1.4, 1.5, active ? 0xf4d77a : 0x4f4b45, active ? 0.85 : 0.35);
  return [shadow, wall, wallLight, roof, door, windowLight];
}

function createHall(scene, dx, dy, active, settlementColor) {
  const shadow = scene.add.ellipse(dx, dy + 7.5, 16, 5, 0x071015, 0.28);
  const wall = scene.add.rectangle(dx, dy + 1.5, 13, 10, active ? 0xd8bd82 : 0x716d66, 1);
  const roof = scene.add.triangle(dx, dy - 5.5, -8, 4.5, 8, 4.5, 0, -5, active ? mixColor(0x713b35, settlementColor, 0.28) : 0x4c4b48, 1);
  const door = scene.add.rectangle(dx, dy + 3.8, 3.2, 5.4, 0x513628, 1);
  const crest = scene.add.rectangle(dx, dy - 2.8, 3, 3, active ? settlementColor : 0x6d6861, 1);
  return [shadow, wall, roof, door, crest];
}

function populationTier(population) {
  if (population >= 45) return 4;
  if (population >= 25) return 3;
  if (population >= 10) return 2;
  return 1;
}

function colorForSettlement(id) {
  const colors = [0xd85f55, 0x5e8bd8, 0xe1b453, 0x6eb878, 0x9a72cc, 0xd679b0];
  return colors[(Math.max(1, id) - 1) % colors.length];
}

function lighten(color) {
  const r = Math.min(255, ((color >> 16) & 0xff) + 34);
  const g = Math.min(255, ((color >> 8) & 0xff) + 34);
  const b = Math.min(255, (color & 0xff) + 34);
  return (r << 16) | (g << 8) | b;
}

function mixColor(a, b, t) {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const blue = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | blue;
}

function destroyContainer(container) {
  for (const child of container.list || []) child.destroy();
  container.destroy();
}
