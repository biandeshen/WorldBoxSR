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

Shipped coherent terrain/units/settlements, direct god powers with SFX/targeting, responsive camera, authoritative territory, persistent inspection, event pulse, deterministic 30-second showcase gate, Pages and real Chromium Visual QA. The legacy Canvas path remains only as a v0.2 comparison escape hatch and should retire when no concrete regression workflow still requires it.

---

## v0.3.0 — Civilizations Rise
**Status: shipped checkpoint on release merge. Primary fantasy: “I can watch small settlements become rival powers.”**

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
v0.3 does not deepen into economy/trade/religion/technology, sophisticated tactics, naval warfare, ecology research, editor/replay or broad art rewrites. Civilization depth now pauses.

---

## v0.4.0 — God Power Sandbox
**Current target. Primary fantasy: “intervening is fun even before I care about the simulation.”**

### Promise
Make the god-hand loop strong enough that creating, destroying and manipulating the world is satisfying immediately, while every meaningful consequence remains authoritative and historically traceable.

### Capability pool
- clearer power categories/tooltips and faster selection;
- creation powers beyond the current Human/Grazer baseline where they create visible world consequences;
- terrain/environment creation candidates such as rain/fertility or biome/terrain shaping;
- destructive candidates such as fire, meteor, plague or tornado, chosen by visible product value rather than feature count;
- social intervention candidates only when they reuse authoritative civilization state cleanly;
- stronger particles/decals/audio/camera feedback and truthful rejected/no-effect states;
- causal history records accepted intervention consequences and lets secondary effects remain observable.

### Guardrails
- no v0.3 civilization-depth continuation disguised as “social powers”;
- no ecology research blocker;
- no inventory/cooldown/progression system unless play evidence requires one—the sandbox should stay immediate;
- every selected power needs a visible authoritative consequence or an explicitly truthful no-effect/rejection path.

---

## v0.5.0 — World Stories
**Primary fantasy: “this world has a history I can follow and remember.”**

Game-first chronicle/event cards, causal drill-down, favorites/bookmarks, ruler/dynasty/settlement/kingdom story views, timeline navigation, replay/rewind prototype if practical, and optional AI summaries strictly derived from recorded facts.

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

**v0.3 Civilizations Rise is closed on the v0.3.0 release checkpoint. v0.4 God Power Sandbox is the only next product-development stage.** Start by strengthening the existing god-hand loop with the smallest set of powers/effects that creates visible, truthful and memorable intervention consequences. Do not reopen civilization depth, ecology or invisible analysis work as near-term blockers.
