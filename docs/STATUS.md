# Project status

Last updated: 2026-08-25

## Management state

**v0.4.0 — God Power Sandbox is shipped and closed.** Tag/Release `v0.4.0`, final CI, interactive Chromium, Pages build/deploy, and the public `/play/` verification all passed. Release gate #200 is closed.

The active product stage is **v0.5.0 — World Stories**. Release gate: #208. Finite backlog: `docs/backlog/v0.5.md`.

The current and only implementation slice is **Causal Event Card — #209 / #211**: turn one selected retained Chronicle event into a readable causal card whose explicit authoritative references can be followed to retained events or current world objects.

## Current authoritative capability

The deterministic engine remains the only world truth: seeded/serializable RNG, fixed ticks, terrain/resources, human lifecycle/ancestry, settlements, polities, rulers, relations, visible warbands/combat, conquest/rebellion, territory/history, typed grazers, save/load, CLI/Simulation Lab and causal events.

God powers act only through authoritative commands. v0.4 intentionally stops at six visible powers: Human, Grazer, Erase, Lightning, Meteor and Rain.

World Stories must remain a query/presentation layer over bounded `world.history`. Existing event `subject` / `causes` / stable IDs are authoritative; unresolved refs are normal under bounded history and must remain visible rather than guessed.

## v0.5 first-slice state

- existing history query layer already supported exact retained-event lookup plus current human/creature/settlement/lineage/parental-union reference resolution;
- #211 extends that resolver only for authoritative `polity` and `warband` refs already emitted by v0.3 systems;
- pure Event Card projection derives headline/detail/provenance and ordered Subject/Causes from one retained event plus reference resolution;
- retained event refs can open another Event Card;
- map-capable current refs can center the Phaser camera and identify the exact referenced object in inspector; polity refs use the current capital when available;
- command refs and expired entity/event refs remain explicitly unavailable with truthful reasons;
- story navigation is presentation-only and deterministic tests require snapshot/RNG neutrality;
- real Chromium gate is being upgraded to select a visible seed45 Chronicle event with both a retained event cause and a map-capable ref, follow both, and require the serialized authoritative world fingerprint to remain unchanged.

## Binding product decisions

- Visible truthful player results outrank hidden system breadth.
- Runtime/engine state is the only world truth; Phaser/UI/AI are projections.
- Civilization depth remains paused after v0.3.
- God-power breadth remains frozen after v0.4.
- Ecology research remains deferred until v0.6.
- No graph database, generalized knowledge system or full replay engine in v0.5.
- No AI-authored canonical facts, hidden motives or inferred causal links.
- Bookmarks/focus/navigation state stay presentation-only and outside world snapshots.

## Current decision gate

1. finish #211 deterministic + real Chromium Event Card evidence;
2. merge #211 only when CI and World Stories navigation gate are green;
3. move next to the smallest focused-story-trail slice from `docs/backlog/v0.5.md`;
4. do not start bookmarks, AI summary, replay or broader Chronicle redesign before the current slice closes.
