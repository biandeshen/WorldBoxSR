# Project status

Last updated: 2026-08-28

## Management state

**v0.9.0 — World Feel & Public Alpha Polish is shipped and immutable.**

Immutable release identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag `v0.9.0` / tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- GitHub Release `WorldBoxSR v0.9.0` published by release workflow #13;
- release-commit CI #929 green;
- Pages #88/public `/play/` green;
- full visual-qa #422 green.

**v1.0 — Stable Sandbox Identity is active. Capability 1 is complete; Capability 2 is next.**

Primary v1.0 promise:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

Finite capability order:
1. **Portable Compatibility Contract — COMPLETE**;
2. **Certified Runtime & Recovery Envelope — NEXT**;
3. **Cross-System Stable Sandbox Gate — BLOCKED on Capability 2**.

Detailed backlog: `docs/backlog/v1.0.md`.

## Capability 1 — delivered

Issue #315 / PR #316 froze the existing portable compatibility behavior as a product contract without changing simulation policy.

### Frozen portable baseline

- engine current schema remains `SNAPSHOT_VERSION = 16`;
- exported frozen `SUPPORTED_SNAPSHOT_VERSIONS = [10,11,12,13,14,15,16]` now drives `worldFromSnapshot()` acceptance;
- public v0.3.0/v0.4.0/v0.7.0 used snapshot v15;
- public v0.8.0/v0.9.0 use snapshot v16;
- v10–v14 remain older accepted prototype/internal schemas, not falsely labeled public release fixtures;
- local ordinary-world save envelope v1 accepts every supported engine snapshot through the same engine migration path;
- Scenario Recipe v1 remains canonical; future unsupported recipe versions reject explicitly.

### Compatibility matrix proof

The independent v10–v16 matrix requires for every supported engine version:
- supplied snapshot is not mutated;
- restore normalizes to current v16;
- local save envelope v1 normalizes the embedded historical snapshot to the exact same current snapshot;
- migrated world and a fresh restore of its normalized v16 state remain byte/deep-identical after the same 12-tick continuation.

Explicit rejection remains frozen for below-floor, non-supported and future engine versions, future local envelope versions, unsupported embedded snapshots and future Scenario Recipe versions.

### Delivery evidence

- PR #316 exact final head: `e88c735e756b06e02fed291e09c746081806eea7`;
- PR CI #934 green;
- PR visual-qa #425 green;
- squash merge `c611401e81ad262c9eb76a55151c1261178fae15`;
- merged-main CI #935 green;
- Pages #91/public `/play/` green;
- full historical visual-qa #426 green, including mobile touch/pinch and renderer failure recovery;
- no historical migration defect was exposed, so no migration branch was changed.

Decision: **Capability 1 stops here.** No second save format, cloud/export subsystem or extra compatibility UI is justified for v1.0.

## Capability 2 — next decision gate

The next bounded work is **Certified Runtime & Recovery Envelope**. It should formalize and enforce only the surfaces already backed by real evidence:
- production Phaser on Chrome/Chromium-class desktop at canonical 1440×900;
- production Phaser on Chrome/Chromium-class coarse touch at canonical 430×820;
- existing Legacy renderer as explicit ordinary-world compatibility fallback;
- Scenario remains Phaser-only, with fallback consequences disclosed;
- `phaser_main` remains ≤300,000 B minified with one dedicated Phaser vendor chunk;
- 64×64 1k/10k Node benchmark remains diagnostic, not a release timing SLA;
- Firefox/Safari remain uncertified until real gates exist.

The likely implementation is support-contract documentation plus focused contract checks that tie those claims to the existing real browser/recovery/build gates. Do not add new gameplay merely to make Capability 2 look larger.

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

1. merge this Capability 1 evidence sync;
2. open exactly one Capability 2 issue for the certified runtime/recovery support contract;
3. keep Capability 3 and unrelated breadth closed until Capability 2 is complete;
4. reuse existing real-browser/build gates instead of creating another parallel runtime implementation;
5. preserve all shipped release tags exactly.
