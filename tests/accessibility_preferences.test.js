import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ACCESSIBILITY_PREFERENCES_KEY,
  currentAccessibilityPreferences,
  defaultAccessibilityPreferences,
  effectiveReducedMotion,
  loadAccessibilityPreferences,
  normalizeAccessibilityPreferences,
  parseAccessibilityPreferences,
  serializeAccessibilityPreferences,
  setCurrentAccessibilityPreferences
} from '../client/presentation/accessibility_preferences.js';
import { currentEffectProfile } from '../client/presentation/effect_preferences.js';
import { playToolSound } from '../client/presentation/audio_feedback.js';

const audioPath = fileURLToPath(new URL('../client/presentation/audio_feedback.js', import.meta.url));
const runtimePath = fileURLToPath(new URL('../client/presentation/accessibility_preferences_runtime.js', import.meta.url));
const indexPath = fileURLToPath(new URL('../client/index.html', import.meta.url));

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('accessibility preference format is narrow, versioned and rejects widened or malformed values', () => {
  assert.deepEqual(defaultAccessibilityPreferences(), { reduceMotion: false, muteSound: false });
  assert.deepEqual(normalizeAccessibilityPreferences({ reduceMotion: true, muteSound: false }), { reduceMotion: true, muteSound: false });
  assert.throws(() => normalizeAccessibilityPreferences({ reduceMotion: true, muteSound: false, volume: 0.5 }), /unsupported fields/);
  assert.throws(() => normalizeAccessibilityPreferences({ reduceMotion: 1, muteSound: false }), /boolean values/);

  const serialized = serializeAccessibilityPreferences({ reduceMotion: true, muteSound: true });
  assert.deepEqual(parseAccessibilityPreferences(serialized), { reduceMotion: true, muteSound: true });
  assert.throws(() => parseAccessibilityPreferences('{"formatVersion":2,"reduceMotion":false,"muteSound":false}'), /Unsupported accessibility preference format/);
  assert.throws(() => parseAccessibilityPreferences('{"formatVersion":1,"reduceMotion":false,"muteSound":false,"volume":1}'), /unsupported fields/);
});

test('invalid or unavailable storage falls back safely while save failure still applies this-session preferences', () => {
  const invalid = new MemoryStorage();
  invalid.setItem(ACCESSIBILITY_PREFERENCES_KEY, '{bad json');
  const loaded = loadAccessibilityPreferences(invalid);
  assert.deepEqual(loaded.preferences, { reduceMotion: false, muteSound: false });
  assert.ok(loaded.error instanceof Error);

  const throwingStorage = {
    getItem() { return null; },
    setItem() { throw new Error('quota'); }
  };
  const result = setCurrentAccessibilityPreferences(
    { reduceMotion: true, muteSound: true },
    { storage: throwingStorage }
  );
  assert.equal(result.persisted, false);
  assert.match(result.error.message, /quota/);
  assert.deepEqual(currentAccessibilityPreferences(), { reduceMotion: true, muteSound: true });

  setCurrentAccessibilityPreferences({ reduceMotion: false, muteSound: false }, { storage: new MemoryStorage() });
});

test('effective reduced motion is monotonic with system accessibility preference', () => {
  const standard = { reduceMotion: false, muteSound: false };
  const localReduced = { reduceMotion: true, muteSound: false };
  assert.equal(effectiveReducedMotion({ systemReducedMotion: false, preferences: standard }), false);
  assert.equal(effectiveReducedMotion({ systemReducedMotion: false, preferences: localReduced }), true);
  assert.equal(effectiveReducedMotion({ systemReducedMotion: true, preferences: standard }), true);
  assert.equal(effectiveReducedMotion({ systemReducedMotion: true, preferences: localReduced }), true);
});

test('current effect profile reacts immediately and never overrides system reduced motion', () => {
  const originalMatchMedia = globalThis.matchMedia;
  try {
    globalThis.matchMedia = () => ({ matches: false });
    setCurrentAccessibilityPreferences({ reduceMotion: true, muteSound: false }, { storage: new MemoryStorage() });
    assert.equal(currentEffectProfile().reducedMotion, true);

    globalThis.matchMedia = () => ({ matches: true });
    setCurrentAccessibilityPreferences({ reduceMotion: false, muteSound: false }, { storage: new MemoryStorage() });
    const systemReduced = currentEffectProfile();
    assert.equal(systemReduced.reducedMotion, true);
    assert.equal(systemReduced.cameraShake, false);
  } finally {
    globalThis.matchMedia = originalMatchMedia;
    setCurrentAccessibilityPreferences({ reduceMotion: false, muteSound: false }, { storage: new MemoryStorage() });
  }
});

test('muted God Power audio returns before AudioContext construction', () => {
  const originalAudioContext = globalThis.AudioContext;
  const originalWebkitAudioContext = globalThis.webkitAudioContext;
  let constructions = 0;
  class ProbeAudioContext {
    constructor() { constructions += 1; }
  }
  try {
    globalThis.AudioContext = ProbeAudioContext;
    globalThis.webkitAudioContext = undefined;
    setCurrentAccessibilityPreferences({ reduceMotion: false, muteSound: true }, { storage: new MemoryStorage() });
    assert.equal(playToolSound('meteor'), false);
    assert.equal(constructions, 0);

    const source = readFileSync(audioPath, 'utf8');
    const muteIndex = source.indexOf('currentAccessibilityPreferences().muteSound');
    const ctorIndex = source.indexOf('globalThis.AudioContext');
    assert.ok(muteIndex >= 0 && ctorIndex > muteIndex, 'mute must be checked before reading/constructing AudioContext');
  } finally {
    globalThis.AudioContext = originalAudioContext;
    globalThis.webkitAudioContext = originalWebkitAudioContext;
    setCurrentAccessibilityPreferences({ reduceMotion: false, muteSound: false }, { storage: new MemoryStorage() });
  }
});

test('Inspector accessibility controls persist through the shared preference runtime without topbar growth', () => {
  const runtime = readFileSync(runtimePath, 'utf8');
  const index = readFileSync(indexPath, 'utf8');
  assert.match(runtime, /initializeAccessibilityPreferences\(\)/);
  assert.match(runtime, /setCurrentAccessibilityPreferences\(\{/);
  assert.match(runtime, /reduceMotion\.addEventListener\('change'/);
  assert.match(runtime, /muteSound\.addEventListener\('change'/);
  assert.match(index, /<details id="accessibility-preferences">/);
  assert.match(index, /id="accessibility-reduce-motion" type="checkbox"/);
  assert.match(index, /id="accessibility-mute-sound" type="checkbox"/);
  assert.match(index, /accessibility_preferences_runtime\.js/);
  const topbar = index.slice(index.indexOf('<header id="topbar">'), index.indexOf('</header>'));
  assert.doesNotMatch(topbar, /accessibility-reduce-motion|accessibility-mute-sound/);
});
