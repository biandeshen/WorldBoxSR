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

The active product stage is **v0.6.0 — Living Ecology**. Release gate: #223. Finite backlog: `docs/backlog/v0.6.md`.

Planning #224 is merged. Capability 1 — **Supported natural-fauna preset** (#225 / #226) — is implementation-complete with deterministic + real Chromium evidence and is at the final documentation-synchronized merge gate.

After #226 merges and merged-main CI/Pages/Chromium/public `/play/` verification succeeds, the only next implementation slice is **Multi-species creature surface**. Do not begin authoritative Wolf predation before the two-species projection/render/selection/inspection surface is merged-main green.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories is a shipped query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / explicit stable domain IDs are authoritative; unresolved refs remain visible rather than guessed. Focus, Watchlist and Chronicle-lens selection stay outside world/snapshot authority.

Creature ecology now has its first explicit player-facing supported mode:
- Phaser topbar exposes `Sandbox · Living Ecology`;
- Sandbox remains default and preserves its existing reproduction-off / old-age-off world plus post-warmup 8-grazer showcase injection;
- Living Ecology is deliberately supported only at 24×24 for the v0.6 canonical scope;
- it promotes the exact Sprint021 10-founder natural-grazer initializer and validated reproduction/old-age settings into runtime authority;
- there is no hidden reseed/population target after initialization;
- Legacy Canvas remains a Sandbox-only compatibility/comparison renderer rather than duplicating preset orchestration.

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

## v0.6 natural-fauna evidence

Capability 1 promotes existing accepted research rather than introducing a new ecology tuning hypothesis:

- initializer constants exactly match Sprint021: 10 founders, vegetation-rich top32 passable pool, deterministic round-robin placement, keyed `[0,6y]` founder ages, age salt `0x1b56c4e9`, `bornDay = -ageDays`;
- Living Ecology config enables `grazerBirthChancePerEligiblePairPerDay: 0.001` and gradual grazer old-age mortality only; existing hunger/eating/movement/reproduction/mortality formulas are unchanged;
- strict authority guard requires 24×24, day0, empty creature domain and the validated ecology config;
- founder initialization consumes zero sequential RNG, allocates normal creature IDs, and creates no `god.spawn_creature` history or command IDs;
- deterministic tests lock exact founder IDs/coordinates/ages, duplicate byte identity, snapshot round-trip, unsupported-scope rejection and RNG neutrality;
- bounded seed45 authority test demonstrates natural birth + material vegetation drawdown with no hidden reseeding;
- adapter tests prove Sandbox remains default/exact and Living Ecology never receives the post-warmup 8-grazer showcase injection;
- real Chromium uses the visible Mode selector and real `↻ World` reset: Sandbox is first verified at 8 manual showcase grazers, then Living Ecology reaches year40 with **116 living grazers and 156 natural births**, with **0** god founder-spawn events;
- browser pauses and real Alt-clicks Grazer #33; inspector shows age/health/hunger/tile and the serialized paused world fingerprint is unchanged by inspection;
- branch head `cf24df29e32037daedafd1350bc284d62c76c5ee` passed CI #689 + full visual-qa #197; visual artifact #9562468337 digest `sha256:722e9da4f43aa10e318c93ab1d8aee700f02a36b37da384e95b1d71866d0f284`;
- manual 1440×900 review passes: `Living Ecology` mode is clear, 116 grazers create visible ecology density without hiding terrain/polities/humans, inspector is readable and the map remains primary.

## v0.6 evidence carried forward / rejected breadth

- Sprint021 passed all 30 tested seeds through 120 years with no extinction, multi-generation replacement reproduction, bounded abundance, repeated vegetation pressure/recovery and unchanged sequential RNG;
- 32×32/48×48 research suggests no founder up-scaling is required, but v0.6 does not promise those sizes;
- compact 16×16 universal initialization is deliberately unresolved;
- scalar founder count is rejected as a universal compact fix;
- terminal population-at-year-X is rejected as a compact persistence classifier because resource-demography cycles are phase-sensitive;
- the 40-year low-population OR zero-birth recovery envelope failed unseen validation;
- encounter-safe founder placement was rejected after fresh paired validation produced **4 rescues vs 6 harms**;
- none of those rejected compact-map hypotheses may leak into runtime merely to claim universal fauna support.

## v0.6 binding product decisions

- Primary promise: **watch vegetation, grazers and one predator species form a visible causal ecology.**
- Canonical map/preset scope is 24×24; supported scope beats universal scope.
- Sandbox remains default and compatibility-safe; Living Ecology is an explicit player choice in the Phaser product surface.
- Legacy Canvas remains Sandbox-only comparison UI; do not duplicate v0.6 preset/product orchestration there.
- Add exactly one new predator species: **Wolf**. Do not build a generalized N-species ecology framework.
- Capability 2 must first generalize the existing grazer-only presentation surface just enough for Grazer + Wolf; do not add hunting behavior in that slice.
- Wolf predation later must be authoritative simulation using shared creature lifecycle/history, never renderer-owned combat.
- Extinction is acceptable. No minimum population, equilibrium or hidden survival controller is allowed.
- Wolf reproduction is not automatically in scope; add it only if the supported canonical gate cannot form a coherent living predator loop without it.
- Save/load and deterministic repeatability are release requirements for new creature state.
- Ecology readability must remain game-facing; no permanent metrics dashboard/heatmap is required.
- No disease, seasons, climate, genetics/evolution, plant-species simulation, economy/religion/technology or renewed civilization depth in v0.6.
- At most three consecutive rejected ecology hypotheses may block the visible release gate; after that, narrow scope and ship rather than continue open-ended research.

## Current decision gate

1. require documentation-synchronized #226 CI + full Chromium success;
2. squash merge #226 and close #225;
3. verify merged `main` CI, Pages build/deploy + public `/play/`, and full Chromium including the Living Ecology gate;
4. open exactly one capability 2 issue/branch for **Multi-species creature surface**;
5. preserve grazer behavior while changing projection/render/selection/inspection only as required for Grazer + Wolf identity;
6. do **not** implement Wolf hunting/predation or reproduction in capability 2;
7. only after capability 2 is merged-main green, open the authoritative Wolf predation slice.
