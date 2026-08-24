import { createPolity } from '../model/polity.js';
import { entityRef, pushEvent } from '../model/events.js';

export function updatePolities(world) {
  const polityById = new Map(world.polities.map((polity) => [polity.id, polity]));
  const activeSettlements = world.settlements
    .filter((settlement) => settlement.active)
    .sort((a, b) => a.id - b.id);

  for (const settlement of activeSettlements) {
    const linked = Number.isInteger(settlement.polityId) ? polityById.get(settlement.polityId) : null;
    if (linked?.active) {
      if (!linked.settlementIds.includes(settlement.id)) {
        linked.settlementIds.push(settlement.id);
        linked.settlementIds.sort((a, b) => a - b);
      }
      continue;
    }

    settlement.polityId = null;
    const polity = createPolity(world, { capitalSettlementId: settlement.id });
    polityById.set(polity.id, polity);
    pushEvent(world, {
      type: 'polity.founded',
      subject: entityRef('polity', polity.id),
      causes: [entityRef('settlement', settlement.id)],
      polityId: polity.id,
      name: polity.name,
      capitalSettlementId: settlement.id,
      colorIndex: polity.colorIndex,
      bannerStyle: polity.bannerStyle
    });
  }

  for (const polity of world.polities) {
    const members = world.settlements
      .filter((settlement) => settlement.polityId === polity.id)
      .sort((a, b) => a.id - b.id);
    polity.settlementIds = members.map((settlement) => settlement.id);
    const livingMembers = members.filter((settlement) => settlement.active);

    if (polity.active && livingMembers.length === 0) {
      polity.active = false;
      polity.dissolvedDay = world.day;
      pushEvent(world, {
        type: 'polity.dissolved',
        subject: entityRef('polity', polity.id),
        polityId: polity.id,
        name: polity.name
      });
      continue;
    }

    if (polity.active && livingMembers.length > 0) {
      const capital = livingMembers.find((settlement) => settlement.id === polity.capitalSettlementId);
      if (!capital) polity.capitalSettlementId = livingMembers[0].id;
    }
  }

  return world;
}
