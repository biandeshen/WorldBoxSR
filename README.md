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
- [Release roadmap](docs/ROADMAP.md)

## Release candidate: v0.8.0 — Ruling Lines & Succession

v0.8 turns existing ruler/genealogy facts into one bounded, deterministic political-history loop:

> **Watch a ruling bloodline inherit power, see when descent fails and a new ruling line begins, then follow those transitions through Inspector + World Stories.**

Release-candidate scope:
- pure RNG-neutral descendant resolver over explicit parent/child records;
- descendant-first polity succession with the existing oldest-adult open-selection fallback preserved;
- minimal persistent ruling-line identity and deterministic snapshot-v16 migration;
- compact ruling-line context in existing ruler/settlement Inspector;
- factual descendant-continuation vs new-line wording in existing Event Cards / Rule Chronicle lens;
- one canonical release gate proving duplicate/save-load exactness and read-only presentation.

Implementation behavior is frozen at `1556a8a8e1e058db54a1ac93a2eed1a69020c191`.

Merged-main delivery is green:
- CI #863 — 396/396 tests + smoke + Pages build/check;
- Pages #65 — deployed and verified public `/play/`;
- full visual-qa #356 — all prior browser regressions plus v0.8 canonical Ruling Lines evidence.

Publication is still pending until this release candidate is merged, immutable annotated tag `v0.8.0` + GitHub Release are created, and the release commit passes CI, Pages and full Chromium.

- [v0.8 canonical browser demo / QA](docs/demos/v0.8.0.md)
- [v0.8.0 release notes](docs/releases/v0.8.0.md)
- [v0.8 finite backlog](docs/backlog/v0.8.md)

### Semantic boundary

A **ruling line** is political identity derived from explicit parent→child descent. It is not a marriage system, noble house, legitimacy/claim model, primogeniture rule, election system or inferred political motive. Existing `parental_union` and maternal `lineage` keep their prior meanings.

## Current shipped release: v0.7.0 — Scenario Builder & Sharing

v0.7 ships the deterministic creation loop:

> **Compose a Scenario → share/import the exact same authoritative start → Run → Replay or Fork.**

Immutable release identity:
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606`;
- release workflow #11, CI #817, Pages #58/public `/play/`, full visual-qa #312 green.

[v0.7.0 release notes](docs/releases/v0.7.0.md) · [v0.7 demo](docs/demos/v0.7.0.md)

v0.6 Living Ecology, v0.5 World Stories, v0.4 God Power Sandbox and v0.3 Civilizations Rise remain full release regressions.

## Next stage: v0.9 — World Feel & Public Alpha Polish

The next stage is deliberately **world-first**, not another hidden-system depth sprint.

Primary goal:

> **Opening the game should immediately feel like looking at a living god-game world, not a simulation dashboard with a small map inside it.**

Planning priorities, in order:
1. make the world use far more of the viewport; reduce dead screen space and keep panels contextual/collapsible;
2. strengthen one coherent visual language for terrain, buildings, units, settlements and polity state;
3. make civilization growth and conflict more visible on the map — construction, territory, roads/settlement form, war activity and destruction/recovery;
4. add high-feedback animation/FX/audio where it materially improves observation and intervention;
5. then finish onboarding, settings/keybinds/accessibility, performance, save/error recovery and platform/touch hardening.

Process target for this stage: roughly **60–65% visible player/world value, 25–30% simulation/reliability, ≤10% docs/process**. Determinism, save/load and sole-authority boundaries remain hard invariants, but ordinary micro-slices should not each receive a bespoke release-grade canonical gate.

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
