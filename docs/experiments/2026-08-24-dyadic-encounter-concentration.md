# Repeated dyadic encounter concentration — 6 seeds × 100 years

## Question

The parental-union baseline showed that a shared birth is not a reliable proxy for a stable partnership. This study therefore asks a more basic social question: **does the current simulation naturally produce persistent repeated person-to-person encounters, and are those encounters concentrated around a small number of partners strongly enough to justify a future social-bond identity?**

No simulation behavior changes in this study.

## Encounter definition

The tracker observes:

- focal cohort: living females from adult age through configured female fertility-end age;
- encounter partners: living adult males, regardless of hunger or birth cooldown;
- encounter: Chebyshev distance <= 1 on a distinct simulation day.

Adult-male eligibility is intentionally social rather than reproductive. Hunger and conception cooldown must not make a physically present person disappear from the social graph.

For each focal female the tracker measures total encounter/pair days, partner concentration, repeated-pair counts, pair spans, recurrence, settlement overlap, and whether a repeated pair is also a historical parental-union pair.

## Storage / method correction

The first implementation bounded each focal female to 64 partner records. That cap was safe in seeds 4/9/45/80 but truncated seed1 and catastrophically thrashed in seed98:

- seed1 cap64: 16,912 evictions;
- seed98 cap64: 2,981,992 evictions.

This also exposed a semantic bug in the first report shape: after eviction and later re-encounter, record segments are not guaranteed to equal distinct people. Those numbers were rejected and not used for conclusions.

A cap sensitivity run on the truncated worlds compared 256 vs 1024:

### seed1

Both caps produced exactly the same decision metrics:

- top partner pair-day share: 0.0985;
- top-2 share: 0.1806;
- HHI: 0.0555;
- mean partners with >=2 encounter days: 45.1193;
- repeated pairs: 4,918;
- zero evictions at either cap;
- maximum partners for one focal female: 81.

### seed98

Again 256 and 1024 were identical:

- top partner share: 0.0474;
- top-2 share: 0.0730;
- HHI: 0.0335;
- mean partners with >=2 encounter days: 137.4408;
- repeated pairs: 29,000;
- zero evictions at either cap;
- maximum partners for one focal female: 173.

The permanent default cap is therefore **256**. The permanent summary separately reports cap truncation and only calls a count `distinctPartners` for focal females with no evictions.

The final six-world baseline below had **zero evictions and zero truncated focal females in every seed**.

## Final dataset

- seeds: 1, 4, 9, 45, 80, 98
- world: 24×24
- founders: 30
- horizon: 100 years
- default partner cap: 256
- all six worlds completed without tracker truncation

## Per-person encounter concentration

| seed | pop y100 | exact distinct partners mean | top partner share | top-2 share | HHI |
|---|---:|---:|---:|---:|---:|
| 1 | 306 | 45.53 | 9.85% | 18.06% | 0.0555 |
| 4 | 159 | 34.63 | 11.02% | 20.32% | 0.0641 |
| 9 | 207 | 40.33 | 10.33% | 17.04% | 0.0703 |
| 45 | 35 | 7.76 | 30.12% | 52.70% | 0.2216 |
| 80 | 112 | 30.17 | 11.27% | 20.63% | 0.0654 |
| 98 | 431 | 137.63 | 4.74% | 7.30% | 0.0335 |

### Interpretation

Ordinary and dense worlds do **not** naturally collapse encounters onto one dominant partner. A typical focal female in seeds 1/4/9/80 has roughly 30–46 repeatedly encountered adult males, while her strongest partner accounts for only ~10–11% of pair-days. In dense seed98 the network is even more diffuse: ~138 distinct partners and only 4.7% of pair-days with the top partner.

Seed45 looks very different at first glance: top-partner share is 30.1% and top-2 share 52.7%. But its social pool is also tiny: only 7.76 partners on average at population 35. The higher concentration is therefore primarily consistent with a small network, not evidence of a special spouse-like mechanism. Low-population control seed80 has a much larger pool and ordinary concentration.

## Repeated encounters are nevertheless highly persistent

Repeated-pair spans are long across every sampled world:

