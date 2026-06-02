# Planner UI

Krumpanion's Planner tab is an actionable dashboard built on top of the planner engine's
`PlannerReport`. It should help a player answer:

1. What do I need overall?
2. How much Resin will this take?
3. What should I spend Resin on first?
4. What can I do without Resin?
5. What can I craft right now?
6. What assumptions or missing data affect these estimates?

## Rendering contract

The Planner tab should read from `plannerOutput.plannerReport` through a presentation adapter,
not from legacy compatibility tables as its primary source.

Current UI flow:

1. `PlannerOutput`
2. `plannerReport`
3. planner UI adapter
4. summary panel
5. warnings panel
6. grouped section cards
7. recommendation cards

The adapter may recompute display-only labels and section groupings, but it must not change
deterministic math, crafting coverage, or Resin formulas.

## Section structure

The Planner tab now renders these user-facing sections in order:

1. `Planner summary`
2. `Planner assumptions and warnings`
3. `Today's resin activities`
4. `Ley Lines`
5. `Domains available today`
   - `Domains of Mastery`
   - `Domains of Forgery`
6. `Normal bosses`
7. `This Week`
   - grouped by weekly availability day
   - split into `Domains of Mastery` and `Domains of Forgery`
8. `Weekly bosses`
9. `Crafting / Conversion`
10. `Forging`
11. `Open-World Enemy Farming`
12. `Local Specialties`
13. `Passive / Incidental Sources`
14. `Unknown / Missing Estimate Data`

Important rules:
- engine sections may overlap
- UI sections must be exclusive where they represent one dashboard lane
- the `This Week` domain schedule is intentionally a planning view and may repeat today's domains in a separate weekly context
- the UI adapter is responsible for avoiding accidental duplication inside a single section

## Summary panel

The summary panel should show:

- active account name when available
- World Level when available
- estimate mode and crafting mode when available
- total estimated Resin
- Resin activity count
- weekly-limited activity count
- no-Resin task count
- unknown estimate count
- warning count

Do not show raw debug values by default.

## Recommendation card anatomy

Each recommendation card should show:

- source or activity name
- activity-type badge
- main action sentence
- estimated days / completion note when derivable
- covered materials with integer quantities
- readable related-goal chips
- compact warning chips when needed
- expandable detail text for estimate basis, drop assumptions, source notes, and schedule data

Examples:

- `7 runs | 40 resin/run | 280 total resin`
- `About 3.5 resin days`
- `Craft 4 Chaos Core from 12 Chaos Circuit`
- `Farm these enemies | No resin`

## Display rules

### Exact requirement vs estimate

The Planner UI must preserve the distinction between:

- exact requirement
- exact remaining deficit
- crafting action
- farming estimate
- passive or incidental source
- unknown estimate

Recommendation cards should not blur these concepts together.

### Quantities

- Material quantities must display as non-negative integers.
- Mora and Character EXP use thousands separators.
- Long decimal deficits must never be shown in user-facing UI.

### Runs and Resin

- Show actionable runs prominently.
- Show `resin/run` separately from total Resin.
- Show decimal estimated runs only as secondary detail when useful.
- Show estimated day counts only when the planner can justify them from existing engine data.
- `No resin` is the only accepted no-Resin label.
- Unknown estimates should show `Missing estimate data`.

### Estimated days

The Planner UI may display two kinds of time estimates:

- Resin days
  - derived from `totalEstimatedResin / dailyResinBudget`
- Time-gated completion
  - adjusted for weekly boss gating
  - adjusted for rotating domain availability
  - adjusted for daily forge-cap limits

Examples:

- `About 3.5 resin days`
- `Earliest completion: Thursday, if started today`
- `About 4 daily resets`

If the planner cannot estimate time safely, show:

- `Days unavailable: missing estimate data`
- or a no-Resin exclusion note for route-based tasks

### Warnings

- Short warnings should appear inline as compact chips.
- Long assumption text belongs in expandable details or the warnings panel.
- Duplicate warnings should be deduplicated at the page level when they describe one global condition.

## Goal display rules

Goal display must use shared helpers, not raw ids.

Use:

- `getGoalDisplayName(...)`
- `getGoalTypeLabel(...)`
- `getCharacterGoalDisplayName(...)`
- `getWeaponGoalLabel(...)`
- `getArtifactGoalDisplayName(...)`

Never render raw storage keys such as:

- `prefarm:CoolSteel`
- `weapon-goal-...`
- legacy `weapon-*` ids
- raw numeric priority scores

Traveler-specific labels should remain readable:

- `Traveler shared level`
- `Anemo Traveler talents`
- `Geo Traveler talents`

## Boss display rules

- Normal boss rows must show unique boss material deficits as the primary need.
- Ascension gems are incidental detail only.
- Gem-only deficits must not create normal boss farming rows.
- If incidental gem detail is shown, keep it in expandable details or secondary chips, not as the primary requirement list.

## Adding a new section

When adding a Planner section:

1. add or reuse an engine-facing `PlannerRecommendationSection`
2. update the planner UI adapter to assign rows into one exclusive UI section
3. provide a title, subtitle, empty state, and section-level Resin behavior
4. add rendering tests
5. confirm no raw ids or duplicate rows appear

## Known deferred work

- richer sorting and filtering controls
- dedicated planner search
- broader visual redesign beyond the dashboard cleanup
- debug-only expansion of deterministic planner internals
