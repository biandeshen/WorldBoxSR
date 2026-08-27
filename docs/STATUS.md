# Project status

Last updated: 2026-08-28

## Management state

**v1.0.0 — Stable Sandbox Identity is shipped and closed.**

Immutable release identity:
- implementation freeze `efecf1e91ac88177ce82917c1312577927e26af6`;
- release commit `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
- annotated tag `v1.0.0` / tag object `75e89c559e91cb0128fb35a79bd32c6fa84f02cf` → exact release commit;
- GitHub Release `WorldBoxSR v1.0.0` published by release workflow #14;
- release-commit CI #948 green;
- Pages #96 green including final public `/play/` verification;
- full historical visual-qa #436 green, including v0.4–v0.9 regressions, mobile touch/pinch, renderer recovery and final stable-sandbox composition;
- tagged-release visual artifact records `stableSandboxGateComplete: true`.

The v1.0 implementation and release identities are immutable. Any later docs cleanup must not move the tag.

**v0.9.0 — World Feel & Public Alpha Polish remains shipped and immutable.**
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag object `6992bba5f45366fa7d3832a981cb590cf5090554`;
- release workflow #13, CI #929, Pages #88/public `/play/`, full visual #422 green.

## v1.0 delivered promise

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

## Capability 1 — Portable Compatibility Contract — COMPLETE

- current engine schema remains snapshot v16;
- frozen supported engine inputs v10–v16;
- independent v10–v16 migration matrix;
- local ordinary-world envelope v1 restores all supported historical engine snapshots through normal engine migration;
- Scenario Recipe v1 remains canonical;
- unsupported/future engine, local-envelope and Scenario Recipe versions reject explicitly;
- historical provenance remains truthful: public v0.3/v0.4/v0.7 used v15; public v0.8/v0.9 use v16; v10–v14 are older accepted prototype/internal schemas.

Delivery evidence:
- #315/#316 merge `c611401e81ad262c9eb76a55151c1261178fae15`;
- PR CI #934 + visual #425 green;
- merged-main CI #935, Pages #91, full visual #426 green;
- no migration defect exposed and no migration branch/simulation behavior changed.

## Capability 2 — Certified Runtime & Recovery Envelope — COMPLETE

Canonical public contract: `docs/SUPPORT.md`.

Certified:
- Chrome/Chromium-class Phaser at 1440×900 desktop;
- Chrome/Chromium-class Phaser at 430×820 coarse touch;
- Legacy Canvas ordinary-world compatibility fallback;
- public 24×24 showcase as initial performance envelope;
- `phaser_main` ≤300,000 B minified with one dedicated Phaser vendor chunk.

Explicit limitations:
- Scenario remains Phaser-only;
- Firefox/Gecko and Safari/WebKit remain uncertified/best effort;
- arbitrary mobile/device combinations outside the certified surface are not claimed;
- no cloud/cross-device save;
- 64×64 1k/10k benchmark remains diagnostic, not an SLA.

Delivery evidence:
- #318/#319 merge `2f40d850673831270463d61480d64842e8771727`;
- PR CI #938 green;
- merged-main CI #939, Pages #93, full visual #428 green;
- no runtime behavior changed.

## Capability 3 — Cross-System Stable Sandbox Gate — COMPLETE

Final implementation freeze: `efecf1e91ac88177ce82917c1312577927e26af6`.

### Causal history
Existing unchanged World Stories evidence remains authoritative for real intervention→death/succession→causal Event Card/cause/map/Inspector navigation and read-only world neutrality.

Frozen events:
- Lightning #175;
- death #176;
- succession #181.

### Ordinary persistence composition
Production UI proof:
- Save now at day 14400;
- real Time/Play mutation to day 14401;
- exact Restore to day 14400;
- saved/restored fingerprint `22296cba`;
- divergent mutation fingerprint `be4daf1e`;
- Restore installs paused;
- Scenario Setup disables ordinary Save/Restore;
- exact status `Scenario active · use Recipe / Replay / Fork`;
- ordinary local save remains unchanged while Scenario identity is active.

### Canonical Scenario identity
Existing canonical Scenario Builder evidence remains unchanged:
- Recipe v1;
- source fingerprint `b411c106`;
- distinct fork fingerprint `0f28ca42`;
- exact source/share/Run/diverge/Replay/Fork/fork-Replay journey complete.

### Full composition
`stable-sandbox-evidence.json` combines Story + ordinary persistence + canonical Scenario evidence and records `stableSandboxGateComplete: true`.

### Proven readiness correction
The final gate found a real integration defect: initial manual `Save now` stayed disabled until the first 30-second autosave because persistence availability did not refresh when showcase warmup became ready.

v1.0 fixes only that boot→ready UI readiness seam. Save envelope, engine snapshot schema, autosave interval, Restore authority, Scenario identity and simulation behavior remain unchanged.

Delivery evidence:
- PR #322 final head `a6b4e0f14617b699a155d560a1cd635d433ea14d`;
- PR CI #945 + visual #433 green;
- squash merge `efecf1e91ac88177ce82917c1312577927e26af6`;
- main CI #946, Pages #95, full visual #434 green.

## Publication proof

Release handoff #323 / PR #324 used exactly seven release/package/doc files and no behavior changes.

Publication evidence:
- release candidate `19863a7571c189ab746a68b50fd8e74572144c02`;
- candidate CI #947 + visual #435 green;
- release PR #324 squash-merged as `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
- release workflow #14 created annotated tag object `75e89c559e91cb0128fb35a79bd32c6fa84f02cf` and GitHub Release `WorldBoxSR v1.0.0`;
- tag resolves exactly to release commit `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
- release-commit CI #948 green;
- Pages #96/public `/play/` green;
- full historical visual #436 green;
- release visual artifact includes complete stable-sandbox composition.

## Authority/support guards after 1.0

- one authoritative deterministic world model;
- snapshot v10–v16 historical support baseline is now a public compatibility contract;
- local ordinary-world envelope v1 and Scenario Recipe v1 remain separate portable identities;
- certified browser/device claims stay bounded by `docs/SUPPORT.md` evidence;
- presentation never invents political/ecological/pathfinding facts;
- published v1.0.0 and older tags never move;
- public `/play/` remains product truth.

## Post-1.0 decision gate

No post-1.0 feature/version theme is committed yet.

Next steps:
1. merge this docs-only shipped closeout;
2. re-read `v1.0.0` tag and prove it still points to `631ca77903ab6046fe5142cf937460d3b5cf5ae2`;
3. close #323 and #321 completed;
4. open exactly one post-1.0 evidence-based product-direction planning gate;
5. do not start parallel feature breadth before that gate freezes the next finite problem.
