# Supplemental reproduction encounters — negative experiment

Date: 2026-08-23  
Issue: #45

## Why this experiment existed

The reproduction-opportunity study showed that sparse worlds are not globally short of eligible males; they are short of **radius-1 local encounters**. In seed 45 at year 100 there were 6 eligible females and 12 eligible males globally, but only 33.3% of eligible females had a male inside the current 3×3 search while 100% had one within radius 3.

A naive wider mating radius would also change which females consume sequential birth RNG. To isolate the intended effect, #45 implemented an experimental supplemental path that:

- left the existing radius-1 reproduction path unchanged;
- activated only when a female had zero radius-1 eligible males;
- used keyed/stateless randomness for supplemental attempt, father selection, and child sex;
- supplied all random child fields explicitly so the supplemental birth itself did not consume sequential world RNG on that day;
- kept default worlds structurally unchanged unless an explicit experimental radius was provided.

Focused tests confirmed this causal isolation before distribution experiments were run.

## Full-rate wider encounters massively overcompensate

A 12-seed (1–10, 45, 98), 100-year scan compared radius 1 with radius 2/3 using the same daily birth-attempt probability as local encounters.

### Baseline radius 1

- population min / median / mean / max: **35 / 370.5 / 369.6 / 649**;
- seed 45: population **35**, births 44, deaths 39, food remaining ~99.45%.

### Supplemental radius 2, full rate

- population min / median / mean / max: **280 / 624 / 562.7 / 838**;
- seed 45: population **758**, births 1,055, deaths 327, food remaining ~1.76%.

### Supplemental radius 3, full rate

- population min / median / mean / max: **285 / 627 / 561.8 / 837**;
- seed 45: population **763**, births 1,882, deaths 1,149, food remaining ~1.46%.

Wider encounter opportunity at the ordinary local birth rate is therefore not a sparse-tail correction; it is a major fertility accelerator.

## Low-rate scans reveal a sharp threshold, not a smooth tuning range

The supplemental attempt probability was then scaled while keeping radius 3.

At year 100:

- multiplier **0.01**: seed 45 remained at population 35 — effectively no repair;
- multiplier **0.015**: seed 45 still remained at 35;
- multiplier **0.02**: seed 45 rose to **68**; 12-seed population mean increased by only ~5.8%, but median increased by roughly 20%;
- multiplier **0.025–0.03**: seed 45 rose to roughly **82**, with continued distribution reshaping;
- multiplier **0.10** produced stronger broad effects.

This is a discrete deterministic system. Small multiplier changes cross individual keyed birth-attempt thresholds; those few extra births then alter future density and encounter opportunity. There is no smooth parameter region where one can assume proportional long-horizon effects.

## 200-year validation rejects the best low-rate candidate

Multiplier 0.02 was the smallest setting that visibly helped seed 45 at year 100, so it was compared with baseline across the same 12 seeds for 200 years.

### Baseline

- population min / median / mean / max: **128 / 535 / 504 / 805**;
- births median: 2,924.5;
- food remaining median: ~2.14%;
- active settlements median: 7;
- seed 45: population **128**, births 184, deaths 86, food remaining ~96.45%, 7 active settlements;
- seed 98: population 404, 1 abandoned settlement.

### Radius 3 × multiplier 0.02

- population min / median / mean / max: **282 / 635 / 558.25 / 817**;
- population median: **+18.7%** vs baseline;
- population mean: **+10.8%** vs baseline;
- food remaining median: ~1.90%;
- active settlements median: 7.5;
- seed 45: population **768**, births 1,522, deaths 784, food remaining ~1.58%, 8 active settlements;
- seed 98: population 408, still 1 abandoned settlement.

The candidate that looked modest at year 100 becomes a severe seed-45 overshoot by year 200 and materially shifts the population distribution.

## Interpretation

The experiment confirms the deeper system structure:

1. local mating opportunity is genuinely brittle in sparse populations;
2. however, simply granting missing females an additional independent birth-attempt channel changes effective lifetime fertility, even at very low daily probability;
3. once a few extra births lift density, ordinary radius-1 opportunities become more common;
4. the feedback amplifies until the world approaches ordinary carrying-capacity pressure.

This is why there is no stable global multiplier that both leaves healthy worlds untouched and merely "fills in" sparse encounters. The desired object is not a second fertility channel.

## Decision

**Reject supplemental reproduction encounters v0.**

No runtime code, config field, or permanent behavior test from #45 is merged. Main reproduction behavior remains unchanged.

The next reproduction redesign should not be framed as "another chance to give birth". A better direction is to separate **social pairing / encounter availability** from **fertility hazard** so that increasing encounter reach does not automatically increase a female's total number of independent daily conception opportunities.

Candidates for future research, before any behavior change:

- persistent eligible pair bonds with a single fertility hazard per female/pair;
- normalized opportunity selection (choose a potential partner from an encounter pool, then apply one conception hazard, rather than one extra hazard per search mode);
- explicit mate-search/visit events with cooldowns instead of daily supplemental conception attempts.

Any such design must preserve the existing post-social demographic baseline as a comparison target and must be tested against seed 45 as well as ordinary worlds.
