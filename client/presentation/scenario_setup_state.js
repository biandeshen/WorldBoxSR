import {
  normalizeScenarioRecipe,
  SCENARIO_RECIPE_KIND,
  SCENARIO_RECIPE_MAX_ACTIONS,
  SCENARIO_RECIPE_VERSION
} from './scenario_recipe.js';

export const DEFAULT_SCENARIO_NAME = 'Untitled scenario';
export const SCENARIO_SETUP_PLACEMENTS = Object.freeze([
  Object.freeze({ id: 'human', label: 'Human', icon: '✦' }),
  Object.freeze({ id: 'grazer', label: 'Grazer', icon: '🐾' }),
  Object.freeze({ id: 'wolf', label: 'Wolf', icon: '🐺' })
]);

export function createScenarioSetupDraft({ seed, preset, name = DEFAULT_SCENARIO_NAME }) {
  return normalizeScenarioRecipe({
    kind: SCENARIO_RECIPE_KIND,
    version: SCENARIO_RECIPE_VERSION,
    name,
    base: { seed, preset },
    setup: []
  });
}

export function scenarioSetupAction(placementId, x, y, count = 1) {
  if (placementId === 'human') return { type: 'spawn_human', x, y, count };
  if (placementId === 'grazer' || placementId === 'wolf') {
    return { type: 'spawn_creature', species: placementId, x, y, count };
  }
  throw new RangeError(`unsupported Scenario Setup placement: ${String(placementId)}`);
}

export function appendScenarioSetupAction(recipeInput, action) {
  const recipe = normalizeScenarioRecipe(recipeInput);
  if (recipe.setup.length >= SCENARIO_RECIPE_MAX_ACTIONS) {
    throw new RangeError(`scenario setup already contains ${SCENARIO_RECIPE_MAX_ACTIONS} actions`);
  }
  return normalizeScenarioRecipe({
    ...recipe,
    setup: [...recipe.setup, action]
  });
}

export function renameScenarioSetup(recipeInput, name) {
  const recipe = normalizeScenarioRecipe(recipeInput);
  return normalizeScenarioRecipe({ ...recipe, name });
}

export function clearScenarioSetup(recipeInput) {
  const recipe = normalizeScenarioRecipe(recipeInput);
  return normalizeScenarioRecipe({ ...recipe, setup: [] });
}

export function forkScenarioSetup(recipeInput) {
  return normalizeScenarioRecipe(recipeInput);
}

export function freezeScenarioSetup(recipeInput) {
  return deepFreeze(normalizeScenarioRecipe(recipeInput));
}

export function scenarioSetupRecentActions(recipeInput, limit = 6) {
  const recipe = normalizeScenarioRecipe(recipeInput);
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError('scenario setup summary limit must be a non-negative integer');
  if (limit === 0) return [];
  return recipe.setup.slice(-limit).map((action, offset) => ({
    index: recipe.setup.length - Math.min(limit, recipe.setup.length) + offset + 1,
    label: setupActionLabel(action)
  }));
}

export function scenarioSetupActionCountLabel(recipeInput) {
  const recipe = normalizeScenarioRecipe(recipeInput);
  return `${recipe.setup.length}/${SCENARIO_RECIPE_MAX_ACTIONS} actions`;
}

export function setupActionLabel(action) {
  if (action.type === 'spawn_human') return `Human ×${action.count} @ ${action.x},${action.y}`;
  if (action.type === 'spawn_creature' && action.species === 'grazer') return `Grazer ×${action.count} @ ${action.x},${action.y}`;
  if (action.type === 'spawn_creature' && action.species === 'wolf') return `Wolf ×${action.count} @ ${action.x},${action.y}`;
  throw new RangeError(`unsupported Scenario Setup action: ${String(action?.type)}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
