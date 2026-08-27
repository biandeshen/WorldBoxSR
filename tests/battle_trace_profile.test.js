import test from 'node:test';
import assert from 'node:assert/strict';
import { battleTraceProfile, projectRecentBattleTraces } from '../client/presentation/battle_trace_profile.js';

test('recent battle projection keeps newest truthful engagements only and is bounded', () => {
  const history = [];
  for (let id = 1; id <= 10; id += 1) {
    history.push({ id, day: 900 + id, type: 'warband.engaged', x: id, y: 4, lossA: 1, lossB: 2, polityAId: 1, polityBId: 2 });
  }
  const before = structuredClone(history);
  const traces = projectRecentBattleTraces(history, 1000, 365);
  assert.equal(traces.length, 6);
  assert.deepEqual(traces.map((trace) => trace.id), [10, 9, 8, 7, 6, 5]);
  assert.equal(traces[0].totalLoss, 3);
  assert.equal(traces[0].x, 10);
  assert.equal(traces[0].polityAId, 1);
  assert.deepEqual(history, before, 'projection must not mutate authoritative history');
});

test('projection rejects stale invalid and zero-loss history without inventing traces', () => {
  const traces = projectRecentBattleTraces([
    { id: 1, day: 1, type: 'warband.engaged', x: 1, y: 1, lossA: 4, lossB: 3 },
    { id: 2, day: 990, type: 'warband.engaged', x: 2, y: 2, lossA: 0, lossB: 0 },
    { id: 3, day: 990, type: 'human.died', x: 3, y: 3, lossA: 9, lossB: 9 },
    { id: 4, day: 990, type: 'warband.engaged', x: Number.NaN, y: 3, lossA: 2, lossB: 1 },
    { id: 5, day: 995, type: 'warband.engaged', x: 5, y: 5, lossA: 2, lossB: 1 }
  ], 1000, 100);
  assert.deepEqual(traces.map((trace) => trace.id), [5]);
  assert.equal(traces[0].ageDays, 5);
});

test('battle trace profile scales with recorded losses while remaining bounded', () => {
  const light = battleTraceProfile({ totalLoss: 2, ageDays: 0, daysPerYear: 365 });
  const heavy = battleTraceProfile({ totalLoss: 18, ageDays: 0, daysPerYear: 365 });
  assert.equal(light.visible, true);
  assert.equal(heavy.visible, true);
  assert.ok(heavy.alpha > light.alpha);
  assert.ok(heavy.radius > light.radius);
  for (const profile of [light, heavy]) {
    assert.ok(profile.alpha >= 0.045 && profile.alpha <= 0.3);
    assert.ok(profile.radius >= 5.5 && profile.radius <= 10);
    assert.ok(profile.stroke >= 0.9 && profile.stroke <= 1.6);
    assert.ok(profile.crossHalf >= 2.8 && profile.crossHalf <= 5);
    assert.ok(profile.dotRadius >= 0.9 && profile.dotRadius <= 1.45);
  }
});

test('battle traces fade with authoritative world-day age and eventually hide', () => {
  const fresh = battleTraceProfile({ totalLoss: 8, ageDays: 0, daysPerYear: 100 });
  const old = battleTraceProfile({ totalLoss: 8, ageDays: 250, daysPerYear: 100 });
  const stale = battleTraceProfile({ totalLoss: 8, ageDays: 301, daysPerYear: 100 });
  assert.ok(fresh.alpha > old.alpha);
  assert.equal(stale.visible, false);
  assert.equal(stale.alpha, 0);
});

test('invalid or zero-loss presentation inputs hide safely', () => {
  assert.equal(battleTraceProfile({ totalLoss: 0 }).visible, false);
  assert.equal(battleTraceProfile({ totalLoss: Number.NaN }).visible, false);
  assert.deepEqual(projectRecentBattleTraces(null, 0, 365), []);
  assert.deepEqual(projectRecentBattleTraces([], Number.NaN, Number.NaN), []);
});
