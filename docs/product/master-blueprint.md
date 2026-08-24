# WorldBoxSR master product blueprint

- Status: product baseline for post-v0.1 development
- Date: 2026-08-24
- Discovery issue: #151

## Executive decision

WorldBoxSR is not trying to win by reproducing every WorldBox mechanic first. It should become a **living pixel god sandbox where worlds visibly grow, collapse, and remember why**.

The project keeps its existing deterministic simulation core as a strategic asset, but product progress is measured by the public playable experience. Simulation rigor is a safety/depth layer; it is not a substitute for visible game quality.

The three things the product must deliver together are:

1. **A living world at a glance** — the map, units, settlements, motion and change are readable and attractive without documentation.
2. **A satisfying god hand** — creation and destruction tools respond immediately with strong visual/audio feedback.
3. **Emergent world stories with memory** — civilizations and individuals create histories that are visible now and explainable later through causal chronology.

The differentiator is the third pillar. WorldBoxSR already records deterministic causal history. That should become a player-facing chronicle/replay/story system rather than remaining a debug metric layer.

## Product identity

### One-sentence promise

> Create a world, watch civilizations and life change it, intervene like a god, and later understand exactly how its history happened.

### We are

- a browser-first pixel-art god sandbox;
- an observer toy and an intervention toy;
- a civilization/world-story generator;
- a deterministic simulation that supports replayable experiments;
- a personal open-source project that may grow through community maps/scenarios/mods later.

### We are not

- a one-to-one WorldBox clone;
- a demographic research dashboard with a game attached;
- a promise to simulate every real-world system accurately;
- a survival controller where all species/civilizations must persist;
- an AI-chat game whose authoritative world state is invented by an LLM.

## Target player fantasies

### The observer

"I want to create a world, speed it up, and watch surprising history happen without micromanaging."

### The experimenter

"What happens if I put two kingdoms on opposite islands, add a plague, or bless one ruler?"

### The storyteller

"I want to remember the village that became an empire, the ruler who caused a war, and why the dynasty collapsed."

### The destroyer/creator

"I want powers that are fun to use even before I care about the simulation — lightning, fire, meteor, terrain shaping, spawning life."

### The builder

"I want to create maps/scenarios, save them, share them, and see other people run different histories from the same setup."

## Core product loops

### 1. Observe loop

Create/reset world → scan map → notice movement/growth/conflict → inspect an interesting entity/settlement → accelerate time → see consequences.

The loop fails if important changes are only numbers in a HUD.

### 2. God-hand loop

Select power → preview target/brush → apply → immediate audiovisual feedback → authoritative world consequence → history records the intervention → watch secondary effects.

The loop fails if a power feels like editing a database cell.

### 3. Civilization loop

Small settlement → visible growth → identity/flag → territory → leader → relations → expansion/conflict → conquest/rebellion/collapse → persistent historical record.

The loop fails if "kingdom" is only a label without visible causality.

### 4. Story loop

Notice person/place/event → favorite/bookmark it → history feed explains changes → causal drill-down reveals prior causes → later revisit/replay/compare the story.

### 5. Scenario loop

Choose/create setup → run deterministic experiment → intervene or observe → save/share seed/scenario → rerun from same start with different interventions.

## Product pillars and non-negotiable principles

### Pillar A — game-first readability

- The world canvas owns the screen; debug information is secondary.
- Terrain, units, settlements, borders, danger and powers need distinct silhouettes/colors/icons.
- Motion should interpolate visually even when authoritative simulation remains tile/tick based.
- Zoom levels need semantic LOD rather than merely scaling the same primitives.

### Pillar B — immediate feedback

- Important actions need particles, animation, sound and/or camera response.
- The effect should begin immediately; simulation consequences may unfold afterward.
- Powers need visible targeting and obvious tool state.

### Pillar C — emergent depth, not invisible complexity

- New simulation depth is valuable when it creates new visible behavior, new intervention consequences, or new stories.
- A technically interesting subsystem that changes none of those is later/research work.

### Pillar D — causal memory

- Player-facing history must distinguish event, actor, place and cause.
- Deterministic event IDs and causal references remain authoritative.
- AI may summarize/narrate recorded facts later, but may not invent authoritative history.

### Pillar E — sandbox agency

- Extinction, collapse, failed states and weird worlds are allowed if coherent.
- The player can make worlds unfair on purpose.
- Defaults should create interesting activity quickly; they do not need to guarantee eternal balance.

