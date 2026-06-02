import type { KrumpanionGoalState, PlannerSettings } from "../goals/types";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../goals/types";
import type { ImportWarning } from "../good/types";
import type { AccountChecklistState } from "../checklist/types";
import { createDefaultChecklistState } from "../checklist/types";

export type AccountId = string;

export interface OwnedCharacter {
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
}

export interface OwnedWeapon {
  weaponInstanceId: string;
  accountId?: string;
  weaponKey: string;
  weaponId?: string;
  importName?: string;
  importedName?: string | null;
  importSourceId?: string | null;
  currentLevel: number;
  currentAscension: number;
  refinement?: number;
  equippedByCharacterId?: string;
  equippedBy?: string | null;
  location?: string;
  lock?: boolean;
  locked?: boolean;
  lastImportedAt?: string;
}

export interface UnmatchedOwnedWeapon {
  weaponInstanceId: string;
  accountId?: string;
  importName: string;
  importedName?: string | null;
  importSourceId?: string | null;
  currentLevel: number;
  currentAscension: number;
  refinement?: number;
  equippedByCharacterId?: string;
  equippedBy?: string | null;
  location?: string;
  lock?: boolean;
  locked?: boolean;
  lastImportedAt?: string;
}

export interface OwnedArtifact {
  artifactInstanceId: string;
  setId: string;
  slotKey: "flower" | "plume" | "sands" | "goblet" | "circlet";
  level: number;
  rarity: number;
  mainStatKey: string;
  location?: string;
  lock?: boolean;
  substats: Array<{
    key: string;
    value: number;
    initialValue?: number;
  }>;
  astralMark?: boolean;
  elixerCrafted?: boolean;
  totalRolls?: number;
  unactivatedSubstats?: Array<{
    key: string;
    value: number;
    initialValue?: number;
  }>;
}

export type InventoryState = Record<string, number>;
export type AccountInventoryState = InventoryState;
export type ImportedInventoryState = InventoryState;
export type MaterialEditSource = "manual" | "bulk";

export interface MaterialEditMetadata {
  editedAt: string;
  source: MaterialEditSource;
}

export type AccountMaterialEditState = Record<string, MaterialEditMetadata>;

export interface AccountOwnershipState {
  characters: OwnedCharacter[];
  weapons: OwnedWeapon[];
  artifacts: OwnedArtifact[];
}

export type AccountCharacterState = OwnedCharacter;
export type AccountWeaponState = OwnedWeapon;

export interface ImportedAccountState {
  importMeta: {
    format: string;
    version: number;
    source?: string;
    importedAt: string;
  };
  characters: OwnedCharacter[];
  weapons: OwnedWeapon[];
  unmatchedWeapons?: UnmatchedOwnedWeapon[];
  artifacts: OwnedArtifact[];
  inventory: InventoryState;
  warnings: ImportWarning[];
}

export interface AccountMetadata {
  description?: string;
  serverRegion?: "america" | "europe" | "asia" | "tw_hk_mo" | "unknown";
  travelerName?: string;
  uid?: string;
  lastOpenedAt?: string;
  color?: string;
  iconCharacterKey?: string;
}

export interface AccountWorldState {
  adventureRank?: number;
  worldLevel?: number;
  selectedWorldLevel?: number;
  resinCap?: number;
  currentResin?: number;
  currentResinUpdatedAt?: string;
  weeklyBossDiscountsUsed?: number;
  condensedResin?: number;
  fragileResin?: number;
  transientResin?: number;
}

export interface AccountImportState {
  lastGoodImportAt?: string;
  lastGoodFileName?: string;
  lastGoodSource?: "file" | "paste" | "manual" | "unknown";
  lastGoodFormatVersion?: string;
  importWarnings?: string[];
  importSummary?: {
    materialCount?: number;
    characterCount?: number;
    weaponCount?: number;
    unmatchedWeaponCount?: number;
    artifactCount?: number;
  };
}

export type PlannerRecalculationState = "idle" | "recalculating" | "recalculated" | "recalculatedWithWarnings" | "failed";

export interface PlannerRecalculationStatus {
  status: PlannerRecalculationState;
  lastRecalculatedAt?: string;
  activeGoalCount: number;
  materialDeficitCount: number;
  totalEstimatedResin: number;
  warningCount: number;
  lastError?: string;
}

export interface GoalProgressBucketBaseline {
  mora: number;
  characterExp: number;
  weaponExp: number;
  materials: number;
}

