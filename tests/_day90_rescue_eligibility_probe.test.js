import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDay90Rules } from '../engine/analysis/reattachment_day90_classifier.js';
import { createReattachmentPredictorTracker } from '../engine/core/reattachment_predictors.js';
import { createWorld, tickWorld } from '../engine/core/world.js';

const seeds = [1, 4, 9, 45, 80, 98];

test('temporary 100-year day90 rescue eligibility probe', () => {
  for (const seed of seeds) {
    const world = createWorld({ seed, width: 24, height: 24, population: 30 });
    const tracker = createReattachmentPredictorTracker();
    const days = 100 * world.config.daysPerYear;

    for (let day = 0; day < days; day += 1) {
      tracker.observe(world);
      tickWorld(world, 1);
    }

    const rows = tracker.summarize(world).rows.filter((row) => row.reproductiveFemaleAtLeave);
    const evaluation = evaluateDay90Rules(rows);
    console.log(`DAY90_RESCUE_RULES ${JSON.stringify({
      seed,
      atRiskEpisodes: evaluation.atRiskEpisodes,
      targetLongEpisodes: evaluation.targetLongEpisodes,
      outcomeCounts: evaluation.outcomeCounts,
      rules: evaluation.rules.map((rule) => ({
        id: rule.id,
        selected: rule.selectedEpisodes,
        selectionRate: round(rule.selectionRate),
        tp: rule.truePositives,
        fn: rule.falseNegatives,
        recall: round(rule.recall),
        precision: round(rule.precisionResolved),
        fpMedium: rule.mediumRecoveryFalsePositives,
        fpOtherJoin: rule.otherJoinFalsePositives,
        fpOtherResolved: rule.otherResolvedFalsePositives,
        censored: rule.selectedCensored,
        mediumRecoveryInterference: round(rule.mediumRecoveryInterferenceRate),
        migrationInterference: round(rule.migrationInterferenceRate),
        otherJoinShareSelected: round(rule.otherJoinShareOfResolvedSelections)
      }))
    })}`);

    assert.ok(evaluation.atRiskEpisodes >= evaluation.targetLongEpisodes);
  }
});

function round(value) {
  return Math.round(value * 10000) / 10000;
}
