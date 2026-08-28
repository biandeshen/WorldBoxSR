import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SNAPSHOT_VERSION,
  SUPPORTED_SNAPSHOT_VERSIONS,
  createWorld,
  snapshotWorld,
  tickWorld,
  worldFromSnapshot
} from '../engine/core/world.js';
import { createGrazer } from '../engine/model/grazer.js';
import { createHuman } from '../engine/model/human.js';
import { createSettlement } from '../engine/model/settlement.js';
import { updatePolities } from '../engine/systems/polities.js';
import { updatePolityRelations } from '../engine/systems/polity_relations.js';
import { updateRulers } from '../engine/systems/rulers.js';
import { updateWarbands } from '../engine/systems/warbands.js';
import {
  LOCAL_WORLD_SAVE_FORMAT_VERSION,
  parseLocalWorldSave
} from '../client/presentation/world_save.js';
import {
  SCENARIO_RECIPE_KIND,
  SCENARIO_RECIPE_VERSION,
  normalizeScenarioRecipe
} from '../client/presentation/scenario_recipe.js';

const CONTINUATION_TICKS = 12;
const POLITY_LINE_KEYS = Object.freeze([
  'rulingLineFounderId',
  'rulingLineSequence',
  'rulingLineSinceDay',
  'rulingLineReignCount'
]);
const SETTLEMENT_POLITICAL_KEYS = Object.freeze([
  'polityId',
  'conquestCount',
  'previousPolityId',
  'lastConqueredDay',
  'lastConqueredByPolityId',
  'lastConqueringWarbandId',
  'occupationStartedDay',
  'rebellionEligibleDay',
  'rebellionCount',
  'lastRebelledDay',
  'lastRebelledFromPolityId'
]);

function currentFixtureSnapshot() {
  const world = createWorld({ seed: 10001, width: 16, height: 16, population: 0 });
  world.day = 100;
  const passable = world.tiles.filter((tile) => tile.passable);
  const first = passable[0];
  const second = passable.find((tile) => Math.abs(tile.x - first.x) + Math.abs(tile.y - first.y) >= 4);
  assert.ok(first && second, 'compatibility fixture requires two separated passable tiles');

  const settlements = [
    createSettlement(world, { x: first.x, y: first.y }),
    createSettlement(world, { x: second.x, y: second.y })
  ];

  settlements.forEach((settlement, settlementIndex) => {
    for (let index = 0; index < 3; index += 1) {
      const human = createHuman(world, {
        x: settlement.x,
        y: settlement.y,
        ageYears: 28 + settlementIndex * 3 + index,
        sex: index % 2 === 0 ? 'F' : 'M',
        hunger: 0.1,
        health: 1,
        settlementId: settlement.id,
        lineageId: null
      });
      settlement.memberIds.push(human.id);
    }
    settlement.population = settlement.memberIds.length;
    settlement.foodStored = 2.5 + settlementIndex * 2;
  });

  createGrazer(world, {
    x: first.x,
    y: first.y,
    ageDays: world.config.daysPerYear * 2,
    hunger: 0.1,
    health: 1,
    lastBirthDay: 80
  });
  world.counters.creatureBirths = 1;

  updatePolities(world);
  updateRulers(world);
  updatePolityRelations(world);
  assert.equal(world.polities.length, 2);
  assert.equal(world.relations.length, 1);

  const relation = world.relations[0];
  relation.active = true;
  relation.atWar = true;
  relation.stance = 'war';
  relation.startedDay = world.day;
  relation.endedDay = null;
  updateWarbands(world);
  assert.equal(world.warbands.length, 2, 'current fixture must contain real valid warband state');

  return snapshotWorld(world);
}

function preV17Snapshot(version) {
  const snapshot = currentFixtureSnapshot();
  snapshot.snapshotVersion = version;
  for (const settlement of snapshot.settlements) delete settlement.foodStored;
  return snapshot;
}

function snapshotV10Prototype() {
  const snapshot = preV17Snapshot(10);
  delete snapshot.config.grazerBirthChancePerEligiblePairPerDay;
  delete snapshot.counters.creatureBirths;
  for (const creature of snapshot.creatures) delete creature.lastBirthDay;
  stripPrePolityState(snapshot);
  return snapshot;
}

function snapshotV11Prototype() {
  const snapshot = preV17Snapshot(11);
  stripPrePolityState(snapshot);
  return snapshot;
}

function snapshotV12Prototype() {
  const snapshot = preV17Snapshot(12);
  delete snapshot.relations;
  delete snapshot.nextWarbandId;
  delete snapshot.warbands;
  stripRulingLineState(snapshot);
  stripHistoryTypes(snapshot, (type) => type.startsWith('warband.'));
  return snapshot;
}

function snapshotV13Prototype() {
  const snapshot = preV17Snapshot(13);
  delete snapshot.nextWarbandId;
  delete snapshot.warbands;
  stripRulingLineState(snapshot);
  stripHistoryTypes(snapshot, (type) => type.startsWith('warband.'));
  return snapshot;
}

