const SETTLEMENT_TYPES = new Set(['settlement.founded', 'settlement.abandoned']);

export function projectHistoryPulse(events, { daysPerYear = 360 } = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  if (!Number.isFinite(daysPerYear) || daysPerYear <= 0) throw new RangeError('daysPerYear must be positive');

  const settlements = [];
  const births = [];
  const deaths = [];

  for (const event of events) {
    if (!event || typeof event.type !== 'string') continue;
    if (SETTLEMENT_TYPES.has(event.type)) settlements.push(projectSettlementEvent(event, daysPerYear));
    else if (event.type === 'human.born') births.push(event);
    else if (event.type === 'human.died') deaths.push(event);
  }

  const summaries = [];
  if (births.length > 0) summaries.push(projectBirthSummary(births, daysPerYear));
  if (deaths.length > 0) summaries.push(projectDeathSummary(deaths, daysPerYear));

  return [...settlements, ...summaries]
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority || a.eventId - b.eventId);
}

export function historyCursor(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;
  let max = 0;
  for (const event of history) {
    if (Number.isInteger(event?.id) && event.id > max) max = event.id;
  }
  return max;
}

function projectSettlementEvent(event, daysPerYear) {
  const founded = event.type === 'settlement.founded';
  const name = String(event.name || `Settlement #${event.settlementId ?? '?'}`);
  return {
    kind: event.type,
    eventId: Number.isInteger(event.id) ? event.id : 0,
    priority: 3,
    tone: founded ? 'growth' : 'loss',
    icon: founded ? '⌂' : '◇',
    title: founded ? `${name} was founded` : `${name} was abandoned`,
    detail: `Year ${eventYear(event, daysPerYear)}`
  };
}

function projectBirthSummary(events, daysPerYear) {
  const latest = latestEvent(events);
  return {
    kind: 'human.births',
    eventId: latest.id ?? 0,
    priority: 1,
    tone: 'life',
    icon: '✦',
    title: events.length === 1 ? 'A child was born' : `${events.length} births`,
    detail: `Year ${eventYear(latest, daysPerYear)}`
  };
}

function projectDeathSummary(events, daysPerYear) {
  const latest = latestEvent(events);
  const causes = new Map();
  for (const event of events) {
    const cause = readableCause(event.cause);
    causes.set(cause, (causes.get(cause) || 0) + 1);
  }
  const causeText = [...causes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([cause, count]) => `${cause}${count > 1 ? ` ×${count}` : ''}`)
    .join(' · ');

  return {
    kind: 'human.deaths',
    eventId: latest.id ?? 0,
    priority: 2,
    tone: 'loss',
    icon: '†',
    title: events.length === 1 ? 'A life ended' : `${events.length} deaths`,
    detail: `${causeText || 'unknown cause'} · Year ${eventYear(latest, daysPerYear)}`
  };
}

function latestEvent(events) {
  return events.reduce((latest, event) => {
    if (!latest) return event;
    const latestId = Number.isInteger(latest.id) ? latest.id : 0;
    const eventId = Number.isInteger(event.id) ? event.id : 0;
    return eventId >= latestId ? event : latest;
  }, null);
}

function eventYear(event, daysPerYear) {
  const day = Number.isFinite(event?.day) ? event.day : 0;
  return (day / daysPerYear).toFixed(1);
}

function readableCause(value) {
  const cause = String(value || 'unknown').replaceAll('_', ' ');
  if (cause === 'old age') return 'old age';
  if (cause === 'starvation') return 'starvation';
  if (cause === 'lightning') return 'lightning';
  if (cause === 'erased') return 'divine erasure';
  return cause;
}
