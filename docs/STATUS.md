# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active product stage is **v0.5.0 — World Stories**. Release gate: #208. Finite backlog: `docs/backlog/v0.5.md`.

Two implementation slices are now complete pending the second merge:
- Causal Event Card — #209 / #211 — merged on `main`;
- Focused Story Trail — #212 / #213 — complete pending final documentation-synchronized gate and merge.

After #213 merged-main verification, the only next implementation slice is **Bookmarks / watchlist**. Do not fold bookmark persistence or Chronicle redesign into Focused Story Trail.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

World Stories remains a query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / explicit stable domain IDs are authoritative; unresolved refs are normal under bounded history and remain visible rather than guessed.

## v0.5 Causal Event Card evidence

- selected retained events project into readable cards with headline/detail/provenance plus ordered Subject and Causes;
- retained event refs can open another Event Card;
- current human/creature/settlement/warband refs can navigate to their current map tile; polity refs use the current capital when available;
- command refs and expired entity/event refs remain explicitly unavailable with truthful reasons;
- real Chromium uses real Lightning pointer input to produce ruler death → normal causal succession, then follows the retained death-event cause and a current map-capable reference while the authoritative world fingerprint remains unchanged;
- the slice did not change Chronicle representative-event selection policy.

## v0.5 Focused Story Trail evidence

- exact retained-history predicates now support explicit polity, warband and one-hop event focus alongside existing human/creature/settlement focus;
- `historyForReference` dispatches only supported stable refs and never infers current-state membership;
- event focus is deliberately one hop: selected event + direct retained children only;
- `story_trail` is pure presentation projection, chronological oldest→newest, fixed limit 8, and preserves unavailable stable focus identity;
- Event Card exposes `Follow this event` and supported `Follow story` actions; trail rows reopen Event Cards; Clear/reset remove only presentation focus;
- deterministic tests require exact membership/order/limits plus snapshot/RNG neutrality;
- natural seed45 Chromium selects Eldergate Realm (`polity #1`) from a real visible Event Card, obtains explicit retained events `[21,22,23,24,27,28,29,32]`, opens event #22, clears focus, remains paused and verifies the serialized authoritative world fingerprint is unchanged;
- manual visual review confirms the compact focused panel is readable and stays subordinate to the world view rather than becoming an analytics dashboard.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- Ecology research remains deferred until v0.6.
- No graph database, generalized knowledge system or full replay engine in v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Focus/bookmark/navigation state stays presentation-only and outside world snapshots.

## Current decision gate

1. require documentation-synchronized #213 CI + Chromium success;
2. squash merge #213 and close #212;
3. verify merged `main` CI, Pages, Chromium and final public `/play/` deploy check;
4. open a finite **Bookmarks / watchlist** issue/branch;
5. do not start broader Chronicle filtering/ranking, AI summary or replay before the bookmark slice closes.