### Pillar F — fastest credible implementation path

- Reuse mature game/rendering/build libraries when they reduce time-to-visible-quality.
- Do not rewrite the deterministic core to satisfy framework preference.
- Prototype with legally reusable coherent assets, then replace with original art deliberately.

## Session design

### First 5 seconds

Without reading documentation, a viewer should identify:

- water/land/vegetation or biome structure;
- living units;
- at least one settlement/civilization cue;
- pause/speed controls;
- a god-power/tool affordance.

### First 30 seconds

The default showcase world should produce at least one legible change: building growth, birth/death notification, settlement expansion, migration, conflict, power effect or similar. A clearly visible speed control may be used.

### First 5 minutes

A new player should be able to:

- use several powers;
- inspect a person/settlement;
- witness a meaningful world event;
- understand that history is being recorded;
- restart with a different seed/scenario.

## Product modes

These are experience modes, not necessarily separate main-menu screens initially.

| Mode | Purpose | Near-term form |
| --- | --- | --- |
| Sandbox / Creative | Main god-game loop | Default mode, powers + world controls |
| Observer | Hands-off aquarium/time-lapse | Hide/minimize tools, speed-first UI |
| Scenario / Experiment | Reproducible setups with goals/questions | Preset cards + seed/rules |
| Chronicle / Replay | Understand what happened | Timeline/causal layer over any world |
| World Builder | Author maps/scenarios | Later dedicated editing UX |

## Visual and interaction direction

### Art direction

Target a coherent original pixel-art language, not copied WorldBox assets.

- orthographic top-down world;
- readable 16–32 px class of tiles/sprites, chosen after prototype tests;
- palette-based terrain families rather than flat HSL debug colors;
- coastline/water-depth variation;
- biome/vegetation clusters with tile variation;
- tiny but recognizable animated humans/animals;
- settlement buildings that visibly progress in scale/stage;
- flags/banners/border overlays for political identity;
- effects layer for lightning/fire/meteor/weather/status;
- crisp nearest-neighbor rendering at pixel zooms.

### Interface hierarchy

1. World canvas.
2. Bottom/edge power dock and time controls.
3. Contextual selection card.
4. Event notifications / chronicle affordance.
5. Optional overlays/debug/advanced metrics.

The current large always-visible debug HUD is not the target UI.

## Complete feature universe

This is a planning universe, **not a promise to ship every item**. Status meanings:

- **Core** — necessary to establish product identity.
- **Planned** — belongs in a named pre-1.0 stage.
- **Later** — useful after the main identity works.
- **Research** — investigate only when a product question justifies it.

| Domain | Features | Priority |
| --- | --- | --- |
| World rendering | terrain tiles, coast/depth, biome variants, vegetation, elevation cues, overlays, zoom LOD | Core |
| World generation | seeds, procedural continents/islands, biome distribution, showcase presets | Core |
| Time | pause, speed levels, deterministic time, time-lapse friendliness | Core |
| Humans | animated sprites, movement, needs, lifecycle, traits/status, inspection | Core |
| Animals | visible species, movement, lifecycle; broader ecology later | Core → Planned |
| Settlements | buildings/stages, settlement names, centers, population/growth cues, readable territory | Core |
| Kingdoms/polities | formation, flag/color, ruler, borders, expansion | Planned |
| Diplomacy | relations, alliance/war/peace, readable state changes | Planned |
| Warfare | armies/combat, conquest, destruction, rebellion | Planned |
| Colonization | migration, new settlements, later boats/naval travel | Planned/Later |
| Economy | food/resources, jobs, trade, production chains | Later |
| Culture/tech/religion | identities, progression, beliefs, technologies | Later |
| Ecology | natural fauna, multiple species, predation, biome affinity, disease, food webs | Later |
| God creation powers | spawn humans/animals, rain/fertility, terrain/biome brushes | Core/Planned |
| God destruction powers | lightning, fire, meteor, tornado, plague; extreme powers later | Core/Planned |
| Social powers | bless/curse/traits, force peace/war/rebellion later | Planned |
| Power UX | toolbar, categories, targeting preview, brushes, cooldown-free sandbox feel, hotkeys | Core |
| Effects | particles, animation, audio, screen/camera feedback, decals/fire/smoke | Core |
| Inspection | contextual entity/tile/settlement/kingdom cards | Core |
| Chronicle | event feed, causal chain, filters, bookmarks/favorites | Core → Planned |
| Genealogy | ancestry/dynasty views built from existing data | Planned |
| Replay | event bookmarks, timeline scrub/rewind if architecture permits | Planned/Research |
| Scenario system | named presets, seed/rules, deterministic starting states | Core → Planned |
| Save/share | save/load, import/export, shareable seed/scenario URL | Planned |
| Creation | world painter, terrain/biome brush, scenario editor | Later |
| Community | map/scenario sharing, workshop-like discovery, mods | Later |
| Accessibility | scalable UI, readable contrast, reduced shake/flashes, input settings | Planned |
| Audio | power SFX, ambient world, event stingers, music | Core → Planned |
| Performance | browser/mobile-aware rendering, simulation budgets, LOD | Continuous |
| AI narration | summarize recorded causal history, scenario flavor text | Research/Later |
| AI authority | letting an LLM invent canonical simulation state | Explicitly not now |

