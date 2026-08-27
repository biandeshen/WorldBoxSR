# Project status

Last updated: 2026-08-27

## Management state

**v0.9.0 — World Feel & Public Alpha Polish implementation is complete and frozen. Release publication is active under #310.**

Implementation freeze:
`d167caa1ac5af3ef9214546693e34f255cdca687`

Exact freeze-commit delivery:
- CI **#927** green;
- Pages **#87** green including final public `/play/` verification;
- full historical visual-qa **#420** green, including v0.4–v0.8 regressions plus v0.9 mobile touch/pinch and renderer failure recovery.

No v0.9 product behavior may change in the release handoff.

**v0.8.0 — Ruling Lines & Succession remains shipped and immutable.**
- release commit `0233cd6923717c3d277d6a35f2e6460e43814d60`;
- annotated tag `v0.8.0` / tag object `04f5ea6b489ca37ff53fa444c8dce9461e5949c5`;
- release workflow #12, CI #865, Pages #66/public `/play/`, full visual-qa #358 green.

## v0.9 delivered promise

> **Opening WorldBoxSR feels like looking at a living god-game world first: larger, more readable, visibly changing, recoverable, and usable across desktop and touch.**

## Delivered v0.9 capabilities

### World-first surface and hierarchy — DONE

- desktop world renders under floating HUD rather than reserving dead UI rectangles;
- canonical 1440×900 world grows from roughly 718×718 to 864×864;
- population-scaled settlement building/street/field footprints make current settlement size legible;
- stronger low-alpha territory wash + borders make polity geography readable without a separate political-map world.

### Living motion and ambience — DONE

- Human/Grazer/Wolf gait is driven only by existing render interpolation;
- active settlements receive bounded banner/hearth ambience;
- no new world action, fuel or production state is introduced.

### Civilization change readability — DONE

- warband strength appears as compact formations while exact strength remains readable;
- existing target-settlement facts drive short objective cues, not fake path lines;
- real recent `warband.engaged` history can leave low-depth battle traces;
- inactive settlements read as neutral ruins using real abandonment time without inventing former size;
- occupation/recent rebellion identity comes from existing political-history fields with no loyalty/unrest mechanics.

### Intervention memory — DONE

- recent recorded Meteor footprints are projected only while their real current vegetation remains depleted;
- existing Rain restoration removes the memory naturally once recovery reaches capacity;
- no crater, fire, elevation or rebuilding state is invented.

### Public-alpha persistence — DONE

- one ordinary-world browser-local slot embeds the existing engine snapshot plus minimal timestamp/preset envelope;
- first checkpoint comes from Save now or 30-second autosave; later page-hide can final-flush an armed checkpoint;
- valid restore installs paused and invalidates stale startup work;
- corrupt/unsupported/quota failures are explicit and atomic;
- Scenario Recipe / Replay / Fork remains separate and suppresses ordinary local-world Save/Restore.

### Mobile/touch — DONE

- bounded 430px mobile HUD keeps core controls reachable;
- touch contract: tap tool, hold ≈460ms inspect, >5px drag pan, two-finger pinch zoom;
- mobile long-hold proof shows no extra command/world mutation;
- final two-touch proof records zoom `0.5863095× → 1.2703374×`, midpoint drift `0.00000854` world px, authority unchanged during/after pinch, and fresh one-finger input restored after release.

### Recovery, accessibility and performance — DONE

- renderer startup failure exposes explicit retry/compatibility-renderer recovery actions;
- local Reduce Motion + Mute preferences affect presentation only; system reduced-motion remains monotonic;
- Phaser runtime is isolated in a stable vendor chunk;
- fast-changing app chunk has a checked minified budget below 300 KB;
- PR browser smoke is bounded while `main` retains the full historical release denominator.

## Authority guards

- no v0.9 engine snapshot-version change;
- no intentional authoritative simulation-rule change from v0.8;
- no second world/camera/mobile renderer authority;
- local ordinary-world persistence stores the existing engine snapshot;
- Scenario identity remains Recipe / Replay / Fork;
- presentation never invents fake pathfinding, terrain damage, former ruin size, loyalty or unrest facts.

## Release handoff — ACTIVE

Issue #310 permits exactly seven paths:
- `package.json` → `0.9.0`;
- `docs/releases/v0.9.0.md`;
- `docs/demos/v0.9.0.md`;
- `README.md`;
- `docs/ROADMAP.md`;
- `docs/STATUS.md`;
- `docs/backlog/v0.9.md`.

Forbidden: any client/engine/content/test/tool/workflow behavior change or v1.0 implementation.

After the release PR merges, require:
1. release workflow succeeds;
2. annotated tag `v0.9.0` targets exactly the release merge commit;
3. GitHub Release `WorldBoxSR v0.9.0` is published from checked-in notes;
4. release-commit CI succeeds;
5. release-commit Pages/public `/play/` succeeds;
6. release-commit full historical Chromium succeeds.

## Current decision gate

1. finish the exact seven-file release candidate with no behavior changes;
2. require candidate CI + browser smoke;
3. merge and let the existing release workflow create immutable `v0.9.0`;
4. verify release-commit CI + Pages/public `/play/` + full historical Visual;
5. close #310/#269 only after publication evidence;
6. then open bounded v1.0 stable-sandbox planning — no more v0.9 polish after freeze.
