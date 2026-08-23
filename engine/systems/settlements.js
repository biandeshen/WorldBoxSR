import { createSettlement } from '../model/settlement.js';
import { pushEvent } from '../model/events.js';
import { tileAt } from '../core/world.js';

export function updateSettlements(world) {
  const interval = world.config.settlementCheckIntervalDays;
  if (interval <= 0 || world.day === 0 || world.day % interval !== 0) return;

  const adultsPerTile = new Uint16Array(world.tiles.length);
  for (const human of world.entities) {
    if (human.kind !== 'human' || !human.alive) continue;
    if (human.ageDays / world.config.daysPerYear < world.config.adultAgeYears) continue;
    adultsPerTile[human.y * world.width + human.x] += 1;
  }

  const eligible = [];
  for (const tile of world.tiles) {
    if (!tile.passable || tooCloseToSettlement(world, tile.x, tile.y)) {
      tile.settlementCandidateDays = 0;
      continue;
    }
    const localAdults = countNearbyAdults(world, adultsPerTile, tile.x, tile.y);
    if (localAdults >= world.config.settlementMinAdults) {
      tile.settlementCandidateDays += interval;
      if (tile.settlementCandidateDays >= world.config.settlementFormationDays) {
        eligible.push({ tile, localAdults });
      }
    } else {
      tile.settlementCandidateDays = 0;
    }
  }

  eligible.sort((a, b) =>
    b.localAdults - a.localAdults ||
    b.tile.settlementCandidateDays - a.tile.settlementCandidateDays ||
    a.tile.y - b.tile.y ||
    a.tile.x - b.tile.x
  );

  for (const { tile } of eligible) {
    if (tooCloseToSettlement(world, tile.x, tile.y)) continue;
    const settlement = createSettlement(world, { x: tile.x, y: tile.y });
    tile.settlementCandidateDays = 0;
    pushEvent(world, {
      type: 'settlement.founded',
      settlementId: settlement.id,
      name: settlement.name,
      x: settlement.x,
      y: settlement.y
    });
  }

  updateSettlementMembership(world);
}

export function updateSettlementMembership(world) {
  for (const settlement of world.settlements) {
    settlement.population = 0;
    settlement.memberIds = [];
  }

  for (const human of world.entities) {
    if (human.kind !== 'human' || !human.alive) continue;
    const settlement = nearestSettlement(world, human.x, human.y);
    human.settlementId = settlement?.id ?? null;
    if (settlement) {
      settlement.population += 1;
      settlement.memberIds.push(human.id);
    }
  }
}

function nearestSettlement(world, x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const settlement of world.settlements) {
    const distance = Math.max(Math.abs(x - settlement.x), Math.abs(y - settlement.y));
    if (distance > world.config.settlementMembershipRadius) continue;
    if (distance < bestDistance || (distance === bestDistance && settlement.id < best.id)) {
      best = settlement;
      bestDistance = distance;
    }
  }
  return best;
}

function countNearbyAdults(world, adultsPerTile, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const tile = tileAt(world, nx, ny);
      if (!tile.passable) continue;
      count += adultsPerTile[ny * world.width + nx];
    }
  }
  return count;
}

function tooCloseToSettlement(world, x, y) {
  return world.settlements.some((settlement) =>
    Math.max(Math.abs(x - settlement.x), Math.abs(y - settlement.y)) < world.config.settlementMinSpacing
  );
}
