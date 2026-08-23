# Experiment: settlement abandonment lifecycle v0

Date: 2026-08-23  
Issue: #19

## Mechanic

Settlements are retained as historical entities but now have an explicit lifecycle. A currently active settlement that remains at zero population for 360 simulated days becomes abandoned. Abandoned settlements keep their ID, name, founding day, abandonment day, and history event, but no longer receive members, apply settlement home bias, or block nearby future settlement formation.

The authoritative settlement shape gains `active`, `emptyDays`, and `abandonedDay`; snapshot schema is therefore advanced to version 3 before any public save format exists.

## Controlled lifecycle checks

Automated tests cover:

- exact grace-period boundary;
- empty-duration reset when population returns;
- no membership assignment to abandoned settlements;
- replacement settlement founding inside the former spacing exclusion zone;
- deterministic save/load continuation through abandonment.

## Five-seed × 200-year comparison

Seeds 1–5, 24×24, 30 founders, settlement cohesion enabled. The control disables practical abandonment by setting a very large grace period.

Population, births, deaths, and food remaining are **identical seed-for-seed** between control and the 360-day lifecycle. All settlements in these five healthy 200-year worlds remain populated, so the lifecycle stays inert when its condition is not met.

Aggregate population in both runs:

- min: 285
- median: 644
- mean: 607
- max: 805

This is the desired property: adding lifecycle state does not change a world merely because the code path exists.

## Natural abandonment sentinel: seed 45 without cohesion

To exercise a naturally declining world, seed 45 was replayed with `settlementHomeBiasChance = 0`, matching the pre-cohesion demographic regime.

At year 200:

- population: 8
- births / deaths: 41 / 63
- food remaining: 99.86%
- historical settlements: 6
- active settlements: 1
- abandoned settlements: 5

The demographic result is still exactly the old collapse baseline while the social history now correctly records five failed settlements. This separates **historical settlement lifecycle** from **population mechanics**.

## Decision

Keep historical settlements in world state; never delete them as an implementation shortcut. Future timeline, ruins, recolonization, and kingdom history can reference stable settlement IDs, while current-world mechanics operate only on active settlements.
