# Resin Calculation

Krumpanion separates exact progression math from farming estimates.

## Guaranteed and advisory layers

The primary planner total is guaranteed:

`guaranteedTotalResin = sum(ceil(deficit / minimumGuaranteedOutput) * resinPerRun)`

Where:

- `deficit` is calculated after current inventory and deterministic conversion coverage
- `minimumGuaranteedOutput` is the validated floor for the configured source level
- runs are always rounded up to a nonnegative integer before Resin is calculated
- `resinPerRun`
  - claim cost for the source

`totalEstimatedResin` remains a compatibility alias for `guaranteedTotalResin`.
Average-yield calculations are exposed as `expectedEstimate` and `expectedAdvisoryResin`.
They are displayed first as the practical planning forecast. Guaranteed values remain the auditable worst-case ceiling and continue to back compatibility totals and deterministic contribution checks.

No-resin activities always display `No resin` and do not contribute to total Resin.
Unknown estimates are excluded from total Resin and surfaced with a warning instead of being treated as `0`.

Deterministic requirements, inventory subtraction, and guaranteed crafting coverage are calculated before Resin estimation. Changing World Level, domain level, or estimate assumptions must not change the exact requirement layer.

## Source categories

- Ley Lines
  - Blossom of Wealth: 20 Resin
  - Blossom of Revelation: 20 Resin
- Domains
  - Talent domains: 20 Resin
  - Weapon ascension domains: 20 Resin
  - Artifact domains: 20 Resin
- Normal bosses
  - 40 Resin per claim
- Weekly bosses
  - first 3 weekly claims: 30 Resin
  - later weekly claims: 60 Resin

## Contribution policy

- Wealth Ley Lines use their fixed Mora reward.
- Revelation Ley Lines use minimum Character EXP for guaranteed totals and average EXP for advisory estimates.
- Talent and weapon domains use the configured level's minimum lower-tier equivalent for guaranteed totals and average equivalent for advisory estimates.
- Normal bosses contribute guaranteed Resin only for unique-material deficits.
- Weekly target materials have no guaranteed completion bound. Expected target drops and discount scheduling are advisory only.
- Ascension Gem-only shortages use current crafting and enabled Dust conversion. Future boss gem drops are incidental.
- Enemy drops, specialties, weapon EXP, artifacts, and unknown sources do not contribute Resin.

Owned same-boss weekly materials may deterministically cover a weekly target at a one-to-one cost with currently owned Dream Solvent. Required alternative materials are reserved before surplus is converted. Future drops and future Dream Solvent are never assumed.

## World Level 9 rules

Conservative defaults are used when exact WL9 data is incomplete.

- Normal bosses:
  - assume guaranteed `3` unique boss materials per claim
  - warn that a possible 4th drop is not modeled exactly
- Weekly bosses:
  - advisory estimate assumes `2` total weekly talent drops per claim
  - advisory target estimate assumes equal distribution among the boss's 3 weekly materials
  - no weekly target estimate contributes to guaranteed Resin
- Open-world enemies:
  - may use WL8 baseline route guidance with a warning

## Gem farming policy

Character Ascension Gems are tracked deterministically, but boss Resin is not driven by gems alone by default.

- normal bosses should be recommended because of missing unique boss materials
- gems are treated as incidental/passive coverage
- gem-only deficits should surface as advisory or passive guidance, not direct boss Resin targets

## Character EXP assumption

Krumpanion stores character levels, not partial EXP within the current level. Character EXP farming therefore conservatively assumes zero progress inside the current level, subtracts the EXP value of owned books, and uses minimum Revelation rewards for guaranteed Resin.
