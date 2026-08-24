# Pre-extinction grazer birth-stall sensitivity — 2026-08-24

Issue: #132
Sprint: 028

## Question

Does a single zero-birth duration cleanly separate persistent compact grazer cycles from terminal generational failure strongly enough to justify another threshold candidate?

This is derivation/diagnostic research only. No threshold is accepted and runtime ecology/initialization remain unchanged.

## Fixed cohort

The exact Sprint027 cohort was re-run:

- 16×16 creature-only worlds;
- seeds `31..60`;
- founders `2/4/6/8/10`;
- vegetation-rich top32 / round-robin placement;
- keyed founder ages `[0,6y]`;
- reproduction `0.001`;
- gradual old-age mortality enabled;
- partner radius3;
- local vegetation radius1 threshold0.50;
- year0→300;
- sequential RNG isolation.

This cohort is explicitly derivation data. Any candidate would have required later validation on different seeds.

## Measurement

For every world the probe tracked exact birth timing and reported:

- extinction year;
- last birth year;
- for extinction after year20, terminal birthless span from `max(year20, last birth)` to extinction;
- longest completed birth gap after year20;
- for survivors, right-censored gap from last birth to year300;
- population<10 duration as context only.

One world (seed36×2) becomes extinct before year20 and is treated as direct early extinction, not as a post-year20 warning-duration case.

## Result

- worlds: **150**;
- survivors at year300: **118**;
- early extinctions before year20: **1**;
- late extinctions: **31**.

### Late-extinction terminal birthless gaps

Across 31 late extinctions:

- minimum: **0.42 years**;
- median: **21.49 years**;
- maximum: **29.98 years**.

### Persistent-world observed birth gaps

For the 118 year300 survivors, using the larger of longest completed gap and current right-censored gap:

- minimum: **7.91 years**;
- median: **17.88 years**;
- maximum: **22.71 years**.

The maximum persistent observed gap is seed39×8 at ~22.71 years. Several other persistent worlds exceed 21 years.

## The distributions overlap decisively

There is **no clean separating interval**.

**16 of the 31 late extinctions** have terminal birthless spans `<=22.71 years`, i.e. no longer than the maximum gap already observed in persistent worlds.

Examples inside the overlap:

- seed39×10: extinct ~year63.35; terminal birthless ~**17.17y**;
- seed37×2: extinct ~year74.44; terminal ~**19.79y**;
- seed53×10: extinct ~year219.84; terminal ~**19.80y**;
- seed57×6: extinct ~year91.80; terminal ~**20.16y**;
- seed51×10: extinct ~year90.66; terminal ~**20.38y**;
- seed56×2: extinct ~year41.49; terminal ~**21.49y**.

Persistent worlds already exhibit completed gaps in the same band:

- seed39×8: **22.71y**;
- seed37×10: **22.24y**;
- seed48×4: **22.22y**;
- seed55×4: **22.12y**;
- seed47×8: **21.84y**.

Therefore any duration low enough to catch those terminal failures would also lie inside normal persistent-cycle behavior. Any duration high enough to avoid all observed persistent gaps necessarily misses many true extinctions and often provides no warning before extinction.

## Additional structure

Some late extinctions occur shortly after year20 with no meaningful post-year20 reproductive history at all, yielding terminal spans of only ~0.4–5.5 years. Others fail after many generations and long cycles with terminal spans near 20–30 years.

So compact extinction itself is causally heterogeneous:

- initial/founder establishment failure;
- later sparse generational collapse after prior successful cycles;
- terminal declines whose birth-gap timing overlaps ordinary persistent oscillations.

A single duration cannot compress all three into a reliable persistence classifier.

## Decision

**Reject single-duration zero-birth classification as the compact persistence gate.**

- do not choose 20/23/25/etc. from this cohort;
- do not add population/resource conditions post hoc to rescue the threshold idea;
- stop threshold-searching on birth-gap duration;
- keep ecology, founder count, placement, and runtime/default fauna unchanged.

For initializer research, use direct causal outcomes instead of trying to predict infinite-horizon persistence from one scalar warning metric. A clean next experiment can target the specifically observed **initial encounter/establishment failure** with a narrow spatial-seeding A/B and measure actual establishment, births, extinction/time-to-extinction, resource pressure, and long-horizon behavior directly.

Default worlds remain creature-free.

## Cleanup

Temporary diagnostic probe/test override are removed before merge. Runtime behavior remains unchanged.
