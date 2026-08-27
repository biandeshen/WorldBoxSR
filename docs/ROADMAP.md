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
9. Ordinary feature slices reuse focused tests/browser smoke; full historical proof belongs at meaningful milestone/release boundaries.

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

Descendant-first ruling-line succession, deterministic open-selection fallback, persistent line identity, ruling-line Inspector readability, Dynastic World Stories and exact canonical save/load proof.

Immutable release identity:
- implementation freeze `1556a8a8e1e058db54a1ac93a2eed1a69020c191`;
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag `v0.8.0` / tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5` → exact release commit;
- release workflow #12, CI #865, Pages #66/public `/play/`, full visual-qa #358 green.

---

## v0.9.0 — World Feel & Public Alpha Polish
**Status: shipped.**

Primary promise:

> **Opening WorldBoxSR feels like looking at a living god-game world first: larger, more readable, visibly changing, recoverable, and usable across desktop and touch.**

v0.9 is intentionally a world-feel / presentation / public-alpha reliability stage rather than a new hidden simulation-depth subsystem.

### Shipped implementation

1. **World-first viewport** — desktop camera uses the full render surface beneath floating HUD chrome; canonical 1440×900 world grows from roughly 718×718 to 864×864 while compact/mobile composition remains bounded.
2. **Visual hierarchy** — population-scaled settlement footprints, stronger capital emphasis and clearer authoritative polity borders.
3. **Living motion** — movement-derived Human/Grazer/Wolf gait plus subtle inhabited-settlement banner/hearth ambience, with no new simulation action state.
4. **Civilization readability** — warband formations, objective cues, recent recorded battle traces, truthful ruins, and occupation/rebellion identity from existing authority.
5. **Intervention memory** — recent Meteor footprint presentation fades with the current real vegetation recovery ratio and disappears after real Rain restoration.
6. **Ordinary-world persistence** — one browser-local slot backed by the existing engine snapshot; automatic/manual paused restore; explicit atomic errors; Scenario Recipe authority remains separate.
7. **Touch/public-alpha navigation** — compact 430px HUD; tap tool, hold inspect, drag pan, two-finger pinch zoom; real mobile Chromium authority proofs.
8. **Recovery/accessibility** — explicit renderer failure recovery actions plus local Reduce Motion and Mute preferences that never alter world authority.
9. **Performance/throughput** — stable Phaser vendor chunk, checked <300 KB minified app-chunk budget, fast PR Chromium smoke while `main` retains the full historical denominator.

### Immutable release identity

- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag `v0.9.0` / tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- GitHub Release `WorldBoxSR v0.9.0` published by release workflow #13;
- release-commit CI #929 green;
- Pages #88/public `/play/` green;
- full visual-qa #422 green, including v0.4–v0.8 history plus v0.9 mobile touch/pinch and renderer recovery.

The v0.9 implementation and release identities are immutable. Later docs cleanup must not move the tag.

### Authority boundary

v0.9 does not intentionally change authoritative simulation rules or the engine snapshot schema from v0.8. Presentation reads existing world/history facts. Local ordinary-world saves embed the existing engine snapshot rather than inventing a second world format. Scenario Recipe / Replay / Fork remain a distinct deterministic creation identity.

### Deliberate stop

No economy/trade/storage/currency, religion/culture/technology, new diplomacy/war-resolution rules, new conquest/destruction/rebuilding/loyalty mechanics, boats/naval warfare, cloud saves, multiple local save slots, or a second mobile renderer/camera authority.

---

## v1.0 — Stable sandbox identity

**Status: next bounded planning stage.**

The next stage should stabilize the product/compatibility contract rather than immediately start another breadth sprint.

Primary target:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported performance, and coherent creation/intervention/civilization/ecology/story workflows.**

Planning should bound:
- supported save/version compatibility and migration policy;
- supported browser/device/performance envelope;
- public-alpha onboarding and error/recovery contract;
- extension/content contracts for creatures, powers and civilizations;
- final cross-system coherence and regression/release standards.

Do not start economy/religion/technology/naval breadth merely to make a v1.0 feature list look larger.

## Current decision

1. v0.9.0 is shipped and immutable; do not move its tag or reopen behavior under that version;
2. close #310 and #269 with the immutable release evidence;
3. open one bounded v1.0 Stable Sandbox Identity planning gate;
4. prioritize compatibility, reliability and cross-system coherence before feature breadth;
5. keep the public `/play/` demo as the product truth surface.
