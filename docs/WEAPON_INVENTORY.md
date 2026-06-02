# Weapon Inventory

## Overview

Krumpanion tracks two separate weapon concepts:

- canonical weapon profiles
- account-owned weapon inventory instances

A weapon profile is static game data from `src/data/database/weapons/weaponProfiles.json`.
A weapon inventory instance is one actual copy owned by one account.

This separation matters because progression planning, GOOD import, duplicate handling, and refinement safety all depend on per-copy state rather than just a weapon key.

## Weapon profiles vs weapon instances

Canonical profile fields include:

- `weaponKey`
- `displayName`
- `weaponType`
- `rarity`
- `weaponAscensionMaterialFamilyKey`
- `eliteEnemyDropFamilyKey`
- `commonEnemyDropFamilyKey`
- optional acquisition/refinement metadata

Weapon inventory instances include:

- `weaponInstanceId`
- `weaponKey`
- `currentLevel`
- `currentAscension`
- `refinement`
- `locked`
- `equippedByCharacterId`
- `location`
- `accountId`
- `importSourceId`
- `importedName`
- `lastImportedAt`

Profiles are canonical runtime data.
Instances are account-scoped user state.

## GOOD weapon import

GOOD import creates one weapon instance per imported weapon row.

Import rules:

1. Match weapon names and aliases against canonical static data.
2. Preserve duplicate copies as separate owned weapon instances.
3. Preserve refinement, level, ascension, lock, and equipped state when GOOD provides them.
4. Preserve GOOD ids when available through `importSourceId`.
5. Generate deterministic local instance ids when GOOD does not provide a stable id.
6. Report unknown weapon names as import warnings instead of silently dropping them.

Weapon import remains account-scoped. Importing GOOD for one account must not overwrite another account's weapon inventory.

## Account-scoped storage

Weapon instances live under the active account state, alongside inventory and goals.

High-level shape:

```ts
account.weapons: OwnedWeapon[]
account.unmatchedWeapons: UnmatchedOwnedWeapon[]
```

Switching accounts changes:

- visible weapon instances
- refinement analysis
- linked owned-weapon goals
- unmatched imported weapon warnings

## Refinement tracking

The refinement tracker is a checklist and analysis layer. It does not create resin tasks.

Default tracking goal:

- help the user work toward at least one unique Refinement 5 copy of each relevant weapon

Tracked statuses:

- `already_r5`
- `can_refine_now`
- `needs_more_copies`
- `manual_review`
- `unsafe_to_refine`
- `not_owned`
- `not_tracked`

1-star and 2-star weapons are not tracked for refinement goals.

## Safe refinement policy

Krumpanion does not recommend blindly consuming duplicates.

Copies are not safe to consume when they are:

- locked
- equipped
- the only owned copy
- goal-linked
- more invested than the proposed base copy

Default policy by rarity and metadata:

- 3-star: normal duplicate refinement recommendations are allowed, while preserving at least one copy
- 4-star: recommendations are allowed, but locked/equipped/goal-linked copies are excluded
- 5-star: duplicate refinement is manual review by default
- `eventExclusive`, `limited`, or `preserve_all`: automatic consume recommendations are disabled

If canonical metadata is missing, Krumpanion defaults to safer behavior instead of aggressive recommendations.

## Weapons tab

The Weapons tab is split into two main areas:

1. `Weapon Goals`
2. `Weapon Inventory / Refinement`

Weapon Goals keeps level and ascension planning intact.
Weapon Inventory / Refinement shows:

- grouped owned copies per weapon
- highest refinement and highest investment
- R5 completion status
- refinement opportunities
- copy-by-copy safety details

The tracker does not perform in-game refinement. Recommendations are phrased as:

- `Can refine in game`
- `Review duplicates`
- `Needs more copies`
- `Already R5`

## Planner relationship

Weapon refinement tracking is not treated as farmable resin planning.

Important rules:

- refinement status may appear in weapon UI and goal context
- refinement tracking does not add resin requirements by default
- duplicate weapon copies are not treated as material deficits
- pre-farm weapon goals still work without owned instances

## Canonical metadata

Weapon profiles may include optional refinement metadata:

- `acquisitionType`
- `refinementTrackable`
- `refinementPolicy`
- `limited`
- `eventExclusive`

Validation checks:

- invalid `acquisitionType` fails validation
- invalid `refinementPolicy` fails validation
- 1-star and 2-star weapons cannot be refinement-trackable
- 5-star weapons default to manual review when explicit policy is missing

## Future work

Deferred follow-ups:

- multiple unique R5 targets
- wish/craft/fishing/event acquisition planning
- direct weapon-instance linking from every goal card
- user-configurable risky refinement preferences
- richer manual weapon-instance editing
