import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { historyCursor, projectHistoryPulse } from '../client/presentation/world_event_pulse.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/world_event_pulse_runtime.js', import.meta.url));
const cssPath = fileURLToPath(new URL('../client/world_event_pulse.css', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('world event pulse keeps named settlement events and aggregates life events', () => {
  const events = [
    { id: 11, day: 14400, type: 'human.born', entityId: 9 },
    { id: 12, day: 14430, type: 'human.born', entityId: 10 },
    { id: 13, day: 14440, type: 'human.died', entityId: 2, cause: 'old_age' },
    { id: 14, day: 14450, type: 'settlement.founded', settlementId: 4, name: 'Stonevale' }
  ];
  const before = structuredClone(events);
  const cards = projectHistoryPulse(events, { daysPerYear: 360 });

  assert.deepEqual(events, before, 'projection must not mutate authoritative history');
  assert.equal(cards.length, 3);
  assert.equal(cards[0].kind, 'settlement.founded');
  assert.equal(cards[0].title, 'Stonevale was founded');
  assert.equal(cards[1].kind, 'human.deaths');
  assert.match(cards[1].detail, /old age/);
  assert.equal(cards[2].kind, 'human.births');
  assert.equal(cards[2].title, '2 births');
});

test('death pulse groups causes without inventing details', () => {
  const cards = projectHistoryPulse([
    { id: 1, day: 360, type: 'human.died', cause: 'starvation' },
    { id: 2, day: 361, type: 'human.died', cause: 'starvation' },
    { id: 3, day: 362, type: 'human.died', cause: 'lightning' }
  ], { daysPerYear: 360 });

  assert.equal(cards.length, 1);
  assert.equal(cards[0].title, '3 deaths');
  assert.match(cards[0].detail, /starvation ×2/);
  assert.match(cards[0].detail, /lightning/);
});

test('history cursor returns the greatest authoritative event id', () => {
  assert.equal(historyCursor([]), 0);
  assert.equal(historyCursor([{ id: 2 }, { id: 7 }, { id: 4 }]), 7);
});

test('event runtime is presentation-only and shell includes reduced-motion styling', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const css = readFileSync(cssPath, 'utf8');
  const html = readFileSync(indexPath, 'utf8');

  assert.doesNotMatch(runtime, /engine\//);
  assert.doesNotMatch(runtime, /pushEvent|applyCommand|tickWorld/);
  assert.match(runtime, /scene\.world\.history/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(html, /id="world-event-pulse"/);
  assert.match(html, /world_event_pulse_runtime\.js/);
});
