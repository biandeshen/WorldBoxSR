const SETTLEMENT_TYPES = new Set(['settlement.founded', 'settlement.abandoned']);
const POLITY_TYPES = new Set(['polity.founded', 'polity.dissolved']);
const RULER_TYPES = new Set(['polity.ruler_appointed', 'polity.ruler_succeeded', 'polity.ruler_vacant']);

export function projectHistoryPulse(events, { daysPerYear = 360 } = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  if (!Number.isFinite(daysPerYear) || daysPerYear <= 0) throw new RangeError('daysPerYear must be positive');
  const predations = []; const rulers = []; const political = []; const settlements = []; const births = []; const deaths = [];
  for (const event of events) {
    if (!event || typeof event.type !== 'string') continue;
    if (event.type === 'creature.predated') predations.push(projectPredationEvent(event, daysPerYear));
    else if (RULER_TYPES.has(event.type)) rulers.push(projectRulerEvent(event, daysPerYear));
    else if (POLITY_TYPES.has(event.type)) political.push(projectPolityEvent(event, daysPerYear));
    else if (SETTLEMENT_TYPES.has(event.type)) settlements.push(projectSettlementEvent(event, daysPerYear));
    else if (event.type === 'human.born') births.push(event);
    else if (event.type === 'human.died') deaths.push(event);
  }
  const summaries = [];
  if (births.length > 0) summaries.push(projectBirthSummary(births, daysPerYear));
  if (deaths.length > 0) summaries.push(projectDeathSummary(deaths, daysPerYear));
  return [...predations, ...rulers, ...political, ...settlements, ...summaries].filter(Boolean).sort((a, b) => b.priority - a.priority || a.eventId - b.eventId);
}

export function historyCursor(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;
  let max = 0; for (const event of history) if (Number.isInteger(event?.id) && event.id > max) max = event.id; return max;
}

function projectPredationEvent(event, daysPerYear) {
  return {
    kind: event.type,
    eventId: event.id ?? 0,
    priority: 6,
    tone: 'loss',
    icon: '🐺',
    title: `Wolf #${event.predatorCreatureId ?? '?'} hunted Grazer #${event.preyCreatureId ?? '?'}`,
    detail: `tile ${coordinate(event.x)},${coordinate(event.y)} · Year ${eventYear(event, daysPerYear)}`
  };
}

function projectRulerEvent(event, daysPerYear) {
  const name = String(event.name || `Polity #${event.polityId ?? '?'}`);
  if (event.type === 'polity.ruler_vacant') return { kind: event.type, eventId: event.id ?? 0, priority: 5, tone: 'loss', icon: '♔', title: `${name} has no ruler`, detail: `${readableReason(event.reason)} · Year ${eventYear(event, daysPerYear)}` };
  const succeeded = event.type === 'polity.ruler_succeeded';
  return { kind: event.type, eventId: event.id ?? 0, priority: 5, tone: 'growth', icon: '♛', title: `Human #${event.rulerId ?? '?'} ${succeeded ? 'succeeded in' : 'became ruler of'} ${name}`, detail: `${succeeded ? readableReason(event.reason) : 'first ruler'} · Year ${eventYear(event, daysPerYear)}` };
}

function projectPolityEvent(event, daysPerYear) { const founded = event.type === 'polity.founded'; const name = String(event.name || `Polity #${event.polityId ?? '?'}`); return { kind: event.type, eventId: event.id ?? 0, priority: 4, tone: founded ? 'growth' : 'loss', icon: founded ? '♛' : '♜', title: founded ? `${name} rose as a power` : `${name} dissolved`, detail: `Year ${eventYear(event, daysPerYear)}` }; }
function projectSettlementEvent(event, daysPerYear) { const founded = event.type === 'settlement.founded'; const name = String(event.name || `Settlement #${event.settlementId ?? '?'}`); return { kind: event.type, eventId: event.id ?? 0, priority: 3, tone: founded ? 'growth' : 'loss', icon: founded ? '⌂' : '◇', title: founded ? `${name} was founded` : `${name} was abandoned`, detail: `Year ${eventYear(event, daysPerYear)}` }; }
function projectBirthSummary(events, daysPerYear) { const latest = latestEvent(events); return { kind: 'human.births', eventId: latest.id ?? 0, priority: 1, tone: 'life', icon: '✦', title: events.length === 1 ? 'A child was born' : `${events.length} births`, detail: `Year ${eventYear(latest, daysPerYear)}` }; }
function projectDeathSummary(events, daysPerYear) { const latest = latestEvent(events); const causes = new Map(); for (const event of events) { const cause = readableCause(event.cause); causes.set(cause, (causes.get(cause) || 0) + 1); } const causeText = [...causes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([cause, count]) => `${cause}${count > 1 ? ` ×${count}` : ''}`).join(' · '); return { kind: 'human.deaths', eventId: latest.id ?? 0, priority: 2, tone: 'loss', icon: '†', title: events.length === 1 ? 'A life ended' : `${events.length} deaths`, detail: `${causeText || 'unknown cause'} · Year ${eventYear(latest, daysPerYear)}` }; }
function latestEvent(events) { return events.reduce((latest, event) => !latest || (event.id ?? 0) >= (latest.id ?? 0) ? event : latest, null); }
function eventYear(event, daysPerYear) { return ((Number.isFinite(event?.day) ? event.day : 0) / daysPerYear).toFixed(1); }
function readableReason(value) { const reason = String(value || 'succession').replaceAll('_', ' '); if (reason === 'death') return 'after ruler death'; if (reason === 'no longer member') return 'after political departure'; if (reason === 'vacancy filled') return 'vacancy filled'; return reason; }
function readableCause(value) { const cause = String(value || 'unknown').replaceAll('_', ' '); if (cause === 'old age') return 'old age'; if (cause === 'starvation') return 'starvation'; if (cause === 'lightning') return 'lightning'; if (cause === 'erased') return 'divine erasure'; return cause; }
function coordinate(value) { return Number.isInteger(value) ? value : '?'; }
