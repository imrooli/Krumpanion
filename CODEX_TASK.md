# Codex Task: Build Krumpanion MVP

Build a lightweight React + TypeScript + Vite application named **Krumpanion**.

Krumpanion imports GOOD-format Genshin Impact inventory JSON and helps the user plan Resin spending based on character, talent, weapon, and artifact farming goals.

## Core requirement

The app must remain responsive with large inventories and many goals. Avoid recalculating the entire planner on every keystroke. Use memoized selectors and pure calculation functions.

## User flow

1. User opens app.
2. User imports a GOOD JSON file.
3. App parses:
   - `characters`
   - `weapons`
   - `materials`
   - `artifacts` only as optional/future data
4. User opens the **Characters** tab.
5. User can search/filter characters and set goals for each owned character:
   - character target level
   - character target ascension
   - talent target levels for `auto`, `skill`, and `burst`
6. User opens the **Weapons** tab.
7. User can set target weapon level and ascension for weapons.
8. User opens the **Artifact Goals** tab.
9. User can add artifact farming goals independent of currently owned artifacts.
10. User opens the **Planner** tab.
11. Planner calculates:
   - total missing materials
   - missing materials grouped by source
   - same-material demand grouped across characters/weapons/talents
   - farmable-today list
   - Resin cost estimate
   - weekly/day schedule based on material availability

## Tabs to build

### Dashboard

Shows:
- imported account source/version
- count of characters
- count of weapons
- count of material keys
- count of artifact records if present
- total active goals
- top Resin bottlenecks

### Characters

Functional UI for each character.

Each character row/card should show:
- name/key
- current level
- current ascension
- current talents: `auto`, `skill`, `burst`
- target level select/input
- target ascension select/input
- target talent selects/inputs
- missing summary:
  - Mora
  - EXP books
  - boss materials
  - gemstones
  - local specialty
  - enemy drops
  - talent books
  - weekly drops
  - crowns

Recommended UI:
- left-side search/filter
- compact table mode for many characters
- optional expandable character detail panel
- changed-goal indicator
- reset character goal button

### Weapons

Each weapon row/card should show:
- weapon key/name
- current level
- current ascension
- refinement
- equipped location
- target level
- target ascension
- missing materials summary

### Artifact Goals

This tab is independent from artifact inventory.

Fields:
- goal id
- character key
- domain key
- target artifact set keys
- desired main stats per slot, optional
- desired substats, optional
- priority 1-5
- weekly Resin budget, optional
- notes

The MVP should not score existing artifacts unless the user explicitly asks later.

### Planner

Planner should have:
- "Today" view
- "This Week" view
- "All Missing Materials" view
- "By Character" view
- "By Domain/Boss/Ley Line" view

Planner should group farmable days:
- Monday / Thursday / Sunday
- Tuesday / Friday / Sunday
- Wednesday / Saturday / Sunday
- Always available
- Weekly reset-limited
- Unknown/manual source

Planner outputs:
- Material name/key
- Needed amount
- Owned amount
- Missing amount
- Used by which goals
- Source
- Available days
- Resin type/cost
- Priority score
- Suggested action

## Data architecture

Create these folders:

```txt
src/
  app/
  components/
  features/
    import/
    characters/
    weapons/
    artifactGoals/
    planner/
  data/
    costTables/
    materialSources/
  domain/
    good/
    goals/
    planner/
  store/
  utils/
```

## Files to implement

Minimum useful implementation:

```txt
src/domain/good/types.ts
src/domain/good/parseGood.ts
src/domain/goals/types.ts
src/domain/planner/types.ts
src/domain/planner/calculateMissingMaterials.ts
src/domain/planner/groupByAvailability.ts
src/domain/planner/buildPlannerRows.ts
src/store/useAppStore.ts
src/features/import/GoodImportPanel.tsx
src/features/characters/CharactersTab.tsx
src/features/weapons/WeaponsTab.tsx
src/features/artifactGoals/ArtifactGoalsTab.tsx
src/features/planner/PlannerTab.tsx
src/App.tsx
```

## Performance requirements

Use pure functions and memoization.

Do not:
- scan every artifact on every character goal edit
- stringify the whole GOOD file repeatedly
- run planner calculations inside individual row components
- store derived planner output as primary state

Do:
- normalize GOOD import into maps by key/id
- keep goals as small separate records
- calculate planner output from `inventory + goals + staticData`
- debounce high-volume inputs
- use table virtualization if the character/artifact inventory view grows large

## Static data strategy

The app must use local JSON data tables for:
- character cost tables
- talent cost tables
- weapon cost tables
- material source tables
- domain availability tables
- Resin costs

Do not scrape the wiki inside the app.

Seed these tables manually from Genshin Impact Wiki data. Keep source notes in `data_seed/README.md`.

## Important implementation note

GOOD files use game-style keys such as `KaedeharaKazuha`, `RaidenShogun`, `critRate_`, `enerRech_`, etc. Preserve keys internally. Add display-name mapping later.