export interface GoalProgressTrackingRecord {
  goalId: string;
  goalType: "character" | "weapon";
  goalLabel: string;
  targetSignature: string;
  startedAt: string;
  completedAt?: string;
  baseline: GoalProgressBucketBaseline;
}

export interface GoalMilestoneLogEntry {
  id: string;
  goalId: string;
  goalType: "character" | "weapon";
  goalLabel: string;
  milestoneType: "character_built" | "weapon_goal_met";
  occurredAt: string;
  startedAt?: string;
  targetSummary?: string;
}

export type RecentPlannerChangeTrigger =
  | "good_import"
  | "manual_edit"
  | "bulk_edit"
  | "reset_to_imported"
  | "goal_edit"
  | "goal_reset"
  | "goal_restore"
  | "account_switch"
  | "save_restore"
  | "world_state_change"
  | "planner_settings"
  | "database_update"
  | "inventory_clear";

export type RecentInventorySourceState = "imported" | "manual" | "missing_from_import" | "preview";

interface RecentPlannerChangeBase {
  id: string;
  changedAt: string;
}

export interface RecentInventoryPlannerChange extends RecentPlannerChangeBase {
  kind: "inventory";
  trigger: Extract<RecentPlannerChangeTrigger, "good_import" | "manual_edit" | "bulk_edit" | "reset_to_imported" | "inventory_clear">;
  materialKey: string;
  materialName: string;
  previousQuantity: number;
  nextQuantity: number;
  sourceStateAfter: RecentInventorySourceState;
}

export interface RecentGoalProgressPlannerChange extends RecentPlannerChangeBase {
  kind: "goal_progress";
  trigger: Extract<RecentPlannerChangeTrigger, "good_import" | "goal_edit" | "goal_reset" | "manual_edit" | "bulk_edit" | "reset_to_imported" | "world_state_change" | "planner_settings">;
  goalId: string;
  goalType: "character" | "weapon" | "artifact";
  goalLabel: string;
  previousStatus: "completed" | "craftable" | "blocked" | "in_progress";
  nextStatus: "completed" | "craftable" | "blocked" | "in_progress";
  previousSummary: string;
  nextSummary: string;
  blocker?: string;
}

export interface RecentPlannerRecalculationChange extends RecentPlannerChangeBase {
  kind: "recalculation";
  trigger: RecentPlannerChangeTrigger;
  status: Exclude<PlannerRecalculationState, "idle" | "recalculating">;
  activeGoalCount: number;
  materialDeficitCount: number;
  totalEstimatedResin: number;
  warningCount: number;
  resolvedGoalCount?: number;
  newlyCompletedGoalCount?: number;
  newlyCraftableGoalCount?: number;
  blockedGoalCountDelta?: number;
  resolvedDeficitCount?: number;
  materialDeficitCountDelta?: number;
  estimatedResinDelta?: number;
  estimatedDaysDelta?: number;
  warningCountDelta?: number;
  errorMessage?: string;
}

export type RecentPlannerChange =
  | RecentInventoryPlannerChange
  | RecentGoalProgressPlannerChange
  | RecentPlannerRecalculationChange;

export interface RecentImportEntry {
  id: string;
  importedAt: string;
  fileName?: string;
  source?: AccountImportState["lastGoodSource"];
  materialCount: number;
  characterCount: number;
  weaponCount: number;
  unmatchedWeaponCount: number;
  artifactCount: number;
  warningCount: number;
  changedMaterialCount: number;
  overwrittenManualCount: number;
}

export interface KrumpanionAccount extends AccountOwnershipState {
  id: AccountId;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata: AccountMetadata;
  importMeta: ImportedAccountState["importMeta"];
  inventory: AccountInventoryState;
  importedInventory: ImportedInventoryState;
  unmatchedWeapons: UnmatchedOwnedWeapon[];
  materialEditState: AccountMaterialEditState;
  warnings: ImportWarning[];
  goals: KrumpanionGoalState;
  plannerSettings: PlannerSettings;
  checklist: AccountChecklistState;
  worldState: AccountWorldState;
  importState: AccountImportState;
  plannerStatus: PlannerRecalculationStatus;
  goalProgressTracking: Record<string, GoalProgressTrackingRecord>;
  goalMilestones: GoalMilestoneLogEntry[];
  recentChanges: RecentPlannerChange[];
  recentImports: RecentImportEntry[];
}

export interface ExportedKrumpanionAccount {
  schemaVersion: 1;
  exportedAt: string;
  account: Omit<KrumpanionAccount, "id"> & {
    originalAccountId?: string;
  };
}

