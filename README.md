# worldboxSR

A deterministic emergent-world god-game sandbox.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/biandeshen/WorldBoxSR)

The project goal is **not** to copy WorldBox code, assets, branding, or proprietary content. The goal is to independently build a small world where simple rules create histories that are both interesting underneath and compelling to watch on screen.

## Product identity

> **A living pixel god sandbox where worlds visibly grow, collapse, and remember why.**

The deterministic simulation foundation is a strategic asset, but it is not a substitute for visible game quality. If progress cannot be seen or felt in the playable demo, it does not count as enough product progress by itself.

- [Product constitution](docs/product/product-constitution.md)
- [Master product blueprint](docs/product/master-blueprint.md)
- [Benchmark and competitor research](docs/product/benchmark-research.md)
- [Presentation-stack decision](docs/decisions/0003-presentation-stack.md)
- [Release roadmap](docs/ROADMAP.md)

## Current release: v0.2.0 — Playable World

v0.2 turns the deterministic v0.1 world into a browser-playable god-game vertical slice:

- Phaser 4.2.1 presentation over the authoritative simulation engine;
- Vite 8.1.0 browser/Pages build;
- readable terrain, coastlines, vegetation and water depth;
- interpolated humans and grazers with persistent inspection selection;
- visible settlement structures, names, flags and authoritative territory;
- responsive pan/zoom/world framing;
- a direct Human / Grazer / Erase / Lightning power dock with target preview, effects and minimal SFX;
- reduced-motion/reduced-flash treatment for strong effects;
- autonomous world-event pulse backed by causal history;
- deterministic seed45 showcase with an executable 5-second readability target and 30-second autonomous-event gate;
- production Chromium Visual QA over the same `/WorldBoxSR/` path used by Pages.

The old Canvas renderer remains available in v0.2 only as `?renderer=legacy` A/B/regression evidence. The default product is Phaser.

- [v0.2 canonical browser demo / QA](docs/demos/v0.2.0.md)
- [v0.2.0 release notes](docs/releases/v0.2.0.md)
- [v0.2 evidence backlog](docs/backlog/v0.2.md)
- [v0.1 reproducible demo](docs/demos/v0.1.0.md)
- [v0.1.0 release notes](docs/releases/v0.1.0.md)

## Next product stage: v0.3 — Civilizations Rise

The next stage is player-visible civilization dynamics: polity/kingdom identity, rulers and succession, diplomacy, war/peace, conquest/rebellion, and territory/history that visibly tells those stories.

Deeper Living Ecology work remains intentionally later (currently v0.6). Non-correctness ecology research stays frozen while the player-facing civilization, god-hand and world-story loops are being built.

## Public playable demo

https://biandeshen.github.io/WorldBoxSR/

The Pages build is validated in normal CI and by a real Chromium visual gate. It publishes the browser product rather than the full repository tree.

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
