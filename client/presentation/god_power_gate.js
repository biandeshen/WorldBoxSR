import { applyCommand, impactTiles, METEOR_RADIUS, RAIN_RADIUS } from '../../engine/core/commands.js';
import { createWorld } from '../../engine/core/world.js';
import { createGrazer } from '../../engine/model/grazer.js';
import { createHuman } from '../../engine/model/human.js';

export const CANONICAL_GOD_POWER = Object.freeze({
  seed: 9401,
  width: 9,
  height: 9,
  center: Object.freeze({ x: 4, y: 4 })
});

export function createCanonicalGodPowerWorld(seed = CANONICAL_GOD_POWER.seed) {
  const world = createWorld({
    seed,
    width: CANONICAL_GOD_POWER.width,
    height: CANONICAL_GOD_POWER.height,
    population: 0,
    config: { waterLevel: -1 }
  });

  createHuman(world, { x: 4, y: 4, ageYears: 30, sex: 'F', lineageId: null, settlementId: null });
  createHuman(world, { x: 6, y: 6, ageYears: 31, sex: 'M', lineageId: null, settlementId: null });
  createHuman(world, { x: 8, y: 4, ageYears: 32, sex: 'F', lineageId: null, settlementId: null });
  createGrazer(world, { x: 2, y: 2 });
  createGrazer(world, { x: 5, y: 4 });
  createGrazer(world, { x: 0, y: 4 });
  return world;
}

export function executeCanonicalGodPowerSequence(world, center = CANONICAL_GOD_POWER.center) {
  const footprint = impactTiles(world, center.x, center.y, METEOR_RADIUS);
  const passable = footprint.filter((tile) => tile.passable);
  const before = capture(world, passable);
  const rngBefore = world.rng.snapshot();
  const meteor = applyCommand(world, { type: 'meteor', x: center.x, y: center.y });
  const afterMeteor = capture(world, passable);
  const rain = applyCommand(world, { type: 'rain', x: center.x, y: center.y });
  const afterRain = capture(world, passable);
  const rngAfter = world.rng.snapshot();

  return {
    center: { ...center },
    radius: METEOR_RADIUS,
    before,
    afterMeteor,
    afterRain,
    meteor,
    rain,
    rngBefore,
    rngAfter
  };
}

export function evaluateGodPowerGate(world, evidence) {
  if (!world || !evidence) return { pass: false, reason: 'missing world/evidence' };
  const meteorEvent = world.history.find((event) => event.id === evidence.meteor.eventId && event.type === 'god.meteor');
  const rainEvent = world.history.find((event) => event.id === evidence.rain.eventId && event.type === 'god.rain');
  const lifeHit = evidence.meteor.humanIds.length + evidence.meteor.creatureIds.length;
  const radiusConsistent = evidence.radius === 2 && METEOR_RADIUS === RAIN_RADIUS;
  const meteorApplied = !evidence.meteor.noEffect
    && lifeHit >= 3
    && evidence.meteor.vegetationRemoved > 0
    && nearlyEqual(evidence.afterMeteor.vegetation, 0)
    && nearlyEqual(evidence.afterMeteor.food, evidence.before.food)
    && evidence.afterMeteor.life < evidence.before.life;
  const rainApplied = !evidence.rain.noEffect
    && evidence.rain.vegetationAdded > 0
    && evidence.rain.foodAdded > 0
    && nearlyEqual(evidence.afterRain.vegetation, evidence.afterRain.vegetationCapacity)
    && nearlyEqual(evidence.afterRain.food, evidence.afterRain.foodCapacity)
    && evidence.afterRain.life === evidence.afterMeteor.life;
  const authorityStable = nearlyEqual(evidence.before.vegetationCapacity, evidence.afterRain.vegetationCapacity)
    && nearlyEqual(evidence.before.foodCapacity, evidence.afterRain.foodCapacity)
    && evidence.before.terrainSignature === evidence.afterMeteor.terrainSignature
    && evidence.before.terrainSignature === evidence.afterRain.terrainSignature;
  const rngStable = JSON.stringify(evidence.rngBefore) === JSON.stringify(evidence.rngAfter);
  const historyOrdered = Boolean(meteorEvent && rainEvent && meteorEvent.id < rainEvent.id);

  return {
    pass: radiusConsistent && meteorApplied && rainApplied && authorityStable && rngStable && historyOrdered,
    radiusConsistent,
    meteorApplied,
    rainApplied,
    authorityStable,
    rngStable,
    historyOrdered,
    lifeHit,
    meteorEventId: meteorEvent?.id ?? null,
    rainEventId: rainEvent?.id ?? null,
    vegetationRemoved: evidence.meteor.vegetationRemoved,
    vegetationAdded: evidence.rain.vegetationAdded,
    foodAdded: evidence.rain.foodAdded
  };
}

function capture(world, footprint) {
  const keys = new Set(footprint.map((tile) => `${tile.x},${tile.y}`));
  const livingHumans = world.entities.filter((entity) => entity.kind === 'human' && entity.alive && keys.has(`${entity.x},${entity.y}`)).length;
  const livingCreatures = world.creatures.filter((creature) => creature.alive && keys.has(`${creature.x},${creature.y}`)).length;
  return {
    vegetation: footprint.reduce((sum, tile) => sum + tile.vegetation, 0),
    vegetationCapacity: footprint.reduce((sum, tile) => sum + tile.vegetationCapacity, 0),
    food: footprint.reduce((sum, tile) => sum + tile.food, 0),
    foodCapacity: footprint.reduce((sum, tile) => sum + tile.foodCapacity, 0),
    life: livingHumans + livingCreatures,
    terrainSignature: footprint.map((tile) => `${tile.x},${tile.y}:${tile.biome}:${tile.passable}:${tile.moisture}:${tile.fertility}`).join('|')
  };
}

function nearlyEqual(a, b, epsilon = 1e-9) {
  return Math.abs(a - b) <= epsilon;
}