export interface MultiAccountUserState {
  schemaVersion: 1;
  activeAccountId: AccountId;
  accountsById: Record<AccountId, KrumpanionAccount>;
  accountOrder: AccountId[];
}

export interface AccountLookups {
  charactersById: Record<string, OwnedCharacter>;
  weaponsById: Record<string, OwnedWeapon>;
  artifactsById: Record<string, OwnedArtifact>;
}

export function buildAccountLookups(account: Pick<AccountOwnershipState, "characters" | "weapons" | "artifacts"> | null): AccountLookups {
  return {
    charactersById: Object.fromEntries((account?.characters ?? []).map((character) => [character.characterId, character])),
    weaponsById: Object.fromEntries((account?.weapons ?? []).map((weapon) => [weapon.weaponInstanceId, weapon])),
    artifactsById: Object.fromEntries((account?.artifacts ?? []).map((artifact) => [artifact.artifactInstanceId, artifact])),
  };
}

export function createDefaultWorldState(): AccountWorldState {
  return {
    worldLevel: DEFAULT_PLANNER_SETTINGS.worldLevel,
    selectedWorldLevel: DEFAULT_PLANNER_SETTINGS.worldLevel,
    resinCap: 200,
    currentResin: DEFAULT_PLANNER_SETTINGS.currentResin,
    weeklyBossDiscountsUsed: DEFAULT_PLANNER_SETTINGS.weeklyBossDiscountClaimsUsed,
    condensedResin: DEFAULT_PLANNER_SETTINGS.condensedResinOwned,
    fragileResin: DEFAULT_PLANNER_SETTINGS.fragileResinOwned,
    transientResin: DEFAULT_PLANNER_SETTINGS.transientResinOwned,
  };
}

export function createBlankImportedAccountState(now = new Date()): ImportedAccountState {
  return {
    importMeta: {
      format: "manual",
      version: 0,
      source: "manual",
      importedAt: now.toISOString(),
    },
    characters: [],
    weapons: [],
    unmatchedWeapons: [],
    artifacts: [],
    inventory: {},
    warnings: [],
  };
}

export function createBlankAccount(
  input: {
    id: AccountId;
    name?: string;
    now?: Date;
    metadata?: Partial<AccountMetadata>;
  },
): KrumpanionAccount {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const importedState = createBlankImportedAccountState(now);
  return {
    ...importedState,
    unmatchedWeapons: importedState.unmatchedWeapons ?? [],
    id: input.id,
    name: input.name?.trim() || "Main Account",
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {
      ...input.metadata,
      lastOpenedAt: timestamp,
    },
    importedInventory: {},
    materialEditState: {},
    goals: structuredClone(DEFAULT_GOAL_STATE),
    plannerSettings: structuredClone(DEFAULT_PLANNER_SETTINGS),
    checklist: createDefaultChecklistState(),
    worldState: createDefaultWorldState(),
    importState: {
      lastGoodSource: "unknown",
      importWarnings: [],
      importSummary: {
        materialCount: 0,
        characterCount: 0,
        weaponCount: 0,
        artifactCount: 0,
      },
    },
    plannerStatus: {
      status: "idle",
      activeGoalCount: 0,
      materialDeficitCount: 0,
      totalEstimatedResin: 0,
      warningCount: 0,
    },
    goalProgressTracking: {},
    goalMilestones: [],
    recentChanges: [],
    recentImports: [],
  };
}

export function createImportedAccountSummary(account: ImportedAccountState): AccountImportState["importSummary"] {
  return {
    materialCount: Object.keys(account.inventory).length,
    characterCount: account.characters.length,
    weaponCount: account.weapons.length,
    unmatchedWeaponCount: account.unmatchedWeapons?.length ?? 0,
    artifactCount: account.artifacts.length,
  };
}

export function buildImportedAccountState(account: KrumpanionAccount): ImportedAccountState {
  return {
    importMeta: account.importMeta,
    characters: account.characters,
    weapons: account.weapons,
    unmatchedWeapons: account.unmatchedWeapons,
    artifacts: account.artifacts,
    inventory: account.importedInventory,
    warnings: account.warnings,
  };
}

export function createDefaultMultiAccountUserState(now = new Date(), name = "Main Account"): MultiAccountUserState {
  const id = crypto.randomUUID();
  const account = createBlankAccount({
    id,
    name,
    now,
  });
  return {
    schemaVersion: 1,
    activeAccountId: id,
    accountsById: {
      [id]: account,
    },
    accountOrder: [id],
  };
}
