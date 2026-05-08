# Performance Plan

Krumpanion should calculate with minimal lag even when the account has many characters, weapons, artifacts, materials, and saved goals.

## Main strategy

Keep primary state small and normalized.

Do not store large derived outputs as editable state.

## Normalize imports

Convert GOOD arrays into maps:

```ts
charactersByKey: Record<string, GoodCharacter>
weaponsById: Record<string, GoodWeapon>
artifactsById: Record<string, GoodArtifact>
materialsByKey: Record<string, number>
```

Weapons and artifacts may need generated stable IDs because GOOD can contain duplicate weapon/artifact keys.

## Separate imported inventory from goals

Inventory snapshot:
- replaced each time a GOOD file is imported

Goals:
- persisted independently
- survive inventory updates
- keyed by character/weapon/generated goal id

## Memoization

Use memoization at these boundaries:

- parsed GOOD file
- normalized inventory
- character plan list
- weapon plan list
- total missing material table
- planner availability groups

In React:
- calculate planner output in a top-level selector/hook
- pass only relevant slices to child rows
- use `React.memo` for row components if needed

## Debouncing

Debounce:
- search inputs
- text notes
- bulk goal operations

Do not debounce:
- select dropdown changes for individual level/talent goals, unless planner calculation becomes heavy

## Virtualization

Use table virtualization once row counts grow:

- characters: likely small enough, but still fine to virtualize
- weapons: useful
- artifacts: required if artifact inventory is displayed later

Suggested library:
- `@tanstack/react-virtual`

## Avoid artifact bottlenecks

For MVP:
- parse artifact count and basic metadata only
- do not run artifact scoring
- do not include artifacts in planner calculations except independent Artifact Goals

Later:
- build artifact scoring as a separate feature module
- compute scores lazily per character/build goal
- cache artifact score results by artifact hash + goal hash

## Web Worker option

If planner calculation eventually becomes heavy:

- move planner calculation to a Web Worker
- send normalized inventory and goals as JSON
- return planner output
- keep UI responsive during recalculation

Do not add a Web Worker in MVP unless actual lag appears.
