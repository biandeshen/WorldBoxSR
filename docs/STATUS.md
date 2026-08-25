# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped and closed.** Release gate #208 and release handoff #220 are closed. Package/tag/Release, merged-main CI, full Chromium Visual QA, Pages build/deploy and the final public `/play/` verification all passed.

Release identity is fixed:
- release commit: `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag: `v0.5.0`;
- tag object: `4b741403979aee61ae51c49d02306d1acf6f74e1`, pointing exactly at the release commit;
- GitHub Release: `WorldBoxSR v0.5.0`, published from `docs/releases/v0.5.0.md`;
- release workflow: #9 — green;
- release-commit CI: #677 — green;
- release-commit full Chromium visual-qa: #187 — green;
- Pages: #40 — build, deploy and final public `/play/` verification green;
- post-tag status closure #222 merged without moving/amending the release tag.

The active product stage is now **v0.6.0 — Living Ecology**. Release gate: #223. Finite backlog: `docs/backlog/v0.6.md`.

v0.6 planning is intentionally supported-scope rather than universal ecology research. The canonical release target is a **24×24 Living Ecology preset** that productizes the already-validated natural grazer loop and adds exactly one visible predator relationship: **Wolf → Grazer**.

No v0.6 implementation should begin before the finite backlog/planning PR is merged. After that, capability 1 is the supported natural-fauna preset; do not start Wolf work before the preset foundation is authority-correct and browser-visible.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories is a shipped query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / explicit stable domain IDs are authoritative; unresolved refs remain visible rather than guessed. Focus, Watchlist and Chronicle-lens selection stay outside world/snapshot authority.

Creature ecology currently has a stronger authoritative base than the public product surface exposes:
- grazer hunger, vegetation consumption, movement toward vegetation, starvation/recovery;
- keyed reproduction with partner/local-resource gates;
- keyed gradual old-age mortality;
- shared creature lifecycle death bookkeeping/events;
- deterministic creature IDs/state and save/load infrastructure;
- current default config deliberately keeps grazer reproduction/old-age mortality disabled;
- current 24×24 showcase injects 8 grazers after warmup rather than running natural fauna from world start.

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

The final real-browser gate proves the four story surfaces work together in one coherent deterministic seed45 session:

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

## v0.6 evidence carried forward

The Living Ecology plan is grounded in existing grazer research rather than restarting ecology tuning:

- **24×24 natural grazer initializer is accepted for supported scope:** exactly 10 founders on the 32 vegetation-richest passable cells, deterministic round-robin placement, keyed founder ages `[0,6y]`, reproduction `0.001`, gradual old-age mortality enabled;
- Sprint021 passed all 30 seeds through 120 years with no extinction, multi-generation replacement reproduction, bounded abundance, repeated vegetation pressure/recovery and unchanged sequential RNG;
- 32×32/48×48 research suggests no founder up-scaling is required, but v0.6 does not promise those sizes;
- compact 16×16 universal initialization is deliberately unresolved;
- scalar founder count is rejected as a universal compact fix;
- terminal population-at-year-X is rejected as a compact persistence classifier because resource-demography cycles are phase-sensitive;
- the 40-year low-population OR zero-birth recovery envelope failed unseen validation;
- encounter-safe founder placement was rejected after fresh paired validation produced **4 rescues vs 6 harms**;
- therefore v0.6 must not smuggle any of those rejected compact-map hypotheses into runtime merely to claim universal fauna support.

## v0.6 binding product decisions

- Primary promise: **watch vegetation, grazers and one predator species form a visible causal ecology.**
- Canonical map/preset scope is 24×24; supported scope beats universal scope.
- The natural-fauna preset uses the exact validated grazer initializer/settings; existing default sandbox compatibility remains explicit.
- Add exactly one new predator species: **Wolf**. Do not build a generalized N-species ecology framework.
- Wolf predation must be authoritative simulation using shared creature lifecycle/history, never renderer-owned combat.
- Extinction is acceptable. No minimum population, equilibrium or hidden survival controller is allowed.
- Wolf reproduction is not automatically in scope; add it only if the supported canonical gate cannot form a coherent living predator loop without it.
- Save/load and deterministic repeatability are release requirements for new creature state.
- Ecology readability must remain game-facing; no permanent metrics dashboard/heatmap is required.
- No disease, seasons, climate, genetics/evolution, plant-species simulation, economy/religion/technology or renewed civilization depth in v0.6.
- At most three consecutive rejected ecology hypotheses may block the visible release gate; after that, narrow scope and ship rather than continue open-ended research.

## Current decision gate

1. merge the v0.6 planning PR containing release gate #223 + `docs/backlog/v0.6.md` + reconciled ROADMAP/STATUS;
2. open exactly one first implementation issue for **Supported natural-fauna preset**;
3. implement the validated 24×24 grazer initializer/preset with no universal compact-map claims and no sequential-RNG coupling;
4. require normal deterministic tests + real Chromium visible-player evidence before merge;
5. only after the natural-fauna preset is merged-main green, open the multi-species surface slice;
6. do not start Wolf predation, generalized ecology refactors or additional research in parallel with slice 1;
7. keep v0.5 release identity immutable while v0.6 proceeds.
