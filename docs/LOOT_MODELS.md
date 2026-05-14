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

Level IV defaults currently used by the planner:

- Talent domain averages:
  - 2-star: `2.2`
  - 3-star: `1.98`
  - 4-star: `0.22`
- Weapon ascension domain averages:
  - 2-star: `2.2`
  - 3-star: `2.418`
  - 4-star: `0.62`
  - 5-star: `0.062`

These are consumed as grouped family estimates so one run can help satisfy multiple tiers.

## Boss models

Normal boss models estimate unique boss material yield by world level.

Weekly boss models estimate total weekly talent materials by world level, then convert to target-specific expected material for one of the boss's three weekly drops.

WL9 modeling is explicit and conservative:

- normal boss unique material estimate: `3`
- weekly boss total talent material estimate: `2`
- target weekly material estimate: `2 / 3`

## Passive and incidental models

Some sources are tracked as guidance only:

- daily commission elemental gem sliver
- billets
- Dream Solvent
- Parametric Transformer
- incidental boss gem drops

These should not be promoted into direct Resin totals unless the feature explicitly supports that behavior.
