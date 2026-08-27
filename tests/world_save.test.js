import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, snapshotWorld, tickWorld } from '../engine/core/world.js';
import {
  clearLocalWorldSave,
  createLocalWorldSave,
  LOCAL_WORLD_SAVE_KEY,
  parseLocalWorldSave,
  readLocalWorldSave,
  serializeLocalWorldSave,
  utf8ByteLength,
  writeLocalWorldSave
} from '../client/presentation/world_save.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    value(key) { return values.get(key); }
  };
}

test('local save envelope contains one existing engine snapshot plus minimal metadata', () => {
  const world = createWorld({ seed: 45, width: 8, height: 8, population: 6 });
  tickWorld(world, 25);
  const envelope = createLocalWorldSave(world, { preset: 'living_ecology', savedAt: 123456 });
  assert.deepEqual(Object.keys(envelope).sort(), ['formatVersion', 'preset', 'savedAt', 'snapshot']);
  assert.equal(envelope.formatVersion, 1);
  assert.equal(envelope.preset, 'living_ecology');
  assert.equal(envelope.savedAt, 123456);
  assert.deepEqual(envelope.snapshot, snapshotWorld(world));
});

test('serialized current save restores exact authoritative snapshot continuation', () => {
  const world = createWorld({ seed: 812, width: 9, height: 7, population: 8 });
  tickWorld(world, 73);
  const serialized = serializeLocalWorldSave(world, { preset: 'sandbox', savedAt: 999 });
  const parsed = parseLocalWorldSave(serialized);
  assert.equal(parsed.preset, 'sandbox');
  assert.equal(parsed.savedAt, 999);
  assert.deepEqual(snapshotWorld(parsed.world), snapshotWorld(world));
  assert.deepEqual(parsed.snapshot, snapshotWorld(world));

  tickWorld(world, 20);
  tickWorld(parsed.world, 20);
  assert.deepEqual(snapshotWorld(parsed.world), snapshotWorld(world), 'restored world must continue deterministically');
});

test('storage write/read/clear uses one stable slot and reports complete serialized bytes', () => {
  const storage = memoryStorage();
  const world = createWorld({ seed: 22, width: 6, height: 6, population: 3 });
  const result = writeLocalWorldSave(storage, world, { preset: 'sandbox', savedAt: 100 });
  assert.equal(storage.value(LOCAL_WORLD_SAVE_KEY), result.serialized);
  assert.equal(result.bytes, utf8ByteLength(result.serialized));
  assert.deepEqual(snapshotWorld(readLocalWorldSave(storage).world), snapshotWorld(world));
  clearLocalWorldSave(storage);
  assert.equal(readLocalWorldSave(storage), null);
});

test('corrupt unsupported and invalid-preset saves reject before replacing any caller world', () => {
  const world = createWorld({ seed: 31, width: 6, height: 6, population: 2 });
  const before = snapshotWorld(world);
  assert.throws(() => parseLocalWorldSave('{bad json'), /not valid JSON/);
  assert.throws(() => parseLocalWorldSave(JSON.stringify({ formatVersion: 99, savedAt: 1, preset: 'sandbox', snapshot: before })), /Unsupported local world save format/);
  assert.throws(() => parseLocalWorldSave(JSON.stringify({ formatVersion: 1, savedAt: 1, preset: 'unknown', snapshot: before })), /Unsupported saved world preset/);
  const unsupportedSnapshot = structuredClone(before);
  unsupportedSnapshot.snapshotVersion = 999;
  assert.throws(() => parseLocalWorldSave(JSON.stringify({ formatVersion: 1, savedAt: 1, preset: 'sandbox', snapshot: unsupportedSnapshot })), /Unsupported snapshot version/);
  assert.deepEqual(snapshotWorld(world), before, 'validation failure must not mutate caller authority');
});

test('storage failures are explicit and never truncate the world save', () => {
  const world = createWorld({ seed: 41, width: 6, height: 6, population: 2 });
  const failingStorage = {
    getItem() { return null; },
    setItem() { throw new Error('quota exceeded'); },
    removeItem() {}
  };
  assert.throws(() => writeLocalWorldSave(failingStorage, world, { preset: 'sandbox', savedAt: 1 }), /quota exceeded/);
  assert.equal(readLocalWorldSave(null), null);
});
