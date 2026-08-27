import test from 'node:test';
import assert from 'node:assert/strict';
import { entityMotionPose } from '../client/presentation/entity_motion.js';

function assertOpposed(a, b, message) {
  assert.ok(Math.abs(a + b) < 1e-9, `${message}: ${a} vs ${b}`);
}

test('moving human pose swings arms and legs in opposition within restrained bounds', () => {
  const pose = entityMotionPose('human', 1234, 0.7, true);
  assertOpposed(pose.backArmAngle, pose.frontArmAngle, 'human arms must oppose');
  assertOpposed(pose.rearLegAngle, pose.frontLegAngle, 'human legs must oppose');
  assert.ok(Math.abs(pose.backArmAngle) <= 15);
  assert.ok(Math.abs(pose.frontLegAngle) <= 15 * 0.82);
  assert.equal(pose.tailAngle, 0);
  assert.equal(pose.headOffsetY, 0);
  assert.ok(pose.breathScaleY >= 0.98 && pose.breathScaleY <= 1.02);
});

test('idle human keeps limbs neutral and only breathes subtly', () => {
  const pose = entityMotionPose('human', 4321, 1.1, false);
  assert.equal(pose.backArmAngle, 0);
  assert.equal(pose.frontArmAngle, 0);
  assert.equal(pose.rearLegAngle, 0);
  assert.equal(pose.frontLegAngle, 0);
  assert.ok(pose.breathScaleY >= 0.988 && pose.breathScaleY <= 1.012);
});

test('grazer stride is opposed with only restrained head motion', () => {
  const moving = entityMotionPose('grazer', 2222, 2.4, true);
  const idle = entityMotionPose('grazer', 2222, 2.4, false);
  assertOpposed(moving.rearLegAngle, moving.frontLegAngle, 'grazer legs must oppose');
  assert.ok(Math.abs(moving.frontLegAngle) <= 12);
  assert.ok(Math.abs(moving.headOffsetY) <= 1.3);
  assert.ok(Math.abs(idle.headOffsetY) <= 1.3 * 0.55);
  assert.equal(moving.tailAngle, 0);
});

test('wolf stride is opposed and tail animation is stronger while moving than idle', () => {
  let maxMovingTail = 0;
  let maxIdleTail = 0;
  for (let now = 0; now <= 5000; now += 37) {
    const moving = entityMotionPose('wolf', now, 3.2, true);
    const idle = entityMotionPose('wolf', now, 3.2, false);
    assertOpposed(moving.rearLegAngle, moving.frontLegAngle, 'wolf legs must oppose');
    assert.ok(Math.abs(moving.frontLegAngle) <= 14);
    maxMovingTail = Math.max(maxMovingTail, Math.abs(moving.tailAngle));
    maxIdleTail = Math.max(maxIdleTail, Math.abs(idle.tailAngle));
  }
  assert.ok(maxMovingTail > 9.5 && maxMovingTail <= 10);
  assert.ok(maxIdleTail > 3.2 && maxIdleTail <= 3.5);
  assert.ok(maxMovingTail > maxIdleTail * 2.5);
});

test('pose helper is deterministic and tolerates invalid presentation clock inputs', () => {
  assert.deepEqual(entityMotionPose('human', 987, 4.2, true), entityMotionPose('human', 987, 4.2, true));
  const fallback = entityMotionPose('unknown', Number.NaN, Number.NaN, false);
  assert.equal(fallback.backArmAngle, 0);
  assert.ok(Number.isFinite(fallback.breathScaleY));
});
