import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { updateRulers } from '../engine/systems/rulers.js';
import { formatRulingLineTransition, rulingLinePresentation } from '../client/presentation/ruling_line_presentation.js';

function simplePolityWorld() {
  const world = createWorld({ seed: 1801, width: 10, height: 10, population: 0 });
  const tile = world.tiles.find((candidate) => candidate.passable);
  const settlement = createSettlement(world, tile);
  updatePolities(world);
  const ruler = createHuman(world, {
    x: settlement.x,
    y: settlement.y,
    ageYears: 42,
    sex: 'F',
    settlementId: settlement.id,
    hunger: 0.1
  });
  updateRulers(world);
  return { world, settlement, polity: world.polities[0], ruler };
}

test('living founder and founding transition project concise ruling-line text', () => {
  const { world, polity, ruler } = simplePolityWorld();
  const view = rulingLinePresentation(world, polity);

  assert.equal(view.currentRulerId, ruler.id);
  assert.equal(view.currentRulerAvailable, true);
  assert.equal(view.founderId, ruler.id);
  assert.equal(view.founderAvailable, true);
  assert.equal(view.lineSequence, 1);
  assert.equal(view.reignCount, 1);
  assert.equal(view.lineText, `ruling line 1 · reign 1 · founder Human #${ruler.id}`);
  assert.equal(view.transitionText, 'founding line');
  assert.equal(view.successionPath, 'founding');
});

test('dead or removed founder keeps stable identity and becomes truthfully unavailable', () => {
  const { world, polity, ruler } = simplePolityWorld();
  world.entities = world.entities.filter((human) => human.id !== ruler.id);
  polity.rulerId = null;
  polity.rulerSinceDay = null;

  const view = rulingLinePresentation(world, polity);
  assert.equal(view.currentRulerId, null);
  assert.equal(view.founderId, ruler.id);
  assert.equal(view.founderAvailable, false);
  assert.equal(view.lineText, `ruling line 1 · reign 1 · founder Human #${ruler.id} · unavailable`);
  assert.equal(view.transitionText, null);
});

test('descendant continuation wording uses only recorded generation distance', () => {
  assert.equal(formatRulingLineTransition({ type: 'polity.ruler_succeeded', successionPath: 'descendant', descendantDistance: 1 }), 'bloodline continued · child');
  assert.equal(formatRulingLineTransition({ type: 'polity.ruler_succeeded', successionPath: 'descendant', descendantDistance: 2 }), 'bloodline continued · grandchild');
  assert.equal(formatRulingLineTransition({ type: 'polity.ruler_succeeded', successionPath: 'descendant', descendantDistance: 4 }), 'bloodline continued · 4 generations');
  assert.equal(formatRulingLineTransition({ type: 'polity.ruler_succeeded', successionPath: 'descendant', descendantDistance: null }), 'bloodline continued');
});

test('open selection and founding are visibly distinct without inferred legitimacy', () => {
  assert.equal(formatRulingLineTransition({ type: 'polity.ruler_succeeded', successionPath: 'open_selection' }), 'new ruling line · open selection');
  assert.equal(formatRulingLineTransition({ type: 'polity.ruler_appointed', successionPath: 'founding' }), 'founding line');
  assert.equal(formatRulingLineTransition({ type: 'human.died', successionPath: 'descendant', descendantDistance: 1 }), null);
});

test('vacancy preserves current ruling-line projection while current ruler is absent', () => {
  const { world, polity, ruler } = simplePolityWorld();
  polity.rulerId = null;
  polity.rulerSinceDay = null;
  polity.rulingLineSequence = 3;
  polity.rulingLineReignCount = 4;

  const view = rulingLinePresentation(world, polity);
  assert.equal(view.currentRulerId, null);
  assert.equal(view.lineText, `ruling line 3 · reign 4 · founder Human #${ruler.id}`);
  assert.equal(view.transitionText, null);
});

test('presentation projection does not mutate snapshot or sequential RNG', () => {
  const { world, polity } = simplePolityWorld();
  const snapshotBefore = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  rulingLinePresentation(world, polity);

  assert.deepEqual(snapshotWorld(world), snapshotBefore);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