function snapshotV14Prototype() {
  const snapshot = preV17Snapshot(14);
  stripRulingLineState(snapshot);
  return snapshot;
}

function snapshotV15PublicRelease() {
  const snapshot = preV17Snapshot(15);
  stripRulingLineState(snapshot);
  return snapshot;
}

function snapshotV16PublicRelease() {
  return preV17Snapshot(16);
}

function snapshotV17Current() {
  return currentFixtureSnapshot();
}

function stripPrePolityState(snapshot) {
  delete snapshot.nextPolityId;
  delete snapshot.polities;
  delete snapshot.relations;
  delete snapshot.nextWarbandId;
  delete snapshot.warbands;
  for (const settlement of snapshot.settlements) {
    for (const key of SETTLEMENT_POLITICAL_KEYS) delete settlement[key];
  }
  stripHistoryTypes(snapshot, (type) => type.startsWith('polity.') || type.startsWith('warband.'));
}

function stripRulingLineState(snapshot) {
  for (const polity of snapshot.polities) {
    for (const key of POLITY_LINE_KEYS) delete polity[key];
  }
}

function stripHistoryTypes(snapshot, predicate) {
  snapshot.history = snapshot.history.filter((event) => !predicate(String(event.type ?? '')));
}

function assertLocalEnvelopeNormalizes(snapshot, normalized) {
  const serialized = JSON.stringify({
    formatVersion: LOCAL_WORLD_SAVE_FORMAT_VERSION,
    savedAt: 1_000,
    preset: 'sandbox',
    snapshot
  });
  const parsed = parseLocalWorldSave(serialized);
  assert.equal(parsed.formatVersion, LOCAL_WORLD_SAVE_FORMAT_VERSION);
  assert.equal(parsed.savedAt, 1_000);
  assert.equal(parsed.preset, 'sandbox');
  assert.deepEqual(parsed.snapshot, normalized);
}

function assertCompatibilityCase(snapshot, version, assertMigrated) {
  assert.equal(snapshot.snapshotVersion, version);
  const inputBefore = structuredClone(snapshot);
  const restored = worldFromSnapshot(snapshot);
  assert.deepEqual(snapshot, inputBefore, `v${version} migration must not mutate the supplied snapshot`);
  assert.equal(restored.snapshotVersion, SNAPSHOT_VERSION);
  if (version < 17) {
    assert.ok(restored.settlements.every((settlement) => settlement.foodStored === 0), `v${version} settlements must migrate foodStored=0`);
  }

  const normalized = snapshotWorld(restored);
  assert.equal(normalized.snapshotVersion, SNAPSHOT_VERSION);
  assertMigrated?.(restored, normalized);
  assertLocalEnvelopeNormalizes(inputBefore, normalized);

  const control = worldFromSnapshot(structuredClone(normalized));
  tickWorld(restored, CONTINUATION_TICKS);
  tickWorld(control, CONTINUATION_TICKS);
  assert.deepEqual(
    snapshotWorld(restored),
    snapshotWorld(control),
    `v${version} migrated world must continue identically to its current-schema normalized equivalent`
  );
}

test('supported engine snapshot baseline is frozen at v10 through current v17', () => {
  assert.equal(SNAPSHOT_VERSION, 17);
  assert.equal(Object.isFrozen(SUPPORTED_SNAPSHOT_VERSIONS), true);
  assert.deepEqual(SUPPORTED_SNAPSHOT_VERSIONS, [10, 11, 12, 13, 14, 15, 16, 17]);
});

test('snapshot v10 accepted prototype schema migrates reproduction, pre-polity defaults and settlement reserve', () => {
  assertCompatibilityCase(snapshotV10Prototype(), 10, (restored) => {
    assert.equal(restored.creatures[0].lastBirthDay, null);
    assert.equal(restored.counters.creatureBirths, 0);
    assert.deepEqual(restored.polities, []);
    assert.deepEqual(restored.relations, []);
    assert.deepEqual(restored.warbands, []);
    assert.ok(restored.settlements.every((settlement) => settlement.polityId === null));
  });
});

test('snapshot v11 accepted prototype schema preserves reproduction fields and migrates pre-polity defaults', () => {
  assertCompatibilityCase(snapshotV11Prototype(), 11, (restored) => {
    assert.equal(restored.creatures[0].lastBirthDay, 80);
    assert.equal(restored.counters.creatureBirths, 1);
    assert.deepEqual(restored.polities, []);
    assert.deepEqual(restored.relations, []);
    assert.deepEqual(restored.warbands, []);
  });
});

test('snapshot v12 accepted prototype schema preserves polity identity and migrates pre-relations state', () => {
  assertCompatibilityCase(snapshotV12Prototype(), 12, (restored) => {
    assert.equal(restored.polities.length, 2);
    assert.deepEqual(restored.relations, []);
    assert.deepEqual(restored.warbands, []);
    assert.equal(restored.nextWarbandId, 1);
    assert.ok(restored.polities.every((polity) => polity.rulingLineSinceDay === null));
  });
});

