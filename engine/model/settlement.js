const PREFIXES = ['Alder', 'Ash', 'Briar', 'Cedar', 'Dawn', 'Elder', 'Fern', 'Glen', 'Hearth', 'Iron', 'Juniper', 'Kestrel', 'Linden', 'Moss', 'North', 'Oak', 'Pine', 'Raven', 'Stone', 'Willow'];
const SUFFIXES = ['brook', 'cross', 'dale', 'field', 'ford', 'gate', 'haven', 'hold', 'mere', 'rest', 'ridge', 'stead', 'vale', 'watch', 'wick', 'wood'];

export function createSettlement(world, { x, y }) {
  const id = world.nextSettlementId++;
  const settlement = {
    id,
    kind: 'settlement',
    name: settlementName(world.seed, id, x, y),
    x,
    y,
    foundedDay: world.day,
    active: true,
    emptyDays: 0,
    abandonedDay: null,
    population: 0,
    memberIds: [],
    polityId: null,
    conquestCount: 0,
    previousPolityId: null,
    lastConqueredDay: null,
    lastConqueredByPolityId: null,
    lastConqueringWarbandId: null,
    occupationStartedDay: null,
    rebellionEligibleDay: null,
    rebellionCount: 0,
    lastRebelledDay: null,
    lastRebelledFromPolityId: null
  };
  world.settlements.push(settlement);
  return settlement;
}

export function settlementName(seed, id, x, y) {
  const a = hash(seed ^ Math.imul(id, 0x9e3779b1), x, y);
  const b = hash(seed ^ 0x85ebca6b, y, x + id);
  return `${PREFIXES[a % PREFIXES.length]}${SUFFIXES[b % SUFFIXES.length]}`;
}

function hash(seed, x, y) {
  let h = seed >>> 0;
  h ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h ^= Math.imul(y + 0x165667b1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
