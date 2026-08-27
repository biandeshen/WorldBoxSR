import test from 'node:test';
import assert from 'node:assert/strict';
import { compactAge, settlementPoliticalStatusProfile } from '../client/presentation/settlement_political_status.js';

test('occupation is visible only when recorded conqueror still owns the settlement', () => {
  const occupied = settlementPoliticalStatusProfile({
    active: true,
    polityId: 3,
    previousPolityId: 1,
    lastConqueredByPolityId: 3,
    occupationStartedDay: 900,
    worldDay: 1050,
    daysPerYear: 100
  });
  assert.equal(occupied.visible, true);
  assert.equal(occupied.kind, 'occupied');
  assert.equal(occupied.ageDays, 150);
  assert.equal(occupied.ageYears, 1.5);
  assert.equal(occupied.badgeText, 'OCCUPIED · 1y');

  const changedOwner = settlementPoliticalStatusProfile({
    active: true,
    polityId: 4,
    previousPolityId: 1,
    lastConqueredByPolityId: 3,
    occupationStartedDay: 900,
    worldDay: 1050,
    daysPerYear: 100
  });
  assert.equal(changedOwner.visible, false);
});

test('occupation requires a truthful different previous polity and valid start day', () => {
  const base = { active: true, polityId: 2, lastConqueredByPolityId: 2, occupationStartedDay: 500, worldDay: 700, daysPerYear: 100 };
  assert.equal(settlementPoliticalStatusProfile({ ...base, previousPolityId: 2 }).visible, false);
  assert.equal(settlementPoliticalStatusProfile({ ...base, previousPolityId: null }).visible, false);
  assert.equal(settlementPoliticalStatusProfile({ ...base, previousPolityId: 1, occupationStartedDay: null }).visible, false);
  assert.equal(settlementPoliticalStatusProfile({ ...base, previousPolityId: 1, occupationStartedDay: 800 }).visible, false);
});

test('recent rebellion is bounded to three authoritative world years and fades', () => {
  const fresh = settlementPoliticalStatusProfile({ active: true, lastRebelledDay: 950, worldDay: 1000, daysPerYear: 100 });
  const old = settlementPoliticalStatusProfile({ active: true, lastRebelledDay: 750, worldDay: 1000, daysPerYear: 100 });
  const stale = settlementPoliticalStatusProfile({ active: true, lastRebelledDay: 699, worldDay: 1000, daysPerYear: 100 });
  assert.equal(fresh.kind, 'rebellion');
  assert.equal(old.kind, 'rebellion');
  assert.equal(stale.visible, false);
  assert.ok(fresh.ringAlpha > old.ringAlpha);
  assert.ok(fresh.badgeAlpha > old.badgeAlpha);
  assert.equal(fresh.badgeText, 'REBELLION · <1y');
  assert.equal(old.badgeText, 'REBELLION · 2y');
});

test('occupation takes precedence over older rebellion history without inventing unrest', () => {
  const status = settlementPoliticalStatusProfile({
    active: true,
    polityId: 5,
    previousPolityId: 2,
    lastConqueredByPolityId: 5,
    occupationStartedDay: 980,
    lastRebelledDay: 900,
    worldDay: 1000,
    daysPerYear: 100
  });
  assert.equal(status.kind, 'occupied');
  assert.match(status.badgeText, /^OCCUPIED/);
});

test('inactive settlement and invalid political timestamps hide safely', () => {
  assert.equal(settlementPoliticalStatusProfile({ active: false, polityId: 2, previousPolityId: 1, lastConqueredByPolityId: 2, occupationStartedDay: 10 }).visible, false);
  assert.equal(settlementPoliticalStatusProfile({ active: true, lastRebelledDay: Number.NaN }).visible, false);
  assert.equal(settlementPoliticalStatusProfile({ active: true, lastRebelledDay: 200, worldDay: 100 }).visible, false);
});

test('political age label stays compact', () => {
  assert.equal(compactAge(0), '<1y');
  assert.equal(compactAge(0.99), '<1y');
  assert.equal(compactAge(1), '1y');
  assert.equal(compactAge(3.8), '3y');
  assert.equal(compactAge(Number.NaN), 'age?');
});
