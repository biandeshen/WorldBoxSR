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

### Shipped scope
1. authoritative polity/kingdom identity from settlements;
2. ruler selection and succession;
3. readable relations plus war/peace;
4. intentionally simple visible army/combat abstraction;
5. conquest/settlement transfer, polity dissolution and bounded rebellion;
6. civilization event/history integration and a canonical “two powers rise and collide” scenario.

Detailed backlog: [`docs/backlog/v0.3.md`](backlog/v0.3.md). Release QA: [`docs/demos/v0.3.0.md`](demos/v0.3.0.md).

### Deliberate stop
No economy/trade/religion/technology, sophisticated tactics, naval warfare, ecology research, editor/replay or broad art rewrite.

---

## v0.4.0 — God Power Sandbox
**Status: shipped. Primary fantasy: “intervening is fun even before I care about the simulation.”**

### Shipped scope
1. six-power dock: Human, Grazer, Erase, Lightning, Meteor and Rain;
2. authoritative Meteor destruction + same-footprint Rain recovery;
3. truthful `applied | no_effect` outcomes and accessible impact feedback;
4. World Chronicle intervention history;
5. headless + real Chromium deterministic Meteor→Rain gates.

Detailed backlog: [`docs/backlog/v0.4.md`](backlog/v0.4.md). Release QA: [`docs/demos/v0.4.0.md`](demos/v0.4.0.md).

### Deliberate stop
No fire/plague/tornado framework, ecology balancing, cooldown/inventory/progression, terrain editor or replay/rewind.

---

## v0.5.0 — World Stories
**Status: shipped. Primary fantasy: “this world has a history I can follow and remember.”**

### Shipped scope
1. Causal Event Card — readable recorded facts, Subject/Causes, retained-event drill-down, current map navigation and truthful unavailable refs;
2. Focused Story Trail — exact stable-ref retained history, oldest→newest, capped at 8;
3. Watchlist — six explicit same-tab stable refs with current-truth re-resolution;
4. Chronicle lenses — exactly `Highlights · Recent · Conflict · Rule`, capped and deterministic;
5. canonical real-browser World Stories path joining gameplay causality, Event Card, retained cause, map navigation, memory, story trail and lens round-trip while read-only story state remains outside authority.

Detailed backlog: [`docs/backlog/v0.5.md`](backlog/v0.5.md). Release QA: [`docs/demos/v0.5.0.md`](demos/v0.5.0.md). Release notes: [`docs/releases/v0.5.0.md`](releases/v0.5.0.md).

Release identity: tag `v0.5.0` points at commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`.

### Deliberate stop
No AI-authored canonical facts, required AI summary, replay/rewind, graph/database infrastructure, semantic search, relevance scoring, analytics dashboard, cloud Watchlist sync, new God Powers, ecology research or renewed civilization-depth breadth.

---

## v0.6.0 — Living Ecology
**Status: shipped. Primary fantasy: “I can watch animal populations and vegetation affect each other, and see predation change that living system.”**

### Shipped scope
1. Supported Living Ecology preset — canonical 24×24 world, exact 10-founder deterministic natural Grazer initializer, natural reproduction + gradual old age, no hidden reseed;
2. Grazer + Wolf creature surface — exactly two shipped creature identities, shared selection/inspection/reference path and distinct visuals;
3. authoritative Wolf predation — deterministic hunger, bounded prey search, one-tile chase, one-prey hunt/feeding, starvation and explicit causal history;
4. ecology readability — current behavior Inspector, compact authoritative `🌿 N%`, readable predation Pulse/Recent/Event Card and truthful dead-prey/current-Wolf navigation;
5. canonical Living Ecology gate — fixed seed45 pressure→recovery checkpoints, fixed Wolf continuation, byte-repeatability, Y40 save→load continuation and one full production Chromium release path.

Detailed backlog: [`docs/backlog/v0.6.md`](backlog/v0.6.md). Release QA: [`docs/demos/v0.6.0.md`](demos/v0.6.0.md). Release notes: [`docs/releases/v0.6.0.md`](releases/v0.6.0.md).

### Release identity
- implementation freeze `ac94bd0bfa59790f959c02c261c3506c378fb26d`;
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb` targets exactly the release commit;
- GitHub Release, release workflow #10, CI #748, Pages #50/public `/play/` and visual-qa #247 verified;
- post-release closeout #239 merged without moving release identity; CI #750, Pages #51 and visual-qa #248 green.

