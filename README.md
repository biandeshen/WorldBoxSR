# worldboxSR

A deterministic emergent-world god-game sandbox.

**[▶ Play the public demo](https://biandeshen.github.io/WorldBoxSR/play/)** · [Open in GitHub Codespaces](https://codespaces.new/biandeshen/WorldBoxSR)

[![GitHub Pages](https://img.shields.io/badge/Play-GitHub%20Pages-2ea44f?logo=github)](https://biandeshen.github.io/WorldBoxSR/play/) [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/biandeshen/WorldBoxSR)

The project goal is **not** to copy WorldBox code, assets, branding, or proprietary content. The goal is to independently build a small world where simple rules create histories that are both interesting underneath and compelling to watch on screen.

## Product identity

> **A living pixel god sandbox where worlds visibly grow, collapse, and remember why.**

The deterministic simulation foundation is a strategic asset, but it is not a substitute for visible game quality. If progress cannot be seen or felt in the playable demo, it does not count as enough product progress by itself.

- [Product constitution](docs/product/product-constitution.md)
- [Master product blueprint](docs/product/master-blueprint.md)
- [Benchmark and competitor research](docs/product/benchmark-research.md)
- [Presentation-stack decision](docs/decisions/0003-presentation-stack.md)
- [Release roadmap](docs/ROADMAP.md)

## Current release: v0.5.0 — World Stories

v0.5 turns the world's bounded authoritative history into a compact game-facing memory layer without letting narrative presentation become a second source of truth.

The release ships four connected story surfaces:

- **Causal Event Cards** — readable headline/detail/provenance, explicit Subject/Causes, truthful unresolved refs, retained-event drill-down and navigation back to current map-capable world objects;
- **Focused Story Trail** — Follow an explicit stable event/entity ref into exact retained history, oldest→newest, capped at 8, with no current-state association guessing;
- **Watchlist** — explicitly Pin up to 6 retained event/entity refs in same-tab `sessionStorage`, re-resolve them against current truth and keep unavailable refs honestly visible;
- **Chronicle lenses** — exactly `Highlights · Recent · Conflict · Rule`, each capped at 7; Highlights preserves the previous representative-history policy while the other lenses use fixed explicit history rules rather than relevance scoring.

One canonical real-Chromium gate stitches the complete player path together. On deterministic seed45, ordinary Lightning creates a real ruler death → normal succession story; the player then opens the succession Event Card, follows its retained death cause, returns to the involved polity on the map, Pins the event + polity, follows that polity's bounded story trail, opens a trail event and round-trips all Chronicle lenses. From the paused post-succession baseline onward, every story/navigation action must preserve the exact authoritative serialized world state.

World Stories deliberately does **not** ship AI-authored canonical facts, replay/rewind, a graph database, relevance scoring, cloud Watchlist sync or an analytics dashboard. Bounded-history refs can expire and are shown truthfully unavailable instead of being invented back into existence.

- [v0.5 canonical browser demo / QA](docs/demos/v0.5.0.md)
- [v0.5.0 release notes](docs/releases/v0.5.0.md)
- [v0.5 finite backlog](docs/backlog/v0.5.md)
- [v0.4 canonical browser demo / QA](docs/demos/v0.4.0.md)
- [v0.4.0 release notes](docs/releases/v0.4.0.md)

## Previous release: v0.4.0 — God Power Sandbox

The six-power God Powers dock remains part of the playable sandbox: Human, Grazer, Erase, Lightning, Meteor and Rain. v0.4 established authoritative Meteor destruction, Rain recovery, truthful `applied | no_effect` outcomes and a real paused Chromium Meteor→Rain gate. v0.5 preserves those capabilities as regressions rather than adding a seventh power.

## Next product stage: v0.6 — Living Ecology

After the v0.5 release handoff is fully verified, the next bounded product stage returns to visible environmental and animal-life systems: supported natural-fauna presets, multiple species, biome affinity/migration, predation/food-web foundations, deterministic initialization and ecology observability.

Coherent extinction remains acceptable when causally truthful; no hidden survival controller should be introduced merely to force a desired outcome. Deeper Civilization Depth remains later still.

## Public playable demo

**Play:** https://biandeshen.github.io/WorldBoxSR/play/

`/play/` is the stable user-facing entry point. The custom GitHub Actions deployment publishes the compiled Phaser game there. The repository also carries a browser-runnable `/play/` fallback so that a mistakenly enabled legacy branch/Jekyll Pages deployment cannot replace the demo with the rendered README again.

The Pages build is validated in normal CI and by a real Chromium interaction gate. CI verifies both the generated compiled `/play/` alias and the legacy fallback, then the deployment workflow re-checks the final public `/play/` URL until the deployment/CDN has converged.

Repository setting must remain **Settings → Pages → Build and deployment → Source → GitHub Actions**. GitHub Actions is the authoritative Pages publisher; the repository fallback exists only as defense in depth.

## Browser-only development with Codespaces

Open the repository in GitHub Codespaces. The Node 22 dev container starts `npm run dev`, forwards port `8080`, and opens the WorldBoxSR preview inside the browser editor.

Use the codespace terminal for the same validation commands used locally and in CI:

```bash
npm test
npm run smoke
npm run sim -- --seed 42 --years 100 --population 30
npm run pages:build
npm run pages:check
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
npm run pages:check
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
