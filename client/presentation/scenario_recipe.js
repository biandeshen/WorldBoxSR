import { applyCommand } from '../../engine/core/commands.js';
import {
  SHOWCASE,
  createShowcaseWorld,
  evolveShowcaseWorld,
  normalizeSeed,
  normalizeShowcasePreset
} from './world_adapter.js';

export const SCENARIO_RECIPE_KIND = 'worldboxsr-scenario';
export const SCENARIO_RECIPE_VERSION = 1;
export const SCENARIO_RECIPE_MAX_NAME_LENGTH = 64;
export const SCENARIO_RECIPE_MAX_ACTIONS = 32;
export const SCENARIO_RECIPE_MAX_COUNT = 10;

const RECIPE_KEYS = Object.freeze(['kind', 'version', 'name', 'base', 'setup']);
const BASE_KEYS = Object.freeze(['seed', 'preset']);
const HUMAN_ACTION_KEYS = Object.freeze(['type', 'x', 'y', 'count']);
const CREATURE_ACTION_KEYS = Object.freeze(['type', 'species', 'x', 'y', 'count']);
const SETUP_CREATURE_SPECIES = Object.freeze(['grazer', 'wolf']);

export function normalizeScenarioRecipe(input) {
  exactObject(input, RECIPE_KEYS, 'Scenario Recipe');
  requiredOwn(input, RECIPE_KEYS, 'Scenario Recipe');

  if (input.kind !== SCENARIO_RECIPE_KIND) {
    throw new RangeError(`scenario kind must be ${SCENARIO_RECIPE_KIND}`);
  }
  if (input.version !== SCENARIO_RECIPE_VERSION) {
    throw new RangeError(`unsupported scenario recipe version: ${String(input.version)}`);
  }

  const name = normalizedName(input.name);
  const base = normalizeBase(input.base);
  const setup = normalizeScenarioSetup(input.setup);

  // Construct in one fixed key order so JSON.stringify is the canonical codec.
  return {
    kind: SCENARIO_RECIPE_KIND,
    version: SCENARIO_RECIPE_VERSION,
    name,
    base,
    setup
  };
}

export function serializeScenarioRecipe(input) {
  return JSON.stringify(normalizeScenarioRecipe(input));
}

export function parseScenarioRecipe(text) {
  if (typeof text !== 'string') throw new TypeError('scenario recipe JSON must be a string');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new SyntaxError(`invalid scenario recipe JSON: ${error?.message || error}`);
  }
  return normalizeScenarioRecipe(parsed);
}

export async function materializeScenarioRecipe(input, { onProgress = null } = {}) {
  const recipe = normalizeScenarioRecipe(input);
  const world = createShowcaseWorld(recipe.base.seed, recipe.base.preset);
  await evolveShowcaseWorld(world, {
    preset: recipe.base.preset,
    onProgress
  });
  applyScenarioSetup(world, recipe.setup);
  return world;
}

export function applyScenarioSetup(world, setupInput) {
  if (!world || world.width !== SHOWCASE.width || world.height !== SHOWCASE.height) {
    throw new RangeError(`Scenario Recipe setup supports exactly ${SHOWCASE.width}x${SHOWCASE.height} worlds`);
  }
  const setup = normalizeScenarioSetup(setupInput);

  // Whole-recipe preflight happens before the first authoritative command.
  // A later impossible placement must never leave a partially applied setup.
  for (let index = 0; index < setup.length; index += 1) {
    const action = setup[index];
    const tile = world.tiles[action.y * world.width + action.x];
    if (!tile?.passable) {
      throw new RangeError(`scenario setup action ${index + 1} targets impassable tile ${action.x},${action.y}`);
    }
  }

  for (const action of setup) applyCommand(world, action);
  return world;
}

function normalizeBase(input) {
  exactObject(input, BASE_KEYS, 'scenario base');
  requiredOwn(input, BASE_KEYS, 'scenario base');

  if (typeof input.seed !== 'string' && typeof input.seed !== 'number') {
    throw new TypeError('scenario base seed must be a string or number');
  }
  if (typeof input.seed === 'number' && !Number.isFinite(input.seed)) {
    throw new RangeError('scenario base numeric seed must be finite');
  }

  return {
    seed: normalizeSeed(input.seed),
    preset: normalizeShowcasePreset(input.preset)
  };
}

function normalizeScenarioSetup(input) {
  if (!Array.isArray(input)) throw new TypeError('scenario setup must be an array');
  if (input.length > SCENARIO_RECIPE_MAX_ACTIONS) {
    throw new RangeError(`scenario setup may contain at most ${SCENARIO_RECIPE_MAX_ACTIONS} actions`);
  }
  return input.map((action, index) => normalizeSetupAction(action, index));
}

function normalizeSetupAction(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`scenario setup action ${index + 1} must be an object`);
  }

  if (input.type === 'spawn_human') {
    exactObject(input, HUMAN_ACTION_KEYS, `scenario setup action ${index + 1}`);
    requiredOwn(input, HUMAN_ACTION_KEYS, `scenario setup action ${index + 1}`);
    return {
      type: 'spawn_human',
      x: coordinate(input.x, 'x', index),
      y: coordinate(input.y, 'y', index),
      count: setupCount(input.count, index)
    };
  }

  if (input.type === 'spawn_creature') {
    exactObject(input, CREATURE_ACTION_KEYS, `scenario setup action ${index + 1}`);
    requiredOwn(input, CREATURE_ACTION_KEYS, `scenario setup action ${index + 1}`);
    if (!SETUP_CREATURE_SPECIES.includes(input.species)) {
      throw new RangeError(`scenario setup action ${index + 1} species must be one of: ${SETUP_CREATURE_SPECIES.join(', ')}`);
    }
    return {
      type: 'spawn_creature',
      species: input.species,
      x: coordinate(input.x, 'x', index),
      y: coordinate(input.y, 'y', index),
      count: setupCount(input.count, index)
    };
  }

  throw new RangeError(`unsupported scenario setup action type: ${String(input.type)}`);
}

function normalizedName(value) {
  if (typeof value !== 'string') throw new TypeError('scenario name must be a string');
  const name = value.trim();
  if (!name) throw new RangeError('scenario name must not be empty');
  if (name.length > SCENARIO_RECIPE_MAX_NAME_LENGTH) {
    throw new RangeError(`scenario name must be at most ${SCENARIO_RECIPE_MAX_NAME_LENGTH} characters`);
  }
  return name;
}

function coordinate(value, axis, index) {
  const max = axis === 'x' ? SHOWCASE.width - 1 : SHOWCASE.height - 1;
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`scenario setup action ${index + 1} ${axis} must be an integer from 0 to ${max}`);
  }
  return value;
}

function setupCount(value, index) {
  if (!Number.isInteger(value) || value < 1 || value > SCENARIO_RECIPE_MAX_COUNT) {
    throw new RangeError(`scenario setup action ${index + 1} count must be an integer from 1 to ${SCENARIO_RECIPE_MAX_COUNT}`);
  }
  return value;
}

function exactObject(value, allowedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new RangeError(`${label} contains unsupported property: ${key}`);
  }
}

function requiredOwn(value, keys, label) {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${label}.${key} is required`);
  }
}
