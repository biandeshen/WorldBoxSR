import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../client/mobile_hud.css', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

const css = readFileSync(cssPath, 'utf8');
const index = readFileSync(indexPath, 'utf8');

test('mobile HUD overrides stay bounded to small-screen media queries and load after base UI', () => {
  assert.match(css, /^@media \(max-width: 650px\)/);
  assert.doesNotMatch(css, /^#topbar|^#row|^#hint/m, 'mobile HUD must not introduce unscoped desktop overrides');
  assert.ok(index.indexOf('./mobile_hud.css') > index.indexOf('./ui.css'), 'mobile overrides must load after base UI');
});

test('small-screen topbar is viewport-bounded and keeps all existing controls reachable', () => {
  assert.match(css, /#topbar[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /#topbar \.brand \{ display: none; \}/);
  assert.match(css, /#row[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /#row > \* \{ flex: 0 0 auto; \}/);
  assert.match(css, /#pause \{ order: -30; \}/);
  assert.match(css, /#reset-camera \{ order: -29; \}/);
  assert.match(css, /#reset \{ order: -28; \}/);
  assert.doesNotMatch(css, /#scenario-setup-enter[^}]*display:\s*none/);
  assert.doesNotMatch(css, /#scenario-portability-toggle[^}]*display:\s*none/);
});

test('coarse-pointer mobile exposes the existing touch hint without changing desktop HUD', () => {
  assert.match(css, /@media \(max-width: 650px\) and \(hover: none\) and \(pointer: coarse\)/);
  assert.match(css, /#hint[\s\S]*?display:\s*block/);
  assert.match(css, /#power-dock[\s\S]*?grid-template-columns:\s*1fr/);
});
