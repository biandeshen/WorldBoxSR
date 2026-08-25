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
**Status: shipped checkpoint on release merge. Primary fantasy: “intervening is fun even before I care about the simulation.”**

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
**Current target. Primary fantasy: “this world has a history I can follow and remember.”**

### Promise
Turn existing causal history into a stronger game-facing memory layer without allowing narrative presentation or AI to become a second source of truth.

### Capability pool
- clearer event cards/headlines/details for high-value world changes;
- causal drill-down from an event to the people, settlements, powers and prior events that explain it;
- bookmarks/favorites for people, settlements, polities and events worth following;
- ruler/dynasty/settlement/polity story views built from recorded facts;
- timeline navigation and useful history filtering/search rather than raw debug logs;
- compact “what changed?” summaries derived from authoritative events;
- optional AI summaries only when every factual claim can be traced back to recorded world state/history.

### Guardrails
- no AI-authored canonical facts, hidden motives or invented causal links;
- no broad replay/rewind engine unless a small story interaction concretely requires it;
- no v0.4 power accumulation disguised as story work;
- no ecology research or v0.8 civilization-depth work as blockers;
- prefer one excellent causal story path over a broad analytics dashboard.

### Candidate exit gate
A player can select one meaningful world event from the default showcase, understand what happened and why, navigate to the involved entities/places, preserve it for later and recover a coherent short story without reading raw engine JSON.

---

## v0.6.0 — Living Ecology
**Primary fantasy: “the environment and animal life form a visible system around civilizations.”**

Return to preserved grazer evidence only after civilization/god/story loops are compelling: supported natural-fauna presets, multiple species, biome affinity/migration, predation/food-web foundations, deterministic initialization and ecology observability. Coherent extinction remains allowed; no hidden survival controller.

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

**v0.4 God Power Sandbox is closed on the v0.4.0 release checkpoint. v0.5 World Stories is the only next product-development stage.** Start with the smallest player-visible causal-story path over existing authoritative history. Do not add more v0.4 powers or reopen ecology/civilization breadth as near-term blockers.
