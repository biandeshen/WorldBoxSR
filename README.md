# worldboxSR

A deterministic emergent-world god-game sandbox.

**[▶ Play the public demo](https://biandeshen.github.io/WorldBoxSR/play/)** · [Open in GitHub Codespaces](https://codespaces.new/biandeshen/WorldBoxSR)

The goal is **not** to copy WorldBox code, assets, branding, or proprietary content. The goal is to independently build a small world where simple rules create histories that are interesting underneath **and compelling to watch on screen**.

## Product identity

> **A living pixel god sandbox where worlds visibly grow, collapse, and remember why.**

Deterministic simulation is a strategic asset, not a substitute for visible game quality. If progress cannot be seen or felt in the playable demo, it does not count as enough product progress by itself.

- [Product constitution](docs/product/product-constitution.md)
- [Master product blueprint](docs/product/master-blueprint.md)
- [Benchmark and competitor research](docs/product/benchmark-research.md)
- [Certified runtime & support](docs/SUPPORT.md)
- [Release roadmap](docs/ROADMAP.md)

## Current shipped release: v0.9.0 — World Feel & Public Alpha Polish

v0.9 is a deliberate world-first pass over the already-deep deterministic sandbox:

> **Opening WorldBoxSR feels like looking at a living god-game world first: larger, more readable, visibly changing, recoverable, and usable across desktop and touch.**

Shipped scope:
- full desktop world surface beneath floating HUD chrome, with much less dead screen space;
- population-scaled settlement footprints and stronger polity borders;
- movement-driven Human/Grazer/Wolf gait plus subtle inhabited-settlement ambience;
- readable warband formations/objectives, recent battle traces, ruins and occupation/rebellion identity;
- Meteor impact memory that disappears through real vegetation recovery;
- one browser-local ordinary-world save slot using the existing engine snapshot, with paused restore and Scenario separation;
- compact 430px HUD and production touch controls: tap tool, hold inspect, drag pan, pinch zoom;
- explicit renderer failure recovery actions;
- local Reduce Motion + Mute accessibility preferences;
- isolated Phaser vendor chunk and a checked <300 KB minified app-chunk budget;
- faster PR browser smoke while `main` retains the full historical browser denominator.

Immutable release identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag `v0.9.0` / tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- GitHub Release `WorldBoxSR v0.9.0` published by release workflow #13;
- release-commit CI #929 green;
- Pages #88 green with final public `/play/` verification;
- full visual-qa #422 green, including historical v0.4–v0.8 regressions plus current mobile touch/pinch and renderer recovery.

- [v0.9 canonical browser demo / QA](docs/demos/v0.9.0.md)
- [v0.9.0 release notes](docs/releases/v0.9.0.md)
- [v0.9 finite backlog / publication audit](docs/backlog/v0.9.md)

### Authority boundary

v0.9 is primarily presentation, input, accessibility and reliability work. It does not intentionally change the authoritative simulation rules or engine snapshot schema from v0.8. Local ordinary-world persistence stores the existing `snapshotWorld(world)` result; Scenario Recipe / Replay / Fork remain the separate Scenario identity path.

## Previous shipped release: v0.8.0 — Ruling Lines & Succession

v0.8 ships deterministic descendant-first ruling-line succession, compact ruling-line Inspector context, truthful Dynastic World Stories and one canonical exactness gate.

Immutable release identity:
- implementation freeze `1556a8a8e1e058db54a1ac93a2eed1a69020c191`;
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag `v0.8.0` / tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5` → exact release commit;
- release workflow #12, CI #865, Pages #66/public `/play/`, full visual-qa #358 green.

[v0.8.0 release notes](docs/releases/v0.8.0.md) · [v0.8 demo](docs/demos/v0.8.0.md)

v0.7 Scenario Builder, v0.6 Living Ecology, v0.5 World Stories, v0.4 God Power Sandbox and v0.3 Civilizations Rise remain full release regressions.

## Next stage: v1.0 — Stable sandbox identity

v1.0 should stabilize the product/compatibility contract rather than immediately start another breadth sprint.

Primary direction:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported performance, and coherent creation/intervention/civilization/ecology/story workflows.**

The finite v1.0 backlog now owns portable compatibility, a certified runtime/recovery envelope and one final cross-system stable-sandbox gate. See [v1.0 backlog](docs/backlog/v1.0.md) and the [certified runtime & support contract](docs/SUPPORT.md).

## Public playable demo

**Play:** https://biandeshen.github.io/WorldBoxSR/play/

`/play/` is the stable user-facing entry point. GitHub Actions is the authoritative Pages publisher.

## Run locally

Requires Node.js 22+.

```bash
npm test
npm run sim -- --seed 42 --years 100 --population 30
npm run dev
npm run pages:build
npm run pages:check
```

For real-browser release evidence:

```bash
bash tools/capture-visual-evidence.sh
bash tools/run-touch-inspect-smoke.sh
```

## Repository map

```text
engine/          deterministic authoritative simulation core
client/          presentation/input layer kept separate from simulation
content/         data-driven creatures, biomes, powers, civilizations
simulation_lab/  batch runs, metrics, experiments
tools/           headless CLI and developer/build tools
tests/           deterministic/regression/invariant tests
docs/            architecture, product rules, roadmap and release evidence
```

## AI development model

The project is run as a small AI team with one Lead/Architect and focused Simulation, World, Client, Test/Research and Content roles. The operating goal is useful parallelism and visible product throughput, with one authoritative simulation core and bounded review gates.

See [`AGENTS.md`](AGENTS.md) and [`docs/team/agent-operating-model.md`](docs/team/agent-operating-model.md).
