# ADR-0003: Phaser presentation layer over deterministic JS core

- Status: Accepted for v0.2 implementation spike
- Date: 2026-08-24
- Supersedes: the **presentation dependency** implication of ADR-0002; does not supersede the framework-independent simulation-kernel decision.

## Context

ADR-0002 intentionally chose a zero-runtime-dependency Node.js prototype so the simulation could be developed and tested without prematurely coupling world rules to a game engine. That succeeded: WorldBoxSR now has a deterministic browser-compatible simulation core, save/load, commands, history and headless test/research tooling.

The first public Pages demo then exposed a different bottleneck. The hand-built Canvas presentation is too low-level for the speed and quality required by the next product stage. Continuing to build camera, animation, sprite, tilemap, effect and audio infrastructure ourselves would optimize engine purity instead of player-visible quality.

The v0.2 target is now `Playable World`. A mature presentation framework is justified by ADR-0002's own revisit trigger: the chosen client now requires a stronger integration path.

## Decision

### Authoritative simulation

Keep `engine/` in modern JavaScript with no dependency on Phaser or DOM rendering state.

- simulation ticks remain authoritative;
- keyed/sequential RNG rules remain authoritative;
- commands remain the only normal player-to-world mutation boundary;
- serialization/save versions remain owned by the simulation layer;
- headless Node tests and Simulation Lab remain supported.

### Presentation

Adopt **Phaser 4**, initially pinning a known-good 4.2.x release during the v0.2 spike.

Phaser owns presentation concerns:

- renderer/scenes;
- camera and input;
- terrain/tilemap rendering;
- unit/building sprites;
- visual interpolation/tweens;
- particles/effects;
- audio;
- presentation-only timers/animation state.

Phaser state must never silently become authoritative simulation state.

### Build/dev tooling

Adopt **Vite 8.x** for client development and production Pages builds when the presentation spike begins.

Vite replaces the custom copy-only Pages build as the normal browser bundler, while existing Node scripts/tests remain valid.

### UI

Use a hybrid approach:

- Phaser for the world, targeting, overlays and effects;
- HTML/CSS for menus, inspector, chronicle and settings when DOM UI is faster/more accessible;
- do not force all UI into either Phaser or DOM for architectural symmetry.

## State bridge

Introduce a narrow presentation adapter rather than importing Phaser throughout simulation code.

Conceptually:

```text
World simulation state/events
        ↓
Presentation adapter
  - stable entity visual IDs
  - previous/current positions for interpolation
  - terrain/territory render data
  - event→effect mapping
        ↓
Phaser scenes/game objects
```

### Visual interpolation rule

Simulation may continue moving entities in tile/tick steps. Presentation stores the previous and current authoritative positions and interpolates between them. Interpolation must not write positions back into the simulation.

### Event/effect rule

Effects such as lightning flash, particles, camera shake or notification animations may be triggered by authoritative history/command events. Effects themselves are non-authoritative and may be skipped/reduced without changing world state.

## Why Phaser instead of continuing raw Canvas

- immediately supplies game-level camera/input/sprite/animation/tween/audio/effect primitives;
- current Phaser 4 includes high-performance tile/sprite rendering options for large 2D worlds;
- keeps the project in JavaScript/browser tooling;
- reduces custom plumbing and allows AI development effort to target art/game feel.

## Why not PixiJS first

PixiJS 8 is an excellent high-performance renderer and remains an escape hatch if Phaser becomes restrictive. However, choosing it now would leave more game-level systems — camera conventions, animation/game objects, tilemap integration, input patterns and effects orchestration — for WorldBoxSR to assemble itself.

The current optimization target is delivery speed, not minimum framework surface.

## Why not migrate to Godot

Godot is a strong 2D engine, but a migration would impose high integration/rewrite cost on a working JavaScript deterministic core and browser/GitHub Pages pipeline. Godot web exports also introduce WebAssembly/WebGL2-specific constraints documented by Godot.

A new Godot project might reasonably choose Godot; WorldBoxSR does not gain enough to justify migration now.

## Performance strategy

Do not prematurely place every object in Phaser GPU-specialized layers.

- active humans/animals: ordinary flexible sprites first;
- mostly-static terrain: tilemap; test TilemapGPULayer where appropriate;
- large decorative/background populations/effects: evaluate GPU layers/particle systems when profiling justifies them;
- keep zoom LOD and culling in the presentation design;
- benchmark representative browsers and map/entity sizes before architecture-wide optimization.

## Asset strategy

The first presentation spike may use coherent CC0 assets (for example Kenney) with a provenance manifest. This is explicitly prototype art, not permission to ship a collage indefinitely.

Do not copy WorldBox assets, branding, sounds or proprietary map content.

## Rollout plan

1. Add Phaser + Vite without removing the existing renderer immediately.
2. Build one side-by-side vertical slice: terrain + humans + one settlement + camera + one power effect.
3. Compare visible quality/performance and capture before/after evidence.
4. If the spike passes v0.2's visual gate, make Phaser the main client and retire redundant Canvas paths incrementally.
5. Keep the simulation core and its tests unchanged except for explicit adapter interfaces.

## Revisit triggers

Reconsider Phaser only if one of these is demonstrated by evidence:

- a required world-scale rendering pattern is infeasible or performs materially worse than alternatives;
- framework lifecycle prevents clean deterministic adapter boundaries;
- bundle/browser compatibility becomes a release blocker;
- a PixiJS/custom-rendering prototype proves substantially better delivered product quality at acceptable maintenance cost.

Preference or framework novelty alone is not a revisit trigger.

## References checked during decision

- Phaser 4.2.1 release: https://phaser.io/download/release/v4.2.1
- Phaser TilemapGPULayer: https://docs.phaser.io/api-documentation/4.0.0/class/tilemaps-tilemapgpulayer
- Phaser SpriteGPULayer performance: https://phaser.io/news/2026/05/phaser4-spritegpulayer-performance
- PixiJS ParticleContainer: https://pixijs.com/8.x/guides/components/scene-objects/particle-container
- Godot web export: https://docs.godotengine.org/en/latest/tutorials/export/exporting_for_web.html
- Vite 8: https://vite.dev/blog/announcing-vite8
- Vite 8.1: https://vite.dev/blog/announcing-vite8-1
- Kenney licensing: https://kenney.nl/support