| seed | repeated pairs | mean encounter days / pair | mean first→last span (days) | share spanning >=360d |
|---|---:|---:|---:|---:|
| 1 | 4,918 | 138.5 | 3,210 | 79.3% |
| 4 | 2,235 | 126.7 | 3,468 | 82.0% |
| 9 | 3,040 | 204.2 | 3,912 | 85.6% |
| 45 | 325 | 141.7 | 4,381 | 88.3% |
| 80 | 1,445 | 135.5 | 4,194 | 88.9% |
| 98 | 29,000 | 224.9 | 4,509 | 97.0% |

A repeated pair is not usually a brief accident. Most sampled repeated dyads recur over at least a year, and mean spans are roughly 9–12.5 years.

This establishes a real **persistent dyadic substrate** in the current movement model. But persistence alone is not pair exclusivity: many persistent edges coexist for the same person.

## Co-parent pairs are stronger observationally, but rarely dominant

Historical co-parent pairs are a small fraction of repeated encounter pairs:

| seed | co-parent share of repeated pairs | top partner is co-parent | co-parent encounter days mean | non-parent mean | co-parent span mean (days) | non-parent span mean |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 6.5% | 19.3% | 251.8 | 130.5 | 5,392 | 3,058 |
| 4 | 7.3% | 29.2% | 207.1 | 120.4 | 4,803 | 3,363 |
| 9 | 7.3% | 21.1% | 666.5 | 167.8 | 5,836 | 3,761 |
| 45 | 13.2% | 16.7% | 222.1 | 129.5 | 6,467 | 4,063 |
| 80 | 8.4% | 31.3% | 217.1 | 128.0 | 5,304 | 4,092 |
| 98 | 3.5% | 13.7% | 354.4 | 220.2 | 6,227 | 4,446 |

Co-parent dyads have more encounter days and longer spans than non-parent repeated pairs in every sampled world. That is a useful structural association.

It is **not yet causal evidence for a bond**. A pair must already be locally co-present to produce a child, so birth-producing pairs are selected from dyads with encounter opportunity. The stronger later/lifetime association may reflect shared local structure rather than a latent relationship mechanism.

Most importantly, a co-parent is the focal female's top encounter partner only about **14–31%** of the time. This independently confirms the parental-union result: co-parent identity is socially informative history, but not a general current-partner identity.

## Settlement overlap

Repeated-pair encounter days occurring while both people share the same settlement:

- seed1: 55.0%
- seed4: 47.3%
- seed9: 59.4%
- seed45: **20.4%**
- seed80: 39.3%
- seed98: 55.2%

Seed45 again differs structurally: its persistent dyads spend much less of their encounter time sharing settlement membership. Co-parent pairs in seed45 are more settlement-aligned than non-parent pairs (30.9% vs 18.8%), but still much less than ordinary worlds.

This is consistent with earlier settlement-retention research: seed45's social contacts exist, but authoritative settlement participation is unusually weak. It does not justify reviving the rejected trajectory-rescue behavior.

## Decision

1. **Persistent repeated dyads are real and worth keeping as a research primitive.** The current simulation naturally generates repeated contact over years without explicit pair behavior.
2. **Do not create an authoritative spouse / pair-bond / household identity yet.** Ordinary worlds show broad, persistent mixing rather than one dominant partner.
3. **Do not promote parental unions to current social bonds.** Co-parent pairs are enriched for persistence but are rarely the top encounter partner.
4. **Do not interpret seed45's high concentration as stronger bonding.** Its network is much smaller, which mechanically raises concentration.
5. Keep the bounded dyadic tracker as derived-only research tooling. Default cap 256 is empirically validated for the sampled 100-year worlds, and truncation remains explicit.
6. The next evidence step should examine **strong-tie candidate stability over time**, not lifetime totals alone. A useful social bond needs a relationship that remains relatively important across time windows, not merely a long first-to-last span among many concurrent edges.

## Next research question

Measure windowed dyadic rank / strength stability with transparent, behavior-neutral criteria:

- encounter rate or encounter-day count within fixed windows;
- top-partner and top-k identity turnover across adjacent windows;
- persistence of candidate strong ties across 1/3/5-year horizons;
- co-parent enrichment among stable strong ties;
- settlement co-membership of stable vs unstable ties;
- prevalence per person and sensitivity to population density.

Only if a bounded subset of dyads is both **strong and rank-stable** should the project introduce a separate behavior-neutral social-bond identity. Behavior would remain a later experiment.
