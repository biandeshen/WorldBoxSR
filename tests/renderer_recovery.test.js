import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  rendererRecoveryDestinations,
  rendererRecoveryPresentation
} from '../client/presentation/renderer_recovery.js';

const runtimePath = fileURLToPath(new URL('../client/presentation/renderer_recovery_runtime.js', import.meta.url));
const uiControlsPath = fileURLToPath(new URL('../client/presentation/ui_controls.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('Phaser compatibility destination preserves unrelated URL state but explicitly drops Scenario', () => {
  const href = 'https://example.test/WorldBoxSR/?foo=1&scenario=abc#frag';
  const recovery = rendererRecoveryDestinations({ href, renderer: 'phaser' });
  assert.equal(recovery.retryHref, href);
  assert.equal(recovery.renderer, 'phaser');
  assert.equal(recovery.dropsScenario, true);

  const legacy = new URL(recovery.legacyHref);
  assert.equal(legacy.origin, 'https://example.test');
  assert.equal(legacy.pathname, '/WorldBoxSR/');
  assert.equal(legacy.searchParams.get('foo'), '1');
  assert.equal(legacy.searchParams.get('renderer'), 'legacy');
  assert.equal(legacy.searchParams.has('scenario'), false);
  assert.equal(legacy.hash, '#frag');
});

test('ordinary Phaser fallback keeps other params while Legacy failure cannot loop to itself', () => {
  const ordinary = rendererRecoveryDestinations({
    href: 'https://example.test/WorldBoxSR/?foo=1&bar=2',
    renderer: 'phaser'
  });
  const legacyUrl = new URL(ordinary.legacyHref);
  assert.equal(ordinary.dropsScenario, false);
  assert.equal(legacyUrl.searchParams.get('foo'), '1');
  assert.equal(legacyUrl.searchParams.get('bar'), '2');
  assert.equal(legacyUrl.searchParams.get('renderer'), 'legacy');

  const legacyFailureHref = 'https://example.test/WorldBoxSR/?renderer=legacy&foo=1';
  const legacyFailure = rendererRecoveryDestinations({ href: legacyFailureHref, renderer: 'legacy' });
  assert.equal(legacyFailure.retryHref, legacyFailureHref);
  assert.equal(legacyFailure.legacyHref, null);
  assert.equal(legacyFailure.dropsScenario, false);
});

test('recovery copy discloses Scenario loss and gives Legacy failures retry only', () => {
  const scenario = rendererRecoveryPresentation({ renderer: 'phaser', dropsScenario: true });
  assert.match(scenario.heading, /Phaser renderer could not start/);
  assert.equal(scenario.fallbackLabel, 'Compatibility renderer');
  assert.match(scenario.note, /cannot run Scenario links/i);
  assert.match(scenario.note, /ordinary world/i);

  const legacy = rendererRecoveryPresentation({ renderer: 'legacy' });
  assert.match(legacy.heading, /Compatibility renderer could not start/);
  assert.equal(legacy.fallbackLabel, null);
  assert.match(legacy.retryLabel, /Retry compatibility renderer/);
});

test('failure recovery observes the existing boot-status signal and only navigates from explicit buttons', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  assert.match(runtime, /const FAILURE_PREFIX = 'Renderer failed:'/);
  assert.match(runtime, /new MutationObserver/);
  assert.match(runtime, /observer\.observe\(bootStatus/);
  assert.match(runtime, /if \(!text\.startsWith\(FAILURE_PREFIX\)\) return;/, 'successful startup must not create recovery UI');
  assert.match(runtime, /panel\.setAttribute\('role', 'alert'\)/);
  assert.match(runtime, /renderer-recovery-retry/);
  assert.match(runtime, /renderer-recovery-legacy/);
  assert.match(runtime, /retry\.onclick = \(\) => window\.location\.assign\(destinations\.retryHref\)/);
  assert.match(runtime, /legacy\.onclick = \(\) => window\.location\.assign\(destinations\.legacyHref\)/);
  assert.doesNotMatch(runtime, /location\.(replace|reload)\(/, 'runtime must not navigate automatically on failure detection');
});

test('recovery observer attaches before renderer bootstrap without changing the renderer contract', () => {
  const uiControls = readFileSync(uiControlsPath, 'utf8');
  const index = readFileSync(indexPath, 'utf8');
  assert.match(uiControls, /^import '\.\/renderer_recovery_runtime\.js';/);
  const uiIndex = index.indexOf('./presentation/ui_controls.js');
  const bootstrapIndex = index.indexOf('./bootstrap.js');
  assert.ok(uiIndex >= 0 && bootstrapIndex > uiIndex, 'ui controls/recovery must load before renderer bootstrap');
  assert.doesNotMatch(uiControls, /renderer=legacy.*location\.assign|location\.assign.*renderer=legacy/, 'ui controls must not introduce automatic renderer switching');
});
