# Krumpanion Architecture Directive

## One-line architecture rule

UI edits state. Core calculates truth. Planner explains next actions. Storage preserves user data. Adapters translate outside formats.

## Target architecture

```text
src/
  app/
    router/
    providers/
    layout/
  features/
    dashboard/
    characters/
    weapons/
    inventory/
    goals/
    planner/
    crafting/
    artifacts/
    importExport/
    settings/
  core/
    schemas/
    game-data/
    calculations/
    crafting/
    planner/
    validation/
  services/
    storage/
    import-export/
    sync/
  state/
    stores/
    selectors/
    migrations/
  workers/
    calculationWorker.*
    plannerWorker.*
  test/
    fixtures/
    helpers/
```

This is a target shape, not a mandate to rename everything immediately.

Codex should map the existing repository first, then adapt these layers to the current framework.

## Domain boundaries

### Core

Core contains reusable logic and data definitions.

Allowed:
- Types.
- Schemas.
- Cost calculators.
- Crafting graph logic.
- Planner generation logic.
- Pure validation logic.

Avoid:
- React imports.
- DOM APIs.
- localStorage / IndexedDB calls.
- File picker APIs.
- UI components.
- Toast notifications.

### Features

Features contain UI, hooks, and user flows.

Allowed:
- Pages.
- Components.
- UI-specific hooks.
- View models.
- User interaction handling.

Avoid:
- Hard-coded Genshin cost tables.
- Duplicated calculation logic.
- Direct parsing of GOOD or save-file formats.

### Services

Services handle side effects.

Examples:
- Storage.
- Import/export.
- Optional cloud sync.
- File reading.
- Browser APIs.

### State

State stores source-of-truth user data.

Examples:
- Owned characters.
- Owned weapons.
- Inventory counts.
- Goals.
- Settings.
- Save schema version.

Derived values should usually be selectors, not stored state.

## Minimum viable domain model

```ts
type MaterialQuantity = {
  materialId: string;
  quantity: number;
};

type InventoryState = Record<string, number>;

type OwnedCharacter = {
  characterId: string;
  currentLevel: number;
  currentAscension: number;
  currentTalents: {
    normal: number;
    skill: number;
    burst: number;
  };
  constellation?: number;
  enabled?: boolean;
};

type CharacterGoal = {
  id: string;
  characterId: string;
  targetLevel?: number;
  targetAscension?: number;
  targetTalents?: {
    normal?: number;
    skill?: number;
    burst?: number;
  };
  priority: number;
  enabled: boolean;
  notes?: string;
};

type OwnedWeapon = {
  weaponInstanceId: string;
  weaponId: string;
  currentLevel: number;
  currentAscension: number;
  refinement?: number;
  equippedByCharacterId?: string;
};

type WeaponGoal = {
  id: string;
  weaponInstanceId?: string;
  weaponId?: string;
  targetLevel: number;
  targetAscension?: number;
  priority: number;
  enabled: boolean;
  notes?: string;
};

type ArtifactGoal = {
  id: string;
  characterId: string;
  setIds: string[];
  sandsMainStats: string[];
  gobletMainStats: string[];
  circletMainStats: string[];
  desiredSubstats: string[];
  priority: number;
  enabled: boolean;
  notes?: string;
};
```

## Planner output

Planner recommendations are generated from state, not manually created by users.

```ts
type PlannerRecommendation = {
  id: string;
  title: string;
  category:
    | "talent_domain"
    | "weapon_domain"
    | "boss"
    | "weekly_boss"
    | "leyline"
    | "crafting"
    | "forging"
    | "artifact_domain"
    | "custom";
  priority: number;
  date?: string;
  resinCost?: number;
  relatedGoalIds: string[];
  requiredMaterials: MaterialQuantity[];
  expectedRewards?: MaterialQuantity[];
  reason: string;
  blockedBy?: string[];
};
```

## Save-file structure

```ts
type KrumpanionSaveFile = {
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  account: {
    characters: OwnedCharacter[];
    weapons: OwnedWeapon[];
    inventory: InventoryState;
  };
  goals: {
    characters: CharacterGoal[];
    weapons: WeaponGoal[];
    artifacts: ArtifactGoal[];
  };
  settings: UserSettings;
};
```

Even if this exact structure is not used, Codex should preserve these boundaries.
