# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped.** Release gate: #208. Release handoff: #220. Package/tag/Release, merged-main CI, full Chromium Visual QA, Pages build/deploy and the final public `/play/` verification all passed.

Release identity is fixed:
- release commit: `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag: `v0.5.0`;
- tag object: `4b741403979aee61ae51c49d02306d1acf6f74e1`, pointing exactly at the release commit;
- GitHub Release: `WorldBoxSR v0.5.0`, published from `docs/releases/v0.5.0.md`;
- release workflow: #9 — green;
- release-commit CI: #677 — green;
- release-commit full Chromium visual-qa: #187 — green;
- Pages: #40 — build, deploy and final public `/play/` verification green.

The preceding implementation checkpoint also passed after #219 merged: CI #675, visual-qa #185 and Pages #39 were all green before packaging began. Release PR #221 itself changed only seven release/status files and passed CI #676 + visual-qa #186 before merge.

**v0.5 feature work is closed.** Do not move/amend tag `v0.5.0` for later documentation changes. v0.6 Living Ecology is the next product stage, but it must begin with its own finite backlog and explicit product gate rather than leaking new work into the closed v0.5 scope.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories is a query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / explicit stable domain IDs are authoritative; unresolved refs are normal under bounded history and remain visible rather than guessed. Focus, Watchlist and Chronicle-lens selection stay outside world/snapshot authority.

## v0.5 shipped capability

### Causal Event Card
- retained events project into readable cards with headline/detail/provenance plus explicit Subject and ordered recorded Causes;
- retained event refs can open another Event Card;
- current map-capable refs reuse the existing world map/inspector path;
- command/expired entity/event refs remain explicitly unavailable rather than inferred;
- deterministic tests + real Chromium prove Event Card navigation remains snapshot/RNG neutral.

### Focused Story Trail
- exact retained-history predicates support explicit human, creature, settlement, polity, warband and one-hop event focus;
- trails are chronological oldest→newest, capped at 8 and never infer current-state membership merely to fill a story;
- trail rows reopen the existing Event Card while focus remains active;
- focus is presentation-only and does not mutate world authority.

### Watchlist
- explicit Pin/Unpin stores at most 6 stable retained-event/entity refs;
- persistence is same-tab/session-only through `sessionStorage`;
- every render re-resolves current authoritative truth; removed/evicted refs remain pinned but visibly unavailable;
- malformed/duplicate/unsupported persisted entries are sanitized;
- Watchlist is player memory, not canonical world importance.

### Chronicle lenses
- exactly four compact lenses: `Highlights · Recent · Conflict · Rule`;
- Highlights preserves the existing representative-history behavior;
- Recent is newest-first readable retained World Story history;
- Conflict and Rule use fixed explicit event-type membership;
- every lens is capped at 7; lens state is presentation-only and unpersisted;
- Event Card, Focused Story and Watchlist remain usable while lenses switch.

## Canonical World Stories release evidence

The final real-browser gate proves the four surfaces work together in one coherent deterministic seed45 session rather than only as isolated tests:

1. ordinary shipped Lightning strikes Lindenvale Dominion ruler Human #23;
2. authority records `god.lightning` #172 + `human.died` #173;
3. normal deterministic succession records `polity.ruler_succeeded` #178 for Human #29 with retained death Event #173 as an explicit Cause;
4. the paused post-succession serialized world becomes the read-only authority baseline;
5. Event #178 visibly explains `Human #29 succeeds Human #23 after death` with Lindenvale Dominion as Subject;
6. browser follows retained Cause Event #173;
7. Show on map resolves polity #3 to current capital Lindenvale, inspector focus `15,12`;
8. Watchlist Pins exactly `event:178` + `polity:3`;
9. Follow polity #3 recovers chronological trail `[122,123,124,125,127,128,130,131]` and opens Event #123;
10. same session round-trips Recent `[178,163,162,159,158,157,156]`, Conflict `[134,120,119,117,115,114,111]`, Rule `[178,163,162,159,158,157,156]`, then restores exact Highlights `[178,135,134,120,119,117,115]`;
11. open Event Card, Focused Story and Watchlist survive the lens round-trip;
12. no raw engine JSON appears;
13. every read-only story/navigation action after the post-succession baseline preserves the exact authoritative world fingerprint + paused state.

Manual review of the fixed 1440×900 canonical evidence confirms the Event Card, Focused Story, Watchlist and lens tabs remain readable while the world map stays the primary surface.

## Binding product decisions carried forward

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- World Stories breadth is frozen after v0.5.
- No graph database, generalized knowledge system or full replay engine is implied by v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Focus/bookmark/navigation state stays presentation-only and outside world snapshots.
- Watchlist is explicit player memory, not canonical world importance.

## Current decision gate

1. merge this post-tag status closure without changing release artifacts or tag `v0.5.0`;
2. close #208 and #220 once the closure commit lands on `main`;
3. treat **v0.6 Living Ecology** as the next product stage;
4. before implementation, create a finite v0.6 backlog with a concrete visible-player promise, supported scenario/preset scope, explicit deterministic + browser gate and clear non-goals;
5. do not reopen v0.5 story breadth merely because the next stage has begun.
