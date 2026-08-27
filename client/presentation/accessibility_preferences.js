export const ACCESSIBILITY_PREFERENCES_KEY = 'worldboxsr:accessibility:v1';
export const ACCESSIBILITY_PREFERENCES_VERSION = 1;

const DEFAULT_PREFERENCES = Object.freeze({ reduceMotion: false, muteSound: false });
let sessionPreferences = null;

export function defaultAccessibilityPreferences() {
  return { ...DEFAULT_PREFERENCES };
}

export function normalizeAccessibilityPreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Accessibility preferences must be an object');
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== 'muteSound' || keys[1] !== 'reduceMotion') {
    throw new Error('Accessibility preferences contain unsupported fields');
  }
  if (typeof value.reduceMotion !== 'boolean' || typeof value.muteSound !== 'boolean') {
    throw new TypeError('Accessibility preferences must use boolean values');
  }
  return { reduceMotion: value.reduceMotion, muteSound: value.muteSound };
}

export function serializeAccessibilityPreferences(preferences) {
  const normalized = normalizeAccessibilityPreferences(preferences);
  return JSON.stringify({
    formatVersion: ACCESSIBILITY_PREFERENCES_VERSION,
    reduceMotion: normalized.reduceMotion,
    muteSound: normalized.muteSound
  });
}

export function parseAccessibilityPreferences(serialized) {
  if (typeof serialized !== 'string' || serialized.length === 0) throw new Error('Accessibility preferences are empty');
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    throw new Error('Accessibility preferences are not valid JSON');
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('Accessibility preference envelope is invalid');
  const keys = Object.keys(envelope).sort();
  const expected = ['formatVersion', 'muteSound', 'reduceMotion'];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error('Accessibility preference envelope contains unsupported fields');
  }
  if (envelope.formatVersion !== ACCESSIBILITY_PREFERENCES_VERSION) {
    throw new Error(`Unsupported accessibility preference format: ${envelope.formatVersion}`);
  }
  return normalizeAccessibilityPreferences({
    reduceMotion: envelope.reduceMotion,
    muteSound: envelope.muteSound
  });
}

export function loadAccessibilityPreferences(storage = browserStorage()) {
  const fallback = defaultAccessibilityPreferences();
  if (!storage?.getItem) {
    return { preferences: fallback, persisted: false, error: new Error('Local preference storage is unavailable') };
  }
  try {
    const serialized = storage.getItem(ACCESSIBILITY_PREFERENCES_KEY);
    if (serialized === null) return { preferences: fallback, persisted: false, error: null };
    return { preferences: parseAccessibilityPreferences(serialized), persisted: true, error: null };
  } catch (error) {
    return { preferences: fallback, persisted: false, error: asError(error) };
  }
}

export function initializeAccessibilityPreferences(storage = browserStorage()) {
  const loaded = loadAccessibilityPreferences(storage);
  sessionPreferences = { ...loaded.preferences };
  return { ...loaded, preferences: { ...loaded.preferences } };
}

export function currentAccessibilityPreferences() {
  if (sessionPreferences === null) initializeAccessibilityPreferences();
  return { ...(sessionPreferences ?? DEFAULT_PREFERENCES) };
}

export function setCurrentAccessibilityPreferences(preferences, { storage = browserStorage() } = {}) {
  const normalized = normalizeAccessibilityPreferences(preferences);
  sessionPreferences = { ...normalized };
  if (!storage?.setItem) {
    return {
      preferences: { ...normalized },
      persisted: false,
      error: new Error('Local preference storage is unavailable')
    };
  }
  try {
    storage.setItem(ACCESSIBILITY_PREFERENCES_KEY, serializeAccessibilityPreferences(normalized));
    return { preferences: { ...normalized }, persisted: true, error: null };
  } catch (error) {
    return { preferences: { ...normalized }, persisted: false, error: asError(error) };
  }
}

export function effectiveReducedMotion({ systemReducedMotion = false, preferences = currentAccessibilityPreferences() } = {}) {
  const normalized = normalizeAccessibilityPreferences(preferences);
  return Boolean(systemReducedMotion) || normalized.reduceMotion;
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function asError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
