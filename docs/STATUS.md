# Project status

Last updated: 2026-08-25

## Management state

**v0.5.0 — World Stories is shipped and closed.** Release gate #208 and release handoff #220 are closed. Package/tag/Release, merged-main CI, full Chromium Visual QA, Pages build/deploy and the final public `/play/` verification all passed.

Release identity remains immutable:
- release commit `104dc7520b2e5ad39ec1d3c98c1cea94a11922b4`;
- annotated tag `v0.5.0` / tag object `4b741403979aee61ae51c49d02306d1acf6f74e1`;
- release workflow #9, CI #677, visual-qa #187 and Pages #40 all green.

The active product stage is **v0.6.0 — Living Ecology**. Release gate: #223. Finite backlog: `docs/backlog/v0.6.md`.

Completed/active v0.6 slices:
- planning/scope freeze — #224 — merged;
- Supported natural-fauna preset — #225 / #226 — merged and merged-main CI/Pages/Chromium/public `/play/` verified;
- Multi-species creature surface — #227 / #228 — implementation + deterministic + real Chromium evidence complete, pending documentation-synchronized final gate/merge;
- next after #228 merged-main verification: **Authoritative Wolf predation loop only**.

Do not implement hunting/reproduction/readability breadth before capability 2 is merged-main green.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, humans/lifecycle/ancestry, settlements/polities/rulers/relations/warbands/conquest/rebellion, bounded causal history, typed creature state, save/load, CLI/Simulation Lab and browser presentation.

World Stories remains a shipped query/presentation layer over bounded `world.history`; focus/Watchlist/lenses never enter world snapshots.

### v0.6 supported ecology base

Phaser exposes `Sandbox · Living Ecology`:
- Sandbox stays default: reproduction off, gradual grazer old-age off, historical 40y + 8 manual showcase grazers preserved;
- Living Ecology is supported at 24×24 and initializes exactly 10 natural grazer founders at day0 using the accepted Sprint021 top32 vegetation placement, round-robin founder placement, keyed `[0,6y]` starting ages, salt `0x1b56c4e9`, and `bornDay=-ageDays`;
- Living Ecology enables grazer reproduction `0.001` + gradual old-age mortality only;
- no post-initialization rescue/reseed/population target exists;
- founder initialization consumes zero sequential RNG and creates no fake god-spawn founder history;
- Legacy Canvas remains Sandbox-only comparison/compatibility UI.

Merged capability-1 evidence:
- deterministic founder IDs/coords/ages, snapshot/load, unsupported-scope rejection and RNG neutrality locked by tests;
- real browser uses Mode → reset and reaches Y40 with 116 living grazers + 156 natural births + 0 god founder spawns;
- real Alt-click Grazer inspection is read-only;
- #226 merged as `a653b606f8c11402f28ca92dae31822cff03ebd1`;
- merged-main CI #692, Pages #43 (including public Play verification) and visual-qa #200 are green.

## Multi-species creature surface evidence

Capability 2 deliberately adds **identity/presentation only**, not predator behavior.

Authoritative surface:
- new inert `species:'wolf'` creature identity uses the existing shared id/x/y/age/health/hunger/lifecycle state shape;
- `spawn_creature` accepts exactly `grazer | wolf`; unsupported species reject before command/creature identity allocation;
- Wolf remains untouched by the grazer system and has no movement/hunger/aging/starvation/hunting/reproduction system in this slice;
- matched-control 30-day tests prove the inert Wolf state is unchanged and does not add sequential RNG consumption;
- Wolf state survives exact snapshot/load round-trip;
- existing `entityKind:'creature'` history/reference resolution resolves Wolf truthfully and reuses current map navigation.

Presentation surface:
- `worldView.creatures` preserves stable species identity and shared inspectable state;
- temporary legacy `grazers` projection remains for Sandbox-only Canvas compatibility;
- Phaser EntityLayer consumes shared creatures;
- Grazer keeps its orange/brown four-legged form;
- Wolf gets a distinct gray long-body silhouette with tail, pointed ears, muzzle/dark nose and amber eye;
- selection/highlight uses the shared creature collection;
- inspector shows `Grazer #id` / `Wolf #id` plus age, health, hunger and tile;
- HUD keeps the existing grazer count and adds a compact `🐺 N` only when wolves exist;
- one hidden `spawn_wolf` select option exists for QA/next-slice setup only — no new God Power button or shortcut.

Final implementation browser evidence on head `05afbd7448b4633ff2ae793a18c6dd6aee0e259d`:
- CI #700 green;
- full visual-qa #208 green after one rerun; the failed first attempt exposed an existing Watchlist warmup-edge flake before the Wolf gate, while the rerun completed all prior regressions plus mixed-species evidence;
- Living Ecology baseline contains 116 grazers, 0 wolves;
- real paused map click through the hidden QA tool creates inert Wolf #167 at tile 11,0 via authoritative `spawn_creature`, recorded as `god.spawn_creature` event #370;
- HUD becomes `Year 40.0 · 👤44 · 🐾116 · 🐺1 · ♛3 · …` after its existing throttled refresh cadence;
- real Alt-click Grazer #33: `age 26.1y · health 100% · hunger 5%`;
- real Alt-click Wolf #167: `age 0.0y · health 100% · hunger 10%`;
- post-spawn read-only Grazer/Wolf inspections + screenshot preserve the exact paused world fingerprint;
- EntityLayer evidence: Grazer 11 child shapes with orange/brown fills vs Wolf 14 child shapes with gray fills;
- visual artifact #9563759645, digest `sha256:acbae9a36f42f4c944d6e1617964a977853573d4d27471091792b71a0fdf054a`;
- manual 1440×900 review passes: Wolf is visually distinguishable within dense grazer ecology, `🐺1` remains restrained, inspector is useful and the world map remains the primary surface.

## v0.6 binding product decisions

- Supported scope beats universal scope: 24×24 Living Ecology is the canonical release target.
- Grazer behavior remains unchanged from the validated natural-fauna work.
- Exactly one predator species: Wolf. No generalized species registry/food-web/DSL.
- Capability 2 Wolf is intentionally inert. **Capability 3 owns the first Wolf behavior.**
- Capability 3 must implement authoritative Wolf hunger/aging/movement/predation using existing creature lifecycle patterns where possible; renderer-owned hunting is forbidden.
- Extinction is allowed. No minimum population/equilibrium/hidden survival controller.
- No hidden prey spawning/rescue after initialization.
- Wolf reproduction is not automatically in scope; only add it if the supported canonical release gate cannot form a coherent predator loop without it.
- Save/load and deterministic repeatability are required for new behavior.
- Ecology readability stays game-facing; no permanent metrics dashboard/heatmap.
- No disease, seasons/climate, genetics/evolution, plant-species simulation, economy/religion/technology or renewed civilization depth in v0.6.
- At most three consecutive rejected ecology hypotheses may block the visible gate; then narrow scope instead of extending research.

## Current decision gate

1. require documentation-synchronized #228 CI + full Chromium success;
2. mark #228 ready, squash merge and close #227;
3. verify merged `main` CI, Pages build/deploy + public `/play/`, and full Chromium including natural-fauna + mixed-species gates;
4. open exactly one capability-3 issue/branch for **Authoritative Wolf predation loop**;
5. first implement the minimum deterministic Wolf lifecycle/hunger + prey-seeking/hunt/feeding/history authority required for one real predation consequence;
6. do not add Wolf reproduction, natural Wolf founder policy or ecology readability breadth until deterministic predation works and the supported browser gate exposes what is actually missing;
7. only capability 4 may tune player-facing predation/vegetation readability after authority is merged-main green.
