import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  advanceWorld,
  createShowcaseWorld,
  seedShowcaseGrazers,
  SHOWCASE
} from '../client/presentation/world_adapter.js';
import { historyCursor, projectHistoryPulse } from '../client/presentation/world_event_pulse.js';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const phaserMainPath = fileURLToPath(new URL('../client/phaser_main.js', import.meta.url));

const LEGIBLE_EVENT_KINDS = new Set([
  'settlement.founded',
  'settlement.abandoned',
  'human.births',
  'human.deaths'
]);

test('canonical showcase produces a readable autonomous event inside the real 30-second default pacing budget', () => {
  const html = readFileSync(indexPath, 'utf8');
  const phaserMain = readFileSync(phaserMainPath, 'utf8');
  const selectedSpeed = html.match(/<option value="(\d+)" selected>\s*60 days<\/option>/);
  const stepInterval = phaserMain.match(/const STEP_INTERVAL_MS = (\d+);/);

  assert.ok(selectedSpeed, 'canonical selected speed must remain discoverable in client/index.html');
  assert.ok(stepInterval, 'Phaser step interval must remain discoverable for the product gate');

  const daysPerStep = Number(selectedSpeed[1]);
  const stepIntervalMs = Number(stepInterval[1]);
  const maxSteps = Math.floor(30_000 / stepIntervalMs);
  assert.ok(maxSteps > 0);

  const world = createShowcaseWorld(SHOWCASE.defaultSeed);
  advanceWorld(world, world.config.daysPerYear * SHOWCASE.warmupYears);
  seedShowcaseGrazers(world);
  let cursor = historyCursor(world.history);
  let observed = null;

  for (let step = 1; step <= maxSteps; step += 1) {
    advanceWorld(world, daysPerStep);
    const fresh = world.history.filter((event) => Number.isInteger(event?.id) && event.id > cursor);
    cursor = historyCursor(world.history);
    const cards = projectHistoryPulse(fresh, { daysPerYear: world.config.daysPerYear });
    const legible = cards.find((card) => LEGIBLE_EVENT_KINDS.has(card.kind));
    if (legible) {
      observed = {
        card: legible,
        elapsedMs: step * stepIntervalMs,
        simulatedDays: step * daysPerStep,
        year: world.day / world.config.daysPerYear
      };
      break;
    }
  }

  assert.ok(
    observed,
    `seed ${SHOWCASE.defaultSeed} produced no readable event in ${maxSteps} default UI steps (${maxSteps * daysPerStep} simulated days)`
  );
  assert.ok(observed.elapsedMs <= 30_000);
  assert.ok(LEGIBLE_EVENT_KINDS.has(observed.card.kind));
});
