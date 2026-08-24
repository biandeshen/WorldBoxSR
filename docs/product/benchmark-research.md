# Benchmark and competitor research

- Date: 2026-08-24
- Discovery issue: #151
- Purpose: decide product direction and implementation priorities before restarting feature work.

## Research method

This pass compares four kinds of evidence:

1. official product positioning and visible feature emphasis;
2. community behavior — what people watch, create, request and remember;
3. adjacent/open-source god games and simulations;
4. rapid AI-built game prototypes and current browser game technology.

The goal is not to copy feature counts. It is to identify the shortest path to a compelling experience and where WorldBoxSR can differentiate.

## User-specified three-hour benchmark

Required benchmark:

- https://www.bilibili.com/video/BV1iSGP6BEFW/

Automated web retrieval returned a cache miss and searches for the BV identifier produced no indexed metadata during this pass. Therefore this document **does not claim to have watched or reverse-engineered the video**. It remains a named benchmark to revisit if the user supplies screenshots/transcript or the URL becomes retrievable.

The user's key observation is still actionable: a rapid replica can deliver much stronger first-impression quality in a few hours than WorldBoxSR v0.1. That means our process must explicitly optimize time-to-visible-result instead of assuming infrastructure/simulation depth will create product quality automatically.

## WorldBox: what the product sells visibly

Official WorldBox store positioning emphasizes the fantasy of an ultimate god sandbox and repeatedly foregrounds visible systems: creating life, civilizations forming kingdoms, colonizing land, sailing, diplomacy, rebellion/war, destruction through powers and disasters, and procedural worlds.

Sources:

- https://store.steampowered.com/app/1206560/WorldBox__God_Simulator/
- https://play.google.com/store/apps/details?id=com.mkarpenko.worldbox

### Product implication

WorldBox's important systems are not merely deep; they are **legible from the world view**. A kingdom expanding, a city burning, a boat crossing water or a meteor impact creates an immediate visual story.

WorldBoxSR should not use feature parity as the first milestone, but it should copy this product principle: important systems need a visual manifestation.

## Content/community pattern: scenario stories are the retention engine

High-interest WorldBox videos commonly frame the game as an experiment or story rather than a free-form feature tour — for example worlds under extreme temperature, civilizations fighting, zombies/apocalypse scenarios, or letting a world evolve for hundreds/thousands of years.

Representative indexed Bilibili/search examples found during research include:

- "当太阳熄灭，世界会如何发展？"
- high-temperature apocalypse experiments;
- ancient civilization war scenarios;
- zombie-era/world-alliance scenarios;
- long unattended world-evolution/time-lapse runs.

### Product implication

A strong God Sandbox is also a **scenario generator**. Our default demo should not open as an empty technical sandbox. It should offer one or more immediately interesting setups and later make them reproducible/shareable.

This also gives deterministic simulation a direct product use: the same scenario can be replayed with the same seed or compared after different god interventions.

## Community wishes and pain points

Recent WorldBox community discussions repeatedly value:

- watching civilizations rise and fall;
- lore/history/important characters and rulers;
- wars, politics and deeper civilization progression;
- bigger/more varied maps and biomes;
- naval/colonization depth;
- trait editing/debug-like creative controls;
- scenarios and self-imposed challenges;
- replay/rewind/history ideas.

They also criticize systems that feel shallow or invisible — ecology/animals that disappear without interesting interaction, and civilization systems that stop progressing meaningfully.

### Product implication

The earlier WorldBoxSR roadmap over-weighted fauna persistence research. Civilization/story/power visibility should precede broad ecology depth. Earlier grazer research remains useful later but should not occupy the next product stage.

## Adjacent games

### Reus 2

Reus 2 focuses on gods/giants shaping worlds, biomes/ecosystems and human civilizations with leaders, relationships, trade and war.

Source: https://store.steampowered.com/app/1875060/Reus_2/

Lesson: world shaping becomes more meaningful when environmental choices are visibly tied to civilization outcomes.

### The Universim

The Universim combines god powers, civilization advancement, planetary ecology and progression across ages/worlds.

Source: https://store.steampowered.com/app/352720/The_Universim/

Lesson: intervention needs a satisfying power layer, while long-running civilization change creates reasons to observe.

### Galimulator

Galimulator emphasizes the aquarium/spectator pleasure of empires rising/falling, wars, revolutions, politics and multiple player roles.

Source: https://store.steampowered.com/app/808100/Galimulator/

Lesson: spectatorship itself can be a main game loop if macro-state changes are visually obvious and stories emerge quickly.

## Open-source / AI-adjacent projects

### Microverse In Box

Repository: https://github.com/KsanaDock/Microverse

This Godot 4 project presents an AI/social simulation with a much more game-like shell and coherent pixel assets. The main lesson for WorldBoxSR is not to copy its AI architecture; it is that a simulation becomes dramatically more credible to players when map selection, character art and UI share one visual language.

### Browser/headless god-sim projects

Other public projects demonstrate that simulation breadth alone does not guarantee product appeal. Text/control-room/browser projects can contain many concepts but still feel like tools unless the visual interaction loop is strong.

### Product implication

The visible shell should be treated as first-class architecture. It is not the final polish phase.

## Rapid AI prototype evidence

A useful external rapid-prototyping example is Pieter Levels' browser flight game, built rapidly with AI assistance and Three.js. Public accounts describe an initial playable prototype within hours, followed by rapid visible additions such as combat/effects/multiplayer.

The exact project is not a WorldBox replica, but the process lesson transfers:

1. select a mature visual/game primitive stack;
2. build one end-to-end playable slice immediately;
3. evaluate in the browser continuously;
4. prioritize high-feedback visible features;
5. accept that prototype architecture may need cleanup after proving the experience.

