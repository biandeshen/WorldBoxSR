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
**Status: active target; finite release gate #223 defined. Primary fantasy: “I can watch animal populations and vegetation affect each other, and see predation change that living system.”**

### Promise
Turn the already-authoritative grazer/resource mechanics into a visible supported ecology experience, then add exactly one new predator relationship so ecology becomes a player-readable world system rather than hidden creature math.

### Supported scope
- canonical release scope is **24×24** through an explicit Living Ecology preset;
- existing/default sandbox behavior remains compatibility-safe rather than silently enabling unvalidated universal fauna;
- natural grazers use the exact Sprint021 validated initializer: 10 founders from the vegetation-rich top32 passable cells, deterministic placement and keyed `[0,6y]` founder ages;
- validated grazer reproduction/old-age settings are enabled only where the preset requires them;
- one additional named predator species: **Wolf**;
- extinction/collapse is allowed; no equilibrium or eternal-coexistence guarantee.

Detailed finite backlog: [`docs/backlog/v0.6.md`](backlog/v0.6.md).

### Ordered scope
1. **Supported natural-fauna preset** — productize the proven 24×24 grazer initializer/settings with deterministic tests and real browser visibility;
2. **Multi-species creature surface** — make Grazer + Wolf visually distinct/selectable/inspectable through the smallest necessary shared creature presentation path;
3. **Wolf predation loop** — authoritative deterministic prey seeking/hunting through shared creature lifecycle/history, with no renderer-owned combat or hidden rescue spawning;
4. **Ecology readability** — compact species/condition/resource-pressure and predation feedback without turning the game into an analytics dashboard;
5. **Canonical Living Ecology gate** — one supported deterministic world proves natural grazer birth, vegetation pressure/recovery, at least one authoritative Wolf→Grazer predation consequence, exact repeatability and save/load continuation;
6. release-only `v0.6.0` package/docs/tag/Pages handoff after merged-main verification.

### Evidence boundary
The release deliberately reuses accepted research instead of reopening compact-map tuning. Sprint021 passed 30/30 24×24 worlds for 120 years with multi-generation grazers and repeated vegetation cycles. By contrast, scalar founder counts, terminal-population classifiers, a 40-year population-low recovery envelope and encounter-safe placement are not promoted; encounter-safe placement specifically failed fresh validation with 4 rescues vs 6 harms.

### Exit gate
In the supported 24×24 preset, a player can identify both species, observe naturally reproduced grazers consuming vegetation, see an authoritative wolf predation event and its visible population/resource consequence, and inspect what happened without raw engine JSON. Duplicate headless runs are byte-identical and save/load continuation matches uninterrupted authority. The gate does not require either species to survive forever.

### Deliberate stop
No universal 16×16–48×48 initializer, equilibrium controller, hidden reseeding, disease, seasons/climate, genetics/evolution, plant-species model, generalized N-species food-web framework, new god powers or renewed civilization/economy/religion/technology breadth. At most three consecutive rejected ecology hypotheses may block the visible gate before scope must narrow.

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

**v0.5.0 World Stories is closed and immutable. v0.6 Living Ecology is the only active product target.** Merge the planning gate first, then implement the supported natural-fauna preset as the single next slice. Do not begin Wolf/predation or additional ecology research in parallel, and do not promise universal fauna beyond the declared 24×24 release scope.
