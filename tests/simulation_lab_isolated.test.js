import test from 'node:test';
import assert from 'node:assert/strict';
import { executeSeedProcess, runBatchIsolated } from '../simulation_lab/isolated.js';

test('isolated batch results are identical across worker counts and remain seed ordered', async () => {
  const options = { startSeed: 31, seeds: 4, years: 2, width: 8, height: 8, population: 8, timeoutMs: 10_000 };
  const serial = await runBatchIsolated({ ...options, workers: 1 });
  const parallel = await runBatchIsolated({ ...options, workers: 3 });

  assert.deepEqual(parallel.runs, serial.runs);
  assert.deepEqual(parallel.aggregate, serial.aggregate);
  assert.deepEqual(parallel.runs.map((run) => run.seed), [31, 32, 33, 34]);
  assert.equal(parallel.failures.length, 0);
  assert.equal(parallel.execution.successfulSeeds, 4);
  assert.equal(parallel.execution.failedSeeds, 0);
  assert.ok(parallel.execution.wallClockMs > 0);
  assert.ok(parallel.execution.perSeedElapsedMs.median > 0);
});

test('one failed isolated seed does not discard successful runs', async () => {
  const executeSeed = async (payload) => {
    if (payload.seed === 102) {
      const error = new Error('synthetic per-seed failure');
      error.code = 'SYNTHETIC_FAILURE';
      throw error;
    }
    return {
      seed: payload.seed,
      day: 1,
      year: 0,
      population: payload.seed,
      births: 0,
      deaths: 0,
      meals: 0,
      settlements: 0,
      settledPopulation: 0,
      averageAgeYears: 0,
      averageHunger: 0,
      food: 1,
      foodCapacity: 1,
      foodUtilization: 1
    };
  };

  const result = await runBatchIsolated(
    { startSeed: 101, seeds: 3, years: 1, width: 8, height: 8, population: 1, workers: 2 },
    { executeSeed }
  );

  assert.deepEqual(result.runs.map((run) => run.seed), [101, 103]);
  assert.equal(result.aggregate.runCount, 2);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].seed, 102);
  assert.equal(result.failures[0].error.code, 'SYNTHETIC_FAILURE');
  assert.equal(result.execution.successfulSeeds, 2);
  assert.equal(result.execution.failedSeeds, 1);
});

test('isolated seed process enforces a hard per-seed timeout', async () => {
  await assert.rejects(
    executeSeedProcess({ seed: 7, years: 100, width: 24, height: 24, population: 30, config: {} }, { timeoutMs: 1 }),
    (error) => error?.code === 'SEED_TIMEOUT'
  );
});

test('isolated batch can resume from completed seed results and checkpoints only new work', async () => {
  const initialSummary = {
    seed: 201,
    day: 1,
    year: 0,
    population: 11,
    births: 0,
    deaths: 0,
    meals: 0,
    settlements: 0,
    activeSettlements: 0,
    abandonedSettlements: 0,
    claimedTerritoryCells: 0,
    unclaimedLandCells: 1,
    territoryCoverage: 0,
    settledPopulation: 0,
    averageAgeYears: 0,
    averageHunger: 0,
    food: 1,
    foodCapacity: 1,
    foodUtilization: 1
  };
  const initialResults = [{ ok: true, seed: 201, elapsedMs: 12, summary: initialSummary }];
  const executed = [];
  const checkpoints = [];
  const executeSeed = async (payload) => {
    executed.push(payload.seed);
    return { ...initialSummary, seed: payload.seed, population: payload.seed };
  };

  const result = await runBatchIsolated(
    { startSeed: 201, seeds: 3, years: 1, width: 8, height: 8, population: 1, workers: 2 },
    { executeSeed, initialResults, onResult: (entry) => checkpoints.push(entry.seed) }
  );

  assert.deepEqual(executed, [202, 203]);
  assert.deepEqual(checkpoints.sort((a, b) => a - b), [202, 203]);
  assert.deepEqual(result.runs.map((run) => run.seed), [201, 202, 203]);
  assert.equal(result.execution.reusedSeeds, 1);
  assert.equal(result.execution.executedSeeds, 2);
});
