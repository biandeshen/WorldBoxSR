import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/event_card_runtime.js', import.meta.url));
const cardPath = fileURLToPath(new URL('../client/presentation/event_card.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const cssPath = fileURLToPath(new URL('../client/event_card.css', import.meta.url));

test('Event Card runtime loads after Phaser bootstrap and owns only presentation navigation', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const html = readFileSync(indexPath, 'utf8');
  const bootstrapIndex = html.indexOf('./bootstrap.js');
  const eventCardIndex = html.indexOf('./presentation/event_card_runtime.js');

  assert.ok(bootstrapIndex >= 0);
  assert.ok(eventCardIndex > bootstrapIndex);
  assert.match(html, /event_card\.css/);
  assert.match(runtime, /data-event-card-nav/);
  assert.match(runtime, /centerOn/);
  assert.match(runtime, /resolveHistoryReference/);
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|pushEvent|createWorld|world\.history\.(push|splice)/);
});

test('Event Card projector is a pure query/presentation layer over history resolution', () => {
  const card = readFileSync(cardPath, 'utf8');
  assert.match(card, /resolveEventReferences/);
  assert.match(card, /chronicleEntryForEvent/);
  assert.match(card, /navigationForResolvedReference/);
  assert.doesNotMatch(card, /applyCommand|tickWorld|pushEvent|createWorld/);
});

test('Event Card stylesheet exposes readable resolved and unavailable reference states', () => {
  const css = readFileSync(cssPath, 'utf8');
  assert.match(css, /\.event-card/);
  assert.match(css, /event-card-ref\[data-status="unresolved"\]/);
  assert.match(css, /event-card-action/);
});
