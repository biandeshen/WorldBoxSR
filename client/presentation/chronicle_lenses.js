import {
  civilizationChronicle,
  chronicleEntryForEvent,
  isCivilizationStoryEvent
} from './civilization_story.js';

export const CHRONICLE_LENS_LIMIT = 7;

export const CHRONICLE_LENSES = Object.freeze([
  { id: 'highlights', label: 'Highlights', empty: 'No highlighted world stories yet.' },
  { id: 'recent', label: 'Recent', empty: 'No recent world stories retained.' },
  { id: 'conflict', label: 'Conflict', empty: 'No retained conflict stories.' },
  { id: 'rule', label: 'Rule', empty: 'No retained rule stories.' }
]);

const CONFLICT_TYPES = new Set([
  'polity.war_started',
  'polity.peace_made',
  'warband.mobilized',
  'warband.engaged',
  'warband.destroyed',
  'warband.disbanded',
  'settlement.conquered',
  'settlement.rebelled'
]);

const RULE_TYPES = new Set([
  'polity.founded',
  'polity.dissolved',
  'polity.ruler_appointed',
  'polity.ruler_succeeded',
  'polity.ruler_vacant'
]);

export function chronicleLensDefinition(lensId) {
  const lens = CHRONICLE_LENSES.find((candidate) => candidate.id === lensId);
  if (!lens) throw new RangeError(`unsupported Chronicle lens: ${lensId}`);
  return lens;
}

export function chronicleRowsForLens(world, lensId, { limit = CHRONICLE_LENS_LIMIT } = {}) {
  validateWorld(world);
  positiveInteger(limit, 'Chronicle lens limit');
  chronicleLensDefinition(lensId);

  if (lensId === 'highlights') return civilizationChronicle(world, { limit });

  const predicate = lensPredicate(lensId);
  const events = [];
  for (let index = world.history.length - 1; index >= 0 && events.length < limit; index -= 1) {
    const event = world.history[index];
    if (!isCivilizationStoryEvent(event) || !predicate(event)) continue;
    events.push(event);
  }
  return events.map((event) => chronicleEntryForEvent(world, event));
}

export function eventAllowedByChronicleLens(event, lensId) {
  chronicleLensDefinition(lensId);
  if (lensId === 'highlights') return isCivilizationStoryEvent(event);
  return isCivilizationStoryEvent(event) && lensPredicate(lensId)(event);
}

function lensPredicate(lensId) {
  if (lensId === 'recent') return () => true;
  if (lensId === 'conflict') return (event) => CONFLICT_TYPES.has(event.type);
  if (lensId === 'rule') return (event) => RULE_TYPES.has(event.type);
  throw new RangeError(`unsupported Chronicle lens: ${lensId}`);
}

function validateWorld(world) {
  if (!world || !Array.isArray(world.history)) throw new TypeError('world.history is required');
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}
