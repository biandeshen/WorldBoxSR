# Lineage probe — household v0 semantics

Date: 2026-08-23  
Issue: #34  
Probe seeds: 45, 80, 98 at year 200

## Results

| Seed | Population | Founder records | Empty | Max generation | Avg living members/record | Max living record | Avg historical members/record |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 45 | 128 | 30 | 27 | 8 | 4.27 | 86 | 7.13 |
| 80 | 871 | 30 | 26 | 9 | 29.03 | 379 | 91.00 |
| 98 | 404 | 30 | 22 | 9 | 13.47 | 87 | 96.40 |

Additional orphaned living humans: seed 45 = 21, seed 80 = 167, seed 98 = 131.

## Interpretation

The current v0 record is **not a residential household**. Because every founder starts one record and children inherit the mother's record indefinitely, the record behaves as a persistent maternal founder **lineage**:

- the number of records remains fixed at the founder count;
- most founder lines become extinct over long horizons;
- surviving records can contain hundreds of living descendants;
- record size therefore cannot be interpreted as co-residence, food sharing, or a household economy.

This is useful history data, but using it directly for household movement, shared storage, inheritance, or politics would encode the wrong social unit.

## Decision

1. Keep the new ancestry information.
2. Treat the current persistent maternal groups as **lineages** conceptually.
3. Do **not** add behavioral household mechanics on top of these records.
4. Before household behavior, split lineage identity from a future residential household/group model whose membership can form, split, merge, move, and expire.

The probe was run temporarily on GitHub Actions and removed from the permanent CI suite after results were captured.
