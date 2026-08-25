# WorldBoxSR release roadmap

WorldBoxSR is an open-ended sandbox, but development must not be open-ended.

The project ships **coherent, visible, playable slices**. Simulation rigor is necessary for trust and depth; it is not product progress by itself. The master product definition lives in [`docs/product/master-blueprint.md`](product/master-blueprint.md).

## Delivery units

### Sprint
One narrow feature, experiment, implementation gate or validation. A sprint normally ends in one issue/PR pair and leaves behind authoritative code, visible product improvement, or durable negative evidence.

### Stage
A small group of sprints that unlocks one coherent player capability. A stage ends when its explicit product gate passes.

### Version
A user-visible checkpoint that can be played on the public demo, tested, documented and compared with the previous release.

For pre-1.0 releases:
- `0.x.0` = new player capability/stage;
- `0.x.y` = fixes, hardening and small improvements inside the stage.

## Permanent release discipline

1. **Visible progress is required.** Green tests alone cannot complete a player-facing version.
2. **The public Pages demo is the product truth surface.** A claimed capability must be demonstrable there unless explicitly platform-specific.
3. **No unbounded research blocker.** Non-correctness research gets at most three consecutive rejected hypotheses in one version before deferral.
4. **Natural negative outcomes are allowed.** Extinction/collapse is acceptable when causally coherent and invariants remain valid.
5. **Supported scope beats universal scope.** A version may support declared scenarios/presets/configurations instead of every seed/map.
6. **Visual/game-feel sprints need evidence.** Before/after screenshot or equivalent reproducible visual evidence is part of review.
7. **Infrastructure is subordinate to the playable loop.** Build it only when it directly unlocks development, verification or delivery.
8. **Every version owns a showcase scenario.** The scenario should communicate the release promise quickly.
9. **Every version declares non-goals.** Future breadth does not leak into the current exit gate.

---

## v0.1.0 — A Living World
**Status: shipped developer-prototype baseline.**

Established the deterministic simulation foundation: terrain/resources, human lifecycle/ancestry, settlements/territory/history, save/load, typed grazers, Simulation Lab/tests, minimal Canvas client, god tools and GitHub delivery infrastructure.

---

## v0.2.0 — Playable World
**Status: shipped.** Tag `v0.2.0` is the player-visible Phaser/Vite checkpoint.

Shipped coherent terrain/units/settlements, direct god powers with SFX/targeting, responsive camera, authoritative territory, persistent inspection, event pulse, deterministic showcase gate, Pages and real Chromium Visual QA.

---

## v0.3.0 — Civilizations Rise
**Status: shipped. Primary fantasy: “I can watch small settlements become rival powers.”**

### Promise
Turn existing settlement/territory/history foundations into visibly distinct political actors whose expansion and conflict can be watched from the map.

### Shipped scope
1. authoritative polity/kingdom identity from settlements;
2. ruler selection and succession;
3. readable relations plus war/peace;
4. intentionally simple visible army/combat abstraction;
5. conquest/settlement transfer, polity dissolution and bounded rebellion;
6. civilization event/history integration and a canonical “two powers rise and collide” scenario.

Detailed finite backlog: [`docs/backlog/v0.3.md`](backlog/v0.3.md). Release QA: [`docs/demos/v0.3.0.md`](demos/v0.3.0.md).

### Exit gate
The default seed45 showcase and executable collision gate demonstrate distinct powers, real rulers, war, engagements and political-map change while Chronicle exposes the resulting story without debug metrics.

### Deliberate stop
v0.3 does not deepen into economy/trade/religion/technology, sophisticated tactics, naval warfare, ecology research, editor/replay or broad art rewrites. Civilization depth pauses after this checkpoint.

---

## v0.4.0 — God Power Sandbox
**Status: shipped. Primary fantasy: “intervening is fun even before I care about the simulation.”**

### Promise
Make direct god intervention immediately legible and satisfying while keeping every meaningful consequence authoritative and historically traceable.

### Shipped scope
1. six-power dock: Human, Grazer, Erase, Lightning, Meteor and Rain;
2. Meteor — exact radius-2 preview, authoritative human/grazer mortality, vegetation destruction, truthful no-effect and strong accessible impact feedback;
3. Rain — the same radius-2 preview, exact restoration of existing food/vegetation capacities, truthful saturation/no-effect and constructive accessible feedback;
4. shared presentation metadata plus accepted-action `applied | no_effect` outcome semantics without introducing a second world model;
5. World Chronicle preserves the two latest direct interventions alongside representative autonomous history;
6. headless deterministic Meteor→Rain product gate using real engine commands;
7. real Chromium pointer gate on canonical seed45 proving destruction and same-footprint recovery in one paused authoritative world.

Detailed finite backlog: [`docs/backlog/v0.4.md`](backlog/v0.4.md). Release QA: [`docs/demos/v0.4.0.md`](demos/v0.4.0.md).

### Exit gate
A player can understand exactly where Meteor/Rain will act, apply them through the real browser input path, distinguish applied/no-effect/rejected outcomes, observe truthful authoritative consequences and recover the short intervention sequence from World Chronicle. Duplicate headless runs remain byte-identical.

