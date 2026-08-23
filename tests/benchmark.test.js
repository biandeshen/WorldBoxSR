import test from 'node:test';
import assert from 'node:assert/strict';
import { runBenchmark } from '../tools/benchmark.js';

test('performance benchmark runs the authoritative simulation and returns structured metrics', () => {
  const result = runBenchmark({
    populations: [20, 40],
    repetitions: 1,
    warmupTicks: 1,
    measuredTicks: 2,
    width: 8,
    height: 8,
    seed: 123
  });

  assert.equal(result.benchmarkVersion, 1);
  assert.deepEqual(result.scenarios.map((scenario) => scenario.population), [20, 40]);
  for (const scenario of result.scenarios) {
    assert.equal(scenario.samples.length, 1);
    assert.ok(scenario.creationMs.median >= 0);
    assert.ok(scenario.msPerTick.median > 0);
    assert.ok(scenario.ticksPerSecond.median > 0);
    assert.ok(scenario.samples[0].finalPopulation >= scenario.population);
    assert.ok(scenario.rssMB.median > 0);
  }
});
