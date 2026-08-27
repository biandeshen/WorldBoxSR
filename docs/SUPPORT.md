# WorldBoxSR support contract

This document states the **certified v1.0 runtime surfaces** that WorldBoxSR actually exercises in automated production-built evidence. It is deliberately narrower than “anything that might run.”

Public product truth surface: `https://biandeshen.github.io/WorldBoxSR/play/`.

## Certified Phaser surfaces

### Desktop — Chrome/Chromium class · 1440×900

WorldBoxSR certifies the production Phaser renderer on the Chrome/Chromium browser family through the repository’s real browser QA at the canonical **1440×900** desktop surface.

The gate serves the production Vite/Pages build under the real `/WorldBoxSR/` base path and requires:
- `Phaser 4 · authoritative simulation · showcase ready`;
- no `Renderer failed:` state;
- real God Power pointer interaction;
- causal World Stories navigation;
- real Scenario Setup pointer/editor interaction in PR smoke;
- the full historical v0.4–current browser denominator on `main` and release boundaries.

This is a certification of the browser family and tested surface used by the project gates, not a claim that every Chromium fork/version/device is identical.

### Coarse touch — Chrome/Chromium class · 430×820

WorldBoxSR certifies the production Phaser renderer at the canonical **430×820** coarse-touch surface through mobile-emulated Chrome/Chromium CDP evidence.

The certified touch contract is:
- **tap** — use the selected God Power / Scenario placement;
- **hold** — inspect without consuming another command;
- **drag** — pan;
- **two-finger pinch** — zoom while preserving the live midpoint and without mutating world authority;
- after both pinch fingers release, a fresh one-finger gesture works normally;
- core Pause / View / World controls remain reachable and the document does not horizontally overflow the certified surface.

430×820 is the project’s certified mobile QA surface. It is **not** a promise that every mobile browser, screen size, device GPU or OS is independently certified.

## Compatibility renderer

The existing **Legacy Canvas renderer** is a certified **ordinary-world compatibility fallback**.

When Phaser startup is fault-injected, the production recovery gate requires explicit user-facing actions:
- `Retry Phaser`;
- `Compatibility renderer`.

The fallback uses the existing `renderer=legacy` contract and preserves unrelated URL parameters.

Legacy is **not feature-equivalent Phaser**. Scenario Recipe links remain Phaser-only. If compatibility fallback must drop Scenario identity, the product must disclose that consequence instead of silently pretending the Scenario was preserved.

## Uncertified / best-effort surfaces

The following are currently **uncertified / best effort** because the repository does not run equivalent real-browser gates for them:
- Firefox / Gecko;
- Safari / WebKit;
- other browser families;
- arbitrary mobile viewport/device combinations outside the certified 430×820 evidence surface.

Do not describe these as certified until a bounded change adds real evidence and updates this contract.

## Persistence support

WorldBoxSR does not provide cloud save or cross-device sync.

Portable/local contracts currently certified elsewhere in the v1.0 compatibility matrix are:
- engine snapshots v10–v16 as supported historical inputs;
- ordinary browser-local save envelope v1, backed by the engine snapshot;
- Scenario Recipe v1 as the separate deterministic Scenario identity.

Ordinary local-world persistence and Scenario Recipe identity remain intentionally separate.

## Performance / build envelope

The initial v1.0 public performance envelope is the shipped **24×24** showcase product surface exercised by the certified browser gates.

Structural build limits are release blockers:
- exactly one dedicated `phaser-vendor-*.js` chunk;
- exactly one fast-changing `phaser_main-*.js` app chunk;
- `phaser_main` minified size must remain **≤ 300,000 bytes**;
- the vendor chunk must remain larger than the application chunk so the split is meaningful.

`npm run bench` additionally measures 64×64 worlds at 1,000 and 10,000 starting population. Those wall-clock results are **diagnostic only**. They are not an FPS, tick-rate or device-support SLA because the project has not calibrated a runner-independent non-flaky threshold.

## Accessibility and recovery

Certified public-alpha controls include:
- local **Reduce Motion** preference, monotonic with the operating-system reduced-motion request;
- local **Mute Sound** preference;
- explicit renderer startup recovery actions described above;
- ordinary-world local Save / Restore / Clear with paused restore and atomic failure behavior.

These are presentation/reliability surfaces and do not create a second simulation authority.

## Evidence ownership

The support contract is intentionally tied to existing repository gates rather than a second browser harness:
- desktop: `tools/capture-visual-evidence.sh`;
- touch + pinch: `tools/run-touch-inspect-smoke.sh`, `tools/capture-touch-inspect-evidence.mjs`, `tools/capture-pinch-zoom-evidence.mjs`;
- renderer recovery: `tools/run-renderer-recovery-smoke.sh`, `tools/capture-renderer-recovery-evidence.mjs`;
- structural bundle budget: `tools/check-pages-build.js`;
- orchestration: `.github/workflows/visual-qa.yml` and normal CI/Pages workflows.

If those evidence surfaces change, the focused support-contract test must force this document to be reviewed at the same time. If evidence does not justify a claim, **narrow the claim instead of inventing support**.
