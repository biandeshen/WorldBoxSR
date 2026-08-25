import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/chronicle_lenses_runtime.js', import.meta.url));
const projectorPath = fileURLToPath(new URL('../client/presentation/chronicle_lenses.js', import.meta.url));
const cssPath = fileURLToPath(new URL('../client/chronicle_lenses.css', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('Chronicle lens runtime loads before Event Card runtime and preserves event-id navigation contract', () => {
  const html = readFileSync(indexPath, 'utf8');
  const runtime = readFileSync(runtimePath, 'utf8');
  const lensIndex = html.indexOf('./presentation/chronicle_lenses_runtime.js');
  const cardIndex = html.indexOf('./presentation/event_card_runtime.js');
  assert.ok(lensIndex >= 0 && cardIndex > lensIndex);
  assert.match(html, /chronicle_lenses\.css/);
  assert.match(runtime, /data-chronicle-lens/);
  assert.match(runtime, /data-event-id/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /scene\.booting !== false/);
  assert.doesNotMatch(runtime, /applyCommand|tickWorld|pushEvent|createWorld|world\.history\.(push|splice)|sessionStorage|localStorage/);
});

test('Chronicle projector explicitly delegates Highlights to existing representative Chronicle', () => {
  const source = readFileSync(projectorPath, 'utf8');
  assert.match(source, /lensId === 'highlights'\) return civilizationChronicle\(world, \{ limit \}\)/);
  assert.match(source, /CHRONICLE_LENS_LIMIT = 7/);
  assert.match(source, /'recent'/);
  assert.match(source, /'conflict'/);
  assert.match(source, /'rule'/);
  assert.doesNotMatch(source, /score|relevance|embedding|Math\.random/);
});

test('Chronicle lens styles replace ignored legacy filters only in Phaser mode', () => {
  const css = readFileSync(cssPath, 'utf8');
  assert.match(css, /html\[data-renderer="phaser"\] #history-controls/);
  assert.match(css, /#chronicle-lenses/);
  assert.match(css, /data-active="true"/);
  assert.doesNotMatch(css, /canvas|#game/);
});