### Deliberate stop
v0.4 stops at six powers. No fire propagation, plague/tornado framework, weather/hydrology simulation, ecology balancing, cooldown/inventory/progression, terrain editor, replay/rewind or renewed civilization depth is part of this release.

---

## v0.5.0 — World Stories
**Status: shipped. Primary fantasy: “this world has a history I can follow and remember.”**

### Promise
Turn existing causal history into a stronger game-facing memory layer without allowing narrative presentation or AI to become a second source of truth.

### Shipped scope
1. **Causal Event Card** — readable headline/detail/provenance, explicit Subject and recorded Causes, retained-event drill-down, current map navigation and truthful unavailable refs;
2. **Focused Story Trail** — exact supported stable-ref history, chronological oldest→newest, fixed limit 8, one-hop event focus and no inferred current-state association;
3. **Watchlist** — explicit Pin/Unpin for retained events and supported entities, fixed limit 6, same-tab `sessionStorage`, safe sanitization and current-truth re-resolution;
4. **Chronicle lenses** — exactly `Highlights · Recent · Conflict · Rule`, fixed 7-row limit, unchanged representative Highlights policy and explicit deterministic membership for the other lenses;
5. **Canonical World Stories gate** — one deterministic real-Chromium session stitches ordinary gameplay causality → Event Card → retained cause → map navigation → Watchlist → Focused Story → Chronicle lens round-trip while story navigation remains read-only against the post-causality world fingerprint.

Detailed finite backlog: [`docs/backlog/v0.5.md`](backlog/v0.5.md). Release QA: [`docs/demos/v0.5.0.md`](demos/v0.5.0.md). Release notes: [`docs/releases/v0.5.0.md`](releases/v0.5.0.md).

Release identity: tag `v0.5.0` points at commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`. Release workflow #9, CI #677, full Chromium visual-qa #187 and Pages #40 including the final public `/play/` check all passed.

### Exit gate
On deterministic seed45, ordinary Lightning produces a real ruler-death → normal-succession story. From the paused post-succession baseline a player can understand the recorded transition and cause, navigate to the involved polity, preserve the event + polity, follow an explicit bounded polity story, open a trail event, browse Recent/Conflict/Rule and restore exact Highlights without raw engine JSON or any read-only story action mutating authoritative world state.

### Deliberate stop
v0.5 does not add AI-authored canonical facts, a required AI summary, replay/rewind, graph/database infrastructure, semantic search/query language, relevance scoring, an analytics dashboard, cloud Watchlist sync, new god powers, ecology research or renewed economy/religion/technology/civilization-depth work. Bounded-history refs may expire and remain truthfully unavailable.

---

## v0.6.0 — Living Ecology
**Status: current target; planning gate next. Primary fantasy: “the environment and animal life form a visible system around civilizations.”**

v0.5 delivery is complete, so the next bounded product stage may now begin. It must start with a finite backlog and supported showcase/preset rather than open-ended ecology research.

### Candidate problem space
- supported natural-fauna initialization that remains deterministic;
- multiple distinct species beyond the current single grazer abstraction;
- biome affinity / migration that is visible on the map;
- predation / food-web foundations that create understandable world consequences;
- ecology observability suitable for player-facing inspection and deterministic regression gates.

### Required planning constraints
- define one visible player promise before implementation;
- select supported seed/preset/scenario scope rather than promising universal equilibrium;
- coherent extinction/collapse remains acceptable when causally truthful;
- no hidden survival controller merely to force species persistence;
- preserve deterministic initialization/save-load/world authority;
- no economy/religion/technology or renewed civilization-depth expansion inside ecology scope;
- no v0.5 World Stories reopening unless a concrete regression blocks the ecology product gate.

The first v0.6 task is therefore **scope + finite backlog + canonical ecology gate design**, not feature coding by accumulation.

---

## v0.7.0 — World Builder & Scenarios
World-generation UI, terrain/biome/life/civilization brushes, named scenarios/rules, save/import/export/share metadata, capture helpers and community-scenario groundwork.

---

## v0.8.0 — Civilization Depth
Capability pool selected by play evidence: trade/economy, professions, culture/technology, religion, deeper politics, boats/colonization/naval conflict and richer diplomacy. This must be subdivided into bounded stages rather than implemented as a mega-sprint.

---

## v0.9.0 — Public Alpha Polish
Onboarding, settings/keybinds/accessibility, performance budgets, audio/art consistency, save compatibility, error/recovery UX, platform/touch decisions, contributor extension points and release hardening.

---

## v1.0 — Stable sandbox identity
v1.0 means a stable product/compatibility contract, not every possible feature: reproducible worlds, dependable browser play, creation/intervention + civilizations + world stories working together, usable causal history, save/version policy and credible supported performance.

## Current decision

**v0.5.0 World Stories is closed and shipped. v0.6 Living Ecology is now the current target, but implementation must not begin until its finite product backlog and canonical visible-player gate are defined.** Preserve v0.5 release identity and avoid reopening closed story breadth without a concrete regression reason.
