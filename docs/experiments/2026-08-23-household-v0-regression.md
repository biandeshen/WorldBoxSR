# Lineage history regression note

Date: 2026-08-23  
Issues: #32, #36

The ancestry/lineage layer is intentionally history-only. The demographic sentinel remains pinned to the post-cohesion seed-45 year-200 result:

- population: 128
- births: 184
- deaths: 86
- food remaining: >96%

The original #32 record was named `household`; #36 corrects it to `lineage` after probe evidence showed the groups are persistent founder lines rather than residential units.

Any future behavior attached to lineage identity must update this evidence only with an explicit causal explanation. Residential household behavior must be modeled separately.