## Existing systems: keep, expose, defer, replace

### Keep as authoritative core

- seeded deterministic world/ticks;
- serializable RNG;
- terrain/resource state;
- human lifecycle and ancestry;
- settlement/territory state;
- causal history IDs/references;
- deterministic commands and god interventions;
- save/load continuation;
- headless CLI/Simulation Lab/tests;
- typed creature domain and validated grazer mechanics.

### Expose differently

- history becomes chronicle/event cards/causal drill-down rather than primarily raw text/debug data;
- territory becomes visible political/settlement overlays;
- human/creature state becomes sprite/status feedback;
- settlement population becomes buildings, density and growth feedback;
- resource changes become terrain/vegetation and contextual overlays.

### Defer

- universal fauna persistence/initializer research;
- broad ecology tuning;
- sophisticated demographic classifiers;
- deeper observability that has no player-facing use.

### Replace/refactor presentation

- flat HSL tile renderer;
- circles for humans and squares for grazers;
- cell-jump visual movement;
- permanent developer HUD as the primary UI;
- hand-built Canvas plumbing when the game framework provides a better primitive.

## Technical architecture boundary

The authoritative core remains framework-independent JavaScript. Presentation consumes state/events and must not become a second source of truth.

```text
engine/ authoritative deterministic simulation
        ↓ snapshots / events / commands
client/presentation-adapter
        ↓
Phaser 4 presentation
  terrain/tilemap
  sprites + interpolation
  buildings/flags/borders
  particles/lighting/FX
  camera/input
        +
HTML/CSS UI for menus, inspector, chronicle where appropriate
        ↓
Vite build → GitHub Pages
```

Detailed technology rationale lives in `docs/decisions/0003-presentation-stack.md`.

## Release philosophy

A version is a **player-visible capability checkpoint**, not a count of completed research tasks.

Every pre-1.0 release must declare:

- one primary player fantasy it unlocks;
- a public Pages demo path;
- visible acceptance gates;
- explicit non-goals;
- regression/performance gates;
- at least one representative scenario used for product QA.

No version is complete merely because automated tests are green.

## Product gates used across versions

### Screenshot gate

Every visual/game-feel PR includes before/after evidence or an equivalent reproducible visual artifact.

### Scenario gate

Each version maintains one or more canonical scenarios that demonstrate its promise quickly.

### Determinism gate

Presentation changes may interpolate/animate freely but may not silently mutate authoritative simulation state outside commands.

### Performance gate

Track representative map sizes and entity counts; profile before introducing architecture-wide optimization.

### Story legibility gate

For major events, a player should be able to answer "what changed?" and, when history data exists, "why?" without reading source code.

## Open product questions

These are intentionally unresolved rather than silently assumed:

- final pixel tile/sprite scale and palette;
- how much of the HUD remains HTML versus Phaser UI;
- exact first civilization model and war abstraction;
- whether replay requires state checkpoints or event-driven reconstruction;
- save compatibility policy after major simulation schema changes;
- mobile/touch target date;
- licensing choice for WorldBoxSR itself;
- final original art pipeline after CC0 prototype assets;
- exact lessons from user-specified Bilibili benchmark `BV1iSGP6BEFW`, which automated retrieval could not access during this discovery pass.

## Stop rule

If work cannot plausibly improve one of these within the current version — visible world quality, player agency, story legibility, performance/correctness required by the demo — it does not automatically enter the sprint queue. Preserve the idea and defer it.
