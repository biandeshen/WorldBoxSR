import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(path) {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
}

const persistence = source('tools/capture-stable-sandbox-persistence-evidence.mjs');
const runner = source('tools/run-stable-sandbox-smoke.sh');
const verifier = source('tools/verify-stable-sandbox-evidence.mjs');
const workflow = source('.github/workflows/visual-qa.yml');

test('stable sandbox persistence evidence uses existing product UI instead of a second save authority', () => {
  assert.match(persistence, /#session-save-now/);
  assert.match(persistence, /#session-restore/);
  assert.match(persistence, /#scenario-setup-enter/);
  assert.match(persistence, /#session-persistence-status/);
  assert.match(persistence, /worldboxsr:local-world:v1/);
  assert.match(persistence, /local world restored · paused/);
  assert.match(persistence, /Scenario active · use Recipe \/ Replay \/ Fork/);
  assert.doesNotMatch(persistence, /installReadyWorld/);
  assert.doesNotMatch(persistence, /localStorage\.setItem/);
  assert.doesNotMatch(persistence, /worldFromSnapshot|snapshotWorld/);
});

test('stable sandbox runner always proves focused persistence but composes historical artifacts only in full scope', () => {
  assert.match(runner, /node tools\/capture-stable-sandbox-persistence-evidence\.mjs/);
  assert.match(runner, /if \[\[ "\$scope" == "full" \]\]; then/);
  assert.match(runner, /node tools\/verify-stable-sandbox-evidence\.mjs/);
  assert.match(verifier, /story-evidence\.json/);
  assert.match(verifier, /stable-sandbox-persistence-evidence\.json/);
  assert.match(verifier, /canonical-scenario-builder-evidence\.json/);
  assert.match(verifier, /stable-sandbox-evidence\.json/);
});

test('stable sandbox verifier follows the current engine snapshot version instead of freezing a live schema number', () => {
  assert.match(verifier, /import \{ SNAPSHOT_VERSION \} from '\.\.\/engine\/core\/world\.js';/);
  assert.match(verifier, /persistence\.ordinary\?\.snapshotVersion === SNAPSHOT_VERSION/);
  assert.doesNotMatch(verifier, /snapshotVersion === 16/);
});

test('visual workflow owns the final v1.0 composition step and its files trigger browser QA', () => {
  assert.match(workflow, /tools\/capture-stable-sandbox-persistence-evidence\.mjs/);
  assert.match(workflow, /tools\/run-stable-sandbox-smoke\.sh/);
  assert.match(workflow, /tools\/verify-stable-sandbox-evidence\.mjs/);
  assert.match(workflow, /name: Verify stable sandbox composition/);
  assert.match(workflow, /WORLDBOXSR_BASH/);
  assert.match(workflow, /& "\$env:WORLDBOXSR_BASH" tools\/run-stable-sandbox-smoke\.sh/);
});
