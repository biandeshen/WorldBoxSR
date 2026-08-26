import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { dynasticRulerStoryForEvent } from '../client/presentation/dynastic_story.js';
import { eventCardForEvent } from '../client/presentation/event_card.js';
import { rulingLinePresentation } from '../client/presentation/ruling_line_presentation.js';

const CANONICAL = Object.freeze({
  seed: 45,
  width: 24,
  height: 24,
  population: 30,
  preSuccessionDay: 9149,
  successionDay: 9150,
  polityId: 1,
  polityName: 'Eldergate Realm',
  founderId: 23,
  successorId: 31,
  rulingLineSequence: 13,
  descendantDistance: 1
});

function createCanonicalWorld() {
  return createWorld({
    seed: CANONICAL.seed,
    width: CANONICAL.width,
    height: CANONICAL.height,
    population: CANONICAL.population
  });
}

function retainedFoundingEvent(world, polityId) {
  return world.history.find((event) =>
    event.type === 'polity.ruler_appointed' &&
    event.polityId === polityId &&
    event.successionPath === 'founding'
  ) ?? null;
}

function retainedOpenSelection(world, polityId) {
  return world.history.findLast((event) =>
    event.type === 'polity.ruler_succeeded' &&
    event.polityId === polityId &&
    event.successionPath === 'open_selection'
  ) ?? null;
}

function retainedCanonicalDescendant(world) {
  return world.history.findLast((event) =>
    event.type === 'polity.ruler_succeeded' &&
    event.polityId === CANONICAL.polityId &&
    event.previousRulerId === CANONICAL.founderId &&
    event.rulerId === CANONICAL.successorId &&
    event.successionPath === 'descendant'
  ) ?? null;
}

