# WorldBoxSR release roadmap

WorldBoxSR is an open-ended sandbox, but development must not be open-ended. The project ships **coherent, visible, playable slices**. Simulation rigor is necessary for trust and depth; it is not product progress by itself.

## Permanent release discipline

1. Visible progress is required; green tests alone do not complete a player-facing version.
2. The public Pages demo is the product truth surface.
3. No unbounded research blocker; supported scope beats universal scope.
4. Natural negative outcomes are valid when causal/invariant truth holds.
5. Visual/game-feel work requires reproducible evidence.
6. Infrastructure is subordinate to the playable loop.
7. Every version owns a canonical showcase path and explicit non-goals.
8. Implementation freezes before release packaging; release tags never move during later docs closeout.

---

## v0.1.0 — A Living World
**Status: shipped developer-prototype baseline.**

Deterministic terrain/resources, human lifecycle/ancestry, settlements/history, save/load, grazers, Simulation Lab/tests, minimal Canvas client, god tools and GitHub delivery infrastructure.

---

## v0.2.0 — Playable World
**Status: shipped.**

Player-visible Phaser/Vite checkpoint: terrain/units/settlements, direct God Powers, responsive camera, inspection, event pulse, deterministic showcase, Pages and real Chromium Visual QA.

---

## v0.3.0 — Civilizations Rise
**Status: shipped.** Primary fantasy: “I can watch small settlements become rival powers.”

Polities, rulers/succession, relations/war/peace, visible warbands, conquest/transfer/dissolution/rebellion and canonical civilization collision path.

Detailed backlog: [`docs/backlog/v0.3.md`](backlog/v0.3.md). Release QA: [`docs/demos/v0.3.0.md`](demos/v0.3.0.md).

---

## v0.4.0 — God Power Sandbox
**Status: shipped.** Primary fantasy: “intervening is fun even before I care about the simulation.”

Six-power dock, authoritative Meteor destruction + Rain recovery, truthful outcomes, Chronicle intervention history and deterministic headless/Chromium gate.

Detailed backlog: [`docs/backlog/v0.4.md`](backlog/v0.4.md). Release QA: [`docs/demos/v0.4.0.md`](demos/v0.4.0.md).

---

## v0.5.0 — World Stories
**Status: shipped.** Primary fantasy: “this world has a history I can follow and remember.”

Causal Event Cards, Focused Story Trail, same-tab Watchlist, four Chronicle lenses and one canonical browser story path. Release tag `v0.5.0` points at `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`.

Detailed backlog: [`docs/backlog/v0.5.md`](backlog/v0.5.md). Release QA: [`docs/demos/v0.5.0.md`](demos/v0.5.0.md). Release notes: [`docs/releases/v0.5.0.md`](releases/v0.5.0.md).

---

## v0.6.0 — Living Ecology
**Status: shipped.** Primary fantasy: “I can watch animal populations and vegetation affect each other, and see predation change that living system.”

Supported Living Ecology preset, Grazer + Wolf surface, deterministic Wolf predation, ecology readability and canonical seed45 pressure→recovery→predation gate.

Release identity:
- release commit `2fa4ce8d131f55d84c59f4bdfbae088cd222486f`;
- annotated tag object `ae558bb91912e383d153317ae0fdb0a77e8c10eb` → exact release commit;
- release workflow #10, CI #748, Pages #50/public `/play/`, visual-qa #247 green.

Detailed backlog: [`docs/backlog/v0.6.md`](backlog/v0.6.md). Release QA: [`docs/demos/v0.6.0.md`](demos/v0.6.0.md). Release notes: [`docs/releases/v0.6.0.md`](releases/v0.6.0.md).

---

