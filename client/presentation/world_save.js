import { snapshotWorld, worldFromSnapshot } from '../../engine/core/world.js';

export const LOCAL_WORLD_SAVE_KEY = 'worldboxsr:local-world:v1';
export const LOCAL_WORLD_SAVE_FORMAT_VERSION = 1;
const ALLOWED_PRESETS = new Set(['sandbox', 'living_ecology']);

export function createLocalWorldSave(world, { preset = 'sandbox', savedAt = Date.now() } = {}) {
  if (!world) throw new TypeError('world is required');
  const normalizedPreset = normalizeSavePreset(preset);
  const normalizedSavedAt = Number.isFinite(savedAt) && savedAt >= 0 ? savedAt : Date.now();
  return {
    formatVersion: LOCAL_WORLD_SAVE_FORMAT_VERSION,
    savedAt: normalizedSavedAt,
    preset: normalizedPreset,
    snapshot: snapshotWorld(world)
  };
}

export function serializeLocalWorldSave(world, options = {}) {
  return JSON.stringify(createLocalWorldSave(world, options));
}

export function parseLocalWorldSave(serialized) {
  if (typeof serialized !== 'string' || serialized.length === 0) throw new Error('Local world save is empty');
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    throw new Error('Local world save is not valid JSON');
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('Local world save envelope is invalid');
  if (envelope.formatVersion !== LOCAL_WORLD_SAVE_FORMAT_VERSION) {
    throw new Error(`Unsupported local world save format: ${envelope.formatVersion}`);
  }
  if (!Number.isFinite(envelope.savedAt) || envelope.savedAt < 0) throw new Error('Local world save timestamp is invalid');
  const preset = normalizeSavePreset(envelope.preset);
  if (!envelope.snapshot || typeof envelope.snapshot !== 'object' || Array.isArray(envelope.snapshot)) throw new Error('Local world save snapshot is missing');

  const world = worldFromSnapshot(envelope.snapshot);
  return {
    formatVersion: LOCAL_WORLD_SAVE_FORMAT_VERSION,
    savedAt: envelope.savedAt,
    preset,
    world,
    snapshot: snapshotWorld(world)
  };
}

export function readLocalWorldSave(storage) {
  if (!storage?.getItem) return null;
  const serialized = storage.getItem(LOCAL_WORLD_SAVE_KEY);
  if (serialized === null) return null;
  return parseLocalWorldSave(serialized);
}

export function writeLocalWorldSave(storage, world, options = {}) {
  if (!storage?.setItem) throw new Error('Local storage is unavailable');
  const envelope = createLocalWorldSave(world, options);
  const serialized = JSON.stringify(envelope);
  storage.setItem(LOCAL_WORLD_SAVE_KEY, serialized);
  return { serialized, bytes: utf8ByteLength(serialized), envelope };
}

export function clearLocalWorldSave(storage) {
  storage?.removeItem?.(LOCAL_WORLD_SAVE_KEY);
}

export function normalizeSavePreset(preset) {
  const value = String(preset ?? '').trim();
  if (!ALLOWED_PRESETS.has(value)) throw new Error(`Unsupported saved world preset: ${value || '(empty)'}`);
  return value;
}

export function utf8ByteLength(value) {
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(String(value)).byteLength;
  return String(value).length;
}
