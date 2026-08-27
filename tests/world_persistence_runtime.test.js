import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const runtimePath = fileURLToPath(new URL('../client/presentation/world_persistence_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('local persistence runtime suppresses scenario authority and startup scenario override', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /__WORLDBOXSR_STARTUP_SCENARIO__/, 'startup shared Scenario must block local startup restore');
  assert.match(source, /scenario\.currentRecipe\?\.\(\) == null/, 'ordinary save eligibility must require no Scenario Recipe');
  assert.match(source, /scenario\.active \|\| scenario\.busy/, 'active or rebuilding Scenario must suppress local saves');
  assert.match(source, /Scenario worlds use Recipe \/ Replay instead of local world saves/, 'suppression must be visible to the player');
});

test('restoring a local world invalidates stale generation, installs paused and clears stale presentation', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /scene\.worldGeneration \+= 1/);
  assert.match(source, /scene\.installReadyWorld\(saved\.world, \{ paused: true \}\)/);
  assert.match(source, /worldboxsr:world-replaced/);
  assert.match(source, /local world restored · paused/);
});

test('ordinary autosave covers periodic and page-hide lifecycle without topbar expansion', () => {
  const source = readFileSync(runtimePath, 'utf8');
  const index = readFileSync(indexPath, 'utf8');
  assert.match(source, /AUTOSAVE_INTERVAL_MS = 30_000/);
  assert.match(source, /addEventListener\?\.\('pagehide'/);
  assert.match(source, /visibilityState === 'hidden'/);
  assert.match(index, /<details id="session-persistence">/);
  assert.match(index, /id="session-save-now"/);
  assert.match(index, /id="session-restore"/);
  assert.match(index, /id="session-clear"/);
  assert.match(index, /world_persistence_runtime\.js/);
  const topbar = index.slice(index.indexOf('<header id="topbar">'), index.indexOf('</header>'));
  assert.doesNotMatch(topbar, /session-save-now|session-restore|session-clear/, 'persistence controls belong in Inspector Session, not the already crowded topbar');
});
