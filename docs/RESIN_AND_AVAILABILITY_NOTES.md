# Resin and Availability Notes

Use local static data tables for game rules.

## Resin defaults

Store in `src/data/resinRules.json`:

```json
{
  "originalResinCap": 200,
  "regenMinutesPerResin": 8,
  "naturalResinPerDay": 180,
  "naturalResinPerWeek": 1260,
  "costs": {
    "domain": 20,
    "leyLine": 20,
    "normalBoss": 40,
    "weeklyBossDiscounted": 30,
    "weeklyBossFull": 60,
    "condensedResinCraft": 40
  },
  "fragileResinRestores": 60,
  "transientResinRestores": 60
}
```

## Availability groups

Use the following normalized availability groups:

```ts
type AvailabilityGroupKey =
  | "MON_THU_SUN"
  | "TUE_FRI_SUN"
  | "WED_SAT_SUN"
  | "ALWAYS"
  | "WEEKLY"
  | "UNKNOWN";
```

Rotating talent and weapon domain materials should be assigned to one of the three rotating day groups. Sunday should surface all rotating domain materials.

Planner availability should use the in-game reset day, not raw local midnight:

- Genshin's daily reset is `2:00 AM` Pacific time
- before `2:00 AM` Pacific, Krumpanion should still treat the planner as the previous in-game day
- after or at `2:00 AM` Pacific, the planner should switch to the new day

## Source record

```ts
type MaterialSource = {
  materialKey: string;
  sourceType:
    | "domain_of_mastery"
    | "domain_of_forgery"
    | "artifact_domain"
    | "normal_boss"
    | "weekly_boss"
    | "ley_line"
    | "enemy_drop"
    | "local_specialty"
    | "alchemy"
    | "other";
  sourceKey: string;
  sourceName: string;
  resinCost?: number;
  availability: AvailabilityGroupKey;
  region?: string;
  notes?: string;
};
```

## Estimation notes

Krumpanion distinguishes:

- deterministic requirements
- exact inventory deficits
- crafting-adjusted deficits
- source-level farming estimates

Source-level estimation rules:

- `Blossom of Wealth` groups all missing Mora into one estimate.
- `Blossom of Revelation` groups all missing character EXP books by total EXP value.
- `Domain of Mastery` estimates are grouped by talent-book family/domain.
- `Domain of Forgery` estimates are grouped by weapon-ascension family/domain.
- `Normal Boss` runs are driven only by missing unique boss materials.
- `Weekly Boss` estimates are grouped by boss source and scheduled once per boss per week.

Character Ascension Gem handling:

- Gems remain deterministic requirements.
- Gems remain part of inventory subtraction and same-family crafting.
- Gem-only deficits do not create default Normal Boss Resin recommendations.
- Gem deficits are treated as passive/incidental/crafting/conversion gaps by default.

Non-Resin sources:

- Open-world enemy drops
- Local specialties
- Forging ores
- Mystic Enhancement Ore forging
- Gem-only advisories

These may still appear as recommendations, but they do not increase `totalEstimatedResin`.

## Priority display semantics

- The Priority view groups rows by actionable source category instead of one row per material tier.
- The main Resin value shown to users is total estimated Resin for the recommendation, not the Resin cost of a single run.
- Known no-Resin activities should display `No resin` rather than `Unknown`.
- Open-world enemy routes and local specialties stay outside Resin-gated activity groups.
- Character Ascension Gem-only gaps stay outside the main Resin queue and surface as passive/incidental advisories instead.
- Weapon EXP forging stays outside the Resin queue and is summarized as a daily-capped Mystic Enhancement Ore recommendation.

## Rounding and crafting display

- User-facing missing material quantities should be whole numbers.
- Positive fractional expected deficits are rounded up for actionability.
- Tiny floating-point artifacts near zero are clamped away.
- Crafting suggestions should only appear when they provide positive useful coverage.
- Crafting text should never show negative covered amounts.
