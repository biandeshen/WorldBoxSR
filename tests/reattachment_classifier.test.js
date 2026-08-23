import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DAY30_RULES,
  evaluateDay30Rules,
  observableAtDay30
} from '../engine/analysis/reattachment_classifier.js';

function row(outcome, {
  durationDays = 60,
  days = 31,
  meanDistance = 5,
  within4 = 0.4,
  otherCloser = 0
} = {}) {
  return {
    outcome,
    durationDays,
    first30: {
      days,
      meanFormerHomeDistance: meanDistance,
      within4Share: within4,
      otherSettlementCloserShare: otherCloser
    }
  };
}

test('day-30 eligibility excludes episodes already resolved or not fully observed through day30', () => {
  assert.equal(observableAtDay30(row('fast_same_rejoin', { durationDays: 30, days: 30 })), false);
  assert.equal(observableAtDay30(row('fast_same_rejoin', { durationDays: 31, days: 30 })), false);
  assert.equal(observableAtDay30(row('fast_same_rejoin', { durationDays: 31, days: 31 })), true);
});

test('classifier reports recall, resolved precision, recovery interference, and migration interference separately', () => {
  const rows = [
    row('long_same_rejoin', { meanDistance: 5.4, within4: 0.2 }),
    row('long_same_rejoin', { meanDistance: 4.2, within4: 0.6 }),
    row('fast_same_rejoin', { meanDistance: 5.1, within4: 0.3 }),
    row('medium_same_rejoin', { meanDistance: 3.8, within4: 0.8 }),
    row('other_join', { meanDistance: 5.3, within4: 0.2, otherCloser: 0.4 }),
    row('other_join', { meanDistance: 3.5, within4: 0.9, otherCloser: 0 }),
    row('censored', { durationDays: 250, meanDistance: 5.6, within4: 0.1 })
  ];

  const rule = DEFAULT_DAY30_RULES.find((candidate) => candidate.id === 'drift-combined');
  const result = evaluateDay30Rules(rows, [rule]);
  const evaluated = result.rules[0];

  assert.equal(result.atRiskEpisodes, 7);
  assert.equal(result.targetLongEpisodes, 2);
  assert.equal(evaluated.selectedEpisodes, 4);
  assert.equal(evaluated.truePositives, 1);
  assert.equal(evaluated.falseNegatives, 1);
  assert.equal(evaluated.fastRecoveryFalsePositives, 1);
  assert.equal(evaluated.mediumRecoveryFalsePositives, 0);
  assert.equal(evaluated.otherJoinFalsePositives, 1);
  assert.equal(evaluated.selectedCensored, 1);
  assert.equal(evaluated.recall, 0.5);
  assert.equal(evaluated.precisionResolved, 1 / 3);
  assert.equal(evaluated.naturalRecoveryInterferenceRate, 0.5);
  assert.equal(evaluated.migrationInterferenceRate, 0.5);
});

test('other-settlement exclusion can reduce migration interference without changing the underlying episode rows', () => {
  const rows = [
    row('long_same_rejoin', { meanDistance: 5.2, within4: 0.25, otherCloser: 0 }),
    row('other_join', { meanDistance: 5.5, within4: 0.1, otherCloser: 0.5 }),
    row('fast_same_rejoin', { meanDistance: 5.1, within4: 0.3, otherCloser: 0 })
  ];
  const before = structuredClone(rows);
  const rules = DEFAULT_DAY30_RULES.filter((rule) =>
    rule.id === 'drift-combined' || rule.id === 'drift-no-other-closer'
  );
  const result = evaluateDay30Rules(rows, rules);
  const broad = result.rules.find((rule) => rule.id === 'drift-combined');
  const guarded = result.rules.find((rule) => rule.id === 'drift-no-other-closer');

  assert.equal(broad.otherJoinFalsePositives, 1);
  assert.equal(guarded.otherJoinFalsePositives, 0);
  assert.equal(guarded.truePositives, 1);
  assert.deepEqual(rows, before);
});
