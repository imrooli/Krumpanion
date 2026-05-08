# Data Model

## GOOD import model

Krumpanion should accept GOOD-format JSON inventory exports.

Important observed top-level keys:
- `format`
- `version`
- `source`
- `characters`
- `artifacts`
- `weapons`
- `materials`

## Character record

Observed shape:

```ts
type GoodCharacter = {
  key: string;
  level: number;
  constellation: number;
  ascension: number;
  talent: {
    auto: number;
    skill: number;
    burst: number;
  };
};
```

## Weapon record

Observed shape:

```ts
type GoodWeapon = {
  key: string;
  level: number;
  ascension: number;
  refinement: number;
  location: string;
  lock: boolean;
};
```

## Artifact record

Observed shape:

```ts
type GoodArtifact = {
  setKey: string;
  slotKey: "flower" | "plume" | "sands" | "goblet" | "circlet";
  level: number;
  rarity: number;
  mainStatKey: string;
  location: string;
  lock: boolean;
  substats: Array<{
    key: string;
    value: number;
    initialValue?: number;
  }>;
};
```

Artifact inventory is optional for MVP planning.

## Material map

Observed shape:

```ts
type GoodMaterials = Record<string, number>;
```

## Multi-account user model

Krumpanion persists user-owned progression data under a multi-account container.

```ts
type MultiAccountUserState = {
  schemaVersion: 1;
  activeAccountId: string;
  accountsById: Record<string, KrumpanionAccount>;
  accountOrder: string[];
};
```

Each account owns:

- imported GOOD snapshot data
- material inventory quantities
- material edit metadata (`editedAt` plus `manual` vs `bulk` source)
- owned characters / weapons / artifacts
- goals
- planner settings
- world state
- import metadata

Static data remains global:

- static game database
- generated runtime data
- static-data health report
- override packs
- global UI settings such as `activeTab` and `plannerView`

Any new user-owned or goal/progression data must be account-scoped by default. Any static game database data must remain global.

### Inventory editing model

Krumpanion currently uses a direct-replace inventory model:

- `account.inventory` is the single planner-facing quantity map
- direct edits write into `account.inventory` immediately
- bulk paste writes into the same map in one batch
- `materialEditState` stores UI-only metadata for manual vs bulk edits
- there is no imported-baseline shadow inventory in this schema

When a GOOD re-import replaces inventory for an account, the replaced snapshot clears any manual edit metadata tied to that inventory state. Older saves migrate safely by defaulting `materialEditState` to an empty object.

## Krumpanion goal state

Persist this separately from GOOD inventory.

```ts
type KrumpanionGoals = {
  version: 1;
  profileName?: string;
  characterGoals: Record<string, CharacterGoal>;
  weaponGoals: Record<string, WeaponGoal>;
  artifactGoals: ArtifactGoal[];
  plannerSettings: PlannerSettings;
};
```

At runtime, the active account stores `goals` and `plannerSettings` separately, then selectors expose a planner-facing combined `KrumpanionGoals` view for compatibility with the calculation pipeline.

## Character goal

```ts
type CharacterGoal = {
  characterKey: string;
  planningMode?: "owned" | "prefarm" | "manual";
  priority: number;
  targetLevel?: number;
  targetAscension?: number;
  talents?: {
    auto?: number;
    skill?: number;
    burst?: number;
  };
  currentOverride?: {
    level?: number;
    ascension?: number;
    talents?: {
      auto?: number;
      skill?: number;
      burst?: number;
    };
  };
  enabled: boolean;
  notes?: string;
};
```

## Weapon goal

```ts
type WeaponGoal = {
  id: string;
  weaponKey: string;
  planningMode?: "owned" | "prefarm" | "manual";
  ownedWeaponInstanceId?: string;
  location?: string;
  priority: number;
  targetLevel?: number;
  targetAscension?: number;
  currentOverride?: {
    level?: number;
    ascension?: number;
  };
  enabled: boolean;
  notes?: string;
};
```

## Bulk inventory paste model

Krumpanion accepts these row formats:

- `material name, quantity`
- `material key, quantity`
- `material name<TAB>quantity`
- `material key<TAB>quantity`

Resolution rules:

- canonical key match first
- exact display-name match second
- alias resolution through the material registry last

Unknown names, invalid quantities, and malformed rows are reported in preview rather than silently creating new materials. Duplicate rows for the same canonical material merge by summing quantities, and the preview shows the contributing row numbers and final resolved quantity before apply.

## Artifact goal

```ts
type ArtifactGoal = {
  id: string;
  characterKey?: string;
  domainKey: string;
  targetSetKeys: string[];
  priority: number;
  weeklyResinBudget?: number;
  desiredMainStats?: Partial<Record<ArtifactSlotKey, string[]>>;
  desiredSubstats?: string[];
  enabled: boolean;
  notes?: string;
};
```

## Backup / import model

- Full backup: exports the whole save file, including all accounts and global settings.
- Single account export: exports one account payload with regenerated account id on import and collision-safe name suffixing.
- Legacy single-account save files migrate into one default `Main Account` during load/import.
