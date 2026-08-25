import { playToolSound } from './audio_feedback.js';
import { currentEffectProfile } from './effect_preferences.js';

export function playToolEffect(scene, effect, tileX, tileY, tileSize) {
  const x = (tileX + 0.5) * tileSize;
  const y = (tileY + 0.5) * tileSize;
  const profile = currentEffectProfile();
  playToolSound(effect);

  if (effect === 'meteor') return playMeteor(scene, x, y, tileSize, profile);
  if (effect === 'rain') return playRain(scene, x, y, tileSize, profile);
  if (effect === 'lightning') return playLightning(scene, x, y, tileSize, profile);
  if (effect === 'erase') return playErase(scene, x, y, tileSize, profile);
  if (effect === 'spawn_grazer') return playSpawn(scene, x, y, tileSize, 0xf0bf68, 7, profile);
  return playSpawn(scene, x, y, tileSize, 0x8ad6ff, 6, profile);
}

function playRain(scene, x, y, tileSize, profile) {
  const halo = scene.add.circle(x, y, tileSize * 0.62, 0x6ed4ff, profile.reducedMotion ? 0.05 : 0.11)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.065), 0x8be9ff, profile.reducedMotion ? 0.48 : 0.78)
    .setDepth(1000);
  const growth = scene.add.circle(x, y, tileSize * 0.35, 0x6bcf72, 0.025)
    .setStrokeStyle(Math.max(1.8, tileSize * 0.075), 0x78df7f, profile.reducedMotion ? 0.52 : 0.88)
    .setDepth(1001);
  const drops = [];
  const count = scaledSparkCount(16, profile);
  const columns = Math.max(4, Math.ceil(Math.sqrt(count)));
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const spread = tileSize * (profile.reducedMotion ? 1.4 : 2.25);
    const startX = x + ((column / Math.max(1, columns - 1)) - 0.5) * spread;
    const startY = y - tileSize * (profile.reducedMotion ? 0.75 : 1.75) - row * tileSize * 0.32;
    const drop = scene.add.rectangle(
      startX,
      startY,
      Math.max(1.5, tileSize * 0.045),
      Math.max(5, tileSize * 0.22),
      index % 3 === 0 ? 0xa9efff : 0x62cfff,
      profile.reducedMotion ? 0.58 : 0.86
    ).setDepth(1003);
    drop.setRotation(0.08);
    drops.push(drop);
    scene.tweens.add({
      targets: drop,
      y: y + tileSize * (profile.reducedMotion ? 0.65 : 1.45),
      alpha: 0,
      duration: profile.reducedMotion ? 210 : 430,
      delay: (index % columns) * (profile.reducedMotion ? 8 : 18),
      ease: 'Quad.In',
      onComplete: () => drop.destroy()
    });
  }

  const growthSparks = createSparks(
    scene,
    x,
    y,
    tileSize,
    0x72dd75,
    scaledSparkCount(10, profile),
    1002
  );

  scene.tweens.add({
    targets: halo,
    alpha: 0,
    scale: profile.reducedMotion ? 1.25 : 2.6,
    duration: profile.reducedMotion ? 260 : 560,
    ease: 'Quad.Out',
    onComplete: () => halo.destroy()
  });
  scene.tweens.add({
    targets: growth,
    alpha: 0,
    scale: profile.reducedMotion ? 1.7 : 4.2,
    duration: profile.reducedMotion ? 280 : 620,
    ease: 'Cubic.Out',
    onComplete: () => growth.destroy()
  });
  animateSparks(
    scene,
    growthSparks,
    x,
    y,
    tileSize * (profile.reducedMotion ? 0.55 : 1.35),
    profile.reducedMotion ? 220 : 480
  );
}

