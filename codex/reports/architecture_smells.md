# Architecture Smell Scan

Found 38 potential issue(s).

## good-schema-outside-adapter

- File: `src\app\AppShell.tsx:26`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\app\navigationRegistry.tsx:3`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\domain\account\types.ts:3`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\domain\goals\goalState.ts:198`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## hardcoded-material-cost-array

- File: `src\domain\planner\buildFarmingEstimates.ts:157`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `Mora",         materialName: "Mora",       };     case "ley_line_revelation":       return {         estimateKey: "ley_line_revelation|BlossomOfRevelation",    `

## hardcoded-material-cost-array

- File: `src\domain\planner\buildPlannerReport.ts:2`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `WeaponGoal } from "../goals/types"; import {   getGoalCurrentStateLabel,   resolveCharacterGoalCurrentState,   resolveWeaponGoalCurrentState, } from "../goals/g`

## good-schema-outside-adapter

- File: `src\domain\planner\buildPlannerRows.test.ts:1`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## hardcoded-material-cost-array

- File: `src\domain\progression\materialResolvers.ts:9`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `WEAPON_ORE_VALUES = [   {`

## good-schema-outside-adapter

- File: `src\domain\progression\resolveCharacterProgression.test.ts:23`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\domain\progression\resolveWeaponProgression.test.ts:22`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\domain\save\migrations.ts:284`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GoodFormat`

## good-schema-outside-adapter

- File: `src\domain\staticData\loadStaticData.test.ts:186`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\domain\staticData\loadStaticData.ts:2`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\domain\staticData\materialKeyMapping.ts:4`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\features\accounts\AccountSwitcher.tsx:42`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\features\characters\CharactersTab.tsx:449`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## hardcoded-material-cost-array

- File: `src\features\characters\CharactersTab.tsx:22`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `ASCENSION_OPTIONS = [undefined, 0, 1, 2, 3, 4, 5, 6]; const TALENT_OPTIONS = [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];  type OwnershipFilter = "all" | "owned"`

## good-schema-outside-adapter

- File: `src\features\dashboard\DashboardTab.tsx:4`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\features\database\databaseModel.ts:655`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\features\database\DatabaseTab.tsx:2013`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\features\database\DatabaseWorkspaceShell.tsx:182`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\features\goals\GoalsWorkspace.tsx:40`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## hardcoded-material-cost-array

- File: `src\features\goals\GoalsWorkspace.tsx:7`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `WeaponsTab } from "../weapons/WeaponsTab"; import { useMemo, useState } from "react";  type GoalsTabKey = "overview" | "characters" | "weapons" | "artifacts";  `

## good-schema-outside-adapter

- File: `src\features\home\HomeWorkspace.tsx:1`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## hardcoded-material-cost-array

- File: `src\features\home\HomeWorkspace.tsx:20`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `weaponGoals).length + goals.artifactGoals.length;   const totalWarnings = importWarnings.length + overrideWarnings.length + plannerOutput.warnings.length;   con`

## good-schema-outside-adapter

- File: `src\features\inventory\InventoryTab.tsx:294`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## good-schema-outside-adapter

- File: `src\features\inventory\InventoryWorkspace.test.tsx:2`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\features\inventory\InventoryWorkspace.tsx:33`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## hardcoded-material-cost-array

- File: `src\features\inventory\InventoryWorkspace.tsx:17`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `weapons";  interface InventoryWorkspaceProps {   plannerOutput: PlannerOutput; }  export function InventoryWorkspace({ plannerOutput }: InventoryWorkspaceProps)`

## good-schema-outside-adapter

- File: `src\features\planning\PlanningWorkspace.tsx:85`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GOOD`

## hardcoded-material-cost-array

- File: `src\features\planning\PlanningWorkspace.tsx:8`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `WeaponsTab } from "../weapons/WeaponsTab"; import { PlannerAssumptionsPanel } from "./PlannerAssumptionsPanel";  type GoalFilter = "all" | "character" | "weapon`

## good-schema-outside-adapter

- File: `src\features\settings\SettingsDataTab.tsx:2`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\features\settings\SettingsWorkspace.tsx:2`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\features\settings\WarningsWorkspace.tsx:1`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## hardcoded-material-cost-array

- File: `src\features\settings\WarningsWorkspace.tsx:35`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `WeaponReferences.map((row) => ({       key: `weapon-${row.generatedKey}`,       label: `Weapon family reference`,       detail: `${row.weaponName} -> ${row.gene`

## hardcoded-material-cost-array

- File: `src\features\weapons\WeaponsTab.tsx:3`
- Description: Potential hard-coded material cost table outside game-data/core.
- Match: `WeaponGoalCurrentState } from "../../domain/goals/goalState"; import type { GoalPlanningMode } from "../../domain/goals/types"; import type { PlannerOutput } fr`

## good-schema-outside-adapter

- File: `src\store\useAppStore.test.ts:2`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `good`

## good-schema-outside-adapter

- File: `src\store\useAppStore.ts:249`
- Description: GOOD-specific logic should usually live in import/export adapters.
- Match: `GoodFormat`

## Note

These are heuristics, not proof of bugs. Codex should inspect each finding before changing code.
