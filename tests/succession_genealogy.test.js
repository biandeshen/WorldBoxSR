import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorld, snapshotWorld } from '../engine/core/world.js';
import { createHuman } from '../engine/model/human.js';
import { addChildToParentalUnion, ensureParentalUnion } from '../engine/model/parental_union.js';
import {
  descendantDistance,
  descendantDistances,
  parentChildAdjacency,
  rankDescendantCandidates
} from '../engine/core/succession_genealogy.js';

function firstLand(world) {
  return world.tiles.find((tile) => tile.passable);
}

function addHuman(world, overrides = {}) {
  const tile = firstLand(world);
  return createHuman(world, {
    x: overrides.x ?? tile.x,
    y: overrides.y ?? tile.y,
    ageYears: overrides.ageYears ?? 30,
    sex: overrides.sex ?? 'F',
    hunger: 0.1,
    ...overrides
  });
}

function linkParents(world, first, second, child) {
  const { union } = ensureParentalUnion(world, first, second);
  addChildToParentalUnion(world, union, child.id);
  return union;
}

test('explicit parent and union facts resolve child/grandchild distance without spouse inference', () => {
  const world = createWorld({ seed: 401, width: 10, height: 10, population: 0 });
  const founder = addHuman(world, { sex: 'M', ageYears: 55 });
  const coParent = addHuman(world, { sex: 'F', ageYears: 45 });
  const child = addHuman(world, {
    sex: 'F',
    ageYears: 25,
    parentIds: [founder.id, coParent.id],
    lineageId: coParent.lineageId,
    generation: 1
  });
  linkParents(world, founder, coParent, child);

  const otherParent = addHuman(world, { sex: 'M', ageYears: 27 });
  const grandchild = addHuman(world, {
    sex: 'M',
    ageYears: 5,
    parentIds: [child.id, otherParent.id],
    lineageId: child.lineageId,
    generation: 2
  });
  linkParents(world, child, otherParent, grandchild);

  assert.equal(descendantDistance(world, founder.id, child.id), 1);
  assert.equal(descendantDistance(world, founder.id, grandchild.id), 2);
  assert.equal(descendantDistance(world, founder.id, founder.id), null);
  assert.equal(descendantDistance(world, founder.id, coParent.id), null, 'co-parenting must not imply spouse/descendant semantics');
  assert.notEqual(child.lineageId, founder.lineageId, 'fixture must cross the maternal-lineage boundary');
  assert.equal(descendantDistance(world, founder.id, child.id), 1, 'paternal descent must not depend on lineageId equality');
});

test('persistent parental-union child records preserve descent after an intermediate ancestor leaves current humans', () => {
  const world = createWorld({ seed: 402, width: 10, height: 10, population: 0 });
  const founder = addHuman(world, { sex: 'F', ageYears: 60 });
  const founderPartner = addHuman(world, { sex: 'M', ageYears: 58 });
  const intermediate = addHuman(world, {
    sex: 'M',
    ageYears: 35,
    parentIds: [founder.id, founderPartner.id],
    lineageId: founder.lineageId,
    generation: 1
  });
  linkParents(world, founder, founderPartner, intermediate);

  const partner = addHuman(world, { sex: 'F', ageYears: 33 });
  const grandchild = addHuman(world, {
    sex: 'F',
    ageYears: 18,
    parentIds: [intermediate.id, partner.id],
    lineageId: partner.lineageId,
    generation: 2
  });
  linkParents(world, intermediate, partner, grandchild);

  world.entities = world.entities.filter((human) => human.id !== intermediate.id);
  assert.equal(world.entities.some((human) => human.id === intermediate.id), false);
  assert.equal(descendantDistance(world, founder.id, grandchild.id), 2);
  assert.equal(descendantDistances(world, founder.id).get(grandchild.id), 2);
});

test('duplicate parentIds plus union evidence creates one graph edge and traversal is cycle-safe', () => {
  const world = createWorld({ seed: 403, width: 10, height: 10, population: 0 });
  const a = addHuman(world, { sex: 'M' });
  const b = addHuman(world, { sex: 'F', parentIds: [a.id] });
  const partner = addHuman(world, { sex: 'F' });
  linkParents(world, a, partner, b);

  const adjacency = parentChildAdjacency(world);
  assert.deepEqual([...adjacency.get(a.id)], [b.id]);

  // Malformed research data must not make the resolver loop forever.
  world.unions.push({
    id: world.nextUnionId++,
    kind: 'parental_union',
    partnerIds: [b.id, partner.id],
    childIds: [a.id],
    foundedDay: world.day,
    lastChildDay: null,
    settlementIdAtFormation: null,
    firstPartnerDeathDay: null,
    firstDeceasedPartnerId: null
  });
  assert.equal(descendantDistance(world, a.id, b.id), 1);
  assert.equal(descendantDistance(world, a.id, 999999), null);
});

test('descendant candidates rank by generation distance, then older age, then stable id', () => {
  const world = createWorld({ seed: 404, width: 10, height: 10, population: 0 });
  const founder = addHuman(world, { sex: 'F', ageYears: 70 });
  const directLowId = addHuman(world, { sex: 'M', ageYears: 30, parentIds: [founder.id], generation: 1 });
  const directHighId = addHuman(world, { sex: 'F', ageYears: 40, parentIds: [founder.id], generation: 1 });
  const directSameAgeLaterId = addHuman(world, { sex: 'M', ageYears: 40, parentIds: [founder.id], generation: 1 });
  const grandchild = addHuman(world, { sex: 'F', ageYears: 60, parentIds: [directLowId.id], generation: 2 });
  const unrelated = addHuman(world, { sex: 'M', ageYears: 80 });

  const ranked = rankDescendantCandidates(world, founder.id, [unrelated, grandchild, directLowId, directSameAgeLaterId, directHighId]);
  assert.deepEqual(
    ranked.map(({ human, distance }) => [human.id, distance]),
    [
      [directHighId.id, 1],
      [directSameAgeLaterId.id, 1],
      [directLowId.id, 1],
      [grandchild.id, 2]
    ]
  );
});

test('succession genealogy queries are snapshot- and RNG-neutral', () => {
  const world = createWorld({ seed: 405, width: 10, height: 10, population: 0 });
  const parentA = addHuman(world, { sex: 'F' });
  const parentB = addHuman(world, { sex: 'M' });
  const child = addHuman(world, { parentIds: [parentA.id, parentB.id], lineageId: parentA.lineageId, generation: 1 });
  linkParents(world, parentA, parentB, child);

  const before = snapshotWorld(world);
  const rngBefore = world.rng.snapshot();
  assert.equal(descendantDistance(world, parentA.id, child.id), 1);
  assert.equal(rankDescendantCandidates(world, parentA.id, [child]).length, 1);
  parentChildAdjacency(world);
  descendantDistances(world, parentA.id);
  assert.deepEqual(snapshotWorld(world), before);
  assert.deepEqual(world.rng.snapshot(), rngBefore);
});
