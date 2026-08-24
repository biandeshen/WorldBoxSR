# worldboxSR

A deterministic emergent-world god-game sandbox.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/biandeshen/WorldBoxSR)

The project goal is **not** to copy WorldBox code, assets, branding, or proprietary content. The goal is to independently build a small world where simple rules create histories that are both interesting underneath and compelling to watch on screen.

## Product identity

> **A living pixel god sandbox where worlds visibly grow, collapse, and remember why.**

The deterministic simulation foundation is a strategic asset, but it is not a substitute for visible game quality. If progress cannot be seen or felt in the playable demo, it does not count as enough product progress by itself.

- [Master product blueprint](docs/product/master-blueprint.md)
- [Benchmark and competitor research](docs/product/benchmark-research.md)
- [Presentation-stack decision](docs/decisions/0003-presentation-stack.md)
- [Release roadmap](docs/ROADMAP.md)

## Current release target: v0.2.0 — Playable World

The only current product-development priority is to make the public demo materially more game-like before adding deeper simulation breadth.

v0.2 focuses on:

- Phaser 4 presentation over the existing deterministic engine;
- Vite browser/Pages build;
- coherent pixel-art/tile/sprite presentation instead of debug primitives;
- readable terrain, coastlines, vegetation and biome detail;
- animated/interpolated humans and creatures;
- visible settlement growth, structures, identity and territory;
- a compact god-power UI with immediate feedback;
- a default scenario that looks alive immediately;
- a 5-second readability gate and a 30-second visible-event gate.

Non-correctness ecology research is frozen until this visible product gate passes. Product discovery deliberately sequences civilization, god-power and world-story stages ahead of the deeper Living Ecology stage, which is now v0.6.

- [v0.2 Playable World backlog](docs/backlog/v0.2.md)
- [v0.1 reproducible demo](docs/demos/v0.1.0.md)
- [v0.1.0 release notes](docs/releases/v0.1.0.md)

## Public playable demo

https://biandeshen.github.io/WorldBoxSR/

The Pages build is validated in normal CI and publishes only the browser runtime rather than the full repository tree.

## Browser-only development with Codespaces

Open the repository in GitHub Codespaces. The Node 22 dev container starts `npm run dev`, forwards port `8080`, and opens the WorldBoxSR preview inside the browser editor.

Use the codespace terminal for the same validation commands used locally and in CI:

```bash
npm test
npm run smoke
npm run sim -- --seed 42 --years 100 --population 30
npm run pages:build
```

## GitHub-hosted simulation runs

For a deterministic run without opening a local environment, use **Actions → simulation-console → Run workflow**. The workflow runs the same authoritative simulation CLI and preserves the complete JSON result as an artifact tied to that commit.

See [GitHub development platform](docs/development/github-platform.md) for the division of responsibilities between PRs, CI, Codespaces, Simulation Console, artifacts, Pages and releases.

## Run locally

Requires Node.js 22+.

```bash
npm test
npm run sim -- --seed 42 --years 100 --population 30
npm run dev   # open http://127.0.0.1:8080
npm run pages:build
```

## Repository map

```text
engine/          deterministic authoritative simulation core
client/          presentation/input layer kept separate from simulation
content/         data-driven creatures, biomes, powers, civilizations
simulation_lab/  batch runs, metrics, experiments
tools/           headless CLI and developer/build tools
tests/           deterministic/regression/invariant tests
docs/            architecture, ADRs, product rules, roadmap, team model
```

## AI development model

The project is run as a small AI team with one Lead/Architect and focused Simulation, World, Client, Test/Research, and Content roles. Agents work through scoped tasks, tests, review gates, visual evidence and architecture decisions rather than independently rewriting the project.

See [`AGENTS.md`](AGENTS.md) and [`docs/team/agent-operating-model.md`](docs/team/agent-operating-model.md).
