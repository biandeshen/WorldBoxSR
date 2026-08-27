import { applyCommand } from '../../engine/core/commands.js';
import { summarizeWorld } from '../../engine/core/metrics.js';
import { createWorld, tickWorld } from '../../engine/core/world.js';
import {
  initializeValidatedNaturalGrazers,
  NATURAL_GRAZER_CONFIG
} from '../../engine/world/natural_fauna.js';
import { acceptedGodAction } from './god_action_outcome.js';
import { projectRecentBattleTraces } from './battle_trace_profile.js';

export const SHOWCASE = Object.freeze({ width: 24, height: 24, population: 30, warmupYears: 40, warmupChunkYears: 2, defaultSeed: 45, grazerCount: 8 });
export const SHOWCASE_PRESETS = Object.freeze([
  Object.freeze({ id: 'sandbox', label: 'Sandbox' }),
  Object.freeze({ id: 'living_ecology', label: 'Living Ecology' })
]);
export const DEFAULT_SHOWCASE_PRESET = 'sandbox';

const showcasePresetByWorld = new WeakMap();

export function normalizeSeed(seedToken) {
  const value = String(seedToken ?? '').trim() || String(SHOWCASE.defaultSeed);
  return /^[-+]?\d+$/.test(value) ? Number(value) : value;
}

export function normalizeShowcasePreset(presetToken = DEFAULT_SHOWCASE_PRESET) {
  const value = String(presetToken ?? '').trim() || DEFAULT_SHOWCASE_PRESET;
  if (!SHOWCASE_PRESETS.some((preset) => preset.id === value)) throw new RangeError(`unsupported showcase preset: ${value}`);
  return value;
}

export function selectedShowcasePreset() {
  const value = globalThis.document?.querySelector?.('#world-preset')?.value;
  return normalizeShowcasePreset(value || DEFAULT_SHOWCASE_PRESET);
}

export function showcasePresetLabel(presetToken) {
  const preset = normalizeShowcasePreset(presetToken);
  return SHOWCASE_PRESETS.find((candidate) => candidate.id === preset)?.label ?? preset;
}

export function createShowcaseWorld(seedToken = SHOWCASE.defaultSeed, presetToken = selectedShowcasePreset()) {
  const preset = normalizeShowcasePreset(presetToken);
  const world = createWorld({
    seed: normalizeSeed(seedToken),
    width: SHOWCASE.width,
    height: SHOWCASE.height,
    population: SHOWCASE.population,
    config: preset === 'living_ecology' ? NATURAL_GRAZER_CONFIG : {}
  });
  if (preset === 'living_ecology') initializeValidatedNaturalGrazers(world);
  showcasePresetByWorld.set(world, preset);
  return world;
}

export function showcasePresetForWorld(world) {
  return showcasePresetByWorld.get(world) ?? DEFAULT_SHOWCASE_PRESET;
}

