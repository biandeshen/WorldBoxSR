const FORMS = ['Realm', 'March', 'League', 'Dominion', 'Compact', 'Reach'];
const BANNERS = ['plain', 'stripe', 'split', 'cross', 'chevron'];
const COLOR_COUNT = 8;

export function createPolity(world, { capitalSettlementId }) {
  if (!Number.isInteger(capitalSettlementId) || capitalSettlementId < 1) {
    throw new RangeError('capitalSettlementId must be a positive integer');
  }
  const capital = world.settlements.find((settlement) => settlement.id === capitalSettlementId);
  if (!capital || !capital.active) throw new Error(`active capital settlement not found: ${capitalSettlementId}`);
  if (capital.polityId !== null && capital.polityId !== undefined) {
    throw new Error(`settlement ${capital.id} already belongs to polity ${capital.polityId}`);
  }

  const id = world.nextPolityId++;
  const identity = polityIdentity(world.seed, id, capital.name);
  const polity = {
    id,
    kind: 'polity',
    name: identity.name,
    capitalSettlementId: capital.id,
    settlementIds: [capital.id],
    foundedDay: world.day,
    active: true,
    dissolvedDay: null,
    colorIndex: identity.colorIndex,
    bannerStyle: identity.bannerStyle,
    rulerId: null,
    rulerSinceDay: null,
    rulerSequence: 0,
    lastRulerId: null
  };
  capital.polityId = id;
  world.polities.push(polity);
  return polity;
}

export function polityIdentity(seed, id, capitalName) {
  if (!Number.isInteger(id) || id < 1) throw new RangeError('polity id must be a positive integer');
  const baseName = String(capitalName || `Polity ${id}`);
  const h = hashIdentity(seed, id, baseName);
  return {
    name: `${baseName} ${FORMS[h % FORMS.length]}`,
    colorIndex: (h >>> 8) % COLOR_COUNT,
    bannerStyle: BANNERS[(h >>> 16) % BANNERS.length]
  };
}

function hashIdentity(seed, id, text) {
  let h = (Number(seed) >>> 0) ^ Math.imul(id, 0x9e3779b1);
  for (let index = 0; index < text.length; index += 1) {
    h ^= text.charCodeAt(index);
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
}
