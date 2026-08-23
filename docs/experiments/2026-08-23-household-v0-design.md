# Former household v0 design note — renamed to lineage

Date: 2026-08-23  
Issues: #32, #36

> Historical note: the persistent maternal founder groups introduced in #32 were initially called `households`. Probe evidence later showed that surviving groups can contain hundreds of descendants, so #36 renames this concept to **lineage**. The term household is reserved for a future dynamic residential/social unit.

## Purpose

Insert ancestry/history between individual humans and settlements without changing demographic behavior.

## Current semantics after #36

- Every newly created human with no supplied lineage starts a founder lineage.
- A child records both biological parent IDs.
- Living parent records retain child IDs.
- A child inherits the mother's lineage in v0.
- Lineage membership is historical: member IDs are not removed when a human dies.
- Lineage `maxGeneration` is monotonic and survives the loss of earlier generations.
- Lineage queries are derived-only and consume no RNG.

Maternal lineage inheritance is a minimal deterministic ancestry convention, **not** a marriage, residence, inheritance, or kinship theory. Cross-lineage paternity is preserved by parent IDs.

## Behavior guard

This layer must not modify birth probability, movement, food use, settlement membership, territory, or sequential RNG consumption.

## Snapshot

The original #32 implementation used snapshot v5. Semantic correction #36 renames authoritative fields to `lineages`, `nextLineageId`, and `lineageId` and advances the schema to v6. There is no public save format requiring migration yet.
