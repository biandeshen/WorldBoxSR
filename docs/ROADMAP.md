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
8. Implementation freezes before release packaging; published release tags never move.
9. Ordinary feature slices reuse focused tests/browser smoke; bespoke release-grade canonical gates belong at authority-changing or milestone boundaries, not every micro-change.

---

## v0.1.0 — A Living World
**Status: shipped developer-prototype baseline.**

Deterministic terrain/resources, human lifecycle/ancestry, settlements/history, save/load, grazers, Simulation Lab/tests, minimal client and God tools.

## v0.2.0 — Playable World
**Status: shipped.**

Phaser/Vite world view, direct powers, camera/input, inspection, event pulse, public Pages and real Chromium QA.

## v0.3.0 — Civilizations Rise
**Status: shipped.**

Polities, rulers/succession, relations/war/peace, warbands, conquest/transfer/dissolution/rebellion.

## v0.4.0 — God Power Sandbox
**Status: shipped.**

Six-power dock, authoritative Meteor destruction + Rain recovery, truthful Chronicle outcomes.

## v0.5.0 — World Stories
**Status: shipped.**

Causal Event Cards, Focused Story Trail, Watchlist, Chronicle lenses and one canonical browser story path.

## v0.6.0 — Living Ecology
**Status: shipped.**

Supported Living Ecology preset, Grazer + Wolf surface, deterministic Wolf predation, ecology readability and canonical pressure→recovery→predation path.

## v0.7.0 — Scenario Builder & Sharing
**Status: shipped.**

Deterministic Scenario Recipe v1, visible Setup, portable share/import, Replay/Fork and one canonical compose→share→diverge→Replay→Fork journey.

Immutable release identity:
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag `v0.7.0` / tag object `236eef64cf5090ff1a65bfee264f193078e79606`;
- release workflow #11, CI #817, Pages #58/public `/play/`, full visual-qa #312 green.

---

## v0.8.0 — Ruling Lines & Succession
**Status: shipped.**

Primary fantasy:

> **I can watch a ruling bloodline inherit power across generations, see when that bloodline loses the throne, and follow the new ruling line in the same causal world history.**

### Shipped behavior

1. **Genealogical resolver** — pure explicit parent→child descendant graph; cycle-safe; no mutation/RNG; deterministic nearest-generation → age → stable-ID ranking.
2. **Authoritative succession** — descendant-first continuation of the current ruling-line founder; existing oldest-adult open-selection fallback starts a new line when no eligible descendant exists; snapshot v16 migration.
3. **Ruling-line readability** — compact founder/sequence/reign/transition facts in existing ruler + settlement Inspector.
4. **Dynastic World Stories** — recorded descendant continuation vs new-line fallback rendered through existing Event Card / Rule lens / event-map references.
5. **Canonical Ruling Lines gate** — duplicate + save/load exactness plus production Chromium read-only Inspector/story evidence, while v0.4–v0.7 browser regressions stay green.

Immutable release identity:
- implementation freeze `1556a8a8e1e058db54a1ac93a2eed1a69020c191`;
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag `v0.8.0` / tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5` → exact release commit;
- GitHub Release `WorldBoxSR v0.8.0` published by release workflow #12;
- release-commit CI #865 green;
- Pages #66/public `/play/` green;
- full visual-qa #358 green.

### Semantic boundary

`parental_union` remains historical co-parent identity; maternal `lineage` remains its existing primitive; a political ruling line is derived only from explicit descent + recorded succession. No marriage, noble-house, legitimacy, claim, primogeniture, election or inferred political motive is implied.

### Deliberate stop

No economy/trade/storage/currency, professions/classes, marriage/household, noble titles/claims, configurable succession laws/elections, claimant civil wars, religion/culture/technology, boats/naval warfare, broad diplomacy rewrite, terrain/editor work, AI-authored political facts or fertility/migration rescue.

---

## v0.9.0 — World Feel & Public Alpha Polish

**Primary fantasy: “the first screen already feels like a living god-game world.”**

This is a deliberate correction toward visible product value. v0.9 must not become another mostly invisible simulation-depth sprint.

### Priority order

1. **World-first viewport** — make the map occupy much more of ordinary 1440×900 play; remove large dead regions; keep information panels contextual, collapsible or overlay-based where practical.
2. **Coherent visual language** — stronger terrain/biome contrast, buildings, units, settlement/polity identity and hierarchy without replacing the authoritative world model.
3. **Visible civilization change** — construction/growth, territorial change, conflict/warbands, destruction/recovery and other already-authoritative systems should read from the map before opening a panel.
4. **Motion, FX and sound feedback** — births/deaths, combat, building, fires, powers, weather and major state changes get bounded animation/particle/audio treatment where it improves observation.
5. **Public-alpha usability** — onboarding, settings/keybinds/accessibility, performance budgets, save compatibility, error/recovery UX, touch/platform decisions and contributor extension points.

### Development allocation target

For this stage, aim roughly for:
- **60–65%** player-visible world/game-feel/content work;
- **25–30%** simulation correctness, reliability, performance and regression work;
- **≤10%** docs/process/governance unless a concrete blocker requires more.

Hard invariants remain: deterministic authority, save/load continuity, no hidden second world model. But the default proof for an ordinary v0.9 slice is focused regression + one real-browser smoke/visual check; full historical/canonical browser proof is batched at meaningful milestone/release gates.

### Early success measures

Before adding another deep civilization subsystem, v0.9 should demonstrate:
- clearly higher world viewport utilization on the standard 1440×900 surface;
- less empty UI/dead space;
- stronger visual distinction among terrain, buildings, entities and polities;
- at least one civilization lifecycle/change that is understandable from the world view without reading raw data;
- intervention feedback that feels immediate and game-like.

---

## v1.0 — Stable sandbox identity

A stable product/compatibility contract: reproducible worlds, dependable browser play, creation/intervention + civilizations + stories + supported ecology + deterministic Scenario creation/sharing working together, usable causal history, save/version policy and credible supported performance.

## Current decision

1. v0.8.0 is shipped and immutable; do not move its tag or reopen behavior under that version;
2. open a bounded v0.9 World Feel/Public Alpha planning gate;
3. first implementation target should be a visibly larger, denser world surface rather than another hidden simulation subsystem;
4. do not start economy/religion/technology/naval breadth in parallel merely to increase feature-count optics;
5. judge the next checkpoint first by what a player can **see and feel in the public demo**.