test('snapshot v13 accepted prototype schema preserves relations and migrates pre-warband state', () => {
  assertCompatibilityCase(snapshotV13Prototype(), 13, (restored) => {
    assert.equal(restored.polities.length, 2);
    assert.equal(restored.relations.length, 1);
    assert.equal(restored.relations[0].atWar, true);
    assert.deepEqual(restored.warbands, []);
    assert.equal(restored.nextWarbandId, 1);
  });
});

test('snapshot v14 accepted prototype schema preserves warbands while normalizing pre-v16 ruling-line state', () => {
  assertCompatibilityCase(snapshotV14Prototype(), 14, (restored) => {
    assert.equal(restored.relations.length, 1);
    assert.equal(restored.warbands.length, 2);
    assert.ok(restored.polities.every((polity) => polity.rulingLineFounderId === polity.rulerId));
    assert.ok(restored.polities.every((polity) => polity.rulingLineSequence === 1));
  });
});

test('snapshot v15 public v0.3-v0.7 schema normalizes ruling-line identity without inventing a history date', () => {
  assertCompatibilityCase(snapshotV15PublicRelease(), 15, (restored) => {
    assert.equal(restored.warbands.length, 2);
    assert.ok(restored.polities.every((polity) => polity.rulingLineFounderId === polity.rulerId));
    assert.ok(restored.polities.every((polity) => polity.rulingLineSequence === 1));
    assert.ok(restored.polities.every((polity) => polity.rulingLineSinceDay === null));
    assert.ok(restored.polities.every((polity) => polity.rulingLineReignCount === 1));
  });
});

test('snapshot v16 public v1.0 schema preserves ruling-line fields exactly while adding zero reserve', () => {
  const snapshot = snapshotV16PublicRelease();
  const originalLines = snapshot.polities.map((polity) => Object.fromEntries(POLITY_LINE_KEYS.map((key) => [key, polity[key]])));
  assertCompatibilityCase(snapshot, 16, (restored) => {
    const restoredLines = restored.polities.map((polity) => Object.fromEntries(POLITY_LINE_KEYS.map((key) => [key, polity[key]])));
    assert.deepEqual(restoredLines, originalLines, 'v16 ruling-line fields must not be re-migrated when current schema advances');
    assert.ok(restored.settlements.every((settlement) => settlement.foodStored === 0));
  });
});

test('snapshot v17 current schema round-trips exactly and continues deterministically', () => {
  const snapshot = snapshotV17Current();
  assertCompatibilityCase(snapshot, 17, (_restored, normalized) => {
    assert.deepEqual(normalized, snapshot);
    assert.deepEqual(normalized.settlements.map((settlement) => settlement.foodStored), [2.5, 4.5]);
  });
});

test('unsupported historical gaps, versions below the floor and future engine snapshots reject explicitly', () => {
  const below = snapshotV17Current();
  below.snapshotVersion = 9;
  assert.throws(() => worldFromSnapshot(below), /Unsupported snapshot version: 9/);

  const gap = snapshotV17Current();
  gap.snapshotVersion = 12.5;
  assert.throws(() => worldFromSnapshot(gap), /Unsupported snapshot version: 12\.5/);

  const future = snapshotV17Current();
  future.snapshotVersion = 18;
  assert.throws(() => worldFromSnapshot(future), /Unsupported snapshot version: 18/);
});

test('local save envelope v1 rejects future envelope and unsupported embedded engine versions without yielding a world', () => {
  const current = snapshotV17Current();
  assert.throws(() => parseLocalWorldSave(JSON.stringify({
    formatVersion: LOCAL_WORLD_SAVE_FORMAT_VERSION + 1,
    savedAt: 1_000,
    preset: 'sandbox',
    snapshot: current
  })), /Unsupported local world save format/);

  const futureSnapshot = structuredClone(current);
  futureSnapshot.snapshotVersion = 18;
  assert.throws(() => parseLocalWorldSave(JSON.stringify({
    formatVersion: LOCAL_WORLD_SAVE_FORMAT_VERSION,
    savedAt: 1_000,
    preset: 'sandbox',
    snapshot: futureSnapshot
  })), /Unsupported snapshot version: 18/);
});

test('Scenario Recipe v1 remains canonical and future recipe versions reject explicitly', () => {
  const recipe = {
    kind: SCENARIO_RECIPE_KIND,
    version: SCENARIO_RECIPE_VERSION,
    name: 'v1 compatibility contract',
    base: { seed: 'compatibility', preset: 'sandbox' },
    setup: []
  };
  assert.equal(SCENARIO_RECIPE_VERSION, 1);
  assert.deepEqual(normalizeScenarioRecipe(recipe), recipe);
  assert.throws(
    () => normalizeScenarioRecipe({ ...recipe, version: SCENARIO_RECIPE_VERSION + 1 }),
    /unsupported scenario recipe version: 2/
  );
});