This is the inverse of WorldBoxSR v0.1's process, where deep simulation/research accumulated before the visible experience was validated.

## Rendering stack research

### Phaser 4

Current official release checked during research: **Phaser 4.2.1**, released 2026-07-09.

Sources:

- https://phaser.io/download/release/v4.2.1
- https://docs.phaser.io/api-documentation/4.0.0/class/tilemaps-tilemapgpulayer
- https://phaser.io/news/2026/05/phaser4-spritegpulayer-performance

Relevant capabilities:

- complete browser game framework rather than renderer only;
- scenes, camera, input, sprites, animation, tweens, tilemaps, audio and effects;
- high-performance TilemapGPULayer for large orthographic maps;
- SpriteGPULayer for very large mostly-static/structured sprite sets;
- ordinary sprites remain appropriate for active characters.

Fit: **best current choice for WorldBoxSR presentation** because we need many game-level primitives immediately and want to preserve the JS/browser architecture.

### PixiJS 8

Sources:

- https://pixijs.com/8.x/guides/components/scene-objects/particle-container
- https://pixijs.com/blog/particlecontainer-v8

Strengths:

- extremely capable high-performance 2D rendering;
- ParticleContainer can render huge lightweight visual populations;
- flexible lower-level rendering architecture.

Tradeoff for us: PixiJS is primarily a renderer/scene graph, so we would write or integrate more camera/input/game-animation/tilemap/FX infrastructure ourselves. That flexibility is attractive for a custom engine, but currently conflicts with the product goal of fastest time-to-game-feel.

Decision: strong fallback if Phaser becomes constraining; not first choice for v0.2.

### Godot 4 Web

Source:

- https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_web.html

Strengths:

- excellent full editor/game-engine workflow;
- mature 2D scene/UI tooling;
- strong ecosystem for pixel games.

Costs for this project:

- current authoritative core and automation are JavaScript/Node;
- migration would create a second language/engine integration boundary or require a rewrite;
- web exports rely on WebAssembly + WebGL2 compatibility mode;
- Godot documents web-specific thread/hosting/browser limitations;
- C# Godot 4 projects cannot currently export to web.

Decision: viable for a new project, but too expensive a migration for WorldBoxSR's browser-first public demo compared with Phaser.

## Build tooling

Vite 8 became stable in March 2026 and uses Rolldown as its unified bundler. Vite 8.1 followed in June 2026.

Sources:

- https://vite.dev/blog/announcing-vite8
- https://vite.dev/blog/announcing-vite8-1

Fit: replace the custom static-copy Pages build when the Phaser presentation spike begins. Vite provides normal dependency/assets handling, fast dev feedback and a conventional production build for Pages.

## Asset strategy

### Legal prototype assets

Kenney states that its game assets are CC0/public-domain licensed and attribution is not required.

Source: https://kenney.nl/support

OpenGameArt and itch.io also contain useful CC0 sets, but each asset pack must be checked individually and its provenance recorded.

### Recommended pipeline

1. v0.2 spike: use one coherent CC0 prototype set (or a deliberately small combination) to validate scale/palette/readability quickly.
2. Record `source`, `author`, `license`, `download date`, and modified files in an asset manifest even for CC0.
3. Do not use/rip WorldBox art, sounds, branding or proprietary maps.
4. Once gameplay composition works, replace prototype art with original/generated art under a consistent art bible rather than generating unrelated assets ad hoc.
5. Original AI-generated assets are acceptable only when provenance/style consistency is managed and they are reviewed as product art, not dumped directly into the repo.

## Why Phaser + existing simulation core wins this decision

| Criterion | Current Canvas | Phaser 4 | PixiJS 8 | Godot 4 Web |
| --- | ---: | ---: | ---: | ---: |
| Preserve JS simulation core | Excellent | Excellent | Excellent | Poor/Medium |
| Fastest path to game primitives | Poor | Excellent | Medium | Excellent after migration |
| Browser/Pages fit | Excellent | Excellent | Excellent | Medium |
| Camera/input/animation/audio included | Hand-built | Yes | Partial/hand-built | Yes |
| Tile/sprite scale headroom | Medium | Excellent | Excellent | Good |
| Migration cost | None | Low/Medium | Low/Medium | High |
| AI/code-agent friendliness | Good | Excellent | Excellent | Medium |
| Recommended now | No as primary renderer | **Yes** | Fallback | No migration now |

## Product sequencing conclusion

The original `v0.2 Living Ecology` ordering was not supported by product evidence. Recommended order is:

1. **Playable World** — first-impression quality and god-game shell.
2. **Civilizations Rise** — visible political expansion/conflict.
3. **God Power Sandbox** — richer intervention and spectacle.
4. **World Stories** — causal chronicle/replay as differentiation.
5. **Living Ecology** — multiple species/environment after the core loop is compelling.
6. **World Builder & Scenarios** — creation/shareability.
7. **Civilization Depth** — trade/culture/tech/religion/naval depth.
8. **Public Alpha Polish** — compatibility/onboarding/performance/accessibility/mod hooks.

This ordering is deliberately biased toward player-visible leverage, not subsystem dependency purity.

## Research conclusions that are now binding

- Do not restart compact-grazer research during v0.2.
- Do not rewrite the deterministic kernel merely to adopt a renderer.
- Adopt a mature game presentation stack before adding civilization breadth.
- Use the Pages demo as the product truth surface.
- Every product sprint should answer: **what does the player see/do now that they could not see/do before?**
- Scenario/storytelling capability is a core product pillar, not end-stage marketing polish.
- Causal history is our strongest existing differentiator and should be surfaced as a game feature.
- The inaccessible Bilibili benchmark remains an explicit follow-up; do not fabricate its contents.
