# Project status

Last updated: 2026-08-26

## Management state

**v0.6.0 — Living Ecology is shipped and closed.** Immutable release identity:
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag `v0.6.0` / tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb`;
- release workflow #10, CI #748, Pages #50/public `/play/`, visual-qa #247 green;
- post-release closeout #239 completed without moving the tag.

**v0.7.0 — Scenario Builder & Sharing implementation is frozen; release candidate publication is active.** Release gate #240; release handoff #252; release PR #253.

Implementation freeze commit: `1043a63375fee4ccaa72141da7f1e026a550b989`.

Frozen implementation delivery:
- Capability 1 Recipe v1 core — #243 / `910a98445428cd361025b028387be065d70034f1`; CI #756, Pages #53, visual #253.
- Capability 2 Scenario Setup — #245 / `8efcb523148a4728d422de7abaeff8527caea5df`; CI #773, Pages #54, visual #270.
- Capability 3 Portable Recipe — #247 / `27f8c1f8715d9908acb7bb95e264bfb5b3ad2233`; CI #794, Pages #55, visual #291.
- Capability 4 Replay + Fork — #249 / `9b44c03df6898096a422822e4af024cf744b9faa`; CI #804, Pages #56, visual #301.
- Capability 5 Canonical Scenario Builder gate — #251 / `1043a63375fee4ccaa72141da7f1e026a550b989`; merged-main CI #811, Pages #57/public `/play/`, full visual-qa #306 green.

**No v0.7 product, test-gate or simulation behavior may change during release packaging.**

## v0.7 player promise

A player can compose a bounded deterministic Scenario Recipe, share/import it into the exact same authoritative start, Run a different history, Replay the exact Recipe start, or Fork/Edit it into a deterministic new Scenario without raw engine tooling.

## Frozen Scenario contract

- Recipe kind/version: `worldboxsr-scenario` / v1.
- Base: current 24×24, 40-year showcase-ready `sandbox | living_ecology` startup.
- Setup: ordered Human / Grazer / Wolf placement only.
- Bounds: <=32 actions, <=10 entities/action, name <=64 code units, canonical JSON <=8192 UTF-8 bytes.
- Portable transport: unpadded base64url under `scenario=`.
- Recipe is deterministic startup input, never a live-state mirror or snapshot substitute.
- Engine world remains sole authority; Phaser is the Scenario product surface.

## Canonical v0.7 evidence

Source **Portable trio**:
- seed45 Sandbox;
- Human `(12,8)`;
- Grazer `(16,12)`;
- Wolf `(14,7)`;
- paused day `14400`;
- source fingerprint **`7f07ed67`**.

End-to-end production Chromium journey:
1. ordinary world → visible Setup → real-click source;
2. Copy Link independently decodes to exact canonical Recipe;
3. fresh Chrome profile reaches byte-identical paused source `7f07ed67`;
4. ordinary Time/Play + Meteor diverges source to `dfbad7ff`, Recipe unchanged;
5. Replay returns exact source and clears stale transient story/Inspector state;
6. Fork/Edit starts from exact source + independent copy;
7. fourth Human `(12,8)` creates deterministic fork **`67543ff4`**, source canonical unchanged;
8. ordinary fork gameplay diverges to `e0b5b305`;
9. Replay returns exact `67543ff4` fork / `SCENARIO · 4`, source canonical still unchanged.

Canonical implementation-gate head `8aca62fcb4ae31b4ab3ab8bab9aa003cc750846d` passed CI #808 + full visual-qa #303. Artifact `9580488110` records `canonicalJourneyComplete: true` and contains four manually reviewed 1440×900 canonical screenshots. Final docs head passed CI #810 + visual #305 before merge.

## Release candidate #252 / #253

Allowed changed files are strictly package + release/demo/management docs:
- `package.json` version `0.7.0`;
- `docs/releases/v0.7.0.md`;
- `docs/demos/v0.7.0.md`;
- README / ROADMAP / STATUS / `docs/backlog/v0.7.md` candidate synchronization.

Forbidden: `client/**`, `engine/**`, `content/**`, `tests/**`, Scenario/Recipe tools, visual-gate behavior, simulation/schema/transport changes or new features.

Publication is still **pending**. `v0.7.0` is not shipped until the release PR merges and all immutable publication evidence is verified.

## Publication gate

1. release PR exact changed-file audit = seven allowed files only;
2. final release PR head normal CI + full Chromium green;
3. squash merge release PR; that merge commit becomes the intended release identity;
4. existing release workflow succeeds and creates annotated tag `v0.7.0`;
5. tag ultimately points **exactly** to the release merge commit;
6. GitHub Release `WorldBoxSR v0.7.0` is published from checked-in release notes;
7. release-commit main CI green;
8. release-commit Pages deploy + final public `/play/` verification green;
9. release-commit full Chromium green;
10. separate docs-only closeout marks shipped without moving the tag;
11. close #252 and #240; only then allow v0.8 planning.

## Explicit v0.7 non-goals

No terrain/elevation/moisture/biome/water/resource painter, live snapshot savegame UI, Setup undo/remove stack, timeline rewind/event replay, rules DSL/scripts/objectives/scoring, cloud/accounts/workshop backend, short-link/compression service, custom map sizes, AI-generated canonical authority or new simulation mechanics.
