# WorldBoxSR release roadmap

WorldBoxSR is an open-ended sandbox, but development must not be open-ended. The project ships **coherent, visible, playable slices** and freezes public contracts at release boundaries.

## Permanent release discipline

1. Visible progress is required; green tests alone do not complete a player-facing version.
2. The public Pages demo is the product truth surface.
3. Supported scope beats universal/unbounded scope.
4. Natural negative outcomes are valid when causal/invariant truth holds.
5. Infrastructure is subordinate to the playable loop.
6. Implementation freezes before release packaging; published tags never move.
7. Ordinary feature slices use focused tests/browser smoke; full historical proof belongs at capability/release boundaries.
8. Public support claims require real evidence; uncertified surfaces stay explicitly uncertified.

---

## v0.1.0 — A Living World
**Status: shipped.** Deterministic terrain/resources, humans/ancestry, settlements/history, save/load, grazers and developer simulation tooling.

## v0.2.0 — Playable World
**Status: shipped.** Phaser/Vite world view, camera/input, inspection, powers, public Pages and real Chromium QA.

## v0.3.0 — Civilizations Rise
**Status: shipped.** Polities, rulers/succession, relations/war/peace, warbands, conquest/transfer/dissolution/rebellion.

## v0.4.0 — God Power Sandbox
**Status: shipped.** Six-power dock, authoritative Meteor destruction + Rain recovery and truthful Chronicle outcomes.

## v0.5.0 — World Stories
**Status: shipped.** Causal Event Cards, Focused Story Trail, Watchlist, Chronicle lenses and canonical browser story path.

## v0.6.0 — Living Ecology
**Status: shipped.** Grazer/Wolf ecology, predation, readability and canonical pressure→recovery→predation evidence.

## v0.7.0 — Scenario Builder & Sharing
**Status: shipped.** Scenario Recipe v1, Setup, portable share/import, Replay/Fork and canonical exact Scenario journey.

Immutable identity:
- release commit `1d5931a650f64765286e155c0e821bfe6d63a299`;
- annotated tag object `236eef64cf5090ff1a65bfee264f193078e79606`;
- release workflow #11, CI #817, Pages #58, full visual #312 green.

## v0.8.0 — Ruling Lines & Succession
**Status: shipped.** Deterministic descendant-first ruling-line succession, exact fallback, Inspector readability and Dynastic World Stories.

Immutable identity:
- implementation freeze `1556a8a8e1e058db54a1ac93a2eed1a69020c191`;
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5`;
- release workflow #12, CI #865, Pages #66, full visual #358 green.

## v0.9.0 — World Feel & Public Alpha Polish
**Status: shipped.** World-first viewport, stronger visual hierarchy/motion/civilization readability, local ordinary-world persistence, mobile touch, recovery/accessibility and faster PR validation.

Immutable identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag object `6992bba5f45366fa7d3832a981cb590cf5090554`;
- release workflow #13, CI #929, Pages #88, full visual #422 green.

---

## v1.0.0 — Stable Sandbox Identity
**Status: shipped.**

Primary promise:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

### Shipped product contract

1. **Portable Compatibility Contract** — current snapshot schema v16; supported engine inputs v10–v16; local ordinary-world envelope v1; Scenario Recipe v1; explicit future/unsupported rejection.
2. **Certified Runtime & Recovery Envelope** — `docs/SUPPORT.md` certifies Chrome/Chromium-class Phaser at 1440×900 desktop and 430×820 coarse touch, plus Legacy Canvas ordinary-world compatibility fallback; Firefox/Safari remain uncertified/best effort; `phaser_main` remains ≤300,000 B with a dedicated Phaser vendor chunk.
3. **Cross-System Stable Sandbox Gate** — unchanged causal World Stories + real UI Save→diverge→exact paused Restore→Scenario persistence isolation + unchanged canonical Scenario share/Run/Replay/Fork evidence, composed into `stable-sandbox-evidence.json`.

The final gate also fixed one proven integration defect: initial manual `Save now` could remain disabled until the first 30-second autosave. v1.0 refreshes Session availability at the real initial boot→ready boundary without changing save formats or simulation authority.

### Immutable release identity

- implementation freeze `efecf1e91ac88177ce82917c1312577927e26af6`;
- release commit `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
- annotated tag `v1.0.0` / tag object `75e89c559e91cb0128fb35a79bd32c6fa84f02cf` → exact release commit;
- GitHub Release `WorldBoxSR v1.0.0` published by release workflow #14;
- release-commit CI #948 green;
- Pages #96/public `/play/` green;
- full historical visual-qa #436 green, including mobile touch/pinch, renderer recovery and stable-sandbox composition;
- tagged-release artifact records `stableSandboxGateComplete: true`.

The v1.0 implementation and release identities are immutable. Later docs cleanup must never move the tag.

### Support boundary

Certified:
- Chrome/Chromium-class production Phaser · 1440×900 desktop;
- Chrome/Chromium-class production Phaser · 430×820 coarse touch;
- Legacy Canvas ordinary-world compatibility fallback.

Scenario remains Phaser-only. Firefox/Gecko, Safari/WebKit and arbitrary other browser/device surfaces remain uncertified/best effort until real evidence exists. See `docs/SUPPORT.md`.

### Deliberate stop

v1.0 does not add economy/trade/currency, religion/culture/technology, naval warfare, professions/classes, broad diplomacy rewrite, multiplayer/cloud sync, public mod marketplace/API, procedural AI-authored history, a new renderer, uncertified browser claims or an uncalibrated large-world SLA.

---

## Post-1.0 direction

**Status: not yet committed to a feature/version theme.**

Do not automatically turn 1.0 into a breadth backlog. The next step is one evidence-based planning gate using the shipped public demo, current user-visible gaps, technical constraints and comparable sandbox products.

Candidate future domains such as deeper economy, religion/culture/technology, naval systems, multiplayer/cloud sync or public mod APIs remain **uncommitted** until separately justified.

The next planning gate should prefer a finite, visibly valuable product problem over subsystem-count optics and should preserve the v1.0 compatibility/support contracts unless explicitly versioned.

## Current decision

1. v1.0.0 is shipped and immutable; never move its tag or rewrite its published contract;
2. close release #323 and final capability #321 after this docs-only closeout is merged and the tag target is re-verified;
3. open exactly one post-1.0 evidence-based product-direction planning gate;
4. do not start parallel post-1.0 feature branches before that planning gate freezes a finite direction;
5. keep public `/play/`, deterministic authority and the certified support contract as product truth.
