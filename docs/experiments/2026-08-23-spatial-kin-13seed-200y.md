# Spatial kin cohesion baseline — 13 seeds × 200 years

Date: 2026-08-23  
Issue: #39  
Seeds: 1–10, 45, 80, 98  
World: 24×24, 30 founders, 200 simulated years

## Purpose

Test whether the current settlement-level home bias already keeps close kin spatially associated, or whether the simulation has a measurable co-residence/care gap that justifies a separate household-like mechanism.

The metrics are derived-only and do not affect simulation state or RNG.

## Headline result: close kin are highly dispersed

Across the 13 worlds:

- parent-child co-located share: median **0.51%**, mean ~0.50%;
- parent-child within radius 1: median **3.63%**, mean ~4.13%;
- parent-child within radius 3: median **15.81%**, mean ~16.61%;
- median parent-child distance: median across worlds **8 tiles**;
- mean parent-child distance: median across worlds ~**8.22 tiles**;
- living humans with direct kin within radius 1: median **7.90%**;
- living humans with direct kin within radius 3: median **31.85%**;
- median nearest-direct-kin distance: **5 tiles**.

This is not a mild gap. Parent/child relations usually occupy different parts of the world even though they may belong to the same settlement or lineage.

## Dependent minors

Every sampled dependent minor with known parents had at least one living parent at year 200, so orphaned-minor count was zero in this snapshot sample. That makes parent proximity especially informative:

- minors with a living parent within radius 1: median **8.25%**, mean ~8.38%;
- minors with a living parent within radius 3: median **30.51%**, mean ~29.30%;
- co-located with a living parent: generally ~0–4% depending on seed.

The model therefore routinely allows dependent children and living parents to diffuse several tiles apart.

## Selected worlds

| Seed | Parent-child ≤1 | Parent-child ≤3 | Median parent-child distance | Minor-parent ≤1 | Minor-parent ≤3 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 3.05% | 13.45% | 8 | 5.56% | 19.44% |
| 2 | 7.69% | 31.58% | 5 | 11.94% | 47.76% |
| 4 | 2.37% | 9.62% | 9 | 3.13% | 16.88% |
| 45 | 2.72% | 8.15% | 8 | 6.25% | 18.75% |
| 80 | 3.04% | 11.44% | 9 | 8.18% | 23.27% |
| 98 | 5.28% | 20.14% | 6 | 5.48% | 31.51% |

Full values were captured using a temporary GitHub Actions probe; that expensive probe was removed after evidence collection.

## Interpretation

Settlement cohesion solved a low-density population failure by gently keeping settlement members near settlement centers, but it does **not** produce family-scale co-residence. Members of the same settlement can still wander independently across the settlement/territory.

This gives us a concrete mechanism gap rather than a generic desire for “more family simulation”.

## Decision

Do **not** jump straight to marriage or a full residential household entity.

The next smallest causal experiment should be **dependent-minor kin cohesion v0**:

1. only humans below adult age with at least one living parent are affected;
2. hunger-driven movement remains authoritative and unchanged;
3. during otherwise passive movement, a keyed/stateless probability may prefer a passable step toward the nearest living parent;
4. preserve the baseline sequential RNG draw so the optional mechanism does not perturb unrelated stochastic history;
5. compare kin-distance metrics and population distributions before considering a permanent household entity.

If a small parent-following rule closes most of the measured gap without demographic distortion, a heavyweight household model may be unnecessary at this stage. If it does not, that becomes stronger evidence for an explicit residential unit.
