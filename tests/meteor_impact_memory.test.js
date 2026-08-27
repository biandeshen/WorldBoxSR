import test from 'node:test';
import assert from 'node:assert/strict';
import { meteorImpactMemoryProfile, projectRecentMeteorImpactSites } from '../client/presentation/meteor_impact_memory.js';

function tiles(width, height, vegetation = 0, capacity = 10) {
  const result = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      result.push({ x, y, passable: true, vegetation, vegetationCapacity: capacity });
    }
  }
  return result;
}

test('projection uses recorded meteor square footprint and current vegetation recovery only', () => {
  const worldTiles = tiles(7, 7, 0, 10);
  const history = [{ id: 8, day: 900, type: 'god.meteor', x: 0, y: 1, radius: 2, vegetationRemoved: 120, noEffect: false }];
  const sites = projectRecentMeteorImpactSites({ history, tiles: worldTiles, worldDay: 1000, daysPerYear: 100, width: 7, height: 7 });
  assert.equal(sites.length, 1);
  assert.deepEqual({ minX: sites[0].minX, minY: sites[0].minY, maxX: sites[0].maxX, maxY: sites[0].maxY }, { minX: 0, minY: 0, maxX: 2, maxY: 3 });
  assert.equal(sites[0].passableTileCount, 12);
  assert.equal(sites[0].recoveryRatio, 0);
  assert.equal(sites[0].vegetationRemoved, 120);
});

test('full authoritative vegetation recovery removes the meteor memory', () => {
  const worldTiles = tiles(5, 5, 10, 10);
  const history = [{ id: 1, day: 90, type: 'god.meteor', x: 2, y: 2, radius: 2, vegetationRemoved: 250, noEffect: false }];
  assert.deepEqual(projectRecentMeteorImpactSites({ history, tiles: worldTiles, worldDay: 100, daysPerYear: 100, width: 5, height: 5 }), []);
});

test('partial recovery lowers visibility monotonically and remains bounded', () => {
  const fresh = meteorImpactMemoryProfile({ recoveryRatio: 0, ageDays: 0, daysPerYear: 100 });
  const half = meteorImpactMemoryProfile({ recoveryRatio: 0.5, ageDays: 0, daysPerYear: 100 });
  const oldHalf = meteorImpactMemoryProfile({ recoveryRatio: 0.5, ageDays: 400, daysPerYear: 100 });
  assert.equal(fresh.visible, true);
  assert.equal(half.visible, true);
  assert.ok(fresh.alpha > half.alpha);
  assert.ok(half.alpha > oldHalf.alpha);
  for (const profile of [fresh, half, oldHalf]) {
    assert.ok(profile.alpha >= 0.04 && profile.alpha <= 0.3);
    assert.ok(profile.lineWidth >= 1 && profile.lineWidth <= 1.8);
    assert.ok(profile.centerAlpha >= 0.04 && profile.centerAlpha <= 0.32);
    assert.ok(profile.cornerRatio >= 0.1 && profile.cornerRatio <= 0.18);
  }
});

test('projection rejects no-effect zero-removal stale and malformed meteor events', () => {
  const worldTiles = tiles(6, 6, 0, 10);
  const history = [
    { id: 1, day: 999, type: 'god.meteor', x: 2, y: 2, radius: 2, vegetationRemoved: 0, noEffect: false },
    { id: 2, day: 999, type: 'god.meteor', x: 2, y: 2, radius: 2, vegetationRemoved: 20, noEffect: true },
    { id: 3, day: 100, type: 'god.meteor', x: 2, y: 2, radius: 2, vegetationRemoved: 20, noEffect: false },
    { id: 4, day: 999, type: 'god.rain', x: 2, y: 2, radius: 2, vegetationRemoved: 20 },
    { id: 5, day: 999, type: 'god.meteor', x: Number.NaN, y: 2, radius: 2, vegetationRemoved: 20, noEffect: false },
    { id: 6, day: 999, type: 'god.meteor', x: 3, y: 3, radius: 1, vegetationRemoved: 20, noEffect: false }
  ];
  const sites = projectRecentMeteorImpactSites({ history, tiles: worldTiles, worldDay: 1000, daysPerYear: 100, width: 6, height: 6 });
  assert.deepEqual(sites.map((site) => site.id), [6]);
});

test('newest duplicate footprint wins and projected site count stays bounded', () => {
  const worldTiles = tiles(20, 5, 0, 10);
  const history = [];
  history.push({ id: 1, day: 900, type: 'god.meteor', x: 2, y: 2, radius: 1, vegetationRemoved: 20, noEffect: false });
  history.push({ id: 2, day: 910, type: 'god.meteor', x: 2, y: 2, radius: 1, vegetationRemoved: 30, noEffect: false });
  for (let id = 3; id <= 8; id += 1) history.push({ id, day: 910 + id, type: 'god.meteor', x: id * 2, y: 2, radius: 0, vegetationRemoved: 10, noEffect: false });
  const sites = projectRecentMeteorImpactSites({ history, tiles: worldTiles, worldDay: 1000, daysPerYear: 100, width: 20, height: 5 });
  assert.equal(sites.length, 4);
  assert.deepEqual(sites.map((site) => site.id), [8, 7, 6, 5]);
});

test('invalid inputs and old/recovered profiles hide safely', () => {
  assert.deepEqual(projectRecentMeteorImpactSites(), []);
  assert.equal(meteorImpactMemoryProfile({ recoveryRatio: 1 }).visible, false);
  assert.equal(meteorImpactMemoryProfile({ recoveryRatio: 0.5, ageDays: 501, daysPerYear: 100 }).visible, false);
  assert.equal(meteorImpactMemoryProfile({ recoveryRatio: Number.NaN }).visible, false);
});
