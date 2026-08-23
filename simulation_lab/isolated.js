import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { aggregateRuns } from './aggregate.js';

const WORKER_PATH = fileURLToPath(new URL('./seed_worker.js', import.meta.url));

export async function runBatchIsolated({
  startSeed = 1,
  seeds = 20,
  years = 100,
  width = 24,
  height = 24,
  population = 30,
  config = {},
  workers = Math.max(1, Math.min(4, seeds)),
  timeoutMs = 30_000
} = {}, { executeSeed = executeSeedProcess } = {}) {
  requirePositiveInteger(seeds, 'seeds');
  requirePositiveInteger(workers, 'workers');
  requirePositiveInteger(timeoutMs, 'timeoutMs');

  const tasks = Array.from({ length: seeds }, (_, index) => ({
    index,
    payload: { seed: startSeed + index, years, width, height, population, config }
  }));
  const slots = new Array(seeds);
  let cursor = 0;

  async function workerLoop() {
    while (true) {
      const taskIndex = cursor++;
      if (taskIndex >= tasks.length) return;
      const task = tasks[taskIndex];
      const started = process.hrtime.bigint();
      try {
        const summary = await executeSeed(task.payload, { timeoutMs });
        slots[task.index] = {
          ok: true,
          seed: task.payload.seed,
          elapsedMs: Number(process.hrtime.bigint() - started) / 1e6,
          summary
        };
      } catch (error) {
        slots[task.index] = {
          ok: false,
          seed: task.payload.seed,
          elapsedMs: Number(process.hrtime.bigint() - started) / 1e6,
          error: normalizeError(error)
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(workers, seeds) }, () => workerLoop()));

  const runs = slots.filter((result) => result.ok).map((result) => result.summary);
  const failures = slots.filter((result) => !result.ok).map(({ seed, elapsedMs, error }) => ({ seed, elapsedMs, error }));
  const timings = slots.filter((result) => result.ok).map(({ seed, elapsedMs }) => ({ seed, elapsedMs }));

  return {
    parameters: { startSeed, seeds, years, width, height, population, workers, timeoutMs },
    aggregate: aggregateRuns(runs),
    runs,
    failures,
    timings
  };
}

export function executeSeedProcess(payload, { timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER_PATH, JSON.stringify(payload)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      const error = new Error(`seed ${payload.seed} exceeded ${timeoutMs}ms timeout`);
      error.code = 'SEED_TIMEOUT';
      reject(error);
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => finishReject(error));
    child.on('close', (code, signal) => {
      if (settled) return;
      if (code !== 0) {
        const detail = stderr.trim() || `exit code ${code}${signal ? ` (${signal})` : ''}`;
        finishReject(new Error(`seed ${payload.seed} failed: ${detail}`));
        return;
      }
      try {
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length !== 1) throw new Error(`expected one JSON result line, got ${lines.length}`);
        finishResolve(JSON.parse(lines[0]));
      } catch (error) {
        finishReject(new Error(`seed ${payload.seed} returned invalid output: ${error.message}`));
      }
    });

    function finishResolve(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }

    function finishReject(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
  });
}

function normalizeError(error) {
  return {
    code: typeof error?.code === 'string' ? error.code : 'SEED_FAILED',
    message: String(error?.message ?? error)
  };
}

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}
