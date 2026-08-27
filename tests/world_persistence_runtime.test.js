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

test('startup restore guards a not-yet-entered stale showcase warmup before it can touch the replacement world', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /guardStaleShowcaseWarmup\(scene\)/);
  assert.match(source, /originalFinishShowcaseWarmup = scene\.finishShowcaseWarmup\?\.bind\(scene\)/);
  assert.match(source, /scene\.finishShowcaseWarmup = \(token, seed\) =>/);
  assert.match(source, /if \(token !== scene\.worldGeneration\) return Promise\.resolve\(\)/, 'stale scheduled warmup must stop before entering the original warmup');
  assert.match(source, /return originalFinishShowcaseWarmup\(token, seed\)/);
});

test('page-hide final flush cannot create the first local checkpoint on a short visit', () => {
  const source = readFileSync(runtimePath, 'utf8');
  assert.match(source, /armed: false/, 'fresh visit must begin unarmed');
  assert.match(source, /addEventListener\?\.\('pagehide', \(\) => flushArmedWorld\(scene, state\)\)/);
  assert.match(source, /visibilityState === 'hidden'\) flushArmedWorld\(scene, state\)/);
  assert.match(source, /function flushArmedWorld\(scene, state\)/);
  assert.match(source, /if \(!state\.armed\) return false/, 'page-hide must be a final flush only after a checkpoint exists');
  assert.match(source, /state\.armed = true/, 'periodic/manual save or restore must arm future final flushes');
  assert.match(source, /state\.armed = false/, 'clearing the slot must disarm page-hide creation again');
});

test('ordinary autosave covers periodic and page-hide lifecycle without topbar expansion', () => {
  const source = readFileSync(runtimePath, 'utf8');
  const index = readFileSync(indexPath, 'utf8');
  assert.match(source, /AUTOSAVE_INTERVAL_MS = 30_000/);
  assert.match(source, /window\.setInterval\(\(\) => saveCurrentWorld\(scene, state, \{ announce: false \}\), AUTOSAVE_INTERVAL_MS\)/);
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
