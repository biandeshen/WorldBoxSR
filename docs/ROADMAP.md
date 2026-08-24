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

It is the foundation to preserve, not the visual/product quality target.

---

## v0.2.0 — Playable World

**Current target. Primary fantasy: “this already feels like a living god game.”**

### Promise

Transform the public demo from debug visualization into a coherent playable pixel world before adding broad simulation systems.

### Core scope

- Phaser 4 presentation over the existing deterministic engine;
- Vite browser/dev/Pages build;
- coherent pixel terrain, coast/depth, vegetation and variation;
- recognizable animated/interpolated humans and grazers;
- settlement buildings/growth cues, names and territory presentation;
- game-first HUD, time controls and compact power dock;
- immediate visual/audio feedback for core powers;
- default showcase scenario that is interesting immediately;
- contextual inspection and lightweight visible event notifications.

### Exit gates

- **5-second:** terrain, living units, settlement presence and god controls are obvious without docs;
- **30-second:** a legible world change/event occurs in the default scenario or after an obvious speed-up;
- **comparison:** a screenshot/video comparison is materially more game-like than the v0.1 baseline;
- full deterministic regression/save-load/smoke and Pages build remain green.

### Non-goals

- full kingdom/diplomacy/war simulation;
- new ecology research or universal fauna persistence;
- final bespoke art production pipeline;
- huge feature count.

---

## v0.3.0 — Civilizations Rise

**Primary fantasy: “I can watch small settlements become rival powers.”**

### Promise

Turn existing settlement/territory/history foundations into visibly distinct political actors whose expansion and conflict can be watched from the map.

### Intended scope

- polity/kingdom formation from settlements;
- colors/flags/names and political borders;
- ruler selection and succession foundation;
- readable relations: neutral/friendly/hostile, war and peace;
- visible combat groups/armies at an intentionally simple first abstraction;
- conquest, settlement transfer/destruction and rebellion seed mechanics;
- civilization event notifications and causal history integration;
- one canonical “two powers rise and collide” scenario.

### Exit gate

From a fresh showcase scenario, a viewer can follow two distinct powers from settlement identity through expansion and at least one political/conflict transition without opening debug metrics.

### Non-goals

- deep economy/trade/religion/technology;
- sophisticated tactics;
- naval warfare beyond any minimal colonization prerequisite.

---

## v0.4.0 — God Power Sandbox

**Primary fantasy: “intervening is fun even before I care about the simulation.”**

### Promise

Make creation/destruction/manipulation a satisfying toy with strong feedback and meaningful world consequences.

### Intended scope

- polished power categories, hotbar/tooltips/target previews;
- creation powers: spawn life, fertility/rain and selected terrain/biome tools;
- destruction powers: lightning, fire, meteor and a small set of high-spectacle disasters such as tornado/plague;
- social manipulation candidates: bless/curse/trait changes and simple war/peace/rebellion influence;
- particles, decals, animation, sound and camera feedback;
- powers recorded into causal world history;
- scenario built around repeated intervention.

### Exit gate

A first-time player can discover and use multiple powers without instructions and each core power has immediate readable feedback plus an authoritative downstream consequence.

---

## v0.5.0 — World Stories

**Primary fantasy: “this world has a history I can follow and remember.”**

### Promise

Turn WorldBoxSR's existing causal-history advantage into the project's signature player feature.

### Intended scope

- game-first chronicle/event cards instead of debug-first history text;
- causal drill-down: what happened, who/where, and why;
- favorites/bookmarks for people, settlements and kingdoms;
- ruler/dynasty/settlement/kingdom story views using authoritative history/ancestry;
- important-event notifications and map focus;
- timeline navigation and event bookmarks;
- replay/rewind prototype if checkpoint/state architecture proves practical;
- optional AI-generated summaries only from recorded facts, never as authoritative state;
- “follow one civilization through history” showcase scenario.

### Exit gate

After a multi-decade run, a player can identify at least one important rise/fall/conflict story and trace its recorded causes without reading raw JSON/source code.

---

## v0.6.0 — Living Ecology

**Primary fantasy: “the environment and animal life form a visible system around civilizations.”**

### Promise

Return to the preserved grazer research only after the main god/civilization/story loops are compelling.

### Intended scope

- explicit natural-fauna activation for declared supported scenarios/map classes;
- multiple visibly distinct animal species;
- biome affinity/migration/resource pressure;
- predation/food-web foundation where product-visible;
- disease/environment interaction candidates;
- deterministic initialization/save-load for supported configurations;
- ecology overlays/inspection that explain visible changes;
- preserve coherent extinction: no hidden survival controller.

### Exit gate

A player can visually distinguish at least one ecology-driven population/environment cycle and understand its major causes through normal play/inspection.

### Non-goal

Universal persistence across every seed/map remains unnecessary.

---

## v0.7.0 — World Builder & Scenarios

**Primary fantasy: “I can author an experiment and share the starting point.”**

### Intended scope

- world-generation configuration UI;
- terrain/biome/life/civilization brushes;
- named scenario presets and rule bundles;
- save/import/export and shareable seed/scenario metadata;
- scenario thumbnails/descriptions;
- time-lapse/screenshot capture helpers;
- groundwork for community map/scenario discovery.

### Exit gate

A player can construct or choose a scenario, reproduce it from its saved definition, and share enough metadata for another player to run the same starting world.

---

## v0.8.0 — Civilization Depth

**Primary fantasy: “different civilizations develop differently, not just in color.”**

Candidate scope, selected by prior play evidence rather than all at once:

- trade/economy and resource exchange;
- professions/building specialization;
- culture/technology progression;
- religion/belief systems;
- deeper ruler/clan politics;
- boats, colonization and naval conflict;
- distinct peoples/races/cultures when supported by coherent mechanics;
- richer diplomacy and war strategy.

This version must be subdivided into bounded stages; the list is a capability pool, not a single mega-sprint.

---

## v0.9.0 — Public Alpha Polish

**Primary fantasy: “I can hand this to someone who did not watch development.”**

### Intended scope

- onboarding/default scenarios;
- settings, keybinds and accessibility options;
- performance budgets/LOD across supported browsers and representative devices;
- audio/music/art consistency pass;
- save compatibility/migration policy;
- error/recovery UX;
- mobile/touch decision and hardening if included;
- contributor/mod/data extension points chosen from actual community needs;
- release packaging/docs and stable public demo.

### Exit gate

A new user can open the public build, understand what to do, create/watch/intervene in a world, save/reload it and discover the chronicle without developer guidance.

---

## v1.0 — Stable sandbox identity

`v1.0` does **not** mean every possible god-game system is complete. It means WorldBoxSR has a stable identity and compatibility contract:

- reproducible authoritative worlds;
- dependable browser play loop;
- creation/intervention, civilizations and world stories all work together;
- causal history is a signature usable feature;
- saves/versioning have a documented policy;
- supported performance targets are credible;
- future ecology/civilization/mod breadth can expand without redefining what the product is.

## Current decision

Product discovery #151 governs sequencing. Until its blueprint is merged, feature work is paused except correctness/live-demo blockers. After merge, **v0.2 Playable World** begins with the Phaser/Vite presentation vertical slice; Living Ecology is intentionally delayed to v0.6 rather than allowed to consume the near-term roadmap again.
