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

## Release candidate: v0.7.0 — Scenario Builder & Sharing

v0.7 turns the existing deterministic startup/command architecture into one finite player creation loop:

> **Compose a Scenario → share/import the exact same authoritative start → Run → Replay or Fork.**

The shipped implementation breadth is frozen:

- **Scenario Recipe v1** — strict versioned startup input over current seed + `Sandbox | Living Ecology` + ordered Human/Grazer/Wolf placements; no live-world snapshot mirror;
- **Scenario Setup** — compact paused editor using the existing Phaser map input and authoritative commands; Clear rematerializes and Run freezes the Recipe;
- **portable sharing** — canonical JSON, unpadded-base64url `scenario=` links, fresh-tab exact reconstruction and atomic visible JSON Import;
- **Replay** — deterministic rematerialization of the frozen Recipe start, never timeline rewind/event replay/snapshot restore;
- **Fork / Edit** — an independent normalized editable copy whose source Recipe identity remains immutable;
- **canonical release gate** — one real-browser journey proves ordinary Setup → Copy Link → fresh shared profile → Run/Meteor divergence → exact source Replay → Fork + fourth Human → fork divergence → exact fork Replay.

Frozen canonical identity:
- source `Portable trio`: seed45 Sandbox, Human `(12,8)`, Grazer `(16,12)`, Wolf `(14,7)`, paused day 14400, fingerprint **`7f07ed67`**;
- canonical fork: one additional Human `(12,8)`, fingerprint **`67543ff4`**;
- canonical dirty source/fork fingerprints: `dfbad7ff` / `e0b5b305`;
- canonical implementation gate artifact `9580488110` records `canonicalJourneyComplete: true` and four manually reviewed 1440×900 screenshots;
- implementation freeze `1043a63375fee4ccaa72141da7f1e026a550b989` passed merged-main CI #811, Pages #57 including final public `/play/`, and full visual-qa #306.

v0.7 deliberately does **not** ship terrain/biome/resource painting, live snapshot savegames, Setup undo/remove stacks, timeline rewind, rules DSL/objectives, cloud/workshop services, custom map sizes or new simulation mechanics.

**Publication is still pending in this release candidate.** `v0.7.0` is not considered shipped until the release PR merges, the existing release workflow creates an annotated `v0.7.0` tag + GitHub Release pointing exactly at that release merge commit, and release-commit CI, Pages/public `/play/` and full Chromium all pass.

- [v0.7 canonical browser demo / QA](docs/demos/v0.7.0.md)
- [v0.7.0 release notes](docs/releases/v0.7.0.md)
- [v0.7 finite backlog](docs/backlog/v0.7.md)

## Current shipped release: v0.6.0 — Living Ecology

v0.6 is the current immutable published release. It shipped a supported 24×24 Living Ecology preset, natural Grazer lifecycle/resource pressure, Grazer + Wolf presentation, authoritative deterministic Wolf predation, restrained ecology readability and a canonical Y40→Y50 recovery→predation release path.

Release identity:
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`;
- release workflow #10, CI #748, Pages #50/public `/play/`, visual-qa #247 green.

- [v0.6 canonical browser demo / QA](docs/demos/v0.6.0.md)
- [v0.6.0 release notes](docs/releases/v0.6.0.md)

v0.5 World Stories, v0.4 God Power Sandbox and v0.3 civilization/ruler/war foundations remain full release regressions.

## Public playable demo

**Play:** https://biandeshen.github.io/WorldBoxSR/play/

`/play/` is the stable user-facing entry point. The custom GitHub Actions deployment publishes the compiled Phaser game there and validates the final public URL after deployment/CDN convergence.

Repository setting must remain **Settings → Pages → Build and deployment → Source → GitHub Actions**. GitHub Actions is the authoritative Pages publisher.

## Browser-only development with Codespaces

Open the repository in GitHub Codespaces. The Node 22 dev container starts `npm run dev`, forwards the preview port, and opens WorldBoxSR in the browser editor.

Use the same validation commands used locally and in CI:

```bash
npm test
npm run smoke
npm run sim -- --seed 42 --years 100 --population 30
npm run pages:build
npm run pages:check
```

For real-browser release evidence:

```bash
bash tools/capture-visual-evidence.sh
```

## GitHub-hosted simulation runs

Use **Actions → simulation-console → Run workflow** for deterministic runs without a local environment. The authoritative CLI result is preserved as an artifact tied to that commit.

See [GitHub development platform](docs/development/github-platform.md) for PR, CI, Codespaces, Simulation Console, artifacts, Pages and release responsibilities.

## Run locally

Requires Node.js 22+.

```bash
npm test
npm run sim -- --seed 42 --years 100 --population 30
npm run dev
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
