import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorld, tickWorld } from '../engine/core/world.js';
import { eligibleRulerCandidates } from '../engine/systems/rulers.js';
import { rankDescendantCandidates } from '../engine/core/succession_genealogy.js';

const SEED = 45;
const YEARS = 200;

test('TEMP probe: seed45 first descendant-first succession divergence', () => {
  const world = createWorld({ seed: SEED, width: 24, height: 24, population: 30 });
  const shadow = new Map();
  const lineChanges = [];
  const compatibleContinuations = [];
  let firstSelectionDivergence = null;
  let rulerAppointments = 0;
  let rulerSuccessions = 0;
  let vacancies = 0;

  const horizonDays = YEARS * world.config.daysPerYear;
  outer: for (let step = 0; step < horizonDays; step += 1) {
    const firstNewEventId = world.nextEventId;
    tickWorld(world, 1);
    const newRulerEvents = world.history.filter((event) =>
      event.id >= firstNewEventId &&
      (event.type === 'polity.ruler_appointed' || event.type === 'polity.ruler_succeeded' || event.type === 'polity.ruler_vacant')
    );

    for (const event of newRulerEvents) {
      if (event.type === 'polity.ruler_appointed') {
        rulerAppointments += 1;
        shadow.set(event.polityId, {
          founderId: event.rulerId,
          lineSequence: 1,
          reignsInLine: 1
        });
        continue;
      }

      if (event.type === 'polity.ruler_vacant') {
        vacancies += 1;
        continue;
      }

      rulerSuccessions += 1;
      const polity = world.polities.find((candidate) => candidate.id === event.polityId);
      if (!polity) throw new Error(`probe lost polity #${event.polityId}`);
      let line = shadow.get(event.polityId);
      if (!line) {
        line = {
          founderId: Number.isInteger(event.previousRulerId) ? event.previousRulerId : event.rulerId,
          lineSequence: 1,
          reignsInLine: 1
        };
        shadow.set(event.polityId, line);
      }

      const eligible = eligibleRulerCandidates(world, polity);
      const ranked = rankDescendantCandidates(world, line.founderId, eligible);
      const record = {
        day: world.day,
        year: world.day / world.config.daysPerYear,
        polityId: polity.id,
        polityName: polity.name,
        previousRulerId: event.previousRulerId,
        rulingLineFounderId: line.founderId,
        rulingLineSequence: line.lineSequence,
        baselineSuccessorId: event.rulerId,
        successionEventId: event.id,
        eligibleAdultCount: eligible.length,
        rankedDescendants: ranked.map(({ human, distance }) => ({
          humanId: human.id,
          distance,
          ageYears: human.ageDays / world.config.daysPerYear,
          settlementId: human.settlementId
        }))
      };

      const topDescendant = ranked[0]?.human ?? null;
      if (!topDescendant) {
        lineChanges.push(record);
        line.founderId = event.rulerId;
        line.lineSequence += 1;
        line.reignsInLine = 1;
        continue;
      }

      record.topDescendantId = topDescendant.id;
      record.baselineMatchesTopDescendant = event.rulerId === topDescendant.id;
      if (record.baselineMatchesTopDescendant) {
        compatibleContinuations.push(record);
        line.reignsInLine += 1;
        continue;
      }

      firstSelectionDivergence = record;
      break outer;
    }
  }

  const evidence = {
    seed: SEED,
    width: world.width,
    height: world.height,
    founders: 30,
    requestedHorizonYears: YEARS,
    simulatedThroughYear: world.day / world.config.daysPerYear,
    rulerAppointments,
    rulerSuccessions,
    vacancies,
    noDescendantLineChangeCountBeforeDivergence: lineChanges.length,
    compatibleContinuationCountBeforeDivergence: compatibleContinuations.length,
    firstNoDescendantLineChange: lineChanges[0] ?? null,
    firstCompatibleContinuation: compatibleContinuations[0] ?? null,
    firstSelectionDivergence
  };

  console.log(`RULING_LINE_TRAJECTORY_PROBE ${JSON.stringify(evidence)}`);
  assert.equal(world.seed, SEED);
  assert.ok(world.day > 0);
});
