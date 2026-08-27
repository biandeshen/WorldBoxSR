# Project status

Last updated: 2026-08-28

## Management state

**v0.9.0 — World Feel & Public Alpha Polish is shipped and immutable.**

Immutable release identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag `v0.9.0` / tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- release workflow #13, CI #929, Pages #88/public `/play/`, full visual-qa #422 green.

**v1.0 — Stable Sandbox Identity is active. Capabilities 1–2 are complete; Capability 3 is next.**

Primary promise:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

Finite order:
1. **Portable Compatibility Contract — COMPLETE**;
2. **Certified Runtime & Recovery Envelope — COMPLETE**;
3. **Cross-System Stable Sandbox Gate — NEXT / final implementation capability**.

Detailed backlog: `docs/backlog/v1.0.md`.
Public support contract: `docs/SUPPORT.md`.

## Capability 1 — complete

Issue #315 / PR #316 froze the engine snapshot support baseline without changing migration behavior:
- `SNAPSHOT_VERSION = 16`;
- `SUPPORTED_SNAPSHOT_VERSIONS = [10,11,12,13,14,15,16]`;
- local save envelope v1 accepts every supported engine snapshot through normal engine migration;
- Scenario Recipe v1 remains canonical and future unsupported versions reject explicitly;
- independent v10–v16 matrix proves current normalization and identical 12-tick continuation.

Evidence:
- merge `c611401e81ad262c9eb76a55151c1261178fae15`;
- PR CI #934 + visual #425 green;
- main CI #935, Pages #91, full visual #426 green;
- no migration defect exposed.

## Capability 2 — complete

Issue #318 / PR #319 publishes one honest certified support envelope and binds it to existing evidence rather than creating another runtime harness.

Certified claims:
- Chrome/Chromium-class desktop Phaser at canonical 1440×900;
- Chrome/Chromium-class coarse-touch Phaser at canonical 430×820;
- Legacy Canvas as explicit ordinary-world compatibility fallback;
- Scenario remains Phaser-only with fallback consequence disclosure;
- Firefox/Gecko, Safari/WebKit and arbitrary other surfaces remain uncertified/best effort;
- `phaser_main` ≤300,000 B minified with exactly one dedicated Phaser vendor chunk;
- shipped 24×24 public showcase is the initial v1.0 product performance envelope;
- 64×64 1k/10k benchmark remains diagnostic, not an SLA;
- no cloud/cross-device save claim.

`tests/support_contract.test.js` now ties those public claims to the existing desktop, mobile, recovery, workflow and Pages-build evidence sources.

Evidence:
- merge `2f40d850673831270463d61480d64842e8771727`;
- PR CI #938 green;
- merged-main CI #939 green;
- Pages #93/public `/play/` green;
- full historical visual-qa #428 green, including desktop/history, mobile touch/pinch and renderer failure recovery;
- no client/engine/tool/workflow behavior changes.

Decision: Capability 2 stops here. Do not broaden browser certification without real evidence.

## Capability 3 — next

The final implementation capability is **Cross-System Stable Sandbox Gate**. It should compose existing shipped behavior rather than add features.

Required shape:
- ordinary production browser session: real intervention → causal Story/Inspector → Save now → mutate → Restore exact saved world paused;
- Scenario production path: reuse canonical Scenario Builder exact source/share/Run/Replay/Fork evidence and add explicit proof that ordinary local-world persistence remains disabled while Scenario identity is active;
- one small v1.0 verifier combines those artifacts instead of duplicating every historical gate;
- full v0.4–v0.9 browser denominator remains green.

Deterministic save/load continuation is already owned by engine/local-save tests and Capability 1. Capability 3 must prove the **production UI composition** of those contracts, not invent a second save engine.

## Authority guards carried into v1.0

- one authoritative deterministic world model;
- no hidden client simulation authority;
- save/load and Scenario identity remain explicit and separate;
- presentation never invents political/ecological/pathfinding facts;
- published v0.9 and older release identities never move;
- public `/play/` remains the product truth surface.

## Explicit non-goals

No plugin/mod API, broad tutorial framework, uncertified Firefox/Safari claim, uncalibrated large benchmark SLA, economy/trade/currency, religion/culture/technology, naval warfare, professions/classes, marriage/households, broad diplomacy rewrite, multiplayer/cloud sync, procedural AI-authored history or new renderer.

## Current decision gate

1. merge this Capability 2 evidence sync;
2. open exactly one Capability 3 issue;
3. implement one bounded cross-system production gate with no new product semantics;
4. require PR CI/browser evidence and merged-main CI/Pages/full historical Visual;
5. when Capability 3 is green, freeze v1.0 implementation and enter release-only `v1.0.0` handoff.
