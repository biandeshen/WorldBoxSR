import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { settlementAmbientPose } from '../client/presentation/settlement_ambient.js';

const settlementLayerPath = fileURLToPath(new URL('../client/presentation/settlement_layer.js', import.meta.url));

test('abandoned settlement ambient pose is exactly still', () => {
  assert.deepEqual(settlementAmbientPose({ nowMs: 1234, settlementId: 7, tier: 4, active: false }), {
    flagAngle: 0,
    flagScaleX: 1,
    flagLift: 0,
    smoke: []
  });
});

test('active hamlet only ripples its banner within restrained bounds', () => {
  for (let now = 0; now <= 5000; now += 41) {
    const pose = settlementAmbientPose({ nowMs: now, settlementId: 2, tier: 1, active: true });
    assert.ok(Math.abs(pose.flagAngle) <= 2.6);
    assert.ok(pose.flagScaleX >= 0.935 && pose.flagScaleX <= 1.065);
    assert.ok(Math.abs(pose.flagLift) <= 0.38);
    assert.deepEqual(pose.smoke, []);
  }
});

test('village and larger active settlements get bounded hearth ambience only', () => {
  const village = settlementAmbientPose({ nowMs: 2345, settlementId: 3, tier: 2, active: true });
  const town = settlementAmbientPose({ nowMs: 2345, settlementId: 3, tier: 3, active: true });
  const city = settlementAmbientPose({ nowMs: 2345, settlementId: 3, tier: 4, active: true });
  assert.equal(village.smoke.length, 2);
  assert.equal(town.smoke.length, 3);
  assert.equal(city.smoke.length, 3);

  for (const puff of city.smoke) {
    assert.ok(Math.abs(puff.x) <= 1.45);
    assert.ok(puff.y <= 0 && puff.y >= -14);
    assert.ok(puff.alpha >= 0 && puff.alpha <= 0.17);
    assert.ok(puff.scale >= 0.72 && puff.scale <= 1.3);
  }
});

test('settlement ambient pose is deterministic and tolerates invalid presentation inputs', () => {
  const args = { nowMs: 9876, settlementId: 9, tier: 3, active: true };
  assert.deepEqual(settlementAmbientPose(args), settlementAmbientPose(args));
  const fallback = settlementAmbientPose({ nowMs: Number.NaN, settlementId: Number.NaN, tier: Number.NaN, active: true });
  assert.equal(fallback.smoke.length, 0);
  assert.ok(Number.isFinite(fallback.flagAngle));
  assert.ok(Number.isFinite(fallback.flagScaleX));
});

test('settlement ambient layer stays presentation-only', () => {
  const source = readFileSync(settlementLayerPath, 'utf8');
  assert.doesNotMatch(source, /engine\//);
  assert.doesNotMatch(source, /applyCommand|tickWorld|advanceWorld|world\.rng|history\.push/);
  assert.match(source, /scene\.events\.on\('update'/);
});