function assertReadOnlyPresentation(world, polity, founding, openSelection, descendant) {
  const snapshotBefore = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();

  const inspector = rulingLinePresentation(world, polity);
  const foundingStory = dynasticRulerStoryForEvent(world, founding);
  const openStory = dynasticRulerStoryForEvent(world, openSelection);
  const descendantStory = dynasticRulerStoryForEvent(world, descendant);
  const openCard = eventCardForEvent(world, openSelection);
  const descendantCard = eventCardForEvent(world, descendant);

  assert.equal(inspector.currentRulerId, CANONICAL.successorId);
  assert.equal(inspector.founderId, CANONICAL.founderId);
  assert.equal(inspector.lineSequence, CANONICAL.rulingLineSequence);
  assert.equal(inspector.reignCount, 2);
  assert.equal(inspector.successionPath, 'descendant');
  assert.equal(inspector.descendantDistance, CANONICAL.descendantDistance);
  assert.equal(inspector.transitionText, 'bloodline continued · child');
  assert.match(inspector.lineText, /ruling line 13 · reign 2 · founder Human #23/);

  assert.equal(foundingStory?.transitionKind, 'founding');
  assert.match(foundingStory?.headline ?? '', /crowns its first ruler/);

  assert.equal(openStory?.transitionKind, 'open_selection');
  assert.match(openStory?.headline ?? '', /begins a new ruling line/);
  assert.match(openStory?.detail ?? '', /begins ruling line \d+ as founder Human #\d+/);
  assert.doesNotMatch(openStory?.detail ?? '', /legitim|primogen|claim|elect|usurp/i);

  assert.equal(descendantStory?.transitionKind, 'descendant');
  assert.equal(descendantStory?.lineSequence, CANONICAL.rulingLineSequence);
  assert.equal(descendantStory?.founderId, CANONICAL.founderId);
  assert.equal(descendantStory?.descendantDistance, CANONICAL.descendantDistance);
  assert.equal(descendantStory?.headline, `${CANONICAL.polityName}'s ruling bloodline continues`);
  assert.match(descendantStory?.detail ?? '', /Human #31 continues ruling line 13 as a child of founder Human #23/);

  assert.equal(openCard.eventId, openSelection.id);
  assert.match(openCard.headline, /begins a new ruling line/);
  assert.equal(openCard.subject?.status, 'resolved');
  assert.equal(openCard.subject?.reference?.entityKind, 'polity');
  assert.equal(openCard.subject?.navigation?.kind, 'map');

  assert.equal(descendantCard.eventId, descendant.id);
  assert.equal(descendantCard.headline, descendantStory.headline);
  assert.equal(descendantCard.subject?.status, 'resolved');
  assert.equal(descendantCard.subject?.reference?.entityKind, 'polity');
  assert.equal(descendantCard.subject?.navigation?.kind, 'map');
  assert.ok(descendantCard.causes.some((cause) => cause.reference?.kind === 'event'));

  assert.deepEqual(snapshotWorld(world), snapshotBefore, 'Inspector/story/Event Card projection must not mutate authority');
  assert.deepEqual(world.rng.snapshot(), rngBefore, 'Inspector/story/Event Card projection must not consume RNG');

  return {
    inspector: {
      lineText: inspector.lineText,
      transitionText: inspector.transitionText,
      currentRulerId: inspector.currentRulerId,
      founderId: inspector.founderId,
      lineSequence: inspector.lineSequence,
      reignCount: inspector.reignCount
    },
    founding: {
      eventId: founding.id,
      rulerId: founding.rulerId,
      lineSequence: founding.rulingLineSequence,
      headline: foundingStory.headline
    },
    openSelection: {
      eventId: openSelection.id,
      previousRulerId: openSelection.previousRulerId,
      rulerId: openSelection.rulerId,
      lineSequence: openSelection.rulingLineSequence,
      founderId: openSelection.rulingLineFounderId,
      reason: openSelection.reason,
      headline: openStory.headline,
      detail: openStory.detail
    },
    descendant: {
      eventId: descendant.id,
      previousRulerId: descendant.previousRulerId,
      rulerId: descendant.rulerId,
      lineSequence: descendant.rulingLineSequence,
      founderId: descendant.rulingLineFounderId,
      reignCount: descendant.rulingLineReignCount,
      distance: descendant.descendantDistance,
      reason: descendant.reason,
      headline: descendantStory.headline,
      detail: descendantStory.detail,
      causeEventIds: descendantCard.causes
        .filter((cause) => cause.reference?.kind === 'event')
        .map((cause) => cause.reference.id)
    }
  };
}

function runCanonicalPath({ restoreAtDay9149 = false } = {}) {
  let world = createCanonicalWorld();
  tickWorld(world, CANONICAL.preSuccessionDay);

  assert.equal(world.day, CANONICAL.preSuccessionDay);
  const polityBefore = world.polities.find((polity) => polity.id === CANONICAL.polityId);
  assert.ok(polityBefore);
  assert.equal(polityBefore.name, CANONICAL.polityName);
  assert.equal(polityBefore.rulerId, CANONICAL.founderId);
  assert.equal(polityBefore.rulingLineFounderId, CANONICAL.founderId);
  assert.equal(polityBefore.rulingLineSequence, CANONICAL.rulingLineSequence);
  assert.equal(polityBefore.rulingLineReignCount, 1);

  const founding = retainedFoundingEvent(world, CANONICAL.polityId);
  const openSelection = retainedOpenSelection(world, CANONICAL.polityId);
  assert.ok(founding, 'canonical polity must retain its founding ruling-line event');
  assert.ok(openSelection, 'canonical polity must retain a real pre-descendant open-selection line change');
  assert.equal(founding.rulingLineSequence, 1);
  assert.equal(founding.rulingLineFounderId, founding.rulerId);
  assert.equal(founding.rulingLineChanged, true);
  assert.equal(openSelection.rulingLineChanged, true);
  assert.equal(openSelection.rulingLineFounderId, openSelection.rulerId);
  assert.equal(openSelection.descendantDistance, null);
  assert.ok(openSelection.rulingLineSequence < CANONICAL.rulingLineSequence);

  const checkpoint = snapshotWorld(world);
  if (restoreAtDay9149) world = worldFromSnapshot(structuredClone(checkpoint));

  tickWorld(world, 1);
  assert.equal(world.day, CANONICAL.successionDay);
  const polity = world.polities.find((candidate) => candidate.id === CANONICAL.polityId);
  assert.ok(polity);
  assert.equal(polity.rulerId, CANONICAL.successorId);
  assert.equal(polity.rulingLineFounderId, CANONICAL.founderId);
  assert.equal(polity.rulingLineSequence, CANONICAL.rulingLineSequence);
  assert.equal(polity.rulingLineReignCount, 2);

  const descendant = retainedCanonicalDescendant(world);
  assert.ok(descendant, 'day-9150 canonical descendant succession must be retained');
  assert.equal(descendant.rulingLineChanged, false);
  assert.equal(descendant.previousRulingLineFounderId, CANONICAL.founderId);
  assert.equal(descendant.rulingLineFounderId, CANONICAL.founderId);
  assert.equal(descendant.rulingLineSequence, CANONICAL.rulingLineSequence);
  assert.equal(descendant.rulingLineReignCount, 2);
  assert.equal(descendant.descendantDistance, CANONICAL.descendantDistance);

  const presentation = assertReadOnlyPresentation(world, polity, founding, openSelection, descendant);
  return { snapshot: snapshotWorld(world), evidence: presentation };
}

test('canonical Ruling Lines path is byte-repeatable, save/load continuous and readable from recorded facts', () => {
  const uninterrupted = runCanonicalPath();
  const duplicate = runCanonicalPath();
  const restored = runCanonicalPath({ restoreAtDay9149: true });

  assert.deepEqual(duplicate.evidence, uninterrupted.evidence, 'duplicate canonical runs must expose identical ruling-line facts');
  assert.deepEqual(duplicate.snapshot, uninterrupted.snapshot, 'duplicate canonical runs must be byte-identical');
  assert.deepEqual(restored.evidence, uninterrupted.evidence, 'day-9149 save/load continuation must expose identical ruling-line facts');
  assert.deepEqual(restored.snapshot, uninterrupted.snapshot, 'day-9149 save/load continuation must reach byte-identical authority');

  console.log(`Canonical Ruling Lines gate: polity #${CANONICAL.polityId} ${CANONICAL.polityName}; open-selection event #${uninterrupted.evidence.openSelection.eventId} → descendant event #${uninterrupted.evidence.descendant.eventId}; Human #${CANONICAL.founderId} → #${CANONICAL.successorId}; ruling line ${CANONICAL.rulingLineSequence}, reign 2; duplicate/save-load exact`);
});
