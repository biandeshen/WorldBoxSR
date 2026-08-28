import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SNAPSHOT_VERSION } from '../engine/core/world.js';

const [outDir] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: node tools/verify-stable-sandbox-evidence.mjs <visual-evidence-dir>');
  process.exit(2);
}

const story = readJson('story-evidence.json');
const persistence = readJson('stable-sandbox-persistence-evidence.json');
const scenario = readJson('canonical-scenario-builder-evidence.json');

assert(Number.isInteger(story.lightningEventId), 'World Stories evidence must retain a real Lightning event');
assert(Number.isInteger(story.deathEventId), 'World Stories evidence must retain a real death event');
assert(Number.isInteger(story.successionEventId), 'World Stories evidence must retain a real succession event');
assert(story.mapTarget?.entityKind && Number.isInteger(story.mapTarget?.entityId), 'World Stories evidence must retain map navigation');
assert(String(story.inspector ?? '').length > 0, 'World Stories evidence must retain Inspector navigation');

assert(persistence.stableSandboxPersistenceComplete === true, 'ordinary persistence composition did not complete');
assert(persistence.localSaveKey === 'worldboxsr:local-world:v1', `unexpected local save key: ${persistence.localSaveKey}`);
assert(persistence.ordinary?.formatVersion === 1, `unexpected local envelope version: ${persistence.ordinary?.formatVersion}`);
assert(persistence.ordinary?.snapshotVersion === SNAPSHOT_VERSION, `unexpected engine snapshot version: ${persistence.ordinary?.snapshotVersion}; expected current ${SNAPSHOT_VERSION}`);
assert(persistence.ordinary?.mutatedDay > persistence.ordinary?.savedDay, 'ordinary world did not diverge after save');
assert(persistence.ordinary?.restoredDay === persistence.ordinary?.savedDay, 'ordinary restore did not return to saved day');
assert(persistence.ordinary?.exactRestore === true, 'ordinary Restore did not return exact saved authority');
assert(persistence.ordinary?.pausedAfterRestore === true, 'ordinary Restore did not install paused');
assert(persistence.ordinary?.savedFingerprint === persistence.ordinary?.restoredFingerprint, 'saved/restored fingerprint hashes differ');
assert(persistence.ordinary?.savedFingerprint !== persistence.ordinary?.mutatedFingerprint, 'mutated world hash did not diverge');
assert(persistence.scenarioIsolation?.scenarioSetupActive === true, 'Scenario Setup was not active during persistence isolation proof');
assert(persistence.scenarioIsolation?.saveDisabled === true, 'ordinary Save remained enabled during Scenario identity');
assert(persistence.scenarioIsolation?.restoreDisabled === true, 'ordinary Restore remained enabled during Scenario identity');
assert(persistence.scenarioIsolation?.status === 'Scenario active · use Recipe / Replay / Fork', 'Scenario persistence status drifted');
assert(persistence.scenarioIsolation?.localSaveUnchanged === true, 'Scenario identity overwrote ordinary local save');

assert(scenario.canonicalJourneyComplete === true, 'canonical Scenario Builder journey did not complete');
assert(scenario.source?.recipe?.version === 1, 'canonical Scenario source is not Recipe v1');
assert(typeof scenario.source?.fingerprint === 'string' && scenario.source.fingerprint.length > 0, 'canonical Scenario source fingerprint missing');
assert(typeof scenario.fork?.fingerprint === 'string' && scenario.fork.fingerprint.length > 0, 'canonical Scenario fork fingerprint missing');
assert(scenario.source.fingerprint !== scenario.fork.fingerprint, 'canonical Scenario Fork did not create a distinct authoritative start');

const evidence = {
  stableSandboxGateComplete: true,
  ordinaryWorld: {
    causalStoryEventIds: {
      lightning: story.lightningEventId,
      death: story.deathEventId,
      succession: story.successionEventId
    },
    savedDay: persistence.ordinary.savedDay,
    mutatedDay: persistence.ordinary.mutatedDay,
    restoredDay: persistence.ordinary.restoredDay,
    exactRestore: true,
    pausedAfterRestore: true,
    scenarioPersistenceSuppressed: true
  },
  scenario: {
    recipeVersion: scenario.source.recipe.version,
    sourceFingerprint: scenario.source.fingerprint,
    forkFingerprint: scenario.fork.fingerprint,
    canonicalJourneyComplete: true
  },
  releaseClaim: 'existing causal World Stories, ordinary local Save/Restore and Scenario Recipe/Replay/Fork compose without adding a second authority or persistence format'
};
writeFileSync(join(outDir, 'stable-sandbox-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Stable Sandbox gate: story #${story.successionEventId}; save ${evidence.ordinaryWorld.savedDay} → mutate ${evidence.ordinaryWorld.mutatedDay} → exact restore; Scenario ${evidence.scenario.sourceFingerprint} → fork ${evidence.scenario.forkFingerprint}`);

function readJson(name) {
  return JSON.parse(readFileSync(join(outDir, name), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
