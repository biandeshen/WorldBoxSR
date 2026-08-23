# Parental union structural baseline — 13 seeds × 200 years

## Question

`parental_union` v0 was introduced as behavior-neutral social history: an unordered pair of humans gets one persistent record after they already produce a shared child under the existing reproduction rules. This study asks whether that record naturally behaves like a stable relationship primitive that could anchor a future residential household, or whether it is mostly a historical co-parent edge.

No behavior was changed for this study.

## Dataset

- seeds: 1–10, 45, 80, 98
- world: 24×24
- founders: 30
- horizon: 200 years
- 13/13 unique seeds completed
- seed45 demographic sentinel: **128 population / 184 births / 86 deaths**

The temporary probe ran on GitHub Actions and was removed after evidence capture.

## Headline result

**Parental union is useful historical identity, but it is not a stable partnership or household primitive under the current simulation.**

Across the 13 worlds:

- union / birth ratio: min **0.9239**, median **0.9768**, mean **0.9743**, max **0.9852**;
- multi-child union share: min **1.50%**, median **1.98%**, mean **2.58%**, max **8.24%**;
- children per union: median **1** in every sampled world; cross-world mean of per-world means **1.0267**;
- historical participants with 2+ unions: min **74.59%**, median **94.39%**, mean **93.49%**, max **97.56%**;
- mean unions per historical participant: min **2.79**, median **6.39**, mean **6.20**, max **7.10**;
- union formation while both parents shared a settlement: min **45.88%**, median **54.76%**, mean **54.33%**, max **59.03%**.

The dominant pattern is therefore almost one new co-parent pair per birth, not repeated parenting by the same pair.

## Why the apparent long union lifetime is not evidence of partnership stability

Ended records have a cross-world median ended-duration median of about **38.2 years** (range 27.9–40.5 years). This looks stable only because v0 currently keeps a union "active" until the first partner dies.

That field is bookkeeping lifecycle, not observed social continuity:

- it does not mean the partners remain near each other;
- it does not mean they share a settlement;
- it does not mean they produce more children together;
- it does not mean they share resources or residence.

The very low multi-child rate and very high multi-union rate are stronger evidence about actual repeated pairing under current mechanics.

## Seed45 vs low-population control seed80

| Metric | seed45 | seed80 |
|---|---:|---:|
| Population | 128 | 871 |
| Births | 184 | 2,700 |
| Parental unions | 170 | 2,660 |
| Union / birth ratio | 0.9239 | 0.9852 |
| Multi-child union share | 8.24% | 1.50% |
| Mean children / union | 1.0824 | 1.0150 |
| Historical participants with 2+ unions | 74.59% | 94.38% |
| Mean unions / historical participant | 2.79 | 5.98 |
| Living humans in at least one union | 41.41% | 79.79% |
| Living humans in 2+ unions | 33.59% | 76.12% |
| Formed in shared settlement | 45.88% | 51.28% |

Seed45 has more repeated parenting and fewer partners per person than dense worlds, but even there only **8.24%** of unions have two or more children and the typical union still has one child. It is not a counterexample strong enough to justify partnership semantics.

## Ordinary-world structure

Most ordinary worlds accumulate roughly 1,800–3,900 union records by year 200. Typical historical participants have around six union records, with P90 around 10–11 and observed maxima up to 22.

This makes the union graph valuable for genealogy and social-history queries, but dangerous as a direct behavior key: treating every union as a current spouse/household link would give most adults many simultaneous behavioral partners.

## Performance note

The 13-seed × 200-year probe took **91.9 seconds** on the GitHub runner. The resulting worlds contain thousands of union records, but this runtime remains in the same order expected from 13 sequential 200-year simulations observed in prior research. There is not enough evidence to add an authoritative pair index solely from this run.

If future profiling isolates `parentalUnionByPair()` as a material hotspot, optimize it with a derived/rebuildable pair index while preserving snapshot semantics and deterministic history. Do not add state complexity preemptively.

## Architectural decision

1. **Keep `parental_union` as historical co-parent identity.** It is useful because it compresses shared-child history and provides stable references across children and death.
2. **Do not attach spouse, co-residence, fertility, movement, resource-sharing, inheritance, or exclusivity behavior to parental unions.**
3. **Do not use parental union directly as residential household membership.** Current data strongly rejects that semantic interpretation.
4. The next social primitive should be searched for in **repeated interaction / co-presence**, not inferred from a single birth. A candidate household or pair bond needs evidence of repeated association before it receives behavior.
5. The current `active` union lifecycle label means "not yet ended by first partner death", not "socially active". This should be made semantically explicit before any agent can mistake it for a current partnership contract.

## Next evidence step

Measure repeated dyadic encounter concentration using the existing partner-persistence research foundation:

- encounter days per pair;
- share of a person's encounter days accounted for by their top partner;
- repeated encounter counts and recurrence gaps;
- persistence across 30/90/180/360-day windows;
- whether repeated dyads share settlements and remain spatially near;
- whether birth-producing pairs are more persistent than non-birth repeated pairs.

Only if a bounded subset of dyads shows real repeated association should the project introduce a separate persistent social-bond / household-seed identity.
