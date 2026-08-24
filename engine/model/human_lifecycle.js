import { entityRef, pushEvent } from './events.js';
import { recordParentalUnionPartnerDeath } from './parental_union.js';

/**
 * Apply authoritative human death bookkeeping without removing the entity from
 * world.entities. Callers own collection cleanup so the regular human system
 * and synchronous god commands can preserve their existing timing semantics.
 */
export function killHuman(world, human, { cause, causes } = {}) {
  if (!human || human.kind !== 'human') throw new TypeError('human is required');
  if (typeof cause !== 'string' || cause.length === 0) throw new TypeError('death cause is required');
  if (!human.alive) return null;

  human.alive = false;
  human.causeOfDeath = cause;
  world.counters.deaths += 1;

  const event = pushEvent(world, {
    type: 'human.died',
    subject: entityRef('human', human.id),
    ...(causes?.length ? { causes } : {}),
    entityId: human.id,
    cause,
    ageYears: human.ageDays / world.config.daysPerYear
  });

  recordParentalUnionPartnerDeath(world, human.id);
  return event;
}
