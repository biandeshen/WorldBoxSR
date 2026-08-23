# Same-partner encounter persistence study — 2026-08-23

Issue: #49

## Question

The temporal drought study (#47) showed that seed45 has reproduction opportunity on only 12.7% of eligible female-days and that its missing-opportunity tail can last months or years. Most drought-days occur after the female has previously had **some** radius-1 male opportunity, but that alone does not justify pair bonds: the previously encountered man might be dead, no longer reproduction-eligible, or simply one of many unrelated encounters.

This study asks whether **the same male identities** encountered locally have enough persistence to support a later relationship/pair model.

## Method

A derived-only tracker observes start-of-day state before the authoritative tick. It remembers only male IDs that were actually reproduction-eligible and observed within radius 1 of a reproduction-age female.

For eligible female drought-days (no current radius-1 eligible male), it distinguishes:

- any remembered same male identity within a 30 / 90 / 180 / 360-day window;
- at least one remembered male still alive;
- at least one remembered male currently reproduction-eligible;
- same female/male local-return intervals after at least one day of separation.

The tracker does not modify world state, snapshots, counters, or RNG.

### Bounded storage

Default identity memory is deliberately bounded:

- retention: 360 days;
- at most 8 remembered males per female;
- stale records are pruned;
- over-cap records evict the oldest encounter deterministically;
- recurrence intervals use a fixed-size histogram rather than an unbounded event list.

Probe worlds: seeds 1, 4, 9, 45, 80, 98; 24×24; population 30; 100 years; daily observation.

## Results

The percentages below use **all eligible female drought-days** as the denominator.

| seed | pop @100y | drought share | 30d same male eligible | 90d | 180d | 360d | same-pair return median | P90 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 306 | 46.3% | 66.0% | 85.3% | 93.0% | 97.2% | 8d | 53d |
| 4 | 159 | 54.4% | 66.1% | 86.1% | 93.9% | 98.0% | 10d | 79d |
| 9 | 207 | 39.1% | 81.2% | 96.3% | 99.1% | 99.6% | 7d | 54d |
| 45 | 35 | **87.3%** | **25.9%** | **46.3%** | **61.6%** | **76.8%** | **11d** | **130d** |
| 80 | 112 | 62.7% | 59.0% | 83.2% | 92.9% | 97.1% | 10d | 90d |
| 98 | 431 | 9.3% | 83.7% | 96.2% | 98.9% | 99.4% | 4d | 14d |

### Alive vs eligible attrition is tiny

For seed45:

| window | remembered identity | remembered alive | remembered eligible |
| ---: | ---: | ---: | ---: |
| 30d | 26.10% | 26.10% | 25.93% |
| 90d | 46.59% | 46.59% | 46.30% |
| 180d | 61.92% | 61.92% | 61.59% |
| 360d | 76.99% | 76.99% | 76.77% |

The drop from "remembered" to "alive" is effectively zero at these horizons. The drop from alive to currently reproduction-eligible is also below one percentage point. Thus partner death or temporary ineligibility is **not** the important reason remembered encounters fail to cover seed45 droughts. The important loss is that the last real encounter is simply too old.

### Same-pair recurrence is real

Seed45 recorded 5,154 same-pair returns within the 360-day retained horizon:

- median return interval: 11 days;
- mean: 41.5 days;
- P90: 130 days;
- maximum recorded interval: 360 days (the retention boundary).

So the simulation does naturally create repeated encounters between the same people. A relationship identity would not be an entirely artificial concept layered onto one-off meetings.

## Cap sensitivity

Because bounded memory could hide relevant partners, seed45 and seed80 were rerun with per-female caps 8 and 16.

### Seed45

- cap 8: 180d remembered-eligible coverage 61.5883%; 360d 76.7742%; 30 cap evictions.
- cap 16: **exactly the same** 180d and 360d coverage; 0 cap evictions.

### Seed80

- cap 8: 180d 92.9242%; 360d 97.1429%.
- cap 16: **exactly the same** coverage at both horizons.

Therefore the main coverage conclusions are not artifacts of the 8-partner cap. Raising the cap changes recurrence-sample counts and interval distribution somewhat, especially in higher-contact worlds, but not whether drought-days have a remembered eligible partner.

## Interpretation

### 1. Partner identity is more than a fiction, but it is not the missing demographic fix

The same male commonly reappears after separation, and remembered partners almost always remain alive and reproduction-eligible over the measured windows. This makes persistent identity a plausible future social primitive.

However, seed45 still has a large uncovered tail:

- ~38% of drought-days have no remembered eligible partner within 180 days;
- ~23% still have none within an entire 360-day year.

A one-year pair-memory model would therefore leave a substantial fraction of the sparse sentinel's reproduction drought untouched. Extending memory to multiple arbitrary years would be tuning around the symptom rather than explaining the spatial structure that keeps people apart.

### 2. Identity adds little coverage beyond generic recent-opportunity memory

The #47 generic recent-opportunity study and this identity study produce nearly the same seed45 coverage at 30/90/180 days. That means the key fact is **recency of contact**, not choosing the right remembered male out of a crowd. Identity tells us the contact is socially coherent; it does not resolve the long separation tail.

### 3. Do not implement pair-bond fertility yet

The evidence now supports retaining partner identity as a candidate world/social concept, but not using it to change conception behavior yet. Previous #45 proved that converting additional remembered opportunity into an independent conception hazard creates positive demographic feedback and massive overcompensation.

Any eventual pair-bond reproduction design must:

- use one normalized fertility hazard, not local + remembered parallel hazards;
- choose a partner within that hazard;
- be tested against the seed45 low-density sentinel and whole-distribution baselines;
- be motivated by a spatial/social model, not by a multi-year magic memory duration.

## Next question

The unresolved root cause is **why seed45 stays spatially isolated even though remembered partners remain alive and eligible**. The next research slice should decompose eligible female drought-days by settlement membership and spatial topology:

- settled vs unsettled females;
- eligible male availability in the same active settlement;
- nearest eligible-male distance;
- whether partners are in the same settlement / territory when separated;
- settlement sex balance through time;
- accessible land-component/topological separation where practical;
- compare seed45 with seed80 and ordinary worlds.

## Decision

- Keep current reproduction behavior unchanged.
- Keep the bounded same-partner tracker as a reusable research instrument.
- Treat persistent partner identity as plausible, but **do not add pair-bond behavior yet**.
- Investigate settlement/topological isolation next.
