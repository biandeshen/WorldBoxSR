# Grazer natural-turnover re-evaluation after radius-3 encounters — 2026-08-24

Issue: #110
Sprint: 017

## Question

Sprint 014 rejected simple grazer senescence while authoritative reproduction still required radius-1 partner encounters. Sprint 015/016 then showed that radius 3 is the smallest reliable encounter geometry and made it authoritative.

This study asks whether that correction is sufficient to make a simple keyed natural lifespan viable, while leaving the rest of grazer ecology unchanged.

## Fixed authoritative ecology

All probes use the current runtime reproduction implementation directly:

- partner-search Chebyshev radius 3;
- each parent's local vegetation test remains radius 1;
- birth chance `0.001`;
- existing maturity, health, hunger, cooldown, stable-pairing, birth-history, and keyed-random behavior;
- no sequential RNG.

Natural death remains **research-only**. Lifespan is derived from `world.seed + creature.id` with keyed randomness; no runtime config/state/event/snapshot change is introduced.

Research senescence runs after daily grazer action/day increment and before authoritative reproduction, so a creature at its derived lifespan cannot reproduce after its death age.

## Stage 1 — pre-registered low-density re-bracket

20 deterministic age-2 founders, seeds `1/4/9`, 30 years.

| Lifespan band | Seed 1 final | Seed 4 final | Seed 9 final | Interpretation |
| --- | ---: | ---: | ---: | --- |
| 8–12y | 40 | 36 | 5 | seed9 falls to a tiny non-recovering tail; not robust |
| 12–18y | **51** | **131** | **101** | shortest band with continued post-founder/replacement reproduction on all seeds |
| 18–24y | 71 | 136 | 92 | longer-lived stock remains, but seed9 records no births after complete founder disappearance |

The pre-registered rule advanced **12–18 years only** to carrying-pressure Stage 2.

For the advancing 12–18y band:

- founders disappear around year 15.8 on all seeds;
- births after founder disappearance: **47 / 125 / 94**;
- replacement-parent births: **87 / 169 / 132**;
- final vegetation utilization: ~**52.9% / 41.0% / 21.4%**.

Low-density evidence therefore looked genuinely cross-generational rather than merely retaining old founders.

## Stage 2 — pre-registered carrying-pressure gate

The unchanged 12–18y band was tested for 60 years with 100/200 age-2 founders across seeds `1/4/9`.

### 100 founders

| Seed | Final grazers | Births | Starvation deaths | Research old-age deaths | Births after founders gone | Minimum living after founders gone | Final vegetation |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | **0** | 32 | 15 | 117 | 1 | 0 | 100% |
| 4 | 42 | 136 | 0 | 194 | 70 | 8 | 95.5% |
| 9 | **1** | 51 | 0 | 150 | 13 | 1 | 99.9% |

Seed1 goes extinct around year30. Seed9 remains a single-animal tail by year60. Only seed4 eventually recovers after falling to eight animals.

### 200 founders

All three landscapes fail decisively:

| Seed | Final grazers | Births | Starvation deaths | Research old-age deaths | Births after founders gone | Extinction timing |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | **0** | 20 | 107 | 113 | 0 | ~year16 |
| 4 | **0** | 39 | 71 | 168 | 0 | ~year20 |
| 9 | **0** | 25 | 95 | 130 | 0 | ~year17 |

The high-density runs first self-thin through starvation into the known carrying-pressure regime. Vegetation reaches minima around **1.9%–3.5%** and reproduction freezes. When founder senescence begins, the replacement cohort is too small. Vegetation then rebounds toward 100%, but no viable reproductive stock remains to exploit the recovered resource.

## Structural diagnosis

Radius 3 fixed the Sprint 014 **encounter** bottleneck, but it does not fix a second timescale problem:

`high density → vegetation depletion → resource gate freezes births → founder cohort ages → senescence starts before replacement stock is large enough → resource recovers after mortality → population is already below recovery capacity`

For age-2 founders under a 12–18y lifespan, the first old-age removals begin roughly ten simulation years later—while 100/200-density vegetation is still in the depleted carrying regime and births have already been frozen for years.

This is not evidence to weaken the vegetation gate or increase birth chance. Both were independently validated as the mechanisms that preserve carrying pressure.

## Exploratory check — 18–24 years

After the pre-registered 12–18 Stage 2 failed, a post-hoc 18–24y carrying run was executed. It is **diagnostic only and is not an acceptance gate**.

It does not rescue the hypothesis:

- 100 founders: seed1 still goes extinct; seed4/9 recover only after deep lows;
- 200 founders: **all three seeds still go extinct**, around years 23–26;
- resource minima remain in the same depleted ~2%–7% regime before old-age decline;
- seed1/4/9 200-founder runs record zero births after founder extinction.

Therefore simply shifting the same six-year hard lifespan band later does not solve the carrying-pressure turnover problem. No further lifespan-band parameter search is justified in this sprint.

## Decision

**Natural grazer senescence remains rejected for authoritative runtime.**

Sprint 017 does not produce an acceptable lifespan configuration. Radius-3 partner discovery was necessary, but it is not sufficient to make a hard keyed-uniform lifespan band robust across both low-density recovery and carrying-pressure worlds.

Do not implement `old_age` deaths, lifespan state/config, or a snapshot change from this study.

## What the next mortality study must change

The next hypothesis should change the **shape of mortality**, not search more lifespan endpoints.

A useful follow-up must isolate whether the remaining failure comes from the cohort-cliff nature of a hard lifespan band—for example by testing a gradual age-dependent mortality hazard and/or realistic founder age structure—while keeping:

- authoritative radius-3 encounters;
- birth chance `0.001`;
- local vegetation threshold `0.50`;
- existing condition/cooldown gates;
- no global population target;
- sequential RNG isolation.

Do not tune reproduction/resource parameters and mortality simultaneously. A mortality model only advances if it survives multiple generations at low density **and** carrying pressure on all landscapes while preserving resource-limited dynamics.

## Cleanup

All temporary turnover probes, test-script overrides, and CI artifact plumbing are research scaffolding and are removed before merge. Runtime behavior remains unchanged.
