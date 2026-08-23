# worldboxSR

A deterministic, headless-first emergent world simulation sandbox inspired by the *god game* genre.

The project goal is **not** to copy WorldBox code, assets, branding, or proprietary content. The goal is to independently build a small world that becomes interesting to watch because simple rules create history.

## First principle

> Make the world worth watching before making the world look beautiful.

## Current milestone: v0.1 — A Living World

The first playable vertical slice is intentionally small:

- deterministic seeded world simulation;
- terrain fertility and renewable food;
- humans that move, get hungry, eat, age, reproduce, and die;
- save/load with deterministic continuation;
- headless CLI for long-running simulations;
- metrics and regression tests;
- later: settlements, kingdoms, diplomacy, war, god powers, history UI.

## Run

Requires Node.js 22+ and no third-party runtime dependencies.

```bash
npm test
npm run sim -- --seed 42 --years 100 --population 30
```

Example machine-readable run:

```bash
node tools/simulate.js --seed 42 --years 100 --population 30 --json
```

## Repository map

```text
engine/          deterministic simulation core
client/          rendering/input layer (kept separate from simulation)
content/         data-driven creatures, biomes, powers, civilizations
simulation_lab/  batch runs, metrics, experiments
 tools/           headless CLI and developer tools
 tests/           deterministic/regression/invariant tests
 docs/            architecture, ADRs, product rules, roadmap, team model
```

## AI development model

The project is run as a small AI team with one Lead/Architect and focused Simulation, World, Client, Test/Research, and Content roles. Agents work through scoped tasks, tests, review gates, and architecture decision records rather than independently rewriting the project.

See [`AGENTS.md`](AGENTS.md) and [`docs/team/agent-operating-model.md`](docs/team/agent-operating-model.md).

## Status

Phase 0 implementation has started. See [`docs/backlog/v0.1.md`](docs/backlog/v0.1.md).