### Deliberate stop
No universal fauna initializer, equilibrium controller, hidden rescue/reseed, Wolf reproduction/natural founders, additional species/generic food web, disease/climate/genetics, ecology dashboard, new God Power or renewed civilization/economy breadth.

---

## v0.7.0 — Scenario Builder & Sharing
**Status: planning gate active. Release gate #240.**

**Primary fantasy: “I can assemble a world setup, send it to someone else, and we both start from exactly the same world before running or forking different histories.”**

v0.7 deliberately starts with a **Scenario Recipe**, not a full map painter. It turns the shipped deterministic startup/command architecture into a portable player workflow before adding authoritative terrain mutation or community infrastructure.

### Planned finite scope
1. **Versioned Scenario Recipe** — compact validated `seed + preset + ordered Human/Grazer/Wolf placement actions + name`; current 24×24/40y Sandbox/Living Ecology startup semantics are reused exactly;
2. **Scenario Setup workspace** — explicit paused setup mode, three placement identities, compact recipe summary, Run and deterministic rebuild boundaries;
3. **Portable share/import/export** — canonical JSON + `scenario=` share URL, fresh-tab exact reconstruction, no snapshot/cloud state;
4. **Replay + Fork** — Replay rematerializes exact recipe start; Fork creates an editable copy without changing imported/shared recipe identity;
5. **canonical Scenario Builder gate** — create → share/import → exact same start → Run → Replay exact start → Fork expected deterministic difference in headless + production Chromium;
6. release-only `v0.7.0` handoff after merged-main delivery verification.

Detailed finite backlog: [`docs/backlog/v0.7.md`](backlog/v0.7.md).

### Architecture boundary
- recipe is versioned startup input, never a live-world snapshot or second simulation;
- materialization reuses current world creation + authoritative commands;
- current v0.6 startup remains byte-compatible when no recipe is present;
- recipe metadata/URL codec owns no RNG/world history/snapshot state;
- Phaser is the v0.7 product surface; Legacy remains comparison-only.

### Deliberate stop
No terrain/elevation/moisture/biome/water painter, arbitrary tile/resource editing, live save-game UI, rules DSL/scripting, objectives/scoring, cloud/workshop/backend, AI-generated authority, custom map sizes or new simulation mechanics. A later builder stage may add terrain editing only after an authoritative mutation contract exists.

---

## v0.8.0 — Civilization Depth
Capability pool selected by play evidence: trade/economy, professions, culture/technology, religion, deeper politics, boats/colonization/naval conflict and richer diplomacy. This must be subdivided into bounded stages rather than implemented as a mega-sprint.

---

## v0.9.0 — Public Alpha Polish
Onboarding, settings/keybinds/accessibility, performance budgets, audio/art consistency, save compatibility, error/recovery UX, platform/touch decisions, contributor extension points and release hardening.

---

## v1.0 — Stable sandbox identity
v1.0 means a stable product/compatibility contract, not every possible feature: reproducible worlds, dependable browser play, creation/intervention + civilizations + world stories + supported ecology working together, usable causal history, save/version policy and credible supported performance.

## Current decision

1. merge the v0.7 planning-only backlog/ROADMAP/STATUS PR after normal CI;
2. only then open capability 1: **Versioned Scenario Recipe contract + deterministic materializer**;
3. do not start Scenario Setup, URL/share, terrain editing or other builder breadth in parallel;
4. no implementation is accepted unless it advances the finite loop `compose → share/import → exact same start → Run → Replay/Fork`.
