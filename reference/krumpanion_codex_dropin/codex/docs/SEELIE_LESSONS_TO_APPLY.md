# Seelie-Inspired Lessons to Apply to Krumpanion

## Useful patterns

### 1. Local-first planning

The app should work from local user state and static game data.

Primary data loop:

```text
Owned account state
+ Inventory
+ Goals
+ Static game data
= Missing materials, crafting recommendations, and planner tasks
```

### 2. Clear feature tabs

A strong planner benefits from recognizable sections:

- Dashboard.
- Characters.
- Weapons.
- Inventory.
- Goals.
- Planner.
- Crafting.
- Artifacts.
- Import / Export.
- Settings.

### 3. Inventory as material counts

Inventory should be a map of stable material IDs to counts.

Do not duplicate full material definitions in user state.

### 4. Goals as first-class records

Goals should be editable, prioritizable, enabled/disabled, and independent from ownership.

### 5. Planner as explanation layer

Planner cards should explain why they exist.

Bad:

```text
Farm Forsaken Rift
```

Good:

```text
Farm Forsaken Rift today because Furina skill 8→10 and Xingqiu burst 6→9 need 42 Philosophies of Justice.
```

## Improvements over Seelie-style architecture

### Do not tie adding a character to adding a goal

A user should be able to track a character without making them an active farming target.

### Keep import formats out of app internals

GOOD and any future import formats should normalize into internal schemas.

### Keep calculations out of UI

UI can display calculations, but should not own formulas.

### Plan for schema migrations early

Save files should include schema versions from the beginning.