function playMeteor(scene, x, y, tileSize, profile) {
  const trail = scene.add.graphics().setDepth(1004);
  trail.lineStyle(Math.max(3, tileSize * 0.15), 0xffd486, profile.reducedMotion ? 0.38 : 0.82);
  trail.lineBetween(x - tileSize * 3.2, y - tileSize * 5.4, x, y);
  trail.lineStyle(Math.max(1.5, tileSize * 0.07), 0xffffff, profile.reducedMotion ? 0.3 : 0.72);
  trail.lineBetween(x - tileSize * 2.6, y - tileSize * 4.4, x, y);

  const impact = scene.add.circle(
    x,
    y,
    tileSize * 0.82,
    0xffd28a,
    Math.min(0.58, profile.flashAlpha * (profile.reducedMotion ? 1.15 : 1.75))
  ).setDepth(1003);
  const core = scene.add.circle(x, y, tileSize * 0.28, 0xffffff, profile.reducedMotion ? 0.48 : 0.95).setDepth(1005);
  const ringA = scene.add.circle(x, y, tileSize * 0.42, 0xffffff, 0.015)
    .setStrokeStyle(Math.max(2.2, tileSize * 0.1), 0xff9a59, profile.reducedMotion ? 0.55 : 0.96)
    .setDepth(1002);
  const ringB = scene.add.circle(x, y, tileSize * 0.68, 0xffffff, 0.01)
    .setStrokeStyle(Math.max(1.8, tileSize * 0.07), 0xffd37a, profile.reducedMotion ? 0.35 : 0.74)
    .setDepth(1001);
  const sparks = createSparks(
    scene,
    x,
    y,
    tileSize,
    0xff9858,
    scaledSparkCount(20, profile),
    1005
  );

  if (profile.cameraShake) scene.cameras.main.shake(230, 0.0085);

  scene.tweens.add({
    targets: trail,
    alpha: 0,
    duration: profile.reducedMotion ? 120 : 220,
    onComplete: () => trail.destroy()
  });
  scene.tweens.add({
    targets: impact,
    alpha: 0,
    scale: profile.reducedMotion ? 1.35 : 2.6,
    duration: profile.reducedMotion ? 220 : 470,
    ease: 'Quad.Out',
    onComplete: () => impact.destroy()
  });
  scene.tweens.add({
    targets: core,
    alpha: 0,
    scale: profile.reducedMotion ? 0.45 : 0.12,
    duration: profile.reducedMotion ? 150 : 250,
    onComplete: () => core.destroy()
  });
  scene.tweens.add({
    targets: ringA,
    alpha: 0,
    scale: profile.reducedMotion ? 1.8 : 4.4,
    duration: profile.reducedMotion ? 260 : 560,
    ease: 'Cubic.Out',
    onComplete: () => ringA.destroy()
  });
  scene.tweens.add({
    targets: ringB,
    alpha: 0,
    scale: profile.reducedMotion ? 1.45 : 3.3,
    duration: profile.reducedMotion ? 280 : 620,
    ease: 'Cubic.Out',
    onComplete: () => ringB.destroy()
  });
  animateSparks(
    scene,
    sparks,
    x,
    y,
    tileSize * (profile.reducedMotion ? 0.9 : 2.15),
    profile.reducedMotion ? 240 : 520
  );
}

function playLightning(scene, x, y, tileSize, profile) {
  const bolt = scene.add.graphics().setDepth(1002);
  const top = Math.max(0, y - tileSize * 9);
  drawBolt(bolt, x, top, x, y, tileSize, 0xfaf4ca, profile.reducedMotion ? 0.7 : 1);
  drawBolt(
    bolt,
    x - tileSize * 0.08,
    top + tileSize * 0.8,
    x + tileSize * 0.04,
    y,
    tileSize,
    0x8dd9ff,
    profile.reducedMotion ? 0.32 : 0.72
  );

  const flash = scene.add.circle(x, y, tileSize * 0.65, 0xfff2a4, profile.flashAlpha).setDepth(1001);
  const core = scene.add.circle(x, y, tileSize * 0.16, 0xffffff, profile.reducedMotion ? 0.5 : 1).setDepth(1003);
  const ring = scene.add.circle(x, y, tileSize * 0.2, 0xffffff, 0.02)
    .setStrokeStyle(
      Math.max(1.5, tileSize * 0.085),
      0xffd95d,
      profile.reducedMotion ? 0.55 : 0.96
    )
    .setDepth(1000);

  const sparks = createSparks(
    scene,
    x,
    y,
    tileSize,
    0xffe36c,
    scaledSparkCount(10, profile),
    1003
  );
  if (profile.cameraShake) scene.cameras.main.shake(130, 0.0058);

  const flashDuration = profile.reducedMotion ? 210 : 390;
  const ringDuration = profile.reducedMotion ? 240 : 470;
  scene.tweens.add({ targets: bolt, alpha: 0, duration: profile.reducedMotion ? 150 : 250, onComplete: () => bolt.destroy() });
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    scale: profile.flashScale,
    duration: flashDuration,
    ease: 'Quad.Out',
    onComplete: () => flash.destroy()
  });
  scene.tweens.add({ targets: core, alpha: 0, scale: 0.1, duration: profile.reducedMotion ? 120 : 190, onComplete: () => core.destroy() });
  scene.tweens.add({
    targets: ring,
    alpha: 0,
    scale: profile.ringScale,
    duration: ringDuration,
    ease: 'Cubic.Out',
    onComplete: () => ring.destroy()
  });
  animateSparks(scene, sparks, x, y, tileSize * (profile.reducedMotion ? 0.55 : 1), profile.reducedMotion ? 190 : 360);
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