export async function evolveShowcaseWorld(world, options = {}) {
  const {
    years = SHOWCASE.warmupYears,
    chunkYears = SHOWCASE.warmupChunkYears,
    onProgress = null,
    preset = showcasePresetForWorld(world)
  } = options;
  const presetId = normalizeShowcasePreset(preset);
  if (!Number.isFinite(years) || years < 0) throw new RangeError('showcase years must be non-negative');
  if (!Number.isFinite(chunkYears) || chunkYears <= 0) throw new RangeError('showcase chunkYears must be positive');
  const targetDays = Math.round(years * world.config.daysPerYear);
  const chunkDays = Math.max(1, Math.round(chunkYears * world.config.daysPerYear));
  while (world.day < targetDays) {
    const remaining = targetDays - world.day;
    tickWorld(world, Math.min(chunkDays, remaining));
    onProgress?.({ day: world.day, year: world.day / world.config.daysPerYear, targetYear: years });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (presetId === 'sandbox') seedShowcaseGrazers(world);
  return world;
}

export function seedShowcaseGrazers(world) {
  if (world.creatures.some((creature) => creature.alive && creature.species === 'grazer')) return;
  const candidates = world.tiles.filter((tile) => tile.passable).sort((a, b) => (b.vegetation - a.vegetation) || (b.moisture - a.moisture) || (a.y - b.y) || (a.x - b.x)).slice(0, Math.max(1, SHOWCASE.grazerCount));
  for (let index = 0; index < SHOWCASE.grazerCount; index += 1) {
    const tile = candidates[index % candidates.length];
    applyCommand(world, { type: 'spawn_creature', species: 'grazer', x: tile.x, y: tile.y, count: 1 });
  }
}

export function advanceWorld(world, days) { tickWorld(world, days); }

export function applyGodTool(world, tool, x, y, count = 1) {
  if (tool === 'meteor') return acceptedGodAction('meteor', applyCommand(world, { type: 'meteor', x, y }));
  if (tool === 'rain') return acceptedGodAction('rain', applyCommand(world, { type: 'rain', x, y }));
  if (tool === 'erase') { applyCommand(world, { type: 'erase', x, y }); return acceptedGodAction('erase'); }
  if (tool === 'lightning') { applyCommand(world, { type: 'lightning', x, y }); return acceptedGodAction('lightning'); }
  if (tool === 'spawn_grazer') { applyCommand(world, { type: 'spawn_creature', species: 'grazer', x, y, count }); return acceptedGodAction('spawn_grazer'); }
  if (tool === 'spawn_wolf') { applyCommand(world, { type: 'spawn_creature', species: 'wolf', x, y, count }); return acceptedGodAction('spawn_wolf'); }
  applyCommand(world, { type: 'spawn_human', x, y, count });
  return acceptedGodAction('spawn_human');
}

export function worldView(world) {
  const settlementById = new Map(world.settlements.map((settlement) => [settlement.id, settlement]));
  const polityById = new Map(world.polities.map((polity) => [polity.id, polity]));
  const relations = (world.relations ?? []).filter((relation) => relation.active).map((relation) => ({ ...relation }));
  const activeWarbands = (world.warbands ?? []).filter((warband) => warband.active).sort((a, b) => a.id - b.id);
  const recentBattles = projectRecentBattleTraces(world.history, world.day, world.config.daysPerYear);
  const creatures = world.creatures
    .filter((creature) => creature.alive)
    .sort((a, b) => a.id - b.id)
    .map((creature) => ({
      id: creature.id,
      species: creature.species,
      x: creature.x,
      y: creature.y,
      ageDays: creature.ageDays,
      hunger: creature.hunger,
      health: creature.health
    }));
  const warbands = activeWarbands.map((warband) => {
    const polity = polityById.get(warband.polityId);
    const opponent = polityById.get(warband.opponentPolityId);
    const origin = settlementById.get(warband.originSettlementId);
    const target = settlementById.get(warband.targetSettlementId);
    const opposingBand = activeWarbands.find((candidate) => candidate.relationKey === warband.relationKey
      && candidate.warStartedDay === warband.warStartedDay
      && candidate.polityId === warband.opponentPolityId);
    const engaged = Boolean(opposingBand && manhattan(warband.x, warband.y, opposingBand.x, opposingBand.y) <= 1);
    const atOrigin = Boolean(origin && warband.x === origin.x && warband.y === origin.y);
    return {
      id: warband.id,
      x: warband.x,
      y: warband.y,
      strength: warband.strength,
      initialStrength: warband.initialStrength,
      sourceAdultPopulation: warband.sourceAdultPopulation,
      polityId: warband.polityId,
      polityName: polity?.name ?? `Polity #${warband.polityId}`,
      polityColorIndex: polity?.colorIndex ?? 0,
      opponentPolityId: warband.opponentPolityId,
      opponentPolityName: opponent?.name ?? `Polity #${warband.opponentPolityId}`,
      relationKey: warband.relationKey,
      warStartedDay: warband.warStartedDay,
      originSettlementId: warband.originSettlementId,
      originSettlementName: origin?.name ?? null,
      targetSettlementId: warband.targetSettlementId,
      targetSettlementName: target?.name ?? null,
      formedDay: warband.formedDay,
      lastMovedDay: warband.lastMovedDay,
      lastEngagedDay: warband.lastEngagedDay,
      engagements: warband.engagements,
      engaged,
      movementState: engaged ? 'engaged' : (atOrigin && warband.engagements === 0 ? 'mobilized' : 'marching')
    };
  });
  return {
    width: world.width,
    height: world.height,
    day: world.day,
    waterLevel: world.config.waterLevel,
    daysPerYear: world.config.daysPerYear,
    tiles: world.tiles.map((tile) => ({ x: tile.x, y: tile.y, biome: tile.biome, passable: tile.passable, elevation: tile.elevation, moisture: tile.moisture, fertility: tile.fertility, ownerSettlementId: tile.ownerSettlementId ?? null, foodRatio: tile.foodCapacity ? tile.food / tile.foodCapacity : 0, vegetationRatio: tile.vegetationCapacity ? tile.vegetation / tile.vegetationCapacity : 0 })),
    humans: world.entities.filter((entity) => entity.kind === 'human').map((human) => {
      const settlement = Number.isInteger(human.settlementId) ? settlementById.get(human.settlementId) : null;
      const polity = Number.isInteger(settlement?.polityId) ? polityById.get(settlement.polityId) : null;
      return {
        id: human.id, x: human.x, y: human.y, sex: human.sex, ageDays: human.ageDays, hunger: human.hunger, health: human.health,
        settlementId: human.settlementId,
        polityId: polity?.id ?? null,
        polityName: polity?.name ?? null,
        polityColorIndex: polity?.colorIndex ?? null,
        isRuler: polity?.rulerId === human.id
      };
    }),
    creatures,
    // Temporary compatibility projection for legacy renderer/tests. Phaser and
    // selection paths use `creatures`; remove this only when legacy no longer
    // requires the historic grazer-only surface.
    grazers: creatures.filter((creature) => creature.species === 'grazer'),
    settlements: world.settlements.map((settlement) => {
      const polity = Number.isInteger(settlement.polityId) ? polityById.get(settlement.polityId) : null;
      const previousPolity = Number.isInteger(settlement.previousPolityId) ? polityById.get(settlement.previousPolityId) : null;
      const rebelFromPolity = Number.isInteger(settlement.lastRebelledFromPolityId) ? polityById.get(settlement.lastRebelledFromPolityId) : null;
      const relation = polity ? relevantRelation(relations, polity.id) : null;
      const counterpartId = relation ? (relation.polityAId === polity.id ? relation.polityBId : relation.polityAId) : null;
      const counterpart = Number.isInteger(counterpartId) ? polityById.get(counterpartId) : null;
      return {
        id: settlement.id, name: settlement.name, x: settlement.x, y: settlement.y, active: settlement.active, population: settlement.population, foundedDay: settlement.foundedDay,
        abandonedDay: Number.isInteger(settlement.abandonedDay) ? settlement.abandonedDay : null,
        polityId: polity?.id ?? null, polityName: polity?.name ?? null, polityColorIndex: polity?.colorIndex ?? null, polityBannerStyle: polity?.bannerStyle ?? null,
        rulerId: polity?.rulerId ?? null, isCapital: polity?.capitalSettlementId === settlement.id,
        relationStance: relation?.stance ?? null, relationScore: relation?.score ?? null, relationCounterpartId: counterpartId, relationCounterpartName: counterpart?.name ?? null,
        atWar: relation?.atWar ?? false,
        conquestCount: settlement.conquestCount ?? 0,
        previousPolityId: Number.isInteger(settlement.previousPolityId) ? settlement.previousPolityId : null,
        previousPolityName: previousPolity?.name ?? null,
        previousPolityColorIndex: previousPolity?.colorIndex ?? null,
        lastConqueredDay: Number.isInteger(settlement.lastConqueredDay) ? settlement.lastConqueredDay : null,
        lastConqueredByPolityId: Number.isInteger(settlement.lastConqueredByPolityId) ? settlement.lastConqueredByPolityId : null,
        occupationStartedDay: Number.isInteger(settlement.occupationStartedDay) ? settlement.occupationStartedDay : null,
        rebellionEligibleDay: Number.isInteger(settlement.rebellionEligibleDay) ? settlement.rebellionEligibleDay : null,
        rebellionCount: settlement.rebellionCount ?? 0,
        lastRebelledDay: Number.isInteger(settlement.lastRebelledDay) ? settlement.lastRebelledDay : null,
        lastRebelledFromPolityId: Number.isInteger(settlement.lastRebelledFromPolityId) ? settlement.lastRebelledFromPolityId : null,
        lastRebelledFromPolityName: rebelFromPolity?.name ?? null,
        lastRebelledFromPolityColorIndex: rebelFromPolity?.colorIndex ?? null
      };
    }),
    polities: world.polities.map((polity) => ({ id: polity.id, name: polity.name, capitalSettlementId: polity.capitalSettlementId, settlementIds: [...polity.settlementIds], foundedDay: polity.foundedDay, active: polity.active, dissolvedDay: polity.dissolvedDay, colorIndex: polity.colorIndex, bannerStyle: polity.bannerStyle, rulerId: polity.rulerId ?? null, rulerSinceDay: polity.rulerSinceDay ?? null, rulerSequence: polity.rulerSequence ?? 0 })),
    relations,
    warbands,
    recentBattles
  };
}

export function worldSummary(world) { return summarizeWorld(world); }

export function selectionAt(world, x, y) {
  const warband = (world.warbands ?? []).filter((candidate) => candidate.active && candidate.x === x && candidate.y === y).sort((a, b) => a.id - b.id)[0];
  if (warband) return { kind: 'warband', value: warband };
  const human = world.entities.filter((entity) => entity.kind === 'human' && entity.x === x && entity.y === y).sort((a, b) => a.id - b.id)[0];
  if (human) return { kind: 'human', value: human };
  const creature = world.creatures.filter((candidate) => candidate.alive && candidate.x === x && candidate.y === y).sort((a, b) => a.id - b.id)[0];
  if (creature) return { kind: 'creature', value: creature };
  const settlement = world.settlements.filter((candidate) => candidate.x === x && candidate.y === y).sort((a, b) => a.id - b.id)[0];
  if (settlement) return { kind: 'settlement', value: settlement };
  const tile = world.tiles.find((candidate) => candidate.x === x && candidate.y === y);
  return tile ? { kind: 'tile', value: tile } : null;
}

function relevantRelation(relations, polityId) {
  return relations
    .filter((relation) => relation.polityAId === polityId || relation.polityBId === polityId)
    .sort((a, b) => Number(b.atWar) - Number(a.atWar) || a.score - b.score || a.key.localeCompare(b.key))[0] ?? null;
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
