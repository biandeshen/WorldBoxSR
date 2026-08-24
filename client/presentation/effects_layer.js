export function playToolEffect(scene, effect, tileX, tileY, tileSize) {
  const x = (tileX + 0.5) * tileSize;
  const y = (tileY + 0.5) * tileSize;

  if (effect === 'lightning') return playLightning(scene, x, y, tileSize);
  if (effect === 'erase') return playErase(scene, x, y, tileSize);
  if (effect === 'spawn_grazer') return playSpawn(scene, x, y, tileSize, 0xf0bf68);
  return playSpawn(scene, x, y, tileSize, 0x8ad6ff);
}

function playLightning(scene, x, y, tileSize) {
  const bolt = scene.add.graphics();
  bolt.setDepth(1000);
  bolt.lineStyle(Math.max(2, tileSize * 0.12), 0xf7f0bd, 1);
  const top = Math.max(0, y - tileSize * 8);
  let px = x;
  let py = top;
  bolt.beginPath();
  bolt.moveTo(px, py);

  for (let index = 1; index <= 7; index += 1) {
    const t = index / 7;
    px = x + (index % 2 === 0 ? -1 : 1) * tileSize * (0.18 + (index % 3) * 0.08);
    py = top + (y - top) * t;
    bolt.lineTo(px, py);
  }
  bolt.lineTo(x, y);
  bolt.strokePath();

  const flash = scene.add.circle(x, y, tileSize * 0.58, 0xfff3a6, 0.78).setDepth(999);
  const ring = scene.add.circle(x, y, tileSize * 0.22, 0xffffff, 0.05)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.08), 0xffdc63, 0.95)
    .setDepth(998);

  scene.cameras.main.shake(110, 0.0045);
  scene.tweens.add({ targets: bolt, alpha: 0, duration: 240, onComplete: () => bolt.destroy() });
  scene.tweens.add({ targets: flash, alpha: 0, scale: 1.8, duration: 360, onComplete: () => flash.destroy() });
  scene.tweens.add({ targets: ring, alpha: 0, scale: 3.2, duration: 440, onComplete: () => ring.destroy() });
}

function playSpawn(scene, x, y, tileSize, color) {
  const ring = scene.add.circle(x, y, tileSize * 0.24, color, 0.08)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.07), color, 0.95)
    .setDepth(998);
  const spark = scene.add.circle(x, y, tileSize * 0.12, 0xffffff, 0.75).setDepth(999);

  scene.tweens.add({ targets: ring, alpha: 0, scale: 2.7, duration: 360, onComplete: () => ring.destroy() });
  scene.tweens.add({ targets: spark, alpha: 0, scale: 0.2, duration: 260, onComplete: () => spark.destroy() });
}

function playErase(scene, x, y, tileSize) {
  const mark = scene.add.graphics().setDepth(998);
  mark.lineStyle(Math.max(2, tileSize * 0.08), 0xff6f6f, 0.9);
  const radius = tileSize * 0.32;
  mark.lineBetween(x - radius, y - radius, x + radius, y + radius);
  mark.lineBetween(x + radius, y - radius, x - radius, y + radius);
  scene.tweens.add({ targets: mark, alpha: 0, scale: 1.8, duration: 320, onComplete: () => mark.destroy() });
}
