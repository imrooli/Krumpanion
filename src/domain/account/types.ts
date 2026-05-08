import type { KrumpanionGoalState, PlannerSettings } from "../goals/types";
import { DEFAULT_GOAL_STATE, DEFAULT_PLANNER_SETTINGS } from "../goals/types";
import type { ImportWarning } from "../good/types";

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
  weaponKey: string;
  weaponId?: string;
  importName?: string;
  currentLevel: number;
  currentAscension: number;
  refinement?: number;
  equippedByCharacterId?: string;
  location?: string;
  lock?: boolean;
}

export interface UnmatchedOwnedWeapon {
  weaponInstanceId: string;
  importName: string;
  currentLevel: number;
  currentAscension: number;
  refinement?: number;
  equippedByCharacterId?: string;
  location?: string;
  lock?: boolean;
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

export interface KrumpanionAccount extends AccountOwnershipState {
  id: AccountId;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata: AccountMetadata;
  importMeta: ImportedAccountState["importMeta"];
  inventory: AccountInventoryState;
  unmatchedWeapons: UnmatchedOwnedWeapon[];
  materialEditState: AccountMaterialEditState;
  warnings: ImportWarning[];
  goals: KrumpanionGoalState;
  plannerSettings: PlannerSettings;
  worldState: AccountWorldState;
  importState: AccountImportState;
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
    materialEditState: {},
    goals: structuredClone(DEFAULT_GOAL_STATE),
    plannerSettings: structuredClone(DEFAULT_PLANNER_SETTINGS),
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
    inventory: account.inventory,
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
