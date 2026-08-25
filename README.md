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

## Current release: v0.3.0 — Civilizations Rise

v0.3 turns settlements into visible political actors whose stories can be followed on the map while keeping the god sandbox—not grand strategy—as the product center:

- deterministic named polities with capitals, flags/colors and polity-aware territory;
- real human rulers with deterministic succession and truthful vacancy;
- authoritative inter-polity relations with readable war/peace transitions;
- intentionally simple visible warbands and deterministic spatial combat;
- settlement conquest, polity dissolution and one bounded rebellion seed mechanic;
- snapshot schema v15 with legacy migration for political-outcome state;
- player-readable Chronicle projection for founding, rulers, war/peace, battles, conquest, rebellion and collapse;
- high-value political event pulses that do not replay warmup history as fresh events;
- canonical deterministic “two powers rise and collide” product gate;
- default seed45 independently demonstrates war, engagements, conquest and rebellion by year 40;
- CI, Pages and real Chromium Visual QA remain release gates over the public browser product.

Civilization depth intentionally stops here for now. v0.3 does **not** expand into deep economy/trade/religion/technology, sophisticated tactics or naval warfare.

- [v0.3 canonical browser demo / QA](docs/demos/v0.3.0.md)
- [v0.3.0 release notes](docs/releases/v0.3.0.md)
- [v0.3 finite backlog](docs/backlog/v0.3.md)
- [v0.2 canonical browser demo / QA](docs/demos/v0.2.0.md)
- [v0.2.0 release notes](docs/releases/v0.2.0.md)

## Next product stage: v0.4 — God Power Sandbox

The next stage returns focus to the second core product pillar: **a satisfying god hand**. Work should improve creation/destruction/social powers, targeting, feedback and their visible causal consequences without reopening civilization depth or ecology research as near-term blockers.

Deeper Living Ecology work remains intentionally later (currently v0.6). World Stories/Chronicle depth remains a separate v0.5 stage rather than expanding v0.3 indefinitely.

## Public playable demo

**Play:** https://biandeshen.github.io/WorldBoxSR/play/

`/play/` is the stable user-facing entry point. The custom GitHub Actions deployment publishes the compiled Phaser game there. The repository also carries a browser-runnable `/play/` fallback so that a mistakenly enabled legacy branch/Jekyll Pages deployment cannot replace the demo with the rendered README again.

The Pages build is validated in normal CI and by a real Chromium visual gate. CI verifies both the generated compiled `/play/` alias and the legacy fallback, then the deployment workflow re-checks the final public `/play/` URL until the deployment/CDN has converged.

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
