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

## Current release candidate: v0.6.0 — Living Ecology

v0.6 turns the existing creature/resource simulation into one supported player-visible ecology experience: **natural Grazer populations visibly pressure vegetation, the landscape later recovers as that pressure falls, and a Wolf can hunt a Grazer through ordinary authoritative simulation.**

The supported release scope is deliberately finite:

- **Living Ecology preset** — 24×24 canonical world with exactly 10 deterministic natural Grazer founders; natural births and old-age deaths come from ordinary simulation, with no later rescue/reseed/population target;
- **Grazer + Wolf** — exactly two shipped creature identities, visually distinct and inspectable through one shared authoritative creature path;
- **authoritative Wolf predation** — bounded deterministic hunger, prey seeking, one-tile movement, one-Grazer hunt/feeding and starvation; no renderer-owned kill or generic combat/food-web framework;
- **ecology readability** — current behavior in Inspector, compact `🌿 N%`, readable Wolf→Grazer Pulse/Recent/Event Card, and truthful unavailable dead prey/current Wolf navigation;
- **canonical release gate** — seed45 locks a real Y34→Y40 vegetation-pressure phase, Y40→Y50 recovery with fewer Grazers, then a fixed explicit QA Wolf movement→predation path; duplicate and Y40 save→load continuations are byte-identical.

Frozen canonical evidence:
- Y34: `136 Grazers · 34.31% vegetation · 150 natural births`;
- Y40: `116 · 17.50% · 156`;
- Y50: `68 · 37.44% · 160`;
- canonical Wolf #171: `(0,8) → (1,9)` then predates Grazer #110;
- the browser reproduces Y40→Y50 through the ordinary **1 year** Time control and the hunt through **1 day** Time + Play;
- Pulse, Recent, Event Card and current Wolf Inspector explain the result while paused read-only interaction preserves exact authoritative state.

This is an observed supported ecology phase, **not** a claim of equilibrium, carrying capacity or guaranteed coexistence. v0.6 does not ship Wolf reproduction/natural Wolf founders, additional species, a universal map-size initializer, hidden survival controls, an ecology dashboard, disease/seasons/climate/genetics or a generic food web.

- [v0.6 canonical browser demo / QA](docs/demos/v0.6.0.md)
- [v0.6.0 release notes](docs/releases/v0.6.0.md)
- [v0.6 finite backlog](docs/backlog/v0.6.md)

Publication of tag/Release `v0.6.0` is completed by the repository release workflow after the release PR merges. Until that publication check is green, v0.7 feature work remains blocked.

## Previous release: v0.5.0 — World Stories

v0.5 turned bounded authoritative history into Causal Event Cards, exact Focused Story trails, a six-item same-tab Watchlist and four Chronicle lenses (`Highlights · Recent · Conflict · Rule`). One canonical real-browser path proved a player could move from a real recorded event through causes, map navigation, memory and a bounded story without narrative presentation becoming a second source of truth.

- [v0.5 canonical browser demo / QA](docs/demos/v0.5.0.md)
- [v0.5.0 release notes](docs/releases/v0.5.0.md)

The six-power God Power Sandbox from v0.4 and civilization/ruler/war foundations from v0.3 remain release regressions.

## Next planning stage after v0.6 publication: v0.7 — World Builder & Scenarios

The roadmap currently reserves v0.7 for creation/scenario tooling, but its exact finite scope must be planned **after** v0.6 tag/Release/Pages/Chromium publication is verified. No v0.7 work belongs in the v0.6 release handoff.

## Public playable demo

**Play:** https://biandeshen.github.io/WorldBoxSR/play/

`/play/` is the stable user-facing entry point. The custom GitHub Actions deployment publishes the compiled Phaser game there. The repository also carries a browser-runnable `/play/` fallback so that a mistakenly enabled legacy branch/Jekyll Pages deployment cannot replace the demo with the rendered README again.

The Pages build is validated in normal CI and by real Chromium gates. CI verifies the generated compiled `/play/` alias and legacy fallback; deployment then re-checks the final public `/play/` URL until the deployment/CDN has converged.

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
