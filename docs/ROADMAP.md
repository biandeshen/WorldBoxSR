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
**Status: shipped.** Primary fantasy: “I can assemble a world setup, send it to someone else, and we both start from exactly the same world before running, replaying or forking different histories.”

v0.7 deliberately ships a deterministic **Scenario Recipe**, not a full map painter.

### Shipped scope

1. **Recipe v1 core** — strict `worldboxsr-scenario` startup input, current seed/preset ready base, ordered Human/Grazer/Wolf placements, bounded validation, canonical serialization and one deterministic materializer.
2. **Scenario Setup workspace** — visible paused composition using the existing Phaser pointer/command path; Clear rematerializes; Run freezes the Recipe.
3. **Portable Recipe** — canonical JSON export/import plus unpadded-base64url `scenario=` links; fresh browser reconstruction is exact and invalid imports are atomic.
4. **Replay + Fork** — Replay rematerializes the frozen Recipe start; Fork creates an independent editable copy while retaining immutable source identity.
5. **Canonical Scenario Builder gate** — one headless + real Chromium journey proves compose → share/fresh open → Run/diverge → Replay exact source → Fork/Edit → deterministic fork → Replay exact fork.

Canonical source `Portable trio`: seed45 Sandbox; Human `(12,8)`, Grazer `(16,12)`, Wolf `(14,7)`; paused fingerprint `7f07ed67`. Canonical fork adds a fourth Human `(12,8)`, fingerprint `67543ff4`.

### Immutable release identity

- implementation freeze `1043a63375fee4ccaa72141da7f1e026a550b989`;
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606` → exact release commit;
- release workflow #11, CI #817, Pages #58/public `/play/`, full visual-qa #312 green;
- docs-only closeout `f14b6194a76a57ba77ff4867d95d0ff44b4c6d6e`; CI #819, Pages #59/public `/play/`, visual #313 green.

Detailed backlog: [`docs/backlog/v0.7.md`](backlog/v0.7.md). Release QA: [`docs/demos/v0.7.0.md`](demos/v0.7.0.md). Release notes: [`docs/releases/v0.7.0.md`](releases/v0.7.0.md).

### Deliberate stop

No terrain/elevation/moisture/biome/water/resource painter, arbitrary tile editor, live snapshot savegame UI, Setup undo/remove stack, timeline rewind/event replay, rules DSL/scripts/objectives/scoring, cloud/workshop backend, short-link/compression service, custom map size or new simulation mechanics.

---

## v0.8.0 — Ruling Lines & Succession
**Status: planning gate active. Release gate #255.**

**Primary fantasy: “I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.”**

v0.8 selects one narrow Civilization Depth seam instead of implementing the whole candidate pool.

### Planned finite scope

1. **Genealogical succession resolver + trajectory audit** — pure descendant graph over explicit parent/child/parental-union records; RNG-neutral ranking; freeze a real bounded seed45 canonical succession opportunity before behavior changes.
2. **Authoritative ruling-line succession** — descendant-first succession inside the current polity, with current oldest-eligible-adult selection preserved as deterministic fallback; minimal ruling-line political identity and snapshot migration.
3. **Ruling-line readability** — compact current ruler/founder/line-sequence/reign context in existing inspection; no politics dashboard or family-tree editor.
4. **Dynastic World Stories** — ruler succession presentation distinguishes recorded bloodline continuation from a new ruling line through existing Event Card / Rule-lens / polity-human references.
5. **Canonical Ruling Lines gate** — one deterministic headless + production Chromium path proves a real descendant succession and a truthful line-change fallback while prior releases stay green.
6. release-only `v0.8.0` handoff after merged-main delivery verification.

Detailed finite backlog: [`docs/backlog/v0.8.md`](backlog/v0.8.md).

### Architecture boundary

- `parental_union` remains historical co-parent identity, not marriage/household;
- existing maternal `lineage` remains a lineage primitive, not a noble house/dynasty;
- ruling-line continuation is derived from explicit parent→child descent and stored only as minimal political identity where persistence is required;
- no second ancestry database and no succession RNG;
- no eligible descendant = current oldest-adult open-selection fallback, not a manufactured heir;
- natural ruling-line failure is valid emergence.

### Why economy is deferred

Prior storage/scarcity/demographic experiments show that settlement resource interventions can cause broad indirect population/spatial feedback and that settlement decline has heterogeneous causes. v0.8 therefore does not reopen storage/economy tuning as a generic “civilization depth” shortcut.

### Deliberate stop

No economy/trade/currency/storage, professions/classes, marriage diplomacy/household semantics, noble titles/claims/legitimacy, configurable succession laws/elections, claimant civil-war system, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, fertility/migration rescue or unrelated simulation mechanics.

---

## v0.9.0 — Public Alpha Polish

Onboarding, settings/keybinds/accessibility, performance budgets, audio/art consistency, save compatibility, error/recovery UX, platform/touch decisions, contributor extension points and release hardening.

---

## v1.0 — Stable sandbox identity

A stable product/compatibility contract: reproducible worlds, dependable browser play, creation/intervention + civilizations + stories + supported ecology + deterministic Scenario creation/sharing working together, usable causal history, save/version policy and credible supported performance.

## Current decision

1. merge the v0.8 planning-only backlog/ROADMAP/STATUS PR after normal CI;
2. only then open capability 1: **Genealogical succession resolver + trajectory audit**;
3. do not start succession behavior, economy, professions, religion, technology, boats or broader diplomacy in parallel;
4. if the audit cannot find a credible bounded real descendant-succession path, reconcile #255 rather than adding fertility/migration/rescue or injected heirs;
5. no implementation is accepted unless it advances `ruler → explicit bloodline succession or line failure → readable political history`.
