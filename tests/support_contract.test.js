import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function source(path) {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
}

const support = source('docs/SUPPORT.md');
const readme = source('README.md');
const desktopGate = source('tools/capture-visual-evidence.sh');
const touchRunner = source('tools/run-touch-inspect-smoke.sh');
const touchGate = source('tools/capture-touch-inspect-evidence.mjs');
const pinchGate = source('tools/capture-pinch-zoom-evidence.mjs');
const recoveryGate = source('tools/capture-renderer-recovery-evidence.mjs');
const pagesCheck = source('tools/check-pages-build.js');
const visualWorkflow = source('.github/workflows/visual-qa.yml');

test('public SUPPORT contract is linked and deliberately narrower than universal browser support', () => {
  assert.match(readme, /\[Certified runtime & support\]\(docs\/SUPPORT\.md\)/);
  assert.match(support, /Chrome\/Chromium class · 1440×900/);
  assert.match(support, /Chrome\/Chromium class · 430×820/);
  assert.match(support, /Legacy Canvas renderer.*ordinary-world compatibility fallback/s);
  assert.match(support, /Scenario Recipe links remain Phaser-only/);
  assert.match(support, /Firefox \/ Gecko/);
  assert.match(support, /Safari \/ WebKit/);
  assert.match(support, /uncertified \/ best effort/);
  assert.match(support, /24×24/);
  assert.match(support, /≤ 300,000 bytes/);
  assert.match(support, /diagnostic only/);
  assert.match(support, /does not provide cloud save or cross-device sync/);
});

test('desktop certification remains tied to production Chrome/Chromium 1440x900 showcase-ready evidence', () => {
  for (const browser of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']) {
    assert.match(desktopGate, new RegExp(browser));
  }
  assert.match(desktopGate, /WORLDBOXSR_BROWSER/);
  assert.match(desktopGate, /--window-size=1440,900/);
  assert.match(desktopGate, /ready_marker="Phaser 4 · authoritative simulation · showcase ready"/);
  assert.match(desktopGate, /Renderer failed:/);
  assert.match(desktopGate, /phaser-seed45-1440x900\.png/);
  assert.match(desktopGate, /legacy-seed45-1440x900\.png/);
  assert.match(visualWorkflow, /WORLDBOXSR_BASH.*tools\/capture-visual-evidence\.sh/);
  assert.match(visualWorkflow, /VISUAL_QA_SCOPE:.*pull_request.*smoke.*full/);
});

test('coarse-touch certification stays bound to 430x820 tap-hold and two-finger pinch evidence', () => {
  assert.match(touchRunner, /capture-touch-inspect-evidence\.mjs/);
  assert.match(touchRunner, /capture-pinch-zoom-evidence\.mjs/);
  assert.match(visualWorkflow, /WORLDBOXSR_BASH.*tools\/run-touch-inspect-smoke\.sh/);

  assert.match(touchGate, /--window-size=430,820/);
  assert.match(touchGate, /width: 430/);
  assert.match(touchGate, /height: 820/);
  assert.match(touchGate, /maxTouchPoints: 1/);
  assert.match(touchGate, /Tap: use selected tool · Hold: inspect · Drag: pan/);

  assert.match(pinchGate, /--window-size=430,820/);
  assert.match(pinchGate, /width: 430, height: 820/);
  assert.match(pinchGate, /maxTouchPoints: 2/);
  assert.match(pinchGate, /two-finger pinch did not increase zoom/);
  assert.match(pinchGate, /pinch midpoint world focus drifted/);
  assert.match(pinchGate, /assertAuthorityUnchanged\(before, during, 'during pinch'\)/);
  assert.match(pinchGate, /assertAuthorityUnchanged\(before, after, 'after pinch release'\)/);
});

test('renderer recovery certification remains explicit Retry plus existing Legacy compatibility fallback', () => {
  assert.match(visualWorkflow, /WORLDBOXSR_BASH.*tools\/run-renderer-recovery-smoke\.sh/);
  assert.match(recoveryGate, /Network\.setBlockedURLs/);
  assert.match(recoveryGate, /\*phaser_main-\*/);
  assert.match(recoveryGate, /Retry Phaser/);
  assert.match(recoveryGate, /Compatibility renderer/);
  assert.match(recoveryGate, /searchParams\.get\('renderer'\) !== 'legacy'/);
  assert.match(recoveryGate, /preserve unrelated URL params/);
});

test('certified build envelope keeps dedicated Phaser vendor split and 300000-byte app budget', () => {
  assert.match(pagesCheck, /const PHASER_APP_MAX_BYTES = 300_000;/);
  assert.match(pagesCheck, /Expected exactly one dedicated phaser-vendor JavaScript asset/);
  assert.match(pagesCheck, /Expected exactly one phaser_main JavaScript app asset/);
  assert.match(pagesCheck, /vendorInfo\.size <= appInfo\.size/);
  assert.match(pagesCheck, /appInfo\.size > PHASER_APP_MAX_BYTES/);
});
