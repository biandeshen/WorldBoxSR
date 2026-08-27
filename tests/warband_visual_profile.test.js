import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleWarbandSoldiers, warbandObjectiveCue, warbandVisualProfile } from '../client/presentation/warband_visual_profile.js';

test('warband strength maps monotonically to zero through five visible soldiers', () => {
  const cases = [
    [0, 0], [1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 4], [8, 4], [9, 5], [40, 5]
  ];
  for (const [strength, expected] of cases) assert.equal(visibleWarbandSoldiers(strength), expected, `strength ${strength}`);
});

test('strength eight formation is materially larger than a strength-one remnant', () => {
  const remnant = warbandVisualProfile({ strength: 1, initialStrength: 8, movementState: 'mobilized' });
  const full = warbandVisualProfile({ strength: 8, initialStrength: 8, movementState: 'mobilized' });
  assert.equal(remnant.soldierCount, 1);
  assert.equal(full.soldierCount, 4);
  assert.equal(remnant.offsets.length, 1);
  assert.equal(full.offsets.length, 4);
  assert.equal(remnant.casualtyRatio, 0.875);
  assert.equal(full.casualtyRatio, 0);
});

test('mobilized, marching and engaged formations are distinct and bounded', () => {
  const mobilized = warbandVisualProfile({ strength: 9, movementState: 'mobilized' });
  const marching = warbandVisualProfile({ strength: 9, movementState: 'marching' });
  const engaged = warbandVisualProfile({ strength: 9, movementState: 'marching', engaged: true });

  assert.equal(mobilized.formation, 'mobilized');
  assert.equal(marching.formation, 'marching');
  assert.equal(engaged.formation, 'engaged');
  assert.notDeepEqual(mobilized.offsets, marching.offsets);
  assert.notDeepEqual(marching.offsets, engaged.offsets);

  for (const profile of [mobilized, marching, engaged]) {
    assert.equal(profile.offsets.length, 5);
    for (const offset of profile.offsets) {
      assert.ok(Math.abs(offset.x) <= 8, `${profile.formation} x ${offset.x}`);
      assert.ok(offset.y >= -5 && offset.y <= 5, `${profile.formation} y ${offset.y}`);
    }
  }
});

test('profile keeps exact current strength separate from visual soldier count', () => {
  const profile = warbandVisualProfile({ strength: 13, initialStrength: 16, movementState: 'marching' });
  assert.equal(profile.currentStrength, 13);
  assert.equal(profile.startingStrength, 16);
  assert.equal(profile.soldierCount, 5);
  assert.ok(Math.abs(profile.casualtyRatio - 3 / 16) < 1e-12);
});

test('invalid profile inputs collapse safely without inventing soldiers', () => {
  const profile = warbandVisualProfile({ strength: Number.NaN, initialStrength: Number.NaN, movementState: 'unknown' });
  assert.equal(profile.currentStrength, 0);
  assert.equal(profile.soldierCount, 0);
  assert.equal(profile.formation, 'mobilized');
  assert.deepEqual(profile.offsets, []);
});

test('marching objective cue points toward the recorded target without claiming a route', () => {
  const cue = warbandObjectiveCue({ x: 2, y: 3, targetX: 8, targetY: 11, movementState: 'marching', tileSize: 28 });
  assert.equal(cue.visible, true);
  assert.ok(Math.abs(cue.targetTileDistance - 10) < 1e-12);
  assert.ok(Math.abs(cue.directionX - 0.6) < 1e-12);
  assert.ok(Math.abs(cue.directionY - 0.8) < 1e-12);
  assert.ok(Math.abs(Math.hypot(cue.directionX, cue.directionY) - 1) < 1e-12);
  assert.ok(cue.arrowStart > 12 && cue.arrowStart < 14);
  assert.ok(cue.arrowEnd > 27 && cue.arrowEnd < 28);
  assert.ok(cue.arrowHead > 5 && cue.arrowHead < 6);
  assert.ok(cue.targetRadius > 11 && cue.targetRadius < 12);
  assert.ok(cue.arrowAlpha > cue.targetAlpha);
});

test('mobilized objective remains subtler than marching while preserving the same truth direction', () => {
  const mobilized = warbandObjectiveCue({ x: 1, y: 1, targetX: 5, targetY: 1, movementState: 'mobilized' });
  const marching = warbandObjectiveCue({ x: 1, y: 1, targetX: 5, targetY: 1, movementState: 'marching' });
  assert.equal(mobilized.visible, true);
  assert.equal(mobilized.directionX, 1);
  assert.equal(mobilized.directionY, 0);
  assert.equal(marching.directionX, mobilized.directionX);
  assert.equal(marching.directionY, mobilized.directionY);
  assert.ok(mobilized.arrowAlpha < marching.arrowAlpha);
  assert.ok(mobilized.targetAlpha < marching.targetAlpha);
});

test('engaged, missing-target and zero-distance objective cues hide exactly', () => {
  const engaged = warbandObjectiveCue({ x: 2, y: 2, targetX: 7, targetY: 7, movementState: 'engaged', engaged: true });
  const missing = warbandObjectiveCue({ x: 2, y: 2, targetX: null, targetY: 7, movementState: 'marching' });
  const arrived = warbandObjectiveCue({ x: 2, y: 2, targetX: 2, targetY: 2, movementState: 'marching' });
  for (const cue of [engaged, missing, arrived]) {
    assert.equal(cue.visible, false);
    assert.equal(cue.arrowAlpha, 0);
    assert.equal(cue.targetAlpha, 0);
    assert.equal(cue.targetRadius, 0);
  }
});
