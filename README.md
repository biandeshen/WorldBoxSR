# worldboxSR

A deterministic, headless-first emergent world simulation sandbox inspired by the *god game* genre.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/biandeshen/WorldBoxSR)

The project goal is **not** to copy WorldBox code, assets, branding, or proprietary content. The goal is to independently build a small world that becomes interesting to watch because simple rules create history.

## First principle

> Make the world worth watching before making the world look beautiful.

## Current release target: v0.1.0 — A Living World

The project is in **release hardening**, not open-ended feature discovery.

The v0.1 vertical slice contains:

- deterministic seeded world simulation;
- procedural terrain and renewable food/vegetation;
- humans that move, get hungry, eat, age, reproduce, die and form ancestry;
- settlements, abandonment, territory and causal history;
- typed grazer ecology available through explicit spawning/research configuration;
- default-off grazer reproduction and gradual old-age mortality;
- deterministic save/load continuation;
- headless CLI, Simulation Lab, metrics, regressions and performance baselines;
- lightweight client rendering, inspectors, timeline/history and minimal god tools.

Universal natural-fauna auto-initialization is **not a v0.1 blocker**. It moves to v0.2 Living Ecology with a declared support matrix instead of holding the first release until every map size/seed is solved.

- [Finite release roadmap](docs/ROADMAP.md)
- [v0.1 release checklist](docs/backlog/v0.1.md)
- [v0.1 reproducible demo](docs/demos/v0.1.0.md)
- [v0.1.0 release notes](docs/releases/v0.1.0.md)

## Browser-only development with Codespaces

The repository includes a Node 22 dev-container configuration. Open the repository in GitHub Codespaces and the codespace will start `npm run dev`, forward port `8080`, and open the WorldBoxSR preview inside the browser editor. The forwarded port stays private by default.

Use the codespace terminal for the same validation commands used locally and in CI:

```bash
npm test
npm run smoke
npm run sim -- --seed 42 --years 100 --population 30
```

## GitHub-hosted simulation runs

For a deterministic run without opening a local environment, use **Actions → simulation-console → Run workflow**. Choose the seed, years, population and map size in the GitHub UI. The workflow runs the same authoritative simulation CLI, shows the main outcome metrics in the Actions summary and preserves the complete JSON result as a private workflow artifact.

See [GitHub development platform](docs/development/github-platform.md) for the project’s division of responsibilities between PRs, CI, Codespaces, the Simulation Console, artifacts and releases. GitHub Pages is intentionally not enabled while this personal-account repository remains private because the published site would be public.

## Run

Requires Node.js 22+ and no third-party runtime dependencies.

```bash
npm test
npm run sim -- --seed 42 --years 100 --population 30
npm run dev   # open http://127.0.0.1:8080
```

Example machine-readable run:

```bash
npm run sim -- --seed 42 --years 100 --population 30 --json
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
