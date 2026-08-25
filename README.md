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

## Current release: v0.4.0 — God Power Sandbox

v0.4 strengthens direct intervention without turning the project into a power catalog or hiding consequences behind presentation-only effects.

The public God Powers dock intentionally contains **six** powers:

- `1` Human;
- `2` Grazer;
- `3` Erase;
- `4` Lightning;
- `5` Meteor;
- `6` Rain.

The release adds one complete destructive/constructive area loop:

- Meteor previews and applies an exact radius-2 footprint, kills in-footprint humans/grazers through lifecycle authority and clears impacted passable vegetation;
- Rain uses the same radius-2 footprint and restores existing food/vegetation values to their already-authoritative capacities without resurrecting life or rewriting climate/terrain;
- accepted actions distinguish real `applied` outcomes from truthful `no_effect`; invalid land-only creation remains a genuine rejection before command identity allocation;
- Meteor/Rain have distinct generated FX/SFX, with reduced-motion/reduced-flash behavior preserved;
- World Chronicle retains the two latest direct god interventions alongside representative autonomous history;
- direct actions do not masquerade as autonomous world-event pulses;
- a headless deterministic gate runs real engine Meteor→Rain commands and proves damage, exact recovery, non-resurrection, stable terrain/capacities/RNG and byte-identical repeatability;
- the real Chromium gate pauses canonical seed45 at year 40, drives actual pointer input, destroys a footprint with Meteor and restores the same footprint with Rain;
- CI, Pages and Chromium remain product/release gates.

v0.4 deliberately stops here: no seventh power, fire propagation, plague/tornado framework, weather/hydrology simulation, cooldown/progression system, ecology research or renewed civilization-depth work.

- [v0.4 canonical browser demo / QA](docs/demos/v0.4.0.md)
- [v0.4.0 release notes](docs/releases/v0.4.0.md)
- [v0.4 finite backlog](docs/backlog/v0.4.md)
- [v0.3 canonical browser demo / QA](docs/demos/v0.3.0.md)
- [v0.3.0 release notes](docs/releases/v0.3.0.md)

## Next product stage: v0.5 — World Stories

The next stage shifts from adding more god powers to making the world's accumulated history easier to **follow, revisit and remember**. The focus is game-first Chronicle/event presentation, causal drill-down, useful story views/bookmarks and timeline navigation while keeping all narrative claims grounded in authoritative recorded facts.

Living Ecology remains intentionally later (currently v0.6), and deeper Civilization Depth remains later still. Neither should block v0.5.

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
