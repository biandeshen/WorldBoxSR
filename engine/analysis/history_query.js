const DEFAULT_LIMIT = 50;

/**
 * Pure query helpers over bounded authoritative `world.history`.
 *
 * These helpers never infer facts from current state. Entity/settlement filters
 * match only explicit references already recorded on the event envelope or
 * domain payload.
 */
export function queryHistory(world, {
  order = 'newest',
  offset = 0,
  limit = DEFAULT_LIMIT,
  predicate = null
} = {}) {
  validateHistoryWorld(world);
  validateOrder(order);
  nonNegativeInteger(offset, 'offset');
  positiveInteger(limit, 'limit');
  if (predicate !== null && typeof predicate !== 'function') {
    throw new TypeError('predicate must be a function or null');
  }

  const filtered = predicate === null
    ? world.history
    : world.history.filter(predicate);
  const ordered = order === 'oldest'
    ? filtered
    : [...filtered].reverse();
  return ordered.slice(offset, offset + limit);
}

export function findHistoryEvent(world, eventId) {
  validateHistoryWorld(world);
  positiveInteger(eventId, 'eventId');
  return world.history.find((event) => event.id === eventId) ?? null;
}

export function historyForSettlement(world, settlementId, options = {}) {
  positiveInteger(settlementId, 'settlementId');
  return queryHistory(world, {
    ...options,
    predicate: (event) => eventExplicitlyReferencesSettlement(event, settlementId)
  });
}

export function historyForHuman(world, humanId, options = {}) {
  positiveInteger(humanId, 'humanId');
  return queryHistory(world, {
    ...options,
    predicate: (event) => eventExplicitlyReferencesHuman(event, humanId)
  });
}

export function historyForCreature(world, creatureId, options = {}) {
  positiveInteger(creatureId, 'creatureId');
  return queryHistory(world, {
    ...options,
    predicate: (event) => eventExplicitlyReferencesCreature(event, creatureId)
  });
}

export function eventHasSubject(event, entityKind, id) {
  nonEmptyString(entityKind, 'entityKind');
  positiveInteger(id, 'entity id');
  return event?.subject?.kind === 'entity' &&
    event.subject.entityKind === entityKind &&
    event.subject.id === id;
}

export function eventExplicitlyReferencesSettlement(event, settlementId) {
  positiveInteger(settlementId, 'settlementId');
  return eventHasSubject(event, 'settlement', settlementId) ||
    event?.settlementId === settlementId ||
    explicitEntityCause(event, 'settlement', settlementId);
}

export function eventExplicitlyReferencesHuman(event, humanId) {
  positiveInteger(humanId, 'humanId');
  if (eventHasSubject(event, 'human', humanId)) return true;
  if (explicitEntityCause(event, 'human', humanId)) return true;
  if (event?.entityId === humanId) return true;
  if (Array.isArray(event?.entityIds) && event.entityIds.includes(humanId)) return true;
  if (event?.motherId === humanId || event?.fatherId === humanId) return true;
  return false;
}

export function eventExplicitlyReferencesCreature(event, creatureId) {
  positiveInteger(creatureId, 'creatureId');
  if (eventHasSubject(event, 'creature', creatureId)) return true;
  if (explicitEntityCause(event, 'creature', creatureId)) return true;
  if (event?.creatureId === creatureId) return true;
  if (Array.isArray(event?.creatureIds) && event.creatureIds.includes(creatureId)) return true;
  return false;
}

/**
 * Resolve one serialized subject/cause reference using only currently retained
 * authoritative data. Unresolved stable IDs are expected under bounded history.
 */
export function resolveHistoryReference(world, reference) {
  validateHistoryWorld(world);
  if (!reference || typeof reference !== 'object') {
    throw new TypeError('history reference must be an object');
  }

  switch (reference.kind) {
    case 'world':
      return { status: 'resolved', reference: { kind: 'world' }, value: world };
    case 'event': {
      positiveInteger(reference.id, 'event reference id');
      const event = findHistoryEvent(world, reference.id);
      return event
        ? { status: 'resolved', reference: { kind: 'event', id: reference.id }, value: event }
        : {
            status: 'unresolved',
            reference: { kind: 'event', id: reference.id },
            reason: 'event_not_retained'
          };
    }
    case 'entity': {
      nonEmptyString(reference.entityKind, 'reference.entityKind');
      positiveInteger(reference.id, 'entity reference id');
      const entity = findCurrentEntity(world, reference.entityKind, reference.id);
      return entity
        ? {
            status: 'resolved',
            reference: { kind: 'entity', entityKind: reference.entityKind, id: reference.id },
            value: entity
          }
        : {
            status: 'unresolved',
            reference: { kind: 'entity', entityKind: reference.entityKind, id: reference.id },
            reason: 'entity_not_currently_present'
          };
    }
    case 'command':
      positiveInteger(reference.id, 'command reference id');
      nonEmptyString(reference.commandType, 'reference.commandType');
      return {
        status: 'unresolved',
        reference: {
          kind: 'command',
          id: reference.id,
          commandType: reference.commandType
        },
        reason: 'command_log_not_retained'
      };
    default:
      throw new TypeError(`unsupported history reference kind: ${reference.kind}`);
  }
}

export function resolveEventReferences(world, event) {
  if (!event || typeof event !== 'object') throw new TypeError('event must be an object');
  return {
    subject: event.subject ? resolveHistoryReference(world, event.subject) : null,
    causes: Array.isArray(event.causes)
      ? event.causes.map((reference) => resolveHistoryReference(world, reference))
      : []
  };
}

function explicitEntityCause(event, entityKind, id) {
  return Array.isArray(event?.causes) && event.causes.some((cause) =>
    cause?.kind === 'entity' && cause.entityKind === entityKind && cause.id === id
  );
}

function findCurrentEntity(world, entityKind, id) {
  switch (entityKind) {
    case 'human':
      return world.entities?.find((entity) => entity.kind === 'human' && entity.id === id) ?? null;
    case 'creature':
      return world.creatures?.find((entity) => entity.kind === 'creature' && entity.id === id) ?? null;
    case 'settlement':
      return world.settlements?.find((entity) => entity.id === id) ?? null;
    case 'lineage':
      return world.lineages?.find((entity) => entity.id === id) ?? null;
    case 'parental_union':
      return world.unions?.find((entity) => entity.id === id) ?? null;
    default:
      return null;
  }
}

function validateHistoryWorld(world) {
  if (!world || !Array.isArray(world.history)) {
    throw new TypeError('world.history must be an array');
  }
}

function validateOrder(order) {
  if (order !== 'newest' && order !== 'oldest') {
    throw new RangeError('order must be newest or oldest');
  }
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
  return value;
}

function nonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return value;
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}
