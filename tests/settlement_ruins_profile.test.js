import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatAbandonmentAge, settlementRuinsProfile } from '../client/presentation/settlement_ruins_profile.js';

const settlementLayerPath = fileURLToPath(new URL('../client/presentation/settlement_layer.js', import.meta.url));

test('active settlements never receive the ruins presentation', () => {
  const profile = settlementRuinsProfile({ active: true, abandonedDay: 10, worldDay: 1000, daysPerYear: 100 });
  assert.equal(profile.visible, false);
  assert.equal(profile.ageBand, 'active');
  assert.equal(profile.ageDays, null);
  assert.equal(profile.foundationAlpha, 0);
});

test('abandoned settlement age derives only from authoritative days', () => {
  const profile = settlementRuinsProfile({ active: false, abandonedDay: 400, worldDay: 650, daysPerYear: 100 });
  assert.equal(profile.visible, true);
  assert.equal(profile.ageDays, 250);
  assert.equal(profile.ageYears, 2.5);
  assert.equal(profile.ageBand, 'settled');
  assert.equal(profile.ageLabel, '2y abandoned');
});

test('recent settled and old ruins fade monotonically without inventing former size', () => {
  const recent = settlementRuinsProfile({ active: false, abandonedDay: 950, worldDay: 1000, daysPerYear: 100 });
  const settled = settlementRuinsProfile({ active: false, abandonedDay: 750, worldDay: 1000, daysPerYear: 100 });
  const old = settlementRuinsProfile({ active: false, abandonedDay: 200, worldDay: 1000, daysPerYear: 100 });
  assert.equal(recent.ageBand, 'recent');
  assert.equal(settled.ageBand, 'settled');
  assert.equal(old.ageBand, 'old');
  assert.ok(recent.foundationAlpha > settled.foundationAlpha);
  assert.ok(settled.foundationAlpha > old.foundationAlpha);
  assert.ok(recent.stoneAlpha > settled.stoneAlpha);
  assert.ok(settled.stoneAlpha > old.stoneAlpha);
  assert.ok(recent.labelAlpha > settled.labelAlpha);
  assert.ok(settled.labelAlpha > old.labelAlpha);
  for (const profile of [recent, settled, old]) {
    assert.ok(profile.foundationAlpha >= 0.2 && profile.foundationAlpha <= 0.34);
    assert.ok(profile.stoneAlpha >= 0.44 && profile.stoneAlpha <= 0.72);
    assert.ok(profile.beamAlpha >= 0.3 && profile.beamAlpha <= 0.62);
    assert.ok(profile.labelAlpha >= 0.68 && profile.labelAlpha <= 0.88);
  }
});

test('missing or inconsistent abandonment day is visibly truthful as unknown age', () => {
  const missing = settlementRuinsProfile({ active: false, abandonedDay: null, worldDay: 1000, daysPerYear: 100 });
  const future = settlementRuinsProfile({ active: false, abandonedDay: 1100, worldDay: 1000, daysPerYear: 100 });
  assert.equal(missing.ageBand, 'unknown');
  assert.equal(future.ageBand, 'unknown');
  assert.equal(missing.ageLabel, 'age unknown');
  assert.equal(future.ageLabel, 'age unknown');
  assert.equal(missing.ageDays, null);
});

test('age label is compact and floors completed world years', () => {
  assert.equal(formatAbandonmentAge(0), '<1y abandoned');
  assert.equal(formatAbandonmentAge(0.99), '<1y abandoned');
  assert.equal(formatAbandonmentAge(1), '1y abandoned');
  assert.equal(formatAbandonmentAge(4.9), '4y abandoned');
  assert.equal(formatAbandonmentAge(Number.NaN), 'age unknown');
  assert.equal(formatAbandonmentAge(-1), 'age unknown');
});

test('ruins renderer is structurally independent from current population tier', () => {
  const source = readFileSync(settlementLayerPath, 'utf8');
  const start = source.indexOf('function createSettlementRuinsVisual');
  const end = source.indexOf('function updateSettlementAmbient', start);
  assert.ok(start >= 0 && end > start, 'dedicated ruins renderer must exist');
  const ruinsSource = source.slice(start, end);
  assert.doesNotMatch(ruinsSource, /settlement\.population|populationTier|settlementVisualProfile/, 'ruins must not reconstruct former size from current population=0');
  assert.match(source, /if \(!settlement\.active\) return createSettlementRuinsVisual/, 'inactive settlements must bypass active population-tier rendering');
});
