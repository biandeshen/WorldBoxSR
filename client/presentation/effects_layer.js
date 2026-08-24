export function playToolEffect(scene, effect, tileX, tileY, tileSize) {
  const x = (tileX + 0.5) * tileSize;
  const y = (tileY + 0.5) * tileSize;

  if (effect === 'lightning') return playLightning(scene, x, y, tileSize);
  if (effect === 'erase') return playErase(scene, x, y, tileSize);
  if (effect === 'spawn_grazer') return playSpawn(scene, x, y, tileSize, 0xf0bf68, 7);
  return playSpawn(scene, x, y, tileSize, 0x8ad6ff, 6);
}

function playLightning(scene, x, y, tileSize) {
  const bolt = scene.add.graphics().setDepth(1002);
  const top = Math.max(0, y - tileSize * 9);
  drawBolt(bolt, x, top, x, y, tileSize, 0xfaf4ca, 1);
  drawBolt(bolt, x - tileSize * 0.08, top + tileSize * 0.8, x + tileSize * 0.04, y, tileSize, 0x8dd9ff, 0.72);

  const flash = scene.add.circle(x, y, tileSize * 0.65, 0xfff2a4, 0.88).setDepth(1001);
  const core = scene.add.circle(x, y, tileSize * 0.16, 0xffffff, 1).setDepth(1003);
  const ring = scene.add.circle(x, y, tileSize * 0.2, 0xffffff, 0.02)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.085), 0xffd95d, 0.96)
    .setDepth(1000);

  const sparks = createSparks(scene, x, y, tileSize, 0xffe36c, 10, 1003);
  scene.cameras.main.shake(130, 0.0058);

  scene.tweens.add({ targets: bolt, alpha: 0, duration: 250, onComplete: () => bolt.destroy() });
  scene.tweens.add({ targets: flash, alpha: 0, scale: 2.1, duration: 390, ease: 'Quad.Out', onComplete: () => flash.destroy() });
  scene.tweens.add({ targets: core, alpha: 0, scale: 0.1, duration: 190, onComplete: () => core.destroy() });
  scene.tweens.add({ targets: ring, alpha: 0, scale: 3.5, duration: 470, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
  animateSparks(scene, sparks, x, y, tileSize, 360);
}

function drawBolt(graphics, x0, y0, x1, y1, tileSize, color, alpha) {
  graphics.lineStyle(Math.max(2, tileSize * 0.105), color, alpha);
  graphics.beginPath();
  graphics.moveTo(x0, y0);

  for (let index = 1; index <= 8; index += 1) {
    const t = index / 8;
    const direction = index % 2 === 0 ? -1 : 1;
    const amplitude = tileSize * (0.15 + (index % 3) * 0.055);
    graphics.lineTo(
      x0 + (x1 - x0) * t + direction * amplitude,
      y0 + (y1 - y0) * t
    );
  }

  graphics.lineTo(x1, y1);
  graphics.strokePath();
}

function playSpawn(scene, x, y, tileSize, color, sparkCount) {
  const outer = scene.add.circle(x, y, tileSize * 0.24, color, 0.04)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.075), color, 0.94)
    .setDepth(999);
  const inner = scene.add.circle(x, y, tileSize * 0.13, 0xffffff, 0.78).setDepth(1000);
  const halo = scene.add.circle(x, y, tileSize * 0.42, color, 0.15).setDepth(998);
  const sparks = createSparks(scene, x, y, tileSize, color, sparkCount, 1001);

  scene.tweens.add({ targets: outer, alpha: 0, scale: 3.1, duration: 390, ease: 'Quad.Out', onComplete: () => outer.destroy() });
  scene.tweens.add({ targets: halo, alpha: 0, scale: 1.55, duration: 300, onComplete: () => halo.destroy() });
  scene.tweens.add({ targets: inner, alpha: 0, scale: 0.15, duration: 245, onComplete: () => inner.destroy() });
  animateSparks(scene, sparks, x, y, tileSize, 330);
}

function playErase(scene, x, y, tileSize) {
  const pulse = scene.add.circle(x, y, tileSize * 0.18, 0xff7770, 0.08)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.07), 0xff7770, 0.86)
    .setDepth(998);
  const mark = scene.add.graphics().setDepth(1000);
  mark.lineStyle(Math.max(2, tileSize * 0.085), 0xff8b84, 0.95);
  const radius = tileSize * 0.34;
  mark.lineBetween(x - radius, y - radius, x + radius, y + radius);
  mark.lineBetween(x + radius, y - radius, x - radius, y + radius);
  const sparks = createSparks(scene, x, y, tileSize, 0xff6f69, 6, 999);

  scene.tweens.add({ targets: pulse, alpha: 0, scale: 2.9, duration: 360, ease: 'Quad.Out', onComplete: () => pulse.destroy() });
  scene.tweens.add({ targets: mark, alpha: 0, scale: 1.55, duration: 320, onComplete: () => mark.destroy() });
  animateSparks(scene, sparks, x, y, tileSize * 0.7, 280);
}

function createSparks(scene, x, y, tileSize, color, count, depth) {
  const sparks = [];
  for (let index = 0; index < count; index += 1) {
    const size = Math.max(1.5, tileSize * (0.035 + (index % 3) * 0.012));
    const spark = scene.add.rectangle(x, y, size, size, index % 2 === 0 ? color : 0xffffff, 0.92).setDepth(depth);
    spark.setRotation((Math.PI / 4) * (index % 2));
    sparks.push(spark);
  }
  return sparks;
}

function animateSparks(scene, sparks, x, y, radius, duration) {
  sparks.forEach((spark, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, sparks.length) + (index % 2) * 0.18;
    const distance = radius * (0.55 + (index % 4) * 0.14);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      rotation: spark.rotation + Math.PI * 0.75,
      duration: duration + (index % 3) * 45,
      ease: 'Quad.Out',
      onComplete: () => spark.destroy()
    });
  });
}
