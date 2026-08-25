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

Detailed finite backlog: [`docs/backlog/v0.3.md`](backlog/v0.3.md). Release QA: [`docs/demos/v0.3.0.md`](demos/v0.3.0.md).

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
**Status: implementation complete; release candidate packaging/publication in progress under #237. Primary fantasy: “I can watch animal populations and vegetation affect each other, and see predation change that living system.”**

### Promise
Turn authoritative Grazer/resource mechanics into one supported visible ecology experience and add exactly one predator relationship without introducing a second renderer-side ecology model or hidden survival controller.

### Shipped implementation scope
1. **Supported Living Ecology preset** — canonical 24×24 world, exact 10-founder deterministic natural Grazer initializer, natural reproduction + gradual old age, no hidden reseed;
2. **Grazer + Wolf creature surface** — exactly two shipped creature identities, shared selection/inspection/reference path and distinct visuals;
3. **authoritative Wolf predation** — deterministic hunger, bounded prey search, one-tile chase, one-prey hunt/feeding, starvation and explicit causal history;
4. **ecology readability** — current behavior Inspector, compact authoritative `🌿 N%`, readable predation Pulse/Recent/Event Card and truthful dead-prey/current-Wolf navigation;
5. **canonical Living Ecology gate** — fixed seed45 pressure→recovery checkpoints, fixed Wolf continuation, byte-repeatability, Y40 save→load continuation and one full production Chromium release path.

Detailed backlog: [`docs/backlog/v0.6.md`](backlog/v0.6.md). Release QA: [`docs/demos/v0.6.0.md`](demos/v0.6.0.md). Release notes: [`docs/releases/v0.6.0.md`](releases/v0.6.0.md).

### Canonical release evidence
Frozen natural trajectory:
- Y34: `136 Grazers · 34.31% vegetation · 150 natural births`;
- Y40 trough: `116 · 17.50% · 156`;
- Y50 recovery: `68 · 37.44% · 160`.

The permanent headless gate runs uninterrupted, duplicate and Y40 snapshot→restore paths and requires byte-identical final authority. After Y50, fixed QA Wolf #171 at `(0,8)` first moves to `(1,9)` and predates Grazer #110. Production Chromium reproduces Y40→Y50 through ordinary Time controls and exposes the hunt through Pulse, Recent, Event Card and current Wolf Inspector while paused presentation remains read-only.

Implementation freeze commit: `ac94bd0bfa59790f959c02c261c3506c378fb26d`; merged-main CI #740, Pages #47/public `/play/` and full visual-qa #239 are green.

### Deliberate stop
No universal 16×16–48×48 initializer, equilibrium/minimum-population controller, hidden rescue/reseed, natural Wolf-founder policy, Wolf reproduction/packs, additional species/generic food web, disease, seasons/climate, genetics/evolution, plant-species model, ecology dashboard/heatmap, new God Power or renewed civilization/economy/religion/technology breadth.

### Publication gate
v0.6 feature behavior is frozen. The release-only handoff may change package/docs only. It must verify final release-PR CI + full Chromium, then after merge verify release workflow/tag/GitHub Release, merged-main CI, full Chromium, Pages deploy and final public `/play/` before #223 is closed.

---

## v0.7.0 — World Builder & Scenarios
**Status: reserved next planning direction; blocked until v0.6.0 publication is verified.**

Potential capability pool: world-generation UI, terrain/biome/life/civilization brushes, named scenarios/rules, save/import/export/share metadata, capture helpers and community-scenario groundwork. Exact scope must be planned as a finite release gate after v0.6 closes rather than inherited as a mega-sprint.

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

**v0.6 implementation is frozen. Release-only handoff #237 / PR #238 is the sole active queue.** No v0.7 feature/planning work begins until package `0.6.0`, annotated tag, GitHub Release, merged-main CI, full Chromium, Pages deploy and final public `/play/` are verified and #223 closes.
