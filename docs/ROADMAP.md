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
**Status: release candidate / publication pending.** Release handoff #323.

Primary promise:

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

v1.0 deliberately contains only three completed product-contract capabilities.

### 1. Portable Compatibility Contract — COMPLETE

- engine current schema remains snapshot v16;
- frozen supported engine input baseline v10–v16;
- independent migration matrix for all seven versions;
- local ordinary-world envelope v1 restored through the same engine migration path;
- Scenario Recipe v1 remains canonical;
- unsupported/future versions reject explicitly;
- no migration behavior or simulation policy changed.

Delivery: #315/#316 → `c611401e81ad262c9eb76a55151c1261178fae15`; main CI #935, Pages #91, full visual #426 green.

### 2. Certified Runtime & Recovery Envelope — COMPLETE

Canonical public contract: `docs/SUPPORT.md`.

Certified:
- Chrome/Chromium-class Phaser desktop 1440×900;
- Chrome/Chromium-class Phaser coarse touch 430×820;
- Legacy Canvas ordinary-world compatibility fallback;
- `phaser_main` ≤300,000 B + dedicated Phaser vendor chunk.

Explicitly uncertified/best effort until real gates exist: Firefox/Gecko, Safari/WebKit and arbitrary other device/browser surfaces. Large Node benchmark remains diagnostic, not an SLA.

Delivery: #318/#319 → `2f40d850673831270463d61480d64842e8771727`; main CI #939, Pages #93, full visual #428 green.

### 3. Cross-System Stable Sandbox Gate — COMPLETE / implementation freeze

Final production evidence composes:
- unchanged causal World Stories evidence;
- ordinary real UI Save now → authoritative divergence → exact paused Restore;
- ordinary→Scenario transition disabling Save/Restore without overwriting ordinary local save;
- unchanged canonical Scenario Recipe v1 share/Run/Replay/Fork evidence;
- full-scope verifier producing `stable-sandbox-evidence.json`.

The final gate discovered and fixed one real integration defect: initial `Save now` did not unlock until the first 30-second autosave. v1.0 now re-renders persistence availability at the real initial boot→ready boundary without changing save formats or simulation authority.

Implementation freeze:
`efecf1e91ac88177ce82917c1312577927e26af6`

Frozen delivery:
- CI #946 green;
- Pages #95/public `/play/` green;
- full historical visual-qa #434 green;
- `stable-sandbox-evidence.json` records `stableSandboxGateComplete: true`.

## v1.0 release-only next step

#323 may change exactly:
- `package.json` → 1.0.0;
- `docs/releases/v1.0.0.md`;
- `docs/demos/v1.0.0.md`;
- README;
- this ROADMAP;
- STATUS;
- `docs/backlog/v1.0.md`.

No behavior changes are allowed after the freeze.

Publication requires:
1. release candidate CI + PR browser smoke green;
2. squash merge of exact release-only files;
3. existing release workflow creates annotated tag `v1.0.0` and GitHub Release;
4. tag resolves exactly to the release merge commit;
5. release-commit CI, Pages/public `/play/`, and full historical Visual all green including stable-sandbox composition.

---

## Post-1.0 direction

Do not infer a new breadth roadmap merely because 1.0 is reached. After immutable v1.0 publication, open one new evidence-based planning gate and decide the next product problem from the shipped public demo and user/developer evidence.

Possible future domains such as economy, religion, technology, naval systems, multiplayer, cloud sync or public mod APIs remain **uncommitted** until separately justified.

## Current decision

1. publish v1.0.0 from frozen implementation `efecf1e9…` with no behavior changes;
2. close #323/#321 only after immutable tag/release + release-commit delivery proof;
3. never move v1.0.0 or older release tags;
4. do not start post-1.0 feature work in parallel with publication;
5. keep public `/play/` plus deterministic authority evidence as product truth.
