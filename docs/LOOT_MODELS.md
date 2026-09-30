# Loot Models

Krumpanion stores source reward assumptions as structured loot/source metadata, not pasted raw tables.

## Loot model shape

Each source model should describe:

- source key
- activity type
- Resin cost per claim, or no-Resin
- level dimension
  - `world_level`
  - `domain_level`
  - `enemy_level`
  - `reward_tier`
  - `adventure_rank`
  - `none`
- explicit guaranteed minimum outputs by family or tier
- expected outputs by family or tier
- data quality
  - `exact`
  - `observed_estimate`
  - `inferred`
  - `partial`
  - `unknown`
- notes and warnings

## Domain models

Talent and weapon domains are modeled by family and domain level.

Each configured domain level stores a guaranteed lower-tier-equivalent floor and an expected average. The configured/highest-unlocked level is used for both layers; the planner does not select a lower level merely because its mathematical floor looks stronger.

Level IV advisory averages currently used by the planner:

- Talent domain averages:
  - 2-star: `2.2`
  - 3-star: `1.98`
  - 4-star: `0.22`
- Weapon ascension domain averages:
  - 2-star: `2.2`
  - 3-star: `2.418`
  - 4-star: `0.62`
  - 5-star: `0.062`

These are consumed as grouped family estimates so one run can help satisfy multiple tiers. Guaranteed totals use the corresponding validated minimum equivalent instead.

## Boss models

Normal boss models store both the guaranteed unique-material floor and the expected unique-material yield by world level.

Weekly boss models estimate total weekly talent materials by world level, then convert to target-specific expected material for one of the boss's three weekly drops.

WL9 modeling is explicit:

- normal boss guaranteed unique-material floor: `3`
- normal boss advisory mean: `3.08`
- weekly boss advisory total talent material estimate: `2`
- advisory target weekly material estimate: `2 / 3`
- weekly target guaranteed estimate: unavailable

## Passive and incidental models

Some sources are tracked as guidance only:

- daily commission elemental gem sliver
- billets
- Dream Solvent
- Parametric Transformer
- incidental boss gem drops

These should not be promoted into direct Resin totals unless the feature explicitly supports that behavior.

Static-data validation requires finite, nonnegative minimum and average fields, checks that averages are not below guaranteed floors, and rejects guaranteed-source records without an explicit floor.
