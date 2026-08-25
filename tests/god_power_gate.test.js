import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { snapshotWorld } from '../engine/core/world.js';
import { acceptedGodAction, isAppliedGodAction, isNoEffectGodAction } from '../client/presentation/god_action_outcome.js';
import { godPowerForShortcut, godPowerIds, godPowerMeta, godPowerTargetRadius } from '../client/presentation/god_power_catalog.js';
import { applyGodTool } from '../client/presentation/world_adapter.js';
import { createCanonicalGodPowerWorld, evaluateGodPowerGate, executeCanonicalGodPowerSequence } from '../client/presentation/god_power_gate.js';

const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

test('god-power catalog is the stable metadata source for the six shipped v0.4 powers', () => {
  assert.deepEqual(godPowerIds(), ['spawn_human', 'spawn_grazer', 'erase', 'lightning', 'meteor', 'rain']);
  assert.equal(godPowerForShortcut('1'), 'spawn_human');
  assert.equal(godPowerForShortcut('5'), 'meteor');
  assert.equal(godPowerForShortcut('6'), 'rain');
  assert.equal(godPowerForShortcut('7'), null);
  assert.equal(godPowerTargetRadius('meteor'), 2);
  assert.equal(godPowerTargetRadius('rain'), 2);
  assert.equal(godPowerTargetRadius('lightning'), 0);
  assert.equal(godPowerMeta('rain').category, 'restoration');
  assert.equal(godPowerMeta('spawn_human').requiresPassable, true);

  const html = readFileSync(indexPath, 'utf8');
  for (const id of godPowerIds()) assert.match(html, new RegExp(`data-tool-button=["']${id}["']`));
  assert.equal((html.match(/data-tool-button=/g) ?? []).length, 6, 'v0.4 stops at six visible powers');
});

test('accepted action outcomes distinguish applied from truthful accepted no-effect without modeling rejection', () => {
  const applied = acceptedGodAction('rain', { noEffect: false, foodAdded: 3 });
  assert.equal(applied.accepted, true);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.noEffect, false);
  assert.equal(isAppliedGodAction(applied), true);
  assert.equal(isNoEffectGodAction(applied), false);

  const noEffect = acceptedGodAction('meteor', { noEffect: true });
  assert.equal(noEffect.status, 'no_effect');
  assert.equal(isNoEffectGodAction(noEffect), true);
});

test('presentation adapter uses the outcome contract while rejected spawn input remains exception-based and identity-neutral', () => {
  const world = createCanonicalGodPowerWorld(9402);
  const applied = applyGodTool(world, 'rain', 4, 4);
  assert.equal(applied.accepted, true);
  assert.equal(applied.status, applied.noEffect ? 'no_effect' : 'applied');

  const commandIdBefore = world.nextCommandId;
  assert.throws(() => applyGodTool(world, 'spawn_human', -1, 0), /x must be an integer/);
  assert.equal(world.nextCommandId, commandIdBefore, 'rejected validation still happens before command identity allocation');
});

test('canonical God Power Sandbox gate proves deterministic damage then recovery with real engine commands', () => {
  const left = createCanonicalGodPowerWorld();
  const right = createCanonicalGodPowerWorld();
  const leftEvidence = executeCanonicalGodPowerSequence(left);
  const rightEvidence = executeCanonicalGodPowerSequence(right);
  const gate = evaluateGodPowerGate(left, leftEvidence);

  assert.equal(gate.pass, true, JSON.stringify(gate));
  assert.equal(gate.radiusConsistent, true);
  assert.equal(gate.meteorApplied, true);
  assert.equal(gate.rainApplied, true);
  assert.equal(gate.authorityStable, true);
  assert.equal(gate.rngStable, true);
  assert.equal(gate.historyOrdered, true);
  assert.ok(gate.lifeHit >= 3);
  assert.ok(gate.vegetationRemoved > 0);
  assert.ok(gate.vegetationAdded > 0);
  assert.ok(gate.foodAdded > 0);
  assert.equal(leftEvidence.afterMeteor.vegetation, 0);
  assert.equal(leftEvidence.afterMeteor.food, leftEvidence.before.food);
  assert.equal(leftEvidence.afterRain.vegetation, leftEvidence.afterRain.vegetationCapacity);
  assert.equal(leftEvidence.afterRain.food, leftEvidence.afterRain.foodCapacity);
  assert.equal(leftEvidence.afterRain.life, leftEvidence.afterMeteor.life, 'Rain restores resources but does not resurrect life');
  assert.deepEqual(leftEvidence, rightEvidence);
  assert.deepEqual(snapshotWorld(left), snapshotWorld(right));
});
