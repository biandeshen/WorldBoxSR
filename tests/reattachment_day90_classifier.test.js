import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DAY90_RULES,
  evaluateDay90Rules,
  observableAtDay90
} from '../engine/analysis/reattachment_day90_classifier.js';

function row(outcome, {
  durationDays = 180,
  days = 91,
  meanDistance = 5.5,
  within6 = 0.7,
  otherCloser = 0
} = {}) {
  return {
    outcome,
    durationDays,
    first90: {
      days,
      meanFormerHomeDistance: meanDistance,
      within6Share: within6,
      otherSettlementCloserShare: otherCloser
    }
  };
}

test('day-90 eligibility excludes episodes already resolved or not fully observed through day90', () => {
  assert.equal(observableAtDay90(row('medium_same_rejoin', { durationDays: 90, days: 90 })), false);
  assert.equal(observableAtDay90(row('medium_same_rejoin', { durationDays: 91, days: 90 })), false);
  assert.equal(observableAtDay90(row('medium_same_rejoin', { durationDays: 91, days: 91 })), true);
});

test('day-90 classifier separates medium recovery and migration interference', () => {
  const rows = [
    row('long_same_rejoin', { meanDistance: 6, within6: 0.5 }),
    row('long_same_rejoin', { meanDistance: 4.5, within6: 0.9 }),
    row('medium_same_rejoin', { durationDays: 150, meanDistance: 5.4, within6: 0.7 }),
    row('other_join', { durationDays: 200, meanDistance: 5.6, within6: 0.6, otherCloser: 0.5 }),
    row('other_join', { durationDays: 200, meanDistance: 4, within6: 1 }),
    row('censored', { durationDays: 300, meanDistance: 6, within6: 0.4 })
  ];
  const rule = DEFAULT_DAY90_RULES.find((candidate) => candidate.id === 'drift-combined');
  const result = evaluateDay90Rules(rows, [rule]);
  const evaluated = result.rules[0];

  assert.equal(result.atRiskEpisodes, 6);
  assert.equal(result.targetLongEpisodes, 2);
  assert.equal(evaluated.selectedEpisodes, 4);
  assert.equal(evaluated.truePositives, 1);
  assert.equal(evaluated.falseNegatives, 1);
  assert.equal(evaluated.mediumRecoveryFalsePositives, 1);
  assert.equal(evaluated.otherJoinFalsePositives, 1);
  assert.equal(evaluated.selectedCensored, 1);
  assert.equal(evaluated.recall, 0.5);
  assert.equal(evaluated.precisionResolved, 1 / 3);
  assert.equal(evaluated.mediumRecoveryInterferenceRate, 1);
  assert.equal(evaluated.migrationInterferenceRate, 0.5);
});

test('other-settlement guard reduces migration interference without mutating rows', () => {
  const rows = [
    row('long_same_rejoin', { meanDistance: 5.8, within6: 0.6, otherCloser: 0 }),
    row('medium_same_rejoin', { meanDistance: 5.6, within6: 0.7, otherCloser: 0 }),
    row('other_join', { meanDistance: 5.9, within6: 0.5, otherCloser: 0.4 })
  ];
  const before = structuredClone(rows);
  const rules = DEFAULT_DAY90_RULES.filter((rule) =>
    rule.id === 'drift-combined' || rule.id === 'drift-no-other-closer'
  );
  const result = evaluateDay90Rules(rows, rules);
  const broad = result.rules.find((rule) => rule.id === 'drift-combined');
  const guarded = result.rules.find((rule) => rule.id === 'drift-no-other-closer');

  assert.equal(broad.otherJoinFalsePositives, 1);
  assert.equal(guarded.otherJoinFalsePositives, 0);
  assert.equal(guarded.truePositives, 1);
  assert.deepEqual(rows, before);
});