function playSpawn(scene, x, y, tileSize, color, sparkCount, profile) {
  const outer = scene.add.circle(x, y, tileSize * 0.24, color, 0.04)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.075), color, profile.reducedMotion ? 0.65 : 0.94)
    .setDepth(999);
  const inner = scene.add.circle(x, y, tileSize * 0.13, 0xffffff, profile.reducedMotion ? 0.46 : 0.78).setDepth(1000);
  const halo = scene.add.circle(x, y, tileSize * 0.42, color, profile.reducedMotion ? 0.07 : 0.15).setDepth(998);
  const sparks = createSparks(scene, x, y, tileSize, color, scaledSparkCount(sparkCount, profile), 1001);

  scene.tweens.add({
    targets: outer,
    alpha: 0,
    scale: profile.reducedMotion ? 1.7 : 3.1,
    duration: profile.reducedMotion ? 190 : 390,
    ease: 'Quad.Out',
    onComplete: () => outer.destroy()
  });
  scene.tweens.add({
    targets: halo,
    alpha: 0,
    scale: profile.reducedMotion ? 1.18 : 1.55,
    duration: profile.reducedMotion ? 160 : 300,
    onComplete: () => halo.destroy()
  });
  scene.tweens.add({ targets: inner, alpha: 0, scale: 0.15, duration: profile.reducedMotion ? 130 : 245, onComplete: () => inner.destroy() });
  animateSparks(
    scene,
    sparks,
    x,
    y,
    tileSize * (profile.reducedMotion ? 0.55 : 1),
    profile.reducedMotion ? 170 : 330
  );
}

function playErase(scene, x, y, tileSize, profile) {
  const pulse = scene.add.circle(x, y, tileSize * 0.18, 0xff7770, profile.reducedMotion ? 0.04 : 0.08)
    .setStrokeStyle(Math.max(1.5, tileSize * 0.07), 0xff7770, profile.reducedMotion ? 0.58 : 0.86)
    .setDepth(998);
  const mark = scene.add.graphics().setDepth(1000);
  mark.lineStyle(Math.max(2, tileSize * 0.085), 0xff8b84, profile.reducedMotion ? 0.7 : 0.95);
  const radius = tileSize * 0.34;
  mark.lineBetween(x - radius, y - radius, x + radius, y + radius);
  mark.lineBetween(x + radius, y - radius, x - radius, y + radius);
  const sparks = createSparks(scene, x, y, tileSize, 0xff6f69, scaledSparkCount(6, profile), 999);

  scene.tweens.add({
    targets: pulse,
    alpha: 0,
    scale: profile.reducedMotion ? 1.5 : 2.9,
    duration: profile.reducedMotion ? 180 : 360,
    ease: 'Quad.Out',
    onComplete: () => pulse.destroy()
  });
  scene.tweens.add({
    targets: mark,
    alpha: 0,
    scale: profile.reducedMotion ? 1.12 : 1.55,
    duration: profile.reducedMotion ? 170 : 320,
    onComplete: () => mark.destroy()
  });
  animateSparks(
    scene,
    sparks,
    x,
    y,
    tileSize * (profile.reducedMotion ? 0.35 : 0.7),
    profile.reducedMotion ? 150 : 280
  );
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

function scaledSparkCount(baseCount, profile) {
  return Math.max(2, Math.round(baseCount * profile.sparkRatio));
}
