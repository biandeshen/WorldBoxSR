# Project status

Last updated: 2026-08-27

## Management state

**v0.9.0 — World Feel & Public Alpha Polish is shipped and closed.**

Immutable release identity:
- implementation freeze `d167caa1ac5af3ef9214546693e34f255cdca687`;
- release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- annotated tag `v0.9.0` / tag object `6992bba5f45366fa7d3832a981cb590cf5090554` → exact release commit;
- GitHub Release `WorldBoxSR v0.9.0` published by release workflow #13;
- release-commit CI #929 green;
- Pages #88 green including final public `/play/` verification;
- full visual-qa #422 green, including v0.4–v0.8 regressions plus current mobile touch/pinch and renderer failure recovery.

The v0.9 implementation and release identities are immutable. Any later docs cleanup must not move the tag.

**v0.8.0 — Ruling Lines & Succession remains shipped and immutable.**
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag `v0.8.0` / tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5`;
- release workflow #12, CI #865, Pages #66/public `/play/`, full visual-qa #358 green.

## v0.9 delivered promise

> **Opening WorldBoxSR feels like looking at a living god-game world first: larger, more readable, visibly changing, recoverable, and usable across desktop and touch.**

Delivered capabilities:
1. desktop world-first viewport beneath floating HUD chrome, with canonical 1440×900 world scale increased from roughly 718×718 to 864×864;
2. population-scaled settlement footprints plus stronger polity territory/frontier readability;
3. movement-derived Human/Grazer/Wolf gait and bounded inhabited-settlement ambience;
4. truthful warband formations/objectives, recent battle traces, ruins and occupation/rebellion identity from existing authority;
5. Meteor impact-site memory tied to real current vegetation depletion/recovery and removed by real Rain restoration;
6. one ordinary-world browser-local slot backed by the existing engine snapshot, with paused restore, atomic failure and Scenario separation;
7. compact 430px HUD and production touch contract: tap tool, hold inspect, drag pan, two-finger pinch zoom;
8. explicit renderer failure recovery actions plus local Reduce Motion and Mute preferences;
9. stable Phaser vendor split, checked <300 KB minified app-chunk budget, and fast PR browser smoke while `main` retains full historical release proof.

## Authority guards

- no v0.9 engine snapshot-version change;
- no intentional authoritative simulation-rule change from v0.8;
- no second world/camera/mobile renderer authority;
- local ordinary-world persistence stores the existing engine snapshot;
- Scenario identity remains Recipe / Replay / Fork;
- presentation never invents fake pathfinding, terrain damage, former ruin size, loyalty or unrest facts.

## Publication proof

Release handoff #310 / PR #311 completed the exact seven-file candidate with no behavior changes.

Publication evidence:
- candidate CI #928 green;
- candidate visual-qa #421 green, including mobile touch/pinch and renderer recovery;
- release PR #311 squash-merged as `6901923ac1a059599a3ce701fa5060054cffd15d`;
- release workflow #13 created annotated tag object `6992bba5f45366fa7d3832a981cb590cf5090554` and GitHub Release `WorldBoxSR v0.9.0`;
- tag resolves exactly to release commit `6901923ac1a059599a3ce701fa5060054cffd15d`;
- release-commit CI #929 green;
- Pages #88/public `/play/` green;
- full visual-qa #422 green.

## Next stage

The next bounded stage is **v1.0 — Stable Sandbox Identity**. It should stabilize the public product/compatibility contract before another breadth sprint: save/version policy, supported browser/device/performance envelope, onboarding/recovery contract, extension/content contracts and cross-system coherence.

## Current decision gate

1. close #310 and #269 with immutable v0.9 evidence;
2. open one bounded v1.0 planning issue;
3. keep v0.9 tag/release identity fixed forever;
4. prioritize stable product contracts and cross-system coherence over economy/religion/technology/naval breadth;
5. continue judging releases by the public `/play/` demo plus deterministic authority evidence.
