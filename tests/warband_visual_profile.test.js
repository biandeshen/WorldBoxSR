import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleWarbandSoldiers, warbandVisualProfile } from '../client/presentation/warband_visual_profile.js';

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
