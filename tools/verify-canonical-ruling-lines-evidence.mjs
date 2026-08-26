import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: node tools/verify-canonical-ruling-lines-evidence.mjs <visual-evidence-dir>');
  process.exit(2);
}

const inspector = JSON.parse(readFileSync(join(outDir, 'ruling-line-readability-evidence.json'), 'utf8'));
const stories = JSON.parse(readFileSync(join(outDir, 'dynastic-world-stories-evidence.json'), 'utf8'));

assert(inspector.day === 14400, `Inspector gate must start exact Y40/day14400: ${inspector.day}`);
assert(inspector.paused === true, 'Inspector gate must remain paused');
assert(inspector.readOnlyAuthorityUnchanged === true, 'Inspector gate must be authority-neutral');
assert(Number.isInteger(inspector.polity?.id), 'Inspector gate must identify a real polity');
assert(Number.isInteger(inspector.polity?.rulerId), 'Inspector gate must identify a real current ruler');
assert(Number.isInteger(inspector.polity?.rulingLineFounderId), 'Inspector gate must identify a recorded ruling-line founder');
assert(inspector.polity?.rulingLineSequence >= 1, 'Inspector gate must expose a positive ruling-line sequence');
assert(inspector.polity?.rulingLineReignCount >= 1, 'Inspector gate must expose a positive reign count');
assert(String(inspector.rulerInspector ?? '').includes(inspector.expectedLine), 'ruler Inspector must contain the authoritative ruling-line text');
assert(String(inspector.settlementInspector ?? '').includes(inspector.expectedLine), 'settlement Inspector must contain the same authoritative ruling-line text');

assert(stories.startDay === 14400, `Dynastic gate must start exact Y40/day14400: ${stories.startDay}`);
assert(stories.paused === true, 'Dynastic gate must end paused');
assert(stories.readOnlyAuthorityUnchanged === true, 'Dynastic story navigation must be authority-neutral');
assert(stories.ruleMembershipOrderUnchanged === true, 'Rule lens membership/order must remain unchanged');
assert(Number.isInteger(stories.descendant?.eventId), 'Dynastic gate must retain a real descendant succession event');
assert(stories.descendant?.distance >= 1, 'Dynastic gate must expose recorded descendant distance');
assert(String(stories.descendant?.headline ?? '').includes('ruling bloodline continues'), 'descendant story must state bloodline continuation');
assert(String(stories.descendant?.detail ?? '').includes(`ruling line ${stories.descendant.lineSequence}`), 'descendant story must preserve recorded line sequence');
assert(Number.isInteger(stories.openSelection?.eventId), 'Dynastic gate must retain a real open-selection succession event');
assert(String(stories.openSelection?.headline ?? '').includes('begins a new ruling line'), 'open-selection story must state a new ruling line');
assert(String(stories.openSelection?.detail ?? '').includes(`ruling line ${stories.openSelection.lineSequence}`), 'open-selection story must preserve recorded line sequence');
assert(Array.isArray(stories.ruleEventIds) && stories.ruleEventIds.includes(stories.descendant.eventId), 'Rule lens must contain the descendant succession event');
assert(Array.isArray(stories.ruleEventIds) && stories.ruleEventIds.includes(stories.openSelection.eventId), 'Rule lens must contain the open-selection succession event');
assert(['event', 'map'].includes(stories.navigation?.kind), `canonical story navigation must follow a recorded event/map reference: ${stories.navigation?.kind}`);
assert(!/legitim|primogen|claim|elect|usurp/i.test(`${stories.descendant?.detail ?? ''} ${stories.openSelection?.detail ?? ''}`), 'canonical stories must not invent political semantics');

const evidence = {
  canonicalBrowserGateComplete: true,
  startDay: 14400,
  inspector: {
    polity: inspector.polity,
    inspectedSettlement: inspector.inspectedSettlement,
    lineText: inspector.expectedLine,
    transitionText: inspector.expectedTransition,
    authorityUnchanged: true
  },
  stories: {
    searchedYears: stories.searchedYears,
    lightningSetup: stories.lightningSetup,
    descendant: stories.descendant,
    openSelection: stories.openSelection,
    ruleEventIds: stories.ruleEventIds,
    navigation: stories.navigation,
    authorityUnchanged: true
  },
  releaseClaim: 'existing authoritative ruling-line state, descendant continuation and open-selection line change are readable through production Inspector + World Stories without presentation mutating world truth'
};

writeFileSync(join(outDir, 'canonical-ruling-lines-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Canonical Ruling Lines browser gate: Y40 Inspector ${inspector.polity.name} ruler #${inspector.polity.rulerId}; descendant event #${stories.descendant.eventId}; open-selection event #${stories.openSelection.eventId}; Rule ${stories.ruleEventIds.join(',')}; authority unchanged`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
