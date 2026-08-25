import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { soundRecipe } from '../client/presentation/audio_feedback.js';
import { effectProfile } from '../client/presentation/effect_preferences.js';

const audioPath = fileURLToPath(new URL('../client/presentation/audio_feedback.js', import.meta.url));
const effectsPath = fileURLToPath(new URL('../client/presentation/effects_layer.js', import.meta.url));

test('each core god power has a tiny generated sound recipe', () => {
  for (const effect of ['spawn_human', 'spawn_grazer', 'erase', 'lightning', 'meteor', 'rain']) {
    const recipe = soundRecipe(effect);
    assert.ok(recipe.length >= 1, `${effect} has no recipe`);
    for (const tone of recipe) {
      assert.ok(tone.duration > 0 && tone.duration <= 0.2);
      assert.ok(tone.gain > 0 && tone.gain <= 0.05);
      assert.ok(tone.startHz > 0 && tone.endHz > 0);
    }
  }
});

test('Meteor feedback is materially stronger while remaining accessibility-profile driven', () => {
  const meteor = soundRecipe('meteor');
  const lightning = soundRecipe('lightning');
  assert.ok(meteor.length > lightning.length);
  assert.ok(Math.max(...meteor.map((tone) => tone.gain)) > Math.max(...lightning.map((tone) => tone.gain)));
  const source = readFileSync(effectsPath, 'utf8');
  assert.match(source, /effect === ['"]meteor['"]/);
  assert.match(source, /function playMeteor/);
  assert.match(source, /profile\.reducedMotion/);
  assert.match(source, /if \(profile\.cameraShake\)/);
});

test('Rain feedback is constructive, reduced-motion aware, and does not shake the camera', () => {
  const rain = soundRecipe('rain');
  assert.ok(rain.length >= 2);
  assert.ok(rain.every((tone) => tone.endHz > tone.startHz), 'Rain tones should rise rather than sound destructive');
  const source = readFileSync(effectsPath, 'utf8');
  const rainStart = source.indexOf('function playRain');
  const meteorStart = source.indexOf('function playMeteor');
  assert.ok(rainStart >= 0 && meteorStart > rainStart);
  const rainSource = source.slice(rainStart, meteorStart);
  assert.match(rainSource, /profile\.reducedMotion/);
  assert.match(rainSource, /scaledSparkCount/);
  assert.doesNotMatch(rainSource, /cameraShake|\.shake\(/);
});

test('reduced-motion profile removes camera shake and sharply lowers flash intensity', () => {
  const normal = effectProfile(false);
  const reduced = effectProfile(true);
  assert.equal(normal.cameraShake, true);
  assert.equal(reduced.cameraShake, false);
  assert.ok(reduced.flashAlpha < normal.flashAlpha / 2);
  assert.ok(reduced.ringScale < normal.ringScale);
  assert.ok(reduced.sparkRatio < normal.sparkRatio);
});

test('audio context is created lazily inside player-triggered feedback', () => {
  const source = readFileSync(audioPath, 'utf8');
  const functionIndex = source.indexOf('export function playToolSound');
  const contextIndex = source.indexOf('new AudioContextCtor()');
  assert.ok(functionIndex >= 0 && contextIndex > functionIndex);
  assert.doesNotMatch(source, /\.mp3|\.wav|\.ogg/);
});

test('visual tool effects invoke both audio and accessibility preferences without engine writes', () => {
  const source = readFileSync(effectsPath, 'utf8');
  assert.match(source, /playToolSound\(effect\)/);
  assert.match(source, /currentEffectProfile\(\)/);
  assert.match(source, /if \(profile\.cameraShake\)/);
  assert.doesNotMatch(source, /engine\//);
  assert.doesNotMatch(source, /applyCommand|tickWorld|pushEvent/);
});
