# Project status

Last updated: 2026-08-27

## Management state

**v0.9.0 — World Feel & Public Alpha Polish is shipped and closed.**

Immutable release identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag `v0.9.0` / tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- GitHub Release `WorldBoxSR v0.9.0` published by release workflow #13;
- release-commit CI #929 green;
- Pages #88 green including final public `/play/` verification;
- full visual-qa #422 green, including v0.4–v0.8 regressions plus current mobile touch/pinch and renderer failure recovery.

The v0.9 implementation and release identities are immutable. Any later docs cleanup must not move the tag.

**v1.0 — Stable Sandbox Identity is now a finite three-capability plan under #313. No implementation has started yet.**

Primary v1.0 promise:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

## v1.0 audit findings

### Compatibility

- engine current snapshot version is 16;
- engine already accepts historical versions 10–15, but proof is distributed across feature tests rather than one formal support matrix;
- ordinary local-world envelope is strict version 1 and embeds the engine snapshot;
- Scenario Recipe is strict canonical version 1.

Decision: v1.0 baseline must keep engine snapshot v10–v16 inputs supported, local envelope v1 supported, and Scenario Recipe v1 supported/canonical. Future/corrupt/unsupported data must fail explicitly and atomically.

### Runtime support

- real browser certification today is Chrome/Chromium based;
- canonical production surfaces are 1440×900 desktop Phaser and 430×820 coarse-touch Phaser;
- existing Legacy renderer is an explicit ordinary-world compatibility fallback;
- Scenario remains Phaser-only and fallback consequences are disclosed;
- Firefox/Safari are currently ungated and therefore uncertified.

Decision: v1.0 should state this honest support envelope before broadening it.

### Performance

- `phaser_main` already has a hard 300,000-byte minified CI limit plus a dedicated Phaser vendor chunk;
- 64×64 1k/10k Node benchmark exists but is not a calibrated CI SLA.

Decision: retain the app-chunk hard budget; keep large Node timing diagnostic until calibration proves a non-flaky threshold.

### First-session / extension scope

- desktop, Scenario and mobile controls already expose concise in-product affordance text;
- Session, Accessibility and renderer recovery are already visible actions;
- `content/` is currently only a future-facing placeholder.

Decision: do not start a tutorial framework or public plugin API in v1.0 without new evidence.

## Frozen v1.0 capability order

1. **Portable Compatibility Contract** — historical save matrix / portable-format support baseline.
2. **Certified Runtime & Recovery Envelope** — certified Chrome/Chromium desktop/touch surfaces, explicit Legacy fallback and current structural performance budgets.
3. **Cross-System Stable Sandbox Gate** — one release contract composing ordinary world intervention/story/save-restore and Scenario Recipe/Run/Replay/Fork through production surfaces.

Detailed backlog: `docs/backlog/v1.0.md`.

## First implementation decision

The first slice must build the **historical engine snapshot v10–v16 compatibility matrix** and central support metadata/tests. It should not change simulation behavior or migration policy unless the matrix exposes a real bug.

No Capability 2/3 implementation issue should open in parallel before that baseline lands.

## Authority guards carried into v1.0

- one authoritative deterministic world model;
- no hidden client simulation authority;
- save/load and Scenario identity remain explicit and separate;
- presentation never invents political/ecological/pathfinding facts;
- published v0.9 and older release identities never move;
- public `/play/` remains the product truth surface.

## Explicit v1.0 non-goals

No public plugin/mod API, large tutorial framework without evidence, uncertified Firefox/Safari claim, uncalibrated large-benchmark SLA, economy/trade/currency, religion/culture/technology, naval warfare, professions/classes, marriage/households, broad diplomacy rewrite, multiplayer/cloud sync, procedural AI-authored history or new renderer.

## Current decision gate

1. merge the docs-only finite v1.0 plan;
2. close planning #313 once ROADMAP/STATUS/backlog agree;
3. open exactly one Capability 1 implementation issue for historical snapshot compatibility;
4. keep Capability 2/3 and unrelated breadth closed until the first baseline lands;
5. preserve all shipped release tags exactly.
