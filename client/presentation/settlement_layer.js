export class SettlementLayer {
  constructor(scene, tileSize) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.visuals = [];
  }

  sync(view) {
    this.destroy();
    for (const settlement of view.settlements) {
      this.visuals.push(createSettlementVisual(this.scene, settlement, this.tileSize));
    }
  }

  destroy() {
    for (const visual of this.visuals) destroyContainer(visual);
    this.visuals = [];
  }
}

function createSettlementVisual(scene, settlement, tileSize) {
  const x = (settlement.x + 0.5) * tileSize;
  const y = (settlement.y + 0.5) * tileSize;
  const scale = Math.max(0.82, tileSize / 24);
  const children = [];

  const halo = scene.add.circle(0, 0, 15, 0xffdf79, settlement.active ? 0.08 : 0.035);
  halo.setStrokeStyle(1.4, settlement.active ? 0xf5cf63 : 0x8c806d, settlement.active ? 0.76 : 0.38);
  children.push(halo);

  const houseCount = Math.max(1, Math.min(4, Math.ceil(Math.max(1, settlement.population) / 10)));
  const offsets = [
    [-5.5, 2.5],
    [5.5, 2.5],
    [-2.5, -5],
    [6.5, -5]
  ];

  for (let index = 0; index < houseCount; index += 1) {
    const [dx, dy] = offsets[index];
    const shadow = scene.add.ellipse(dx, dy + 5.2, 9, 3.5, 0x071015, 0.24);
    const wall = scene.add.rectangle(dx, dy + 1.5, 8, 7, settlement.active ? 0xd6b277 : 0x7b756b, 1);
    const roof = scene.add.triangle(dx, dy - 4, -5, 4, 5, 4, 0, -3.5, settlement.active ? 0x8e4538 : 0x595552, 1);
    const door = scene.add.rectangle(dx, dy + 2.8, 2.4, 4.4, 0x5f402f, 1);
    children.push(shadow, wall, roof, door);
  }

  if (settlement.active) {
    const pole = scene.add.rectangle(10, -8, 1.2, 13, 0x5b4832, 1);
    const flag = scene.add.rectangle(13.5, -12.5, 7, 4.5, colorForSettlement(settlement.id), 1);
    children.push(pole, flag);
  }

  const label = scene.add.text(0, -22, settlement.name, {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '10px',
    color: settlement.active ? '#fff2bf' : '#b9b1a2',
    stroke: '#10151c',
    strokeThickness: 3,
    align: 'center'
  });
  label.setOrigin(0.5, 1);
  children.push(label);

  const container = scene.add.container(x, y, children);
  container.setScale(scale);
  container.setAlpha(settlement.active ? 1 : 0.48);
  container.setDepth(20 + y / Math.max(1, tileSize));
  return container;
}

function colorForSettlement(id) {
  const colors = [0xd85f55, 0x5e8bd8, 0xe1b453, 0x6eb878, 0x9a72cc, 0xd679b0];
  return colors[(Math.max(1, id) - 1) % colors.length];
}

function destroyContainer(container) {
  for (const child of container.list || []) child.destroy();
  container.destroy();
}
