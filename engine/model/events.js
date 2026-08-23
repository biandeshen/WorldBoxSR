export function pushEvent(world, event) {
  if (!event || typeof event.type !== 'string' || event.type.length === 0) {
    throw new TypeError('event.type is required');
  }

  const { type, subject, causes, ...payload } = event;
  const eventId = world.nextEventId;
  const stored = {
    id: eventId,
    day: world.day,
    type,
    ...payload
  };

  if (subject !== undefined) stored.subject = normalizeSubject(subject);
  if (causes !== undefined && causes.length > 0) {
    stored.causes = causes.map((cause) => normalizeCause(eventId, cause));
  }

  world.nextEventId += 1;
  world.history.push(stored);
  const overflow = world.history.length - world.config.maxEventHistory;
  if (overflow > 0) world.history.splice(0, overflow);
  return stored;
}

export function worldSubject() {
  return { kind: 'world' };
}

export function entityRef(entityKind, id) {
  requireNonEmptyString(entityKind, 'entityKind');
  requirePositiveInteger(id, 'entity id');
  return { kind: 'entity', entityKind, id };
}

export function eventRef(id) {
  requirePositiveInteger(id, 'event id');
  return { kind: 'event', id };
}

export function commandRef(id, commandType) {
  requirePositiveInteger(id, 'command id');
  requireNonEmptyString(commandType, 'commandType');
  return { kind: 'command', id, commandType };
}

function normalizeSubject(subject) {
  if (!subject || typeof subject !== 'object') throw new TypeError('event subject must be an object reference');
  if (subject.kind === 'world') return { kind: 'world' };
  if (subject.kind === 'entity') return entityRef(subject.entityKind, subject.id);
  throw new TypeError(`unsupported event subject kind: ${subject.kind}`);
}

function normalizeCause(eventId, cause) {
  if (!cause || typeof cause !== 'object') throw new TypeError('event cause must be an object reference');
  switch (cause.kind) {
    case 'command':
      return commandRef(cause.id, cause.commandType);
    case 'entity':
      return entityRef(cause.entityKind, cause.id);
    case 'event': {
      const ref = eventRef(cause.id);
      if (ref.id >= eventId) throw new RangeError('event causes must reference a prior event');
      return ref;
    }
    default:
      throw new TypeError(`unsupported event cause kind: ${cause.kind}`);
  }
}

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
}

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
}
