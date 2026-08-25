# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active product stage is **v0.5.0 — World Stories**. Release gate: #208. Finite backlog: `docs/backlog/v0.5.md`.

Three ordered World Stories slices are complete through implementation evidence:
- Causal Event Card — #209 / #211 — merged on `main`;
- Focused Story Trail — #212 / #213 — merged on `main`;
- Bookmarks / Watchlist — #214 / #215 — complete pending documentation-synchronized final gate and merge.

After #215 merged-main verification, the only next implementation slice is **Chronicle navigation/readability**. Do not start AI summary, replay, ecology or release handoff before that finite pass closes.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories remains a query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / explicit stable domain IDs are authoritative; unresolved refs are normal under bounded history and remain visible rather than guessed.

## v0.5 Causal Event Card evidence

- selected retained events project into readable cards with headline/detail/provenance plus ordered Subject and Causes;
- retained event refs can open another Event Card;
- current human/creature/settlement/warband refs can navigate to their current map tile; polity refs use the current capital when available;
- command refs and expired entity/event refs remain explicitly unavailable with truthful reasons;
- real Chromium uses real Lightning pointer input to produce ruler death → normal causal succession, then follows the retained death-event cause and a current map-capable reference while authoritative world fingerprint remains unchanged;
- the slice did not change Chronicle representative-event selection policy.

## v0.5 Focused Story Trail evidence

- exact retained-history predicates support explicit polity, warband and one-hop event focus alongside existing human/creature/settlement focus;
- `historyForReference` dispatches only supported stable refs and never infers current-state membership;
- event focus is deliberately one hop: selected event + direct retained children only;
- `story_trail` is pure presentation projection, chronological oldest→newest, fixed limit 8, and preserves unavailable stable focus identity;
- Event Card exposes `Follow this event` and supported `Follow story` actions; trail rows reopen Event Cards; Clear/reset remove only presentation focus;
- natural seed45 Chromium selects Eldergate Realm (`polity #1`), obtains explicit retained events `[21,22,23,24,27,28,29,32]`, opens event #22, clears focus and verifies authoritative world fingerprint is unchanged;
- merged-main CI, Pages, Chromium and public `/play/` verification passed.

## v0.5 Watchlist evidence

- Watchlist stores only stable retained-event or supported entity refs; it never writes world/history/snapshots or consumes RNG;
- list is capped at 6, Pin↔Unpin is exact/idempotent, and malformed/duplicate/unsupported persisted entries are sanitized;
- persistence is same-tab session-only through `sessionStorage`; there is no cloud/cross-device canonical memory;
- each render re-resolves the stable refs through current authoritative history/entity lookup; removed entities and evicted events remain pinned but visibly unavailable;
- Event Card header + supported Subject/Cause rows expose Pin/Unpin; Watchlist reuses existing Open/Map/Follow navigation plus Unpin/Clear all;
- a first real reload test caught a genuine warmup race: `scene.world` existed before seed45 showcase evolution finished, causing retained event #163 to be temporarily misclassified unavailable;
- runtime now waits for `scene.booting === false` before Watchlist re-resolution, hides during reset/warmup, and refreshes Watchlist when Event Cards render;
- final Chromium pins `event:163` + Eldergate Realm (`polity:1`), browses elsewhere, reopens the pinned event, same-tab reload restores both `2/6` refs, then Unpin/Clear stores `[]`;
- authoritative world fingerprint is unchanged across Pin/browse/Open before reload and across rehydrate/Unpin/Clear after reload;
- manual screenshots confirm both pre-reload and post-reload Watchlists are readable and compact while the map remains the primary surface.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- Ecology research remains deferred until v0.6.
- No graph database, generalized knowledge system or full replay engine in v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Focus/bookmark/navigation state stays presentation-only and outside world snapshots.
- Watchlist is explicit player memory, not canonical world importance.

## Current decision gate

1. require documentation-synchronized #215 CI + four-stage Chromium success;
2. squash merge #215 and close #214;
3. verify merged `main` CI, Pages, Chromium and final public `/play/` deploy check;
4. open one finite **Chronicle navigation/readability** issue/branch;
5. preserve representative autonomous history + recent god interventions while making normal play navigation useful;
6. do not start AI summary, replay or release-only work until the Chronicle pass and canonical v0.5 gate close.
