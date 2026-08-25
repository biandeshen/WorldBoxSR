import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));
const cssPath = fileURLToPath(new URL('../client/scenario_portability.css', import.meta.url));
const bootstrapPath = fileURLToPath(new URL('../client/bootstrap.js', import.meta.url));
const phaserPath = fileURLToPath(new URL('../client/phaser_main.js', import.meta.url));
const setupPath = fileURLToPath(new URL('../client/presentation/scenario_setup_runtime.js', import.meta.url));
const portabilityPath = fileURLToPath(new URL('../client/presentation/scenario_portability_runtime.js', import.meta.url));

test('portable Scenario shell stays compact and exposes only Copy Link, Export JSON and Import JSON', () => {
  const html = readFileSync(indexPath, 'utf8');
  const css = readFileSync(cssPath, 'utf8');

  assert.match(html, /id="scenario-portability-toggle"/);
  assert.match(html, /id="scenario-portability-panel"[^>]*hidden/);
  assert.match(html, /id="scenario-copy-link"[^>]*disabled/);
  assert.match(html, /id="scenario-export-json"[^>]*disabled/);
  assert.match(html, /id="scenario-recipe-text"/);
  assert.match(html, /id="scenario-import-json"/);
  assert.match(html, /id="scenario-startup-error"[^>]*hidden/);
  assert.ok(html.indexOf('./presentation/scenario_setup_runtime.js') < html.indexOf('./presentation/scenario_portability_runtime.js'));

  assert.match(css, /#scenario-portability-panel[\s\S]*width:\s*min\(285px/);
  assert.match(css, /#scenario-recipe-text[\s\S]*font:\s*8px\/1\.35 ui-monospace/);
  assert.match(css, /html\[data-renderer="legacy"\][\s\S]*#scenario-portability-toggle/);
  assert.doesNotMatch(html, /Replay Scenario|Fork Scenario|snapshot save|terrain painter/i);
});

test('bootstrap decodes scenario query before renderer startup and keeps Legacy comparison-only', () => {
  const source = readFileSync(bootstrapPath, 'utf8');

  assert.match(source, /scenarioRecipeFromSearch/);
  assert.match(source, /__WORLDBOXSR_STARTUP_SCENARIO__/);
  assert.match(source, /__WORLDBOXSR_STARTUP_SCENARIO_ERROR__/);
  assert.match(source, /Scenario links require the Phaser renderer/);
  assert.ok(source.indexOf('scenarioRecipeFromSearch') < source.indexOf("import('./phaser_main.js')"));
  assert.doesNotMatch(source, /snapshotWorld|worldFromSnapshot|localStorage|sessionStorage/);
});

test('fresh Phaser Scenario startup materializes once and installs a ready paused world through one scene seam', () => {
  const source = readFileSync(phaserPath, 'utf8');

  assert.match(source, /materializeScenarioRecipe/);
  assert.match(source, /loadStartupScenario\(startupScenario\)/);
  assert.match(source, /installReadyWorld\(world, \{ paused: true \}\)/);
  assert.match(source, /setPaused\(paused\)/);
  assert.ok(source.indexOf('await materializeScenarioRecipe(recipe') < source.indexOf('this.installReadyWorld(world, { paused: true })'));
  assert.doesNotMatch(source, /snapshotWorld|worldFromSnapshot|localStorage|sessionStorage/);
});

test('Scenario Setup remains the only recipe identity owner and portable import swaps authority only after full materialization', () => {
  const source = readFileSync(setupPath, 'utf8');

  assert.match(source, /currentRecipe\(\)/);
  assert.match(source, /installPortableRecipe\(recipe\)/);
  assert.match(source, /await materializeScenarioRecipe\(recipe/);
  assert.match(source, /scene\.installReadyWorld\(world, \{ paused: true \}\)/);
  assert.ok(source.indexOf('await materializeScenarioRecipe(recipe') < source.indexOf('scene.installReadyWorld(world, { paused: true })'));
  assert.doesNotMatch(source, /snapshotWorld|worldFromSnapshot|localStorage|sessionStorage|history\.replaceState/);
});

test('portability runtime uses canonical Recipe transport with truthful clipboard/download fallbacks and no world ownership', () => {
  const source = readFileSync(portabilityPath, 'utf8');

  assert.match(source, /scenarioShareUrl\(window\.location, recipe, \{ renderer: 'phaser' \}\)/);
  assert.match(source, /navigator\.clipboard\?\.writeText/);
  assert.match(source, /Clipboard unavailable/);
  assert.match(source, /serializeScenarioRecipe/);
  assert.match(source, /new Blob\(\[canonical\]/);
  assert.match(source, /parseScenarioRecipeText\(beforeText\)/);
  assert.match(source, /installPortableRecipe\(recipe\)/);
  assert.match(source, /Import rejected:/);
  assert.match(source, /MutationObserver/);

  assert.doesNotMatch(source, /snapshotWorld|worldFromSnapshot|entities\.push|creatures\.push|history\.push|pushEvent/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|history\.replaceState|location\.assign|location\.href\s*=/);
});
