# Resin Calculation

Krumpanion separates exact progression math from farming estimates.

## Total Resin rule

For standard Resin-gated activities:

`totalEstimatedResin = actionableRuns * resinPerRun`

Where:

- `estimatedRuns`
  - decimal expected-value estimate
- `actionableRuns`
  - rounded-up count the user can actually claim
- `resinPerRun`
  - claim cost for the source

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

## Weekly boss calculation

Weekly bosses are once-per-boss-per-week.

The planner:

1. Estimates target-specific weekly material claims.
2. Rounds up to actionable weekly claims.
3. Applies the current remaining discounted weekly claims.
4. Calculates total Resin from the discounted and full-cost split.

The UI should show that split directly in the row details.

## World Level 9 rules

Conservative defaults are used when exact WL9 data is incomplete.

- Normal bosses:
  - assume guaranteed `3` unique boss materials per claim
  - warn that a possible 4th drop is not modeled exactly
- Weekly bosses:
  - assume `2` total weekly talent drops per claim
  - assume equal distribution among the boss's 3 weekly materials
  - therefore estimate `2/3` target material per claim unless better data is added
- Open-world enemies:
  - may use WL8 baseline route guidance with a warning

## Gem farming policy

Character Ascension Gems are tracked deterministically, but boss Resin is not driven by gems alone by default.

- normal bosses should be recommended because of missing unique boss materials
- gems are treated as incidental/passive coverage
- gem-only deficits should surface as advisory or passive guidance, not direct boss Resin targets