## v0.7.0 — Scenario Builder & Sharing
**Status: implementation frozen; release candidate publication gate active (#252 / PR #253).**

**Primary fantasy: “I can assemble a world setup, send it to someone else, and we both start from exactly the same world before running, replaying or forking different histories.”**

v0.7 deliberately ships a deterministic **Scenario Recipe**, not a full map painter.

### Frozen shipped implementation

1. **Recipe v1 core** — strict `worldboxsr-scenario` startup input, current seed/preset ready base, ordered Human/Grazer/Wolf placements, bounded validation, canonical serialization and one deterministic materializer.
2. **Scenario Setup workspace** — visible paused composition using the existing Phaser pointer/command path; Clear rematerializes; Run freezes the Recipe.
3. **Portable Recipe** — canonical JSON export/import plus unpadded-base64url `scenario=` links; fresh browser reconstruction is exact and invalid imports are atomic.
4. **Replay + Fork** — Replay rematerializes the frozen Recipe start; Fork creates an independent editable copy while retaining immutable source identity.
5. **Canonical Scenario Builder gate** — one headless + real Chromium journey proves compose → share/fresh open → Run/diverge → Replay exact source → Fork/Edit → deterministic fork → Replay exact fork.

Canonical source `Portable trio`:
- seed45 Sandbox;
- Human `(12,8)`, Grazer `(16,12)`, Wolf `(14,7)`;
- paused fingerprint `7f07ed67`.

Canonical fork:
- fourth Human `(12,8)`;
- paused fingerprint `67543ff4`.

Implementation freeze:
- capability 5 merge `1043a63375fee4ccaa72141da7f1e026a550b989`;
- merged-main CI #811;
- Pages #57 including final public `/play/` verification;
- full visual-qa #306;
- canonical artifact `9580488110` + four manually reviewed 1440×900 screenshots.

Detailed backlog: [`docs/backlog/v0.7.md`](backlog/v0.7.md). Release candidate QA: [`docs/demos/v0.7.0.md`](demos/v0.7.0.md). Release candidate notes: [`docs/releases/v0.7.0.md`](releases/v0.7.0.md).

### Release publication still pending

The implementation is frozen, but `v0.7.0` is **not yet shipped**. Release-only PR #253 may change package/release/management docs only. After merge, require:
- existing release workflow success;
- annotated tag `v0.7.0` targets exactly the release merge commit;
- GitHub Release uses checked-in `docs/releases/v0.7.0.md`;
- release-commit CI, Pages/public `/play/` and full Chromium all green;
- later docs-only closeout never moves the tag.

### Deliberate stop

No terrain/elevation/moisture/biome/water/resource painter, arbitrary tile editor, live snapshot savegame UI, Setup undo/remove stack, timeline rewind/event replay, rules DSL/scripts/objectives/scoring, cloud/workshop backend, short-link/compression service, custom map size or new simulation mechanics.

---

## v0.8.0 — Civilization Depth
**Status: future planning only; may not begin until v0.7 immutable publication closeout.**

Candidate pool selected by play evidence: trade/economy, professions, culture/technology, religion, deeper politics, boats/colonization/naval conflict and richer diplomacy. This must be subdivided into bounded stages rather than implemented as a mega-sprint.

---

## v0.9.0 — Public Alpha Polish

Onboarding, settings/keybinds/accessibility, performance budgets, audio/art consistency, save compatibility, error/recovery UX, platform/touch decisions, contributor extension points and release hardening.

---

## v1.0 — Stable sandbox identity

A stable product/compatibility contract: reproducible worlds, dependable browser play, creation/intervention + civilizations + stories + supported ecology + deterministic Scenario creation/sharing working together, usable causal history, save/version policy and credible supported performance.

## Current decision

1. keep v0.7 product/gate behavior frozen at `1043a63375fee4ccaa72141da7f1e026a550b989`;
2. finish release-only #252 / PR #253 with an exact package/docs allowlist;
3. require release-PR normal CI + full Chromium before merge;
4. after merge, verify annotated tag/GitHub Release + release-commit CI + Pages/public `/play/` + full Chromium;
5. perform a separate docs-only shipped closeout without moving the tag;
6. only then close #240/#252 and allow v0.8 planning.
