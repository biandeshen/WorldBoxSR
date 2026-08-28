import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotWorld, tickWorld, worldFromSnapshot } from '../engine/core/world.js';
import { createShowcaseWorld } from '../client/presentation/world_adapter.js';
import { wolfPredationEvidenceStartCandidates } from '../tools/wolf_predation_evidence_selection.js';

function y40World() {
  const world = createShowcaseWorld(45, 'living_ecology');
  const targetDay = 40 * world.config.daysPerYear;
  tickWorld(world, targetDay - world.day);
  return world;
}

test('incremental Wolf browser evidence selects a deterministic valid Y40 start without owning the canonical gate', () => {
  const world = y40World();
  const duplicate = worldFromSnapshot(snapshotWorld(world));
  const before = JSON.stringify(snapshotWorld(world));

  const first = wolfPredationEvidenceStartCandidates(world);
  const second = wolfPredationEvidenceStartCandidates(duplicate);

  assert.ok(first.length > 0, 'Y40 Living Ecology must retain at least one valid incremental Wolf evidence start');
  assert.deepEqual(first, second, 'same authoritative Y40 world must produce the same ordered evidence candidates');
  assert.equal(JSON.stringify(snapshotWorld(world)), before, 'evidence selection must not mutate world or RNG state');

  const chosen = first[0];
  const tile = world.tiles.find((candidate) => candidate.x === chosen.x && candidate.y === chosen.y);
  assert.equal(tile?.passable, true);
  assert.ok(chosen.nearestGrazerDistance >= 2);
  assert.ok(chosen.nearestGrazerDistance <= world.config.wolfPreySearchRadius);

  const occupied = [
    ...world.entities.filter((entity) => entity.kind === 'human' && entity.alive),
    ...world.creatures.filter((creature) => creature.alive),
    ...(world.warbands ?? []).filter((warband) => warband.active)
  ].some((entity) => entity.x === chosen.x && entity.y === chosen.y);
  assert.equal(occupied, false);

  const prey = world.creatures.find((creature) => creature.alive && creature.species === 'grazer' && creature.id === chosen.nearestGrazerId);
  assert.ok(prey);
  const startDistance = Math.max(Math.abs(chosen.x - prey.x), Math.abs(chosen.y - prey.y));
  const stepDistance = Math.max(
    Math.abs(chosen.firstCloserStep.x - prey.x),
    Math.abs(chosen.firstCloserStep.y - prey.y)
  );
  assert.equal(startDistance, chosen.nearestGrazerDistance);
  assert.ok(stepDistance < startDistance, 'selected start must admit a passable first step toward the chosen prey');

  const stepTile = world.tiles.find((candidate) => candidate.x === chosen.firstCloserStep.x && candidate.y === chosen.firstCloserStep.y);
  assert.equal(stepTile?.passable, true);
});

test('selector rejects a start when authoritative nearest prey is already range-1', () => {
  const world = {
    config: { wolfPreySearchRadius: 6 },
    tiles: [
      { x: 0, y: 0, passable: true },
      { x: 1, y: 0, passable: true },
      { x: 2, y: 0, passable: true },
      { x: 3, y: 0, passable: true }
    ],
    entities: [],
    warbands: [],
    creatures: [
      { id: 1, species: 'grazer', alive: true, x: 1, y: 0 },
      { id: 2, species: 'grazer', alive: true, x: 3, y: 0 }
    ]
  };

  const candidates = wolfPredationEvidenceStartCandidates(world);
  assert.equal(
    candidates.some((candidate) => candidate.x === 0 && candidate.y === 0),
    false,
    'tile 0,0 must not pretend Grazer #2 at distance 3 is the chosen prey while Grazer #1 is actually range-1'
  );
});
