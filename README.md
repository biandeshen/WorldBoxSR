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
- [Certified runtime & support](docs/SUPPORT.md)
- [Release roadmap](docs/ROADMAP.md)

## Release candidate: v1.0.0 — Stable Sandbox Identity

v1.0 does not add a new breadth-mechanics framework. It freezes a dependable product contract around the sandbox built through v0.1–v0.9:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

Release-candidate scope:
- engine snapshot compatibility baseline v10–v16, current schema v16;
- ordinary local-save envelope v1 across supported historical engine snapshots;
- Scenario Recipe v1 frozen as the separate canonical Scenario identity;
- certified Chrome/Chromium-class Phaser surfaces at 1440×900 desktop and 430×820 coarse touch;
- Legacy Canvas as explicit ordinary-world compatibility fallback;
- focused support contract bound to the actual browser/recovery/build evidence sources;
- one final cross-system production gate composing causal World Stories, exact ordinary Save/Restore and canonical Scenario share/Run/Replay/Fork;
- immediate manual `Save now` readiness after initial world warmup, fixing a real integration defect found by the final gate.

Implementation behavior is frozen at:
`efecf1e91ac88177ce82917c1312577927e26af6`

Exact freeze delivery is green:
- CI #946;
- Pages #95 including final public `/play/` verification;
- full historical visual-qa #434;
- full artifact contains `stable-sandbox-evidence.json` with `stableSandboxGateComplete: true`.

Publication is still pending until this release candidate is merged, immutable annotated tag `v1.0.0` + GitHub Release are created, and the release commit passes CI, Pages and full historical Chromium again.

- [v1.0 canonical stable-sandbox QA](docs/demos/v1.0.0.md)
- [v1.0.0 release notes](docs/releases/v1.0.0.md)
- [v1.0 finite backlog](docs/backlog/v1.0.md)
- [Certified runtime & support](docs/SUPPORT.md)

## Current shipped release: v0.9.0 — World Feel & Public Alpha Polish

v0.9 is the shipped world-first/public-alpha foundation underneath v1.0: larger world surface, clearer settlement/territory/civilization presentation, movement/ambient life, mobile touch, local ordinary-world persistence, renderer recovery, accessibility and faster validation boundaries.

Immutable v0.9 identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- release workflow #13, CI #929, Pages #88/public `/play/`, full visual-qa #422 green.

[v0.9.0 release notes](docs/releases/v0.9.0.md) · [v0.9 demo](docs/demos/v0.9.0.md)

v0.8 Ruling Lines & Succession, v0.7 Scenario Builder, v0.6 Living Ecology, v0.5 World Stories, v0.4 God Power Sandbox and v0.3 Civilizations Rise remain full release regressions.

## Public support boundary

Certified v1.0 surfaces are deliberately narrow and evidence-backed:
- Chrome/Chromium-class production Phaser at 1440×900 desktop;
- Chrome/Chromium-class production Phaser at 430×820 coarse touch;
- Legacy Canvas ordinary-world compatibility fallback.

Scenario remains Phaser-only. Firefox/Gecko, Safari/WebKit and arbitrary other browser/device surfaces remain uncertified/best effort until real gates exist. See [docs/SUPPORT.md](docs/SUPPORT.md).

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

For real-browser evidence:

```bash
bash tools/capture-visual-evidence.sh
bash tools/run-touch-inspect-smoke.sh
bash tools/run-renderer-recovery-smoke.sh
VISUAL_QA_SCOPE=full bash tools/run-stable-sandbox-smoke.sh
```

## Repository map

```text
engine/          deterministic authoritative simulation core
client/          presentation/input layer kept separate from simulation
content/         future-facing data/content area; not a public mod API
simulation_lab/  batch runs, metrics, experiments
tools/           headless CLI and developer/build tools
tests/           deterministic/regression/invariant tests
docs/            architecture, support, roadmap and release evidence
```

## AI development model

The project is run as a small AI team with one Lead/Architect and focused Simulation, World, Client, Test/Research and Content roles. The operating goal is useful parallelism and visible product throughput, with one authoritative simulation core and bounded review gates.

See [`AGENTS.md`](AGENTS.md) and [`docs/team/agent-operating-model.md`](docs/team/agent-operating-model.md).
