# Project status

Last updated: 2026-08-28

## Management state

**v0.9.0 — World Feel & Public Alpha Polish remains shipped and immutable.**
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- release workflow #13, CI #929, Pages #88/public `/play/`, full visual #422 green.

**v1.0.0 — Stable Sandbox Identity implementation is complete and frozen. Release candidate publication is active under #323.**

Implementation freeze:
`efecf1e91ac88177ce82917c1312577927e26af6`

Exact freeze delivery:
- CI **#946** green;
- Pages **#95** green including final public `/play/` verification;
- full historical visual-qa **#434** green;
- full artifact includes `stable-sandbox-evidence.json` with `stableSandboxGateComplete: true`.

No v1.0 product behavior may change in the release handoff.

## v1.0 delivered promise

> **WorldBoxSR behaves like one dependable sandbox product: reproducible worlds, stable browser play, recoverable saves, understandable history, supported public surfaces, and coherent creation/intervention/civilization/ecology/story workflows.**

## Capability 1 — Portable Compatibility Contract — COMPLETE

Issue #315 / PR #316 froze existing migration capability as a supported contract.

- current engine schema stays v16;
- `SUPPORTED_SNAPSHOT_VERSIONS = [10,11,12,13,14,15,16]` drives acceptance;
- independent v10–v16 matrix normalizes every supported historical schema to current;
- every migrated case remains exact against a current-normalized equivalent after the same 12-tick continuation;
- local envelope v1 accepts every supported engine case;
- Scenario Recipe v1 remains canonical;
- future/unsupported versions reject explicitly;
- no migration defect was exposed and no migration branch/simulation behavior changed.

Evidence:
- merge `c611401e81ad262c9eb76a55151c1261178fae15`;
- PR CI #934 + visual #425;
- main CI #935, Pages #91, full visual #426 green.

Historical provenance:
- public v0.3/v0.4/v0.7 used v15;
- public v0.8/v0.9 use v16;
- v10–v14 are older accepted prototype/internal schemas.

## Capability 2 — Certified Runtime & Recovery Envelope — COMPLETE

Canonical contract: `docs/SUPPORT.md`.

Certified:
- Chrome/Chromium-class production Phaser at 1440×900 desktop;
- Chrome/Chromium-class production Phaser at 430×820 coarse touch;
- Legacy Canvas ordinary-world compatibility fallback;
- public 24×24 showcase as initial product performance envelope;
- exactly one Phaser vendor/app split and app chunk ≤300,000 B.

Explicit limitations:
- Scenario remains Phaser-only;
- Firefox/Gecko and Safari/WebKit remain uncertified/best effort;
- arbitrary mobile/device surfaces outside the certified evidence surface are not claimed;
- no cloud/cross-device save;
- 64×64 1k/10k Node benchmark remains diagnostic, not an SLA.

Evidence:
- merge `2f40d850673831270463d61480d64842e8771727`;
- PR CI #938;
- main CI #939, Pages #93, full visual #428 green.

## Capability 3 — Cross-System Stable Sandbox Gate — COMPLETE

Issue #321 / PR #322 owns the final implementation freeze.

### Causal history
Existing unchanged World Stories evidence remains authoritative for real intervention→death/succession→causal Event Card/cause/map/Inspector navigation and read-only world neutrality.

Frozen full evidence:
- Lightning #175;
- death #176;
- succession #181.

### Ordinary local persistence composition
New focused production-browser proof uses the existing Session UI only:
- Save now ordinary Sandbox at day 14400;
- real Time/Play mutation to day 14401;
- exact Restore to day 14400;
- saved/restored fingerprint `22296cba`;
- mutated fingerprint `be4daf1e`;
- restored world paused;
- entering Scenario Setup disables Save/Restore;
- exact status `Scenario active · use Recipe / Replay / Fork`;
- ordinary local save remains unchanged during Scenario identity.

### Scenario identity
Existing canonical Scenario Builder evidence remains unchanged:
- Recipe v1;
- source fingerprint `b411c106`;
- distinct fork fingerprint `0f28ca42`;
- exact source/share/Run/Replay/Fork journey complete.

### Full composition
`verify-stable-sandbox-evidence.mjs` composes Story + ordinary persistence + canonical Scenario artifacts and writes `stable-sandbox-evidence.json` only when all are complete.

Frozen full #434 artifact records `stableSandboxGateComplete: true`.

### Proven persistence readiness fix
The final gate found a real integration defect: after initial showcase warmup, manual `Save now` stayed disabled until the first 30-second autosave because Session availability was not re-rendered at boot→ready.

v1.0 fixes only that readiness seam. Save format, engine snapshot schema, autosave interval, restore authority and Scenario identity remain unchanged.

Evidence:
- PR head `a6b4e0f14617b699a155d560a1cd635d433ea14d`;
- PR CI #945 + visual #433 green;
- squash merge `efecf1e91ac88177ce82917c1312577927e26af6`;
- main CI #946;
- Pages #95/public `/play/`;
- full historical visual #434 green.

## Release handoff — active

Issue #323 allows exactly seven release/package/doc paths:
- `package.json` → `1.0.0`;
- `docs/releases/v1.0.0.md`;
- `docs/demos/v1.0.0.md`;
- `README.md`;
- `docs/ROADMAP.md`;
- `docs/STATUS.md`;
- `docs/backlog/v1.0.md`.

`docs/SUPPORT.md` and all product/test/tool/workflow behavior are frozen.

After release PR merge require:
1. release workflow succeeds;
2. annotated tag `v1.0.0` resolves exactly to the release merge commit;
3. GitHub Release `WorldBoxSR v1.0.0` exists from checked-in notes;
4. release-commit CI green;
5. release-commit Pages/public `/play/` green;
6. release-commit full historical visual-qa green including stable-sandbox composition.

## Explicit v1.0 non-goals

No economy/trade/currency, religion/culture/technology, naval warfare, professions/classes, broad diplomacy rewrite, multiplayer/cloud sync, public mod marketplace/API, procedural AI-authored history, new renderer, uncertified Firefox/Safari claim or uncalibrated large-world SLA.

## Current decision gate

1. finish exact seven-file release candidate #323 with no behavior changes;
2. require candidate CI + PR browser smoke;
3. squash merge and let existing release workflow create immutable `v1.0.0`;
4. verify release-commit CI + Pages/public `/play/` + full historical Visual + stable-sandbox artifact;
5. only then mark v1.0 shipped and close #323/#321;
6. no post-1.0 feature work begins during publication.
