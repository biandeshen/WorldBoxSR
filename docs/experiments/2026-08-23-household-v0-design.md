# Household / family v0 design note

Date: 2026-08-23  
Issue: #32

## Purpose

Insert the missing social-history layer between individual humans and settlements without changing demographic behavior.

## v0 semantics

- Every newly created human with no supplied household starts a founder household.
- A child records both biological parent IDs.
- Parent records retain child IDs while the parent is alive.
- A child inherits the mother's household in v0.
- Household membership is historical: member IDs are not removed when a human dies.
- Household `maxGeneration` is monotonic and survives the loss of earlier generations.
- Family/household queries are derived-only and consume no RNG.

Maternal household inheritance is intentionally a minimal deterministic convention, **not** a marriage, residence, inheritance, or kinship theory. Cross-household paternity is preserved by parent IDs. A later household-behavior issue can replace or extend residence rules using evidence.

## Behavior guard

This slice must not modify:

- birth eligibility or probability;
- movement;
- food use;
- settlement membership;
- territory;
- sequential RNG consumption.

The existing demographic regressions remain the primary guard that the lineage layer is observational/history-only.

## Snapshot

Households, household IDs, and lineage references are authoritative history state, so snapshot schema advances from v4 to v5. There is no public save format requiring migration yet.
