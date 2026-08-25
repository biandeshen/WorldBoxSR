import { entityRef, pushEvent } from './events.js';

/**
 * Apply authoritative creature death bookkeeping without removing the creature
 * from world.creatures. Callers own collection cleanup so regular systems and
 * synchronous god commands can preserve their existing timing semantics.
 */
export function killCreature(world, creature, { cause, causes } = {}) {
  if (!creature || creature.kind !== 'creature') throw new TypeError('creature is required');
  if (typeof cause !== 'string' || cause.length === 0) throw new TypeError('death cause is required');
  if (!creature.alive) return null;

  creature.alive = false;
  creature.causeOfDeath = cause;
  world.counters.creatureDeaths += 1;

  return pushEvent(world, {
    type: 'creature.died',
    subject: entityRef('creature', creature.id),
    ...(causes?.length ? { causes } : {}),
    creatureId: creature.id,
    species: creature.species,
    cause,
    ageDays: creature.ageDays
  });
}
