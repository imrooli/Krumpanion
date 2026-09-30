import { availabilityDays } from "../../utils/days";
import type { AvailabilityGroupKey } from "../planner/types";
import type {
  ArtifactDomainRecord,
  CharacterCatalogEntry,
  CharacterElement,
  CharacterMaterialProfile,
  CharacterWeaponType,
  DomainOfForgeryRecord,
  DomainOfMasteryRecord,
  EliteEnemyDropFamily,
  GeneralEnemyDropFamily,
  LocalSpecialtyMaterial,
  LocalSpecialtyRegion,
  MaterialDescriptor,
  MaterialRecord,
  MaterialRecordCategory,
  MaterialSourceRecord,
  MaterialSourceType,
  OverrideDataPack,
  StaticGameData,
  TalentBookFamily,
  TieredMaterialFamilyIndexEntry,
  TrounceDomainRecord,
  WeaponAscensionFamily,
  WeaponAscensionMaterialFamilyRecord,
  WeaponCatalogEntry,
  WeaponMaterialProfile,
  WeaponRefinementPolicy,
  WeaponRarity,
  WeaponAcquisitionType,
  WeeklyBossMaterial,
  NormalBossMaterial,
} from "./types";
import type { CraftingRecipe } from "../crafting/types";

export type DatabaseCanonicalStatus =
  | "verified"
  | "unresolved"
  | "beta"
  | "special_case"
  | "ignored"
  | "deprecated";

export type DatabaseCanonicalReleaseState =
  | "live"
  | "beta"
  | "unreleased"
  | "special_case"
  | "ignored"
  | "deprecated";

export interface WeeklyBossGroupDraft {
  sourceKey: string;
  bossKey: string;
  bossName: string;
  domainName: string;
  status: DatabaseCanonicalStatus;
  notes: string[];
  drops: [
    { key: string; displayName: string },
    { key: string; displayName: string },
    { key: string; displayName: string },
  ];
}

export interface TalentBookFamilyDraft {
  key: string;
  teachingsKey: string;
  teachingsName: string;
  guideKey: string;
  guideName: string;
  philosophiesKey: string;
  philosophiesName: string;
  domainKey: string;
  domainName: string;
  availability: AvailabilityGroupKey;
  region: string;
  status: DatabaseCanonicalStatus;
  notes: string[];
}

export interface WeaponAscensionFamilyDraft {
  key: string;
  displayName: string;
  twoStarKey: string;
  twoStarName: string;
  threeStarKey: string;
  threeStarName: string;
  fourStarKey: string;
  fourStarName: string;
  fiveStarKey: string;
  fiveStarName: string;
  domainKey: string;
  domainName: string;
  availability: AvailabilityGroupKey;
  region: string;
  status: DatabaseCanonicalStatus;
  notes: string[];
}

export interface CommonEnemyDropFamilyDraft {
  familyId: string;
  displayName: string;
  sourceEnemyFamily: string;
  lowKey: string;
  lowName: string;
  midKey: string;
  midName: string;
  highKey: string;
  highName: string;
  status: DatabaseCanonicalStatus;
  notes: string[];
}

export interface NormalBossMaterialDraft {
  key: string;
  displayName: string;
  bossKey: string;
  bossDisplayName: string;
  status: DatabaseCanonicalStatus;
  notes: string[];
}

export interface LocalSpecialtyDraft {
  key: string;
  displayName: string;
  region: LocalSpecialtyRegion;
  isPurchasable: boolean;
  purchaseVendors: string[];
  searchHint: string;
  notes: string[];
}

export interface StandaloneMaterialDraft {
  key: string;
  displayName: string;
  category: MaterialDescriptor["category"];
  recordCategory: MaterialRecordCategory;
  status: DatabaseCanonicalStatus;
  usedFor: string[];
  craftable: boolean;
  conversionRatio?: number;
  sourceType: MaterialSourceType;
  sourceKey: string;
  sourceName: string;
  availability: AvailabilityGroupKey;
  region?: string;
  notes: string[];
}

export interface CharacterMaterialAssignmentDraft {
  characterKey: string;
  displayName: string;
  element?: CharacterElement;
  weaponType?: CharacterWeaponType;
  rarity?: 4 | 5;
  region?: string;
  releaseState: DatabaseCanonicalReleaseState;
  status: DatabaseCanonicalStatus;
  plannerEligible: boolean;
  aliases: string[];
  notes: string[];
  sourceRefs: string[];
  gemFamilyKey: string;
  normalBossMaterialKey: string;
  commonEnemyDropFamilyKey: string;
  localSpecialtyKey: string;
  talentBookFamilyKey: string;
  weeklyBossMaterialKey: string;
}

export interface WeaponProfileDraft {
  weaponKey: string;
  displayName: string;
  weaponType?: CharacterWeaponType;
  rarity: WeaponRarity;
  acquisitionType?: WeaponAcquisitionType;
  refinementTrackable?: boolean;
  refinementPolicy?: WeaponRefinementPolicy;
  limited?: boolean;
  eventExclusive?: boolean;
  weaponAscensionMaterialFamilyKey: string;
  eliteEnemyDropFamilyKey: string;
  commonEnemyDropFamilyKey: string;
  releaseState: DatabaseCanonicalReleaseState;
  status: DatabaseCanonicalStatus;
  plannerEligible: boolean;
  aliases: string[];
  notes: string[];
}

export type ArtifactDomainDraft = ArtifactDomainRecord;

export interface SourceDomainDraft {
  domainKey: string;
  domainType: "forgery" | "mastery" | "trounce";
  name: string;
  region: string;
  location: string;
  availability?: AvailabilityGroupKey;
  linkedFamilyKeys: string[];
  listedRewards: string[];
  elements: string[];
  notes: string[];
}

export type PatchManifestRecordKind =
  | "weeklyBossGroup"
  | "talentBookFamily"
  | "weaponAscensionFamily"
  | "commonEnemyDropFamily"
  | "normalBossMaterial"
  | "localSpecialty"
  | "standaloneMaterial"
  | "characterAssignment"
  | "weaponProfile"
  | "artifactDomain"
  | "sourceDomain";

export interface PatchManifestRecordMetadata {
  id: string;
  kind: PatchManifestRecordKind;
  mode: "new" | "modify";
  sourceCanonicalKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseChangeSet {
  automaticData?: Pick<OverrideDataPack, "characters" | "weapons" | "materials" | "artifactSets" | "exactCharacterRequirements" | "exactWeaponRequirements">;
  version: 1;
  label: string;
  releaseTag: string;
  notes: string;
  recordMetadata?: Record<string, PatchManifestRecordMetadata>;
  weeklyBossGroups: Record<string, WeeklyBossGroupDraft>;
  talentBookFamilies: Record<string, TalentBookFamilyDraft>;
  weaponAscensionFamilies: Record<string, WeaponAscensionFamilyDraft>;
  commonEnemyDropFamilies: Record<string, CommonEnemyDropFamilyDraft>;
  normalBossMaterials: Record<string, NormalBossMaterialDraft>;
  localSpecialties: Record<string, LocalSpecialtyDraft>;
  standaloneMaterials: Record<string, StandaloneMaterialDraft>;
  characters: Record<string, CharacterMaterialAssignmentDraft>;
  weapons: Record<string, WeaponProfileDraft>;
  artifactDomains: Record<string, ArtifactDomainDraft>;
  sourceDomains: Record<string, SourceDomainDraft>;
}

export interface ChangeSetValidationIssue {
  id: string;
  severity: "error" | "warning" | "info";
  scope: "change_set" | "preview";
  entityType: string;
  entityKey: string;
  message: string;
}

export interface CanonicalExportFile {
  path: string;
  description: string;
  recordCount: number;
  payload: Record<string, unknown>;
  json: string;
}

export interface ChangeSetExportBundle {
  files: CanonicalExportFile[];
  overridePack: OverrideDataPack;
}

export function createEmptyDatabaseChangeSet(): DatabaseChangeSet {
  return {
    version: 1,
    label: "Patch Update Draft",
    releaseTag: "",
    notes: "",
    recordMetadata: {},
    weeklyBossGroups: {},
    talentBookFamilies: {},
    weaponAscensionFamilies: {},
    commonEnemyDropFamilies: {},
    normalBossMaterials: {},
    localSpecialties: {},
    standaloneMaterials: {},
    characters: {},
    weapons: {},
    artifactDomains: {},
    sourceDomains: {},
  };
}

export function countChangeSetEntries(changeSet: DatabaseChangeSet): number {
  return (
    Object.keys(changeSet.weeklyBossGroups).length +
    Object.keys(changeSet.talentBookFamilies).length +
    Object.keys(changeSet.weaponAscensionFamilies).length +
    Object.keys(changeSet.commonEnemyDropFamilies).length +
    Object.keys(changeSet.normalBossMaterials).length +
    Object.keys(changeSet.localSpecialties).length +
    Object.keys(changeSet.standaloneMaterials).length +
    Object.keys(changeSet.characters).length +
    Object.keys(changeSet.weapons).length +
    Object.keys(changeSet.artifactDomains).length +
    Object.keys(changeSet.sourceDomains).length
  );
}

export function getPatchManifestRecordMetadataKey(kind: PatchManifestRecordKind, key: string): string {
  return `${kind}:${key}`;
}

function createPatchManifestMetadata(
  kind: PatchManifestRecordKind,
  key: string,
  mode: PatchManifestRecordMetadata["mode"],
  sourceCanonicalKey?: string,
): PatchManifestRecordMetadata {
  const now = new Date().toISOString();
  return {
    id: getPatchManifestRecordMetadataKey(kind, key),
    kind,
    mode,
    sourceCanonicalKey,
    createdAt: now,
    updatedAt: now,
  };
}

function withPatchManifestMetadata(
  changeSet: DatabaseChangeSet,
  kind: PatchManifestRecordKind,
  key: string,
  mode: PatchManifestRecordMetadata["mode"],
  sourceCanonicalKey?: string,
): DatabaseChangeSet {
  const metadataKey = getPatchManifestRecordMetadataKey(kind, key);
  return {
    ...changeSet,
    recordMetadata: {
      ...(changeSet.recordMetadata ?? {}),
      [metadataKey]: {
        ...(changeSet.recordMetadata?.[metadataKey] ?? createPatchManifestMetadata(kind, key, mode, sourceCanonicalKey)),
        id: metadataKey,
        kind,
        mode,
        sourceCanonicalKey,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

function upsertPatchManifestDraft(
  changeSet: DatabaseChangeSet,
  kind: PatchManifestRecordKind,
  key: string,
  draft: unknown,
): DatabaseChangeSet {
  switch (kind) {
    case "weeklyBossGroup":
      return { ...changeSet, weeklyBossGroups: { ...changeSet.weeklyBossGroups, [key]: draft as WeeklyBossGroupDraft } };
    case "talentBookFamily":
      return { ...changeSet, talentBookFamilies: { ...changeSet.talentBookFamilies, [key]: draft as TalentBookFamilyDraft } };
    case "weaponAscensionFamily":
      return { ...changeSet, weaponAscensionFamilies: { ...changeSet.weaponAscensionFamilies, [key]: draft as WeaponAscensionFamilyDraft } };
    case "commonEnemyDropFamily":
      return { ...changeSet, commonEnemyDropFamilies: { ...changeSet.commonEnemyDropFamilies, [key]: draft as CommonEnemyDropFamilyDraft } };
    case "normalBossMaterial":
      return { ...changeSet, normalBossMaterials: { ...changeSet.normalBossMaterials, [key]: draft as NormalBossMaterialDraft } };
    case "localSpecialty":
      return { ...changeSet, localSpecialties: { ...changeSet.localSpecialties, [key]: draft as LocalSpecialtyDraft } };
    case "standaloneMaterial":
      return { ...changeSet, standaloneMaterials: { ...changeSet.standaloneMaterials, [key]: draft as StandaloneMaterialDraft } };
    case "characterAssignment":
      return { ...changeSet, characters: { ...changeSet.characters, [key]: draft as CharacterMaterialAssignmentDraft } };
    case "weaponProfile":
      return { ...changeSet, weapons: { ...changeSet.weapons, [key]: draft as WeaponProfileDraft } };
    case "artifactDomain":
      return { ...changeSet, artifactDomains: { ...changeSet.artifactDomains, [key]: draft as ArtifactDomainDraft } };
    case "sourceDomain":
      return { ...changeSet, sourceDomains: { ...changeSet.sourceDomains, [key]: draft as SourceDomainDraft } };
  }
}

function getPatchManifestDraft(
  changeSet: DatabaseChangeSet,
  kind: PatchManifestRecordKind,
  key: string,
): unknown {
  switch (kind) {
    case "weeklyBossGroup":
      return changeSet.weeklyBossGroups[key];
    case "talentBookFamily":
      return changeSet.talentBookFamilies[key];
    case "weaponAscensionFamily":
      return changeSet.weaponAscensionFamilies[key];
    case "commonEnemyDropFamily":
      return changeSet.commonEnemyDropFamilies[key];
    case "normalBossMaterial":
      return changeSet.normalBossMaterials[key];
    case "localSpecialty":
      return changeSet.localSpecialties[key];
    case "standaloneMaterial":
      return changeSet.standaloneMaterials[key];
    case "characterAssignment":
      return changeSet.characters[key];
    case "weaponProfile":
      return changeSet.weapons[key];
    case "artifactDomain":
      return changeSet.artifactDomains[key];
    case "sourceDomain":
      return changeSet.sourceDomains[key];
  }
}

function withoutPatchManifestDraft(
  changeSet: DatabaseChangeSet,
  kind: PatchManifestRecordKind,
  key: string,
): DatabaseChangeSet {
  const omit = <T>(records: Record<string, T>) => {
    const next = { ...records };
    delete next[key];
    return next;
  };
  switch (kind) {
    case "weeklyBossGroup":
      return { ...changeSet, weeklyBossGroups: omit(changeSet.weeklyBossGroups) };
    case "talentBookFamily":
      return { ...changeSet, talentBookFamilies: omit(changeSet.talentBookFamilies) };
    case "weaponAscensionFamily":
      return { ...changeSet, weaponAscensionFamilies: omit(changeSet.weaponAscensionFamilies) };
    case "commonEnemyDropFamily":
      return { ...changeSet, commonEnemyDropFamilies: omit(changeSet.commonEnemyDropFamilies) };
    case "normalBossMaterial":
      return { ...changeSet, normalBossMaterials: omit(changeSet.normalBossMaterials) };
    case "localSpecialty":
      return { ...changeSet, localSpecialties: omit(changeSet.localSpecialties) };
    case "standaloneMaterial":
      return { ...changeSet, standaloneMaterials: omit(changeSet.standaloneMaterials) };
    case "characterAssignment":
      return { ...changeSet, characters: omit(changeSet.characters) };
    case "weaponProfile":
      return { ...changeSet, weapons: omit(changeSet.weapons) };
    case "artifactDomain":
      return { ...changeSet, artifactDomains: omit(changeSet.artifactDomains) };
    case "sourceDomain":
      return { ...changeSet, sourceDomains: omit(changeSet.sourceDomains) };
  }
}

function renameDraftInternalKey(kind: PatchManifestRecordKind, draft: unknown, newKey: string): unknown {
  switch (kind) {
    case "weeklyBossGroup":
      return { ...(draft as WeeklyBossGroupDraft), sourceKey: newKey };
    case "talentBookFamily":
      return { ...(draft as TalentBookFamilyDraft), key: newKey };
    case "weaponAscensionFamily":
      return { ...(draft as WeaponAscensionFamilyDraft), key: newKey };
    case "commonEnemyDropFamily":
      return { ...(draft as CommonEnemyDropFamilyDraft), familyId: newKey };
    case "normalBossMaterial":
      return { ...(draft as NormalBossMaterialDraft), key: newKey };
    case "localSpecialty":
      return { ...(draft as LocalSpecialtyDraft), key: newKey };
    case "standaloneMaterial":
      return { ...(draft as StandaloneMaterialDraft), key: newKey };
    case "characterAssignment":
      return { ...(draft as CharacterMaterialAssignmentDraft), characterKey: newKey };
    case "weaponProfile":
      return { ...(draft as WeaponProfileDraft), weaponKey: newKey };
    case "artifactDomain":
      return { ...(draft as ArtifactDomainDraft), setKey: newKey };
    case "sourceDomain":
      return { ...(draft as SourceDomainDraft), domainKey: newKey };
  }
}

function toCharacterMaterialStatus(status: DatabaseCanonicalStatus): CharacterMaterialProfile["status"] {
  if (status === "verified" || status === "beta" || status === "unresolved") {
    return status;
  }
  return "needs_manual_review";
}

function toMaterialFamilyStatus(status: DatabaseCanonicalStatus): WeaponAscensionMaterialFamilyRecord["status"] {
  return status === "verified" ? "verified" : "needs_manual_review";
}

function toMaterialRecordStatus(status: DatabaseCanonicalStatus): MaterialRecord["status"] {
  if (status === "verified" || status === "beta" || status === "unresolved") {
    return status;
  }
  return "needs_manual_review";
}

function buildStandaloneCanonicalSource(draft: StandaloneMaterialDraft): MaterialRecord["source"] {
  switch (draft.sourceType) {
    case "weekly_boss":
      return { type: "weekly_boss", bossKey: draft.sourceKey, bossName: draft.sourceName, domainName: draft.sourceName };
    case "domain_of_mastery":
      return { type: "domain_of_mastery", region: draft.region ?? "Fontaine", domainName: draft.sourceName, availableDays: [] };
    case "domain_of_forgery":
      return { type: "domain_of_forgery", region: draft.region ?? null, domainName: draft.sourceName, availableDays: [], sourceHint: draft.sourceName };
    case "normal_boss":
      return { type: "normal_boss", bossKey: draft.sourceKey, bossName: draft.sourceName };
    case "local_specialty":
      return {
        type: "local_specialty",
        region: (draft.region as LocalSpecialtyRegion | undefined) ?? "Fontaine",
        purchaseVendors: [],
        searchHint: draft.sourceName,
      };
    case "enemy_drop":
      return { type: "enemy_drop", enemyFamily: draft.sourceName || draft.sourceKey };
    case "weapon_exp_material":
      return { type: "weapon_exp_material", sourceHint: draft.sourceName };
    case "weapon_fodder":
      return { type: "weapon_fodder", sourceHint: draft.sourceName };
    case "forging":
      return { type: "forging", sourceHint: draft.sourceName, inputMaterialKeys: [] };
    default:
      return { type: "special", sourceHint: draft.sourceName || draft.sourceKey };
  }
}

function addMaterialDescriptor(
  target: NonNullable<OverrideDataPack["materials"]>,
  materialKey: string,
  displayName: string,
  category: MaterialDescriptor["category"],
): void {
  target[materialKey] = {
    key: materialKey,
    displayName,
    category,
  };
}

function addMaterialRecord(
  target: NonNullable<OverrideDataPack["materialRecords"]>,
  materialKey: string,
  displayName: string,
  category: MaterialRecordCategory,
  runtimeCategory: MaterialDescriptor["category"],
  sourceKey: string,
  source: MaterialRecord["source"],
  status: MaterialRecord["status"],
  usedFor: MaterialRecord["usedFor"],
  options: {
    familyKey?: string;
    tier?: number | string;
    rarity?: MaterialRecord["rarity"];
    craftable?: boolean;
    conversionRatio?: number;
    notes?: string[];
  } = {},
): void {
  const record: MaterialRecord & {
    sourceKeys?: string[];
    tier?: number | string;
    legacyCategory?: MaterialDescriptor["category"];
  } = {
    key: materialKey,
    displayName,
    category,
    source,
    sourceKeys: [sourceKey],
    status,
    usedFor,
    craftable: options.craftable ?? false,
    notes: options.notes ?? [],
    legacyCategory: runtimeCategory,
  };
  if (options.familyKey) {
    record.familyKey = options.familyKey;
  }
  if (options.rarity) {
    record.rarity = options.rarity;
  }
  if (options.conversionRatio !== undefined) {
    record.conversionRatio = options.conversionRatio;
  }
  if (options.tier !== undefined) {
    record.tier = options.tier;
  }
  target[materialKey] = record;
}

function createTierIndexEntries(
  familyKey: string,
  familyType: TieredMaterialFamilyIndexEntry["familyType"],
  tierKeys: string[],
): Record<string, TieredMaterialFamilyIndexEntry> {
  return Object.fromEntries(
    tierKeys.map((materialKey, tierIndex) => [
      materialKey,
      {
        materialKey,
        familyKey,
        familyType,
        tierIndex,
        maxTierIndex: tierKeys.length - 1,
        tierKeys,
      },
    ]),
  );
}

function createTierUpgradeRecipes(options: {
  familyKey: string;
  category: CraftingRecipe["category"];
  tierKeys: string[];
  tierNames: string[];
  moraCost: number;
  eligibleCraftingBonusTypes: NonNullable<CraftingRecipe["eligibleCraftingBonusTypes"]>;
}): Record<string, CraftingRecipe> {
  const recipes: Record<string, CraftingRecipe> = {};
  for (let index = 1; index < options.tierKeys.length; index += 1) {
    const inputKey = options.tierKeys[index - 1];
    const outputKey = options.tierKeys[index];
    recipes[outputKey] = {
      outputKey,
      outputMaterialKey: outputKey,
      outputName: options.tierNames[index] || outputKey,
      outputQuantity: 1,
      category: options.category,
      inputMaterials: [
        {
          materialKey: inputKey,
          materialName: options.tierNames[index - 1] || inputKey,
          quantity: 3,
        },
      ],
      ingredients: {
        [inputKey]: 3,
      },
      moraCost: options.moraCost,
      craftingMethod: "alchemy",
      isTierUpgrade: true,
      eligibleCraftingBonusTypes: options.eligibleCraftingBonusTypes,
      familyKey: options.familyKey,
      tierIndex: index,
    };
  }
  return recipes;
}

function createTalentBookMaterialSource(
  materialKey: string,
  family: TalentBookFamilyDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: "domain_of_mastery",
      sourceKey: family.domainKey || family.key,
      sourceName: family.domainName || family.key,
      availability: family.availability,
      region: family.region,
    },
  ];
}

function createWeaponAscensionMaterialSource(
  materialKey: string,
  family: WeaponAscensionFamilyDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: "domain_of_forgery",
      sourceKey: family.domainKey || family.key,
      sourceName: family.domainName || family.key,
      availability: family.availability,
      region: family.region,
    },
  ];
}

function createEnemyDropMaterialSource(
  materialKey: string,
  family: CommonEnemyDropFamilyDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: "enemy_drop",
      sourceKey: family.familyId,
      sourceName: family.displayName,
      availability: "ALWAYS",
      notes: family.sourceEnemyFamily,
    },
  ];
}

function createNormalBossMaterialSource(
  materialKey: string,
  draft: NormalBossMaterialDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: "normal_boss",
      sourceKey: draft.bossKey,
      sourceName: draft.bossDisplayName,
      availability: "ALWAYS",
      resinCost: 40,
    },
  ];
}

function createWeeklyBossMaterialSource(
  materialKey: string,
  group: WeeklyBossGroupDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: "weekly_boss",
      sourceKey: group.sourceKey || group.bossKey,
      sourceName: group.domainName || group.bossName,
      availability: "WEEKLY",
      notes: group.bossName,
    },
  ];
}

function createLocalSpecialtyMaterialSource(
  materialKey: string,
  draft: LocalSpecialtyDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: "local_specialty",
      sourceKey: draft.key,
      sourceName: draft.displayName,
      availability: "ALWAYS",
      region: draft.region,
      notes: draft.searchHint,
    },
  ];
}

function createStandaloneMaterialSource(
  materialKey: string,
  draft: StandaloneMaterialDraft,
): MaterialSourceRecord[] {
  return [
    {
      materialKey,
      sourceType: draft.sourceType,
      sourceKey: draft.sourceKey,
      sourceName: draft.sourceName,
      availability: draft.availability,
      region: draft.region,
      notes: draft.notes.join(" | ") || undefined,
    },
  ];
}

export function mergeOverridePacks(
  basePack: OverrideDataPack | null | undefined,
  patchPack: OverrideDataPack | null | undefined,
): OverrideDataPack | null {
  if (!basePack && !patchPack) {
    return null;
  }

  const base = basePack ?? { version: 1 };
  const patch = patchPack ?? { version: 1 };

  return {
    ...base,
    ...patch,
    artifactSets: { ...base.artifactSets, ...patch.artifactSets },
    exactCharacterRequirements: { ...base.exactCharacterRequirements, ...patch.exactCharacterRequirements },
    exactWeaponRequirements: { ...base.exactWeaponRequirements, ...patch.exactWeaponRequirements },
    version: 1,
    label: patch.label ?? base.label,
    farmingRelationships: { ...base.farmingRelationships, ...patch.farmingRelationships },
    farmingOrigins: { ...base.farmingOrigins, ...patch.farmingOrigins },
    farmingConflicts: { ...base.farmingConflicts, ...patch.farmingConflicts },
    farmingDrafts: { ...base.farmingDrafts, ...patch.farmingDrafts },
    characters: { ...(base.characters ?? {}), ...(patch.characters ?? {}) },
    materials: { ...(base.materials ?? {}), ...(patch.materials ?? {}) },
    materialRecords: { ...(base.materialRecords ?? {}), ...(patch.materialRecords ?? {}) },
    characterMaterialProfiles: { ...(base.characterMaterialProfiles ?? {}), ...(patch.characterMaterialProfiles ?? {}) },
    weeklyBossMaterials: { ...(base.weeklyBossMaterials ?? {}), ...(patch.weeklyBossMaterials ?? {}) },
    talentBookFamilies: { ...(base.talentBookFamilies ?? {}), ...(patch.talentBookFamilies ?? {}) },
    weaponAscensionFamilies: { ...(base.weaponAscensionFamilies ?? {}), ...(patch.weaponAscensionFamilies ?? {}) },
    weaponAscensionMaterialFamilies: {
      ...(base.weaponAscensionMaterialFamilies ?? {}),
      ...(patch.weaponAscensionMaterialFamilies ?? {}),
    },
    generalEnemyDropFamilies: { ...(base.generalEnemyDropFamilies ?? {}), ...(patch.generalEnemyDropFamilies ?? {}) },
    eliteEnemyDropFamilies: { ...(base.eliteEnemyDropFamilies ?? {}), ...(patch.eliteEnemyDropFamilies ?? {}) },
    enemyDropFamilies: { ...(base.enemyDropFamilies ?? {}), ...(patch.enemyDropFamilies ?? {}) },
    normalBossMaterials: { ...(base.normalBossMaterials ?? {}), ...(patch.normalBossMaterials ?? {}) },
    localSpecialties: { ...(base.localSpecialties ?? {}), ...(patch.localSpecialties ?? {}) },
    materialSources: { ...(base.materialSources ?? {}), ...(patch.materialSources ?? {}) },
    weapons: { ...(base.weapons ?? {}), ...(patch.weapons ?? {}) },
    weaponMaterialProfiles: { ...(base.weaponMaterialProfiles ?? {}), ...(patch.weaponMaterialProfiles ?? {}) },
    tieredMaterialIndex: { ...(base.tieredMaterialIndex ?? {}), ...(patch.tieredMaterialIndex ?? {}) },
    recipes: { ...(base.recipes ?? {}), ...(patch.recipes ?? {}) },
    craftingRecipes: { ...(base.craftingRecipes ?? {}), ...(patch.craftingRecipes ?? {}) },
    artifactDomains: { ...(base.artifactDomains ?? {}), ...(patch.artifactDomains ?? {}) },
    domainsOfForgery: { ...(base.domainsOfForgery ?? {}), ...(patch.domainsOfForgery ?? {}) },
    domainsOfMastery: { ...(base.domainsOfMastery ?? {}), ...(patch.domainsOfMastery ?? {}) },
    trounceDomains: { ...(base.trounceDomains ?? {}), ...(patch.trounceDomains ?? {}) },
  };
}

export function compileChangeSetToOverridePack(changeSet: DatabaseChangeSet): OverrideDataPack {
  if (changeSet.automaticData) {
    const { automaticData, ...manual } = changeSet;
    return mergeOverridePacks(compileChangeSetToOverridePack(manual), { version: 1, ...automaticData })!;
  }
  const overridePack: OverrideDataPack = {
    version: 1,
    label: changeSet.label || "Database Change Set Preview",
    characters: {},
    weapons: {},
    materials: {},
    materialRecords: {},
    characterMaterialProfiles: {},
    weaponMaterialProfiles: {},
    weeklyBossMaterials: {},
    talentBookFamilies: {},
    weaponAscensionFamilies: {},
    weaponAscensionMaterialFamilies: {},
    generalEnemyDropFamilies: {},
    eliteEnemyDropFamilies: {},
    enemyDropFamilies: {},
    normalBossMaterials: {},
    localSpecialties: {},
    materialSources: {},
    tieredMaterialIndex: {},
    recipes: {},
    craftingRecipes: {},
    artifactDomains: {},
    domainsOfForgery: {},
    domainsOfMastery: {},
    trounceDomains: {},
  };

  for (const group of Object.values(changeSet.weeklyBossGroups)) {
    for (const drop of group.drops) {
      const source = {
        type: "weekly_boss" as const,
        bossKey: group.bossKey,
        bossName: group.bossName,
        domainName: group.domainName,
      };
      overridePack.weeklyBossMaterials![drop.key] = {
        key: drop.key,
        displayName: drop.displayName,
        category: "weekly_boss_material",
        source,
        usedFor: ["talent_leveling"],
        craftable: false,
        status: group.status === "special_case" ? "verified" : group.status,
        notes: group.notes,
      } as WeeklyBossMaterial;
      addMaterialDescriptor(overridePack.materials!, drop.key, drop.displayName, "weekly_boss");
      addMaterialRecord(
        overridePack.materialRecords!,
        drop.key,
        drop.displayName,
        "weekly_boss_material",
        "weekly_boss",
        group.sourceKey || group.bossKey,
        source,
        toMaterialRecordStatus(group.status),
        ["talent_leveling"],
        { notes: group.notes },
      );
      overridePack.materialSources![drop.key] = createWeeklyBossMaterialSource(drop.key, group);
    }
  }

  for (const family of Object.values(changeSet.talentBookFamilies)) {
    overridePack.talentBookFamilies![family.key] = {
      key: family.key,
      teachings: family.teachingsKey,
      guide: family.guideKey,
      philosophies: family.philosophiesKey,
      domainKey: family.domainKey,
      domainName: family.domainName,
      availability: family.availability,
      region: family.region,
    } satisfies TalentBookFamily;
    const source = {
      type: "domain_of_mastery" as const,
      region: family.region,
      domainName: family.domainName,
      availableDays: availabilityDays(family.availability),
    };
    const materials = [
      { key: family.teachingsKey, displayName: family.teachingsName, tier: 0 },
      { key: family.guideKey, displayName: family.guideName, tier: 1 },
      { key: family.philosophiesKey, displayName: family.philosophiesName, tier: 2 },
    ];
    Object.assign(
      overridePack.tieredMaterialIndex!,
      createTierIndexEntries(family.key, "talent_book_family", materials.map((material) => material.key)),
    );
    const recipes = createTierUpgradeRecipes({
      familyKey: family.key,
      category: "talent_level_up_material",
      tierKeys: materials.map((material) => material.key),
      tierNames: materials.map((material) => material.displayName),
      moraCost: 175,
      eligibleCraftingBonusTypes: [
        "double_product_character_talent_material",
        "refund_character_talent_material",
        "regional_extra_character_talent_material",
      ],
    });
    Object.assign(overridePack.recipes!, recipes);
    Object.assign(overridePack.craftingRecipes!, recipes);
    for (const material of materials) {
      addMaterialDescriptor(overridePack.materials!, material.key, material.displayName, "talent_book");
      addMaterialRecord(
        overridePack.materialRecords!,
        material.key,
        material.displayName,
        "character_talent_material",
        "talent_book",
        family.domainKey || family.key,
        source,
        toMaterialRecordStatus(family.status),
        ["talent_leveling"],
        {
          familyKey: family.key,
          tier: material.tier,
          craftable: true,
          conversionRatio: 3,
          notes: family.notes,
        },
      );
      overridePack.materialSources![material.key] = createTalentBookMaterialSource(material.key, family);
    }
  }

  for (const family of Object.values(changeSet.weaponAscensionFamilies)) {
    overridePack.weaponAscensionFamilies![family.key] = {
      key: family.key,
      tier1: family.twoStarKey,
      tier2: family.threeStarKey,
      tier3: family.fourStarKey,
      tier4: family.fiveStarKey,
      domainKey: family.domainKey,
      domainName: family.domainName,
      availability: family.availability,
      region: family.region,
    } satisfies WeaponAscensionFamily;
    overridePack.weaponAscensionMaterialFamilies![family.key] = {
      key: family.key,
      displayName: family.displayName,
      tiers: {
        twoStar: family.twoStarKey,
        threeStar: family.threeStarKey,
        fourStar: family.fourStarKey,
        fiveStar: family.fiveStarKey,
      },
      tierDisplayNames: {
        twoStar: family.twoStarName,
        threeStar: family.threeStarName,
        fourStar: family.fourStarName,
        fiveStar: family.fiveStarName,
      },
      usedByWeapons: [],
      category: "weapon_ascension_material_family",
      source: {
        type: "domain_of_forgery",
        region: family.region,
        domainName: family.domainName,
        availableDays: availabilityDays(family.availability),
      },
      usedByWeaponKeys: [],
      craftable: true,
      conversionRatio: 3,
      status: toMaterialFamilyStatus(family.status),
    } satisfies WeaponAscensionMaterialFamilyRecord;
    const source = {
      type: "domain_of_forgery" as const,
      region: family.region,
      domainName: family.domainName,
      availableDays: availabilityDays(family.availability),
    };
    const materials = [
      { key: family.twoStarKey, displayName: family.twoStarName, tier: 0, rarity: "2-Star" },
      { key: family.threeStarKey, displayName: family.threeStarName, tier: 1, rarity: "3-Star" },
      { key: family.fourStarKey, displayName: family.fourStarName, tier: 2, rarity: "4-Star" },
      { key: family.fiveStarKey, displayName: family.fiveStarName, tier: 3, rarity: "5-Star" },
    ];
    Object.assign(
      overridePack.tieredMaterialIndex!,
      createTierIndexEntries(family.key, "weapon_ascension_material_family", materials.map((material) => material.key)),
    );
    const recipes = createTierUpgradeRecipes({
      familyKey: family.key,
      category: "weapon_ascension_material",
      tierKeys: materials.map((material) => material.key),
      tierNames: materials.map((material) => material.displayName),
      moraCost: 125,
      eligibleCraftingBonusTypes: ["double_product_weapon_ascension_material", "refund_weapon_ascension_material"],
    });
    Object.assign(overridePack.recipes!, recipes);
    Object.assign(overridePack.craftingRecipes!, recipes);
    for (const material of materials) {
      addMaterialDescriptor(overridePack.materials!, material.key, material.displayName, "weapon_ascension");
      addMaterialRecord(
        overridePack.materialRecords!,
        material.key,
        material.displayName,
        "weapon_ascension_material",
        "weapon_ascension",
        family.domainKey || family.key,
        source,
        toMaterialFamilyStatus(family.status),
        ["weapon_ascension"],
        {
          familyKey: family.key,
          tier: material.tier,
          rarity: material.rarity as MaterialRecord["rarity"],
          craftable: true,
          conversionRatio: 3,
          notes: family.notes,
        },
      );
      overridePack.materialSources![material.key] = createWeaponAscensionMaterialSource(material.key, family);
    }
  }

  const weaponEliteEnemyFamilyKeys = new Set(
    Object.values(changeSet.weapons)
      .map((weapon) => weapon.eliteEnemyDropFamilyKey)
      .filter(Boolean),
  );

  for (const family of Object.values(changeSet.commonEnemyDropFamilies)) {
    overridePack.generalEnemyDropFamilies![family.familyId] = {
      familyId: family.familyId,
      displayName: family.displayName,
      category: "general_enemy_drop",
      sourceType: "Common Enemies and some Elite Enemies",
      sourceEnemyFamily: family.sourceEnemyFamily,
      materialNames: [family.lowName, family.midName, family.highName],
      materialKeys: [family.lowKey, family.midKey, family.highKey],
      rarity: [1, 2, 3],
      usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
      usedByCharacters: [],
      usedByWeapons: [],
    } satisfies GeneralEnemyDropFamily;
    overridePack.enemyDropFamilies![family.familyId] = {
      key: family.familyId,
      low: family.lowKey,
      mid: family.midKey,
      high: family.highKey,
      notes: family.notes.join(" | ") || family.sourceEnemyFamily,
    };
    if (weaponEliteEnemyFamilyKeys.has(family.familyId)) {
      const usedByWeapons = Object.values(changeSet.weapons)
        .filter((weapon) => weapon.eliteEnemyDropFamilyKey === family.familyId)
        .map((weapon) => weapon.displayName || weapon.weaponKey);
      const usedByWeaponKeys = Object.values(changeSet.weapons)
        .filter((weapon) => weapon.eliteEnemyDropFamilyKey === family.familyId)
        .map((weapon) => weapon.weaponKey);
      overridePack.eliteEnemyDropFamilies![family.familyId] = {
        familyId: family.familyId,
        displayName: family.displayName,
        category: "elite_enemy_drop",
        sourceType: "Elite Enemies",
        sourceEnemyFamily: family.sourceEnemyFamily,
        materialNames: [family.lowName, family.midName, family.highName],
        materialKeys: [family.lowKey, family.midKey, family.highKey],
        rarity: [2, 3, 4],
        usedFor: ["weapon_ascension"],
        usedByWeapons,
        usedByWeaponKeys,
      } satisfies EliteEnemyDropFamily;
    }
    const source = {
      type: "enemy_drop" as const,
      enemyFamily: family.sourceEnemyFamily,
    };
    const materials = [
      { key: family.lowKey, displayName: family.lowName, tier: 1 },
      { key: family.midKey, displayName: family.midName, tier: 2 },
      { key: family.highKey, displayName: family.highName, tier: 3 },
    ];
    Object.assign(
      overridePack.tieredMaterialIndex!,
      createTierIndexEntries(family.familyId, "general_enemy_drop_family", materials.map((material) => material.key)),
    );
    const recipes = createTierUpgradeRecipes({
      familyKey: family.familyId,
      category: "character_weapon_enhancement_material",
      tierKeys: materials.map((material) => material.key),
      tierNames: materials.map((material) => material.displayName),
      moraCost: 50,
      eligibleCraftingBonusTypes: [
        "double_product_character_weapon_enhancement_material",
        "refund_character_weapon_material",
      ],
    });
    Object.assign(overridePack.recipes!, recipes);
    Object.assign(overridePack.craftingRecipes!, recipes);
    for (const material of materials) {
      addMaterialDescriptor(overridePack.materials!, material.key, material.displayName, "general_enemy_drop");
      addMaterialRecord(
        overridePack.materialRecords!,
        material.key,
        material.displayName,
        "general_enemy_drop",
        "general_enemy_drop",
        family.familyId,
        source,
        toMaterialRecordStatus(family.status),
        ["character_ascension", "weapon_ascension", "talent_leveling"],
        { familyKey: family.familyId, tier: material.tier, notes: family.notes },
      );
      overridePack.materialSources![material.key] = createEnemyDropMaterialSource(material.key, family);
    }
  }

  for (const material of Object.values(changeSet.normalBossMaterials)) {
    overridePack.normalBossMaterials![material.key] = {
      key: material.key,
      displayName: material.displayName,
      bossKey: material.bossKey,
      bossDisplayName: material.bossDisplayName,
      category: "normal_boss_material",
      usedFor: ["character_ascension"],
      craftable: false,
    } satisfies NormalBossMaterial;
    const source = {
      type: "normal_boss" as const,
      bossKey: material.bossKey,
      bossName: material.bossDisplayName,
    };
    addMaterialDescriptor(overridePack.materials!, material.key, material.displayName, "normal_boss_material");
    addMaterialRecord(
      overridePack.materialRecords!,
      material.key,
      material.displayName,
      "normal_boss_material",
      "normal_boss_material",
      material.bossKey,
      source,
      toMaterialRecordStatus(material.status),
      ["character_ascension"],
      { notes: material.notes },
    );
    overridePack.materialSources![material.key] = createNormalBossMaterialSource(material.key, material);
  }

  for (const specialty of Object.values(changeSet.localSpecialties)) {
    overridePack.localSpecialties![specialty.key] = {
      key: specialty.key,
      displayName: specialty.displayName,
      category: "local_specialty",
      region: specialty.region,
      usedFor: ["character_ascension"],
      isPurchasable: specialty.isPurchasable,
      purchaseVendors: specialty.purchaseVendors,
      searchHint: specialty.searchHint,
      craftable: false,
    } satisfies LocalSpecialtyMaterial;
    const source = {
      type: "local_specialty" as const,
      region: specialty.region,
      purchaseVendors: specialty.purchaseVendors,
      searchHint: specialty.searchHint,
    };
    addMaterialDescriptor(overridePack.materials!, specialty.key, specialty.displayName, "local_specialty");
    addMaterialRecord(
      overridePack.materialRecords!,
      specialty.key,
      specialty.displayName,
      "local_specialty",
      "local_specialty",
      specialty.key,
      source,
      toMaterialRecordStatus("verified"),
      ["character_ascension"],
      { notes: specialty.notes },
    );
    overridePack.materialSources![specialty.key] = createLocalSpecialtyMaterialSource(specialty.key, specialty);
  }

  for (const material of Object.values(changeSet.standaloneMaterials)) {
    addMaterialDescriptor(overridePack.materials!, material.key, material.displayName, material.category);
    addMaterialRecord(
      overridePack.materialRecords!,
      material.key,
      material.displayName,
      material.recordCategory,
      material.category,
      material.sourceKey,
      buildStandaloneCanonicalSource(material),
      toMaterialRecordStatus(material.status),
      material.usedFor as MaterialRecord["usedFor"],
      {
        craftable: material.craftable,
        conversionRatio: material.conversionRatio,
        notes: material.notes,
      },
    );
    overridePack.materialSources![material.key] = createStandaloneMaterialSource(material.key, material);
  }

  for (const character of Object.values(changeSet.characters)) {
    overridePack.characters![character.characterKey] = {
      key: character.characterKey,
      displayName: character.displayName,
      element: character.element,
      weaponType: character.weaponType,
      rarity: character.rarity,
      region: character.region,
      playable: true,
      characterKind: "normal",
    } satisfies CharacterCatalogEntry;
    overridePack.characterMaterialProfiles![character.characterKey] = {
      characterKey: character.characterKey,
      displayName: character.displayName,
      name: character.displayName,
      element: character.element,
      weaponType: character.weaponType,
      rarity: character.rarity,
      gemFamilyKey: character.gemFamilyKey,
      normalBossMaterialKey: character.normalBossMaterialKey,
      normalBossMaterial: character.normalBossMaterialKey,
      commonEnemyMaterialFamilyId: character.commonEnemyDropFamilyKey,
      localSpecialtyKey: character.localSpecialtyKey,
      talentBookSeriesKey: character.talentBookFamilyKey,
      weeklyBossMaterialKey: character.weeklyBossMaterialKey,
      weeklyBossMaterial: character.weeklyBossMaterialKey,
      notes: character.notes,
      status: toCharacterMaterialStatus(character.status),
    } satisfies CharacterMaterialProfile;
  }

  for (const weapon of Object.values(changeSet.weapons)) {
    overridePack.weapons![weapon.weaponKey] = {
      key: weapon.weaponKey,
      displayName: weapon.displayName,
      weaponType: weapon.weaponType,
      rarity: weapon.rarity,
      acquisitionType: weapon.acquisitionType ?? "unknown",
      refinementTrackable: weapon.refinementTrackable ?? weapon.rarity >= 3,
      refinementPolicy: weapon.refinementPolicy ?? (weapon.rarity === 5 ? "manual_review" : "normal"),
      limited: weapon.limited ?? false,
      eventExclusive: weapon.eventExclusive ?? false,
    } satisfies WeaponCatalogEntry;
    overridePack.weaponMaterialProfiles![weapon.weaponKey] = {
      weaponKey: weapon.weaponKey,
      rarity: weapon.rarity,
      weaponType: weapon.weaponType,
      weaponAscensionFamilyKey: weapon.weaponAscensionMaterialFamilyKey,
      eliteEnemyDropFamilyId: weapon.eliteEnemyDropFamilyKey,
      eliteEnemyFamilyKey: weapon.eliteEnemyDropFamilyKey,
      commonEnemyFamilyKey: weapon.commonEnemyDropFamilyKey,
      goalTrackable: weapon.plannerEligible,
      status: toMaterialRecordStatus(weapon.status),
      notes: weapon.notes,
    } satisfies WeaponMaterialProfile;
  }

  for (const artifactDomain of Object.values(changeSet.artifactDomains)) {
    overridePack.artifactDomains![artifactDomain.setKey] = artifactDomain;
  }

  for (const domain of Object.values(changeSet.sourceDomains)) {
    if (domain.domainType === "forgery") {
      overridePack.domainsOfForgery![domain.domainKey] = {
        name: domain.name,
        region: domain.region,
        location: domain.location,
        activityType: "domain_of_forgery",
        resinCost: 20,
        condensedResinAllowed: true,
        adventureRankRequirements: [16, 21, 30, 40],
        partyLevelRecommendations: [15, 36, 59, 80],
        elements: domain.elements,
        weaponAscensionFamilies: domain.linkedFamilyKeys,
        listedRewards: domain.listedRewards,
      } satisfies DomainOfForgeryRecord;
    } else if (domain.domainType === "mastery") {
      overridePack.domainsOfMastery![domain.domainKey] = {
        name: domain.name,
        region: domain.region,
        location: domain.location,
        activityType: "domain_of_mastery",
        resinCost: 20,
        condensedResinAllowed: true,
        adventureRankRequirements: [27, 28, 36, 45],
        partyLevelRecommendations: [38, 54, 71, 88],
        elements: domain.elements,
        talentFamilies: domain.linkedFamilyKeys,
        listedRewards: domain.listedRewards,
      } satisfies DomainOfMasteryRecord;
    } else {
      overridePack.trounceDomains![domain.domainKey] = {
        name: domain.name,
        region: domain.region,
        location: domain.location,
        activityType: "trounce_domain",
        resinCostFirstThreeWeekly: 30,
        resinCostAfterFirstThreeWeekly: 60,
        rewardLimit: "once_per_boss_per_week",
        adventureRankRequirements: [40],
        partyLevelRecommendations: [90],
        weeklyTalentMaterials: domain.linkedFamilyKeys,
      } satisfies TrounceDomainRecord;
    }
  }

  return overridePack;
}

function sortObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  ) as T;
}

function createCanonicalCharacterProfile(draft: CharacterMaterialAssignmentDraft) {
  return {
    characterKey: draft.characterKey,
    displayName: draft.displayName,
    rarity: draft.rarity,
    weaponType: draft.weaponType,
    element: draft.element,
    elementGemFamilyKey: draft.gemFamilyKey,
    localSpecialtyKey: draft.localSpecialtyKey,
    commonEnemyDropFamilyKey: draft.commonEnemyDropFamilyKey,
    talentBookFamilyKey: draft.talentBookFamilyKey,
    normalBossMaterialKey: draft.normalBossMaterialKey,
    weeklyBossMaterialKey: draft.weeklyBossMaterialKey,
    releaseState: draft.releaseState,
    status: draft.status,
    plannerEligible: draft.plannerEligible,
    region: draft.region ?? null,
    notes: draft.notes,
    aliases: draft.aliases.length ? draft.aliases : [draft.displayName],
    sourceRefs: draft.sourceRefs,
  };
}

function createCanonicalWeaponProfile(draft: WeaponProfileDraft) {
  return {
    weaponKey: draft.weaponKey,
    displayName: draft.displayName,
    rarity: draft.rarity,
    weaponType: draft.weaponType,
    weaponAscensionMaterialFamilyKey: draft.weaponAscensionMaterialFamilyKey,
    eliteEnemyDropFamilyKey: draft.eliteEnemyDropFamilyKey,
    commonEnemyDropFamilyKey: draft.commonEnemyDropFamilyKey,
    acquisitionType: draft.acquisitionType ?? "unknown",
    refinementTrackable: draft.refinementTrackable ?? draft.rarity >= 3,
    refinementPolicy: draft.refinementPolicy ?? (draft.rarity === 5 ? "manual_review" : "normal"),
    limited: draft.limited ?? false,
    eventExclusive: draft.eventExclusive ?? false,
    releaseState: draft.releaseState,
    status: draft.status,
    plannerEligible: draft.plannerEligible,
    notes: draft.notes,
    aliases: draft.aliases.length ? draft.aliases : [draft.displayName],
  };
}

export function exportChangeSetToCanonicalBundle(changeSet: DatabaseChangeSet): ChangeSetExportBundle {
  const overridePack = compileChangeSetToOverridePack(changeSet);
  const files: CanonicalExportFile[] = [];

  const weeklyBossMaterials = sortObject(
    Object.fromEntries(
      Object.values(changeSet.weeklyBossGroups).flatMap((group) =>
        group.drops.map((drop) => [
          drop.key,
          overridePack.weeklyBossMaterials?.[drop.key],
        ]),
      ),
    ),
  );
  if (Object.keys(weeklyBossMaterials).length) {
    files.push({
      path: "src/data/database/materials/weeklyBossMaterials.json",
      description: "Weekly boss material group records",
      recordCount: Object.keys(weeklyBossMaterials).length,
      payload: weeklyBossMaterials,
      json: JSON.stringify(weeklyBossMaterials, null, 2),
    });
  }

  const talentBookFamilies = sortObject(
    Object.fromEntries(
      Object.values(changeSet.talentBookFamilies).map((family) => [family.key, overridePack.talentBookFamilies?.[family.key]]),
    ),
  );
  if (Object.keys(talentBookFamilies).length) {
    files.push({
      path: "src/data/database/materials/talentBookFamilies.json",
      description: "Talent book family records",
      recordCount: Object.keys(talentBookFamilies).length,
      payload: talentBookFamilies,
      json: JSON.stringify(talentBookFamilies, null, 2),
    });
  }

  const weaponAscensionMaterialFamilies = sortObject(
    Object.fromEntries(
      Object.values(changeSet.weaponAscensionFamilies).map((family) => [
        family.key,
        overridePack.weaponAscensionMaterialFamilies?.[family.key],
      ]),
    ),
  );
  if (Object.keys(weaponAscensionMaterialFamilies).length) {
    files.push({
      path: "src/data/database/materials/weaponAscensionMaterialFamilies.json",
      description: "Weapon ascension family records",
      recordCount: Object.keys(weaponAscensionMaterialFamilies).length,
      payload: weaponAscensionMaterialFamilies,
      json: JSON.stringify(weaponAscensionMaterialFamilies, null, 2),
    });
  }

  const commonEnemyDropFamilies = sortObject(
    Object.fromEntries(
      Object.values(changeSet.commonEnemyDropFamilies).map((family) => [
        family.familyId,
        overridePack.generalEnemyDropFamilies?.[family.familyId],
      ]),
    ),
  );
  if (Object.keys(commonEnemyDropFamilies).length) {
    files.push({
      path: "src/data/database/materials/commonEnemyDropFamilies.json",
      description: "Common enemy family records",
      recordCount: Object.keys(commonEnemyDropFamilies).length,
      payload: commonEnemyDropFamilies,
      json: JSON.stringify(commonEnemyDropFamilies, null, 2),
    });
  }

  const eliteEnemyDropFamilies = sortObject(
    Object.fromEntries(
      Object.values(changeSet.commonEnemyDropFamilies)
        .filter((family) => Object.values(changeSet.weapons).some((weapon) => weapon.eliteEnemyDropFamilyKey === family.familyId))
        .map((family) => [
          family.familyId,
          overridePack.eliteEnemyDropFamilies?.[family.familyId],
        ]),
    ),
  );
  if (Object.keys(eliteEnemyDropFamilies).length) {
    files.push({
      path: "src/data/database/materials/eliteEnemyDropFamilies.json",
      description: "Elite enemy family records generated for weapon ascension profiles",
      recordCount: Object.keys(eliteEnemyDropFamilies).length,
      payload: eliteEnemyDropFamilies,
      json: JSON.stringify(eliteEnemyDropFamilies, null, 2),
    });
  }

  const normalBossMaterials = sortObject(
    Object.fromEntries(
      Object.values(changeSet.normalBossMaterials).map((material) => [material.key, overridePack.normalBossMaterials?.[material.key]]),
    ),
  );
  if (Object.keys(normalBossMaterials).length) {
    files.push({
      path: "src/data/database/materials/normalBossMaterials.json",
      description: "Normal boss material records",
      recordCount: Object.keys(normalBossMaterials).length,
      payload: normalBossMaterials,
      json: JSON.stringify(normalBossMaterials, null, 2),
    });
  }

  const localSpecialties = sortObject(
    Object.fromEntries(
      Object.values(changeSet.localSpecialties).map((specialty) => [specialty.key, overridePack.localSpecialties?.[specialty.key]]),
    ),
  );
  if (Object.keys(localSpecialties).length) {
    files.push({
      path: "src/data/database/materials/localSpecialties.json",
      description: "Local specialty records",
      recordCount: Object.keys(localSpecialties).length,
      payload: localSpecialties,
      json: JSON.stringify(localSpecialties, null, 2),
    });
  }

  const characterProfiles = sortObject(
    Object.fromEntries(
      Object.values(changeSet.characters).map((character) => [character.characterKey, createCanonicalCharacterProfile(character)]),
    ),
  );
  if (Object.keys(characterProfiles).length) {
    files.push({
      path: "src/data/database/characters/characterProfiles.json",
      description: "Canonical character profile records",
      recordCount: Object.keys(characterProfiles).length,
      payload: characterProfiles,
      json: JSON.stringify(characterProfiles, null, 2),
    });
  }

  const weaponProfiles = sortObject(
    Object.fromEntries(
      Object.values(changeSet.weapons).map((weapon) => [weapon.weaponKey, createCanonicalWeaponProfile(weapon)]),
    ),
  );
  if (Object.keys(weaponProfiles).length) {
    files.push({
      path: "src/data/database/weapons/weaponProfiles.json",
      description: "Canonical weapon profile records",
      recordCount: Object.keys(weaponProfiles).length,
      payload: weaponProfiles,
      json: JSON.stringify(weaponProfiles, null, 2),
    });
  }

  const artifactDomains = sortObject(
    Object.fromEntries(
      Object.values(changeSet.artifactDomains).map((domain) => [domain.setKey, overridePack.artifactDomains?.[domain.setKey]]),
    ),
  );
  if (Object.keys(artifactDomains).length) {
    files.push({
      path: "src/data/database/artifacts/artifactDomains.json",
      description: "Artifact set to farming domain mappings",
      recordCount: Object.keys(artifactDomains).length,
      payload: artifactDomains,
      json: JSON.stringify(artifactDomains, null, 2),
    });
  }

  const domainsOfForgery = sortObject(
    Object.fromEntries(
      Object.values(changeSet.sourceDomains)
        .filter((domain) => domain.domainType === "forgery")
        .map((domain) => [domain.domainKey, overridePack.domainsOfForgery?.[domain.domainKey]]),
    ),
  );
  const domainsOfMastery = sortObject(
    Object.fromEntries(
      Object.values(changeSet.sourceDomains)
        .filter((domain) => domain.domainType === "mastery")
        .map((domain) => [domain.domainKey, overridePack.domainsOfMastery?.[domain.domainKey]]),
    ),
  );
  const trounceDomains = sortObject(
    Object.fromEntries(
      Object.values(changeSet.sourceDomains)
        .filter((domain) => domain.domainType === "trounce")
        .map((domain) => [domain.domainKey, overridePack.trounceDomains?.[domain.domainKey]]),
    ),
  );
  const sourceDomainCount = Object.keys(domainsOfForgery).length + Object.keys(domainsOfMastery).length + Object.keys(trounceDomains).length;
  if (sourceDomainCount > 0) {
    const payload = sortObject({
      ...(Object.keys(domainsOfForgery).length ? { domainsOfForgery } : {}),
      ...(Object.keys(domainsOfMastery).length ? { domainsOfMastery } : {}),
      ...(Object.keys(trounceDomains).length ? { trounceDomains } : {}),
    });
    files.push({
      path: "src/data/database/sources/domainSchedule.json",
      description: "Domain schedule and reward records",
      recordCount: sourceDomainCount,
      payload,
      json: JSON.stringify(payload, null, 2),
    });
  }

  const generatedRecipeTargetKeys = new Set([
    ...Object.values(changeSet.talentBookFamilies).flatMap((family) => [family.guideKey, family.philosophiesKey]),
    ...Object.values(changeSet.weaponAscensionFamilies).flatMap((family) => [family.threeStarKey, family.fourStarKey, family.fiveStarKey]),
    ...Object.values(changeSet.commonEnemyDropFamilies).flatMap((family) => [family.midKey, family.highKey]),
  ]);
  const recipes = sortObject(
    Object.fromEntries(
      Object.entries(overridePack.recipes ?? {}).filter(([materialKey]) => generatedRecipeTargetKeys.has(materialKey)),
    ),
  );
  if (Object.keys(recipes).length) {
    files.push({
      path: "src/data/database/crafting/recipes.json",
      description: "Generated tier-up crafting recipes",
      recordCount: Object.keys(recipes).length,
      payload: recipes,
      json: JSON.stringify(recipes, null, 2),
    });
  }

  const materialDescriptors = sortObject(
    Object.fromEntries(
      Object.entries(overridePack.materials ?? {}).filter(([materialKey]) => {
        return Boolean(
          Object.values(changeSet.weeklyBossGroups).some((group) => group.drops.some((drop) => drop.key === materialKey)) ||
            Object.values(changeSet.talentBookFamilies).some((family) =>
              [family.teachingsKey, family.guideKey, family.philosophiesKey].includes(materialKey),
            ) ||
            Object.values(changeSet.weaponAscensionFamilies).some((family) =>
              [family.twoStarKey, family.threeStarKey, family.fourStarKey, family.fiveStarKey].includes(materialKey),
            ) ||
            Object.values(changeSet.commonEnemyDropFamilies).some((family) =>
              [family.lowKey, family.midKey, family.highKey].includes(materialKey),
            ) ||
            changeSet.normalBossMaterials[materialKey] ||
            changeSet.localSpecialties[materialKey] ||
            changeSet.standaloneMaterials[materialKey],
        );
      }),
    ),
  );
  if (Object.keys(materialDescriptors).length) {
    files.push({
      path: "src/data/database/materials/materials.json",
      description: "Planner-facing material descriptor and record patches",
      recordCount: Object.keys(materialDescriptors).length,
      payload: materialDescriptors,
      json: JSON.stringify(materialDescriptors, null, 2),
    });
  }

  const tieredMaterialIndex = sortObject(
    Object.fromEntries(
      Object.entries(overridePack.tieredMaterialIndex ?? {}).filter(([materialKey]) => materialDescriptors[materialKey]),
    ),
  );
  if (Object.keys(tieredMaterialIndex).length) {
    files.push({
      path: "src/data/database/crafting/tieredMaterialIndex.json",
      description: "Generated tiered material family index records",
      recordCount: Object.keys(tieredMaterialIndex).length,
      payload: tieredMaterialIndex,
      json: JSON.stringify(tieredMaterialIndex, null, 2),
    });
  }

  const materialSources = sortObject(
    Object.fromEntries(
      Object.entries(overridePack.materialSources ?? {}).filter(([materialKey]) => materialDescriptors[materialKey]),
    ),
  );
  if (Object.keys(materialSources).length) {
    files.push({
      path: "src/data/database/sources/materialSources.json",
      description: "Material source mappings",
      recordCount: Object.keys(materialSources).length,
      payload: materialSources,
      json: JSON.stringify(materialSources, null, 2),
    });
  }

  return { files, overridePack };
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function addValidationIssue(issues: ChangeSetValidationIssue[], issue: ChangeSetValidationIssue): void {
  issues.push(issue);
}

function collectGeneratedMaterialKeys(changeSet: DatabaseChangeSet): Array<{ key: string; entityType: string; entityKey: string }> {
  return [
    ...Object.values(changeSet.weeklyBossGroups).flatMap((group) =>
      group.drops.map((drop) => ({ key: drop.key, entityType: "weeklyBossGroup", entityKey: group.sourceKey || group.bossKey })),
    ),
    ...Object.values(changeSet.talentBookFamilies).flatMap((family) =>
      [family.teachingsKey, family.guideKey, family.philosophiesKey].map((key) => ({
        key,
        entityType: "talentBookFamily",
        entityKey: family.key,
      })),
    ),
    ...Object.values(changeSet.weaponAscensionFamilies).flatMap((family) =>
      [family.twoStarKey, family.threeStarKey, family.fourStarKey, family.fiveStarKey].map((key) => ({
        key,
        entityType: "weaponAscensionFamily",
        entityKey: family.key,
      })),
    ),
    ...Object.values(changeSet.commonEnemyDropFamilies).flatMap((family) =>
      [family.lowKey, family.midKey, family.highKey].map((key) => ({
        key,
        entityType: "commonEnemyDropFamily",
        entityKey: family.familyId,
      })),
    ),
    ...Object.values(changeSet.normalBossMaterials).map((material) => ({
      key: material.key,
      entityType: "normalBossMaterial",
      entityKey: material.key,
    })),
    ...Object.values(changeSet.localSpecialties).map((specialty) => ({
      key: specialty.key,
      entityType: "localSpecialty",
      entityKey: specialty.key,
    })),
    ...Object.values(changeSet.standaloneMaterials).map((material) => ({
      key: material.key,
      entityType: "standaloneMaterial",
      entityKey: material.key,
    })),
  ].filter((entry) => hasValue(entry.key));
}

export function validateChangeSet(changeSet: DatabaseChangeSet, staticData: StaticGameData): ChangeSetValidationIssue[] {
  const issues: ChangeSetValidationIssue[] = [];
  const materialKeyOwners = new Map<string, string[]>();
  for (const entry of collectGeneratedMaterialKeys(changeSet)) {
    materialKeyOwners.set(entry.key, [...(materialKeyOwners.get(entry.key) ?? []), `${entry.entityType}:${entry.entityKey}`]);
  }
  for (const [materialKey, owners] of materialKeyOwners) {
    if (owners.length > 1) {
      addValidationIssue(issues, {
        id: `duplicate-material-${materialKey}`,
        severity: "error",
        scope: "change_set",
        entityType: "material",
        entityKey: materialKey,
        message: `Material key ${materialKey} is generated by multiple patch entities: ${owners.join(", ")}.`,
      });
    }
  }

  for (const group of Object.values(changeSet.weeklyBossGroups)) {
    if (!hasValue(group.bossKey) || !hasValue(group.bossName) || !hasValue(group.domainName)) {
      issues.push({
        id: `weekly-boss-${group.sourceKey || group.bossKey}-identity`,
        severity: "error",
        scope: "change_set",
        entityType: "weeklyBossGroup",
        entityKey: group.sourceKey || group.bossKey,
        message: "Weekly boss groups need a source key, boss key, boss name, and domain name.",
      });
    }
    const missingDrops = group.drops.filter((drop) => !hasValue(drop.key) || !hasValue(drop.displayName)).length;
    if (missingDrops > 0) {
      issues.push({
        id: `weekly-boss-${group.sourceKey || group.bossKey}-drops`,
        severity: "error",
        scope: "change_set",
        entityType: "weeklyBossGroup",
        entityKey: group.sourceKey || group.bossKey,
        message: "Weekly boss groups must define all three material keys and display names.",
      });
    }
  }

  for (const family of Object.values(changeSet.talentBookFamilies)) {
    if (!family.key || !family.domainKey || !family.domainName || !family.region) {
      issues.push({
        id: `talent-family-${family.key || "unknown"}`,
        severity: "error",
        scope: "change_set",
        entityType: "talentBookFamily",
        entityKey: family.key || "unknown",
        message: "Talent book families need a family key, domain key/name, and region.",
      });
    }
    if (family.domainKey && !changeSet.sourceDomains[family.domainKey] && !staticData.domainsOfMastery[family.domainKey]) {
      addValidationIssue(issues, {
        id: `talent-family-${family.key}-source-domain`,
        severity: "warning",
        scope: "change_set",
        entityType: "talentBookFamily",
        entityKey: family.key,
        message: `Talent family ${family.key} references mastery domain ${family.domainKey}, but the patch manifest does not define that source domain.`,
      });
    }
  }

  for (const family of Object.values(changeSet.weaponAscensionFamilies)) {
    if (!family.key || !family.domainKey || !family.domainName || !family.region) {
      addValidationIssue(issues, {
        id: `weapon-family-${family.key || "unknown"}`,
        severity: "error",
        scope: "change_set",
        entityType: "weaponAscensionFamily",
        entityKey: family.key || "unknown",
        message: "Weapon ascension families need a family key, domain key/name, and region.",
      });
    }
    if (family.domainKey && !changeSet.sourceDomains[family.domainKey] && !staticData.domainsOfForgery[family.domainKey]) {
      addValidationIssue(issues, {
        id: `weapon-family-${family.key}-source-domain`,
        severity: "warning",
        scope: "change_set",
        entityType: "weaponAscensionFamily",
        entityKey: family.key,
        message: `Weapon family ${family.key} references forging domain ${family.domainKey}, but the patch manifest does not define that source domain.`,
      });
    }
  }

  for (const draft of Object.values(changeSet.characters)) {
    const required = [
      ["display name", draft.displayName],
      ["gem family", draft.gemFamilyKey],
      ["normal boss material", draft.normalBossMaterialKey],
      ["common enemy family", draft.commonEnemyDropFamilyKey],
      ["local specialty", draft.localSpecialtyKey],
      ["talent book family", draft.talentBookFamilyKey],
      ["weekly boss material", draft.weeklyBossMaterialKey],
    ] as const;
    const missing = required.filter(([, value]) => !hasValue(value));
    if (missing.length) {
      issues.push({
        id: `character-${draft.characterKey}-missing`,
        severity: "error",
        scope: "change_set",
        entityType: "characterAssignment",
        entityKey: draft.characterKey,
        message: `Character assignments are incomplete: ${missing.map(([label]) => label).join(", ")}.`,
      });
    }
    if (draft.plannerEligible && draft.releaseState !== "live") {
      addValidationIssue(issues, {
        id: `character-${draft.characterKey}-planner-beta`,
        severity: "error",
        scope: "change_set",
        entityType: "characterAssignment",
        entityKey: draft.characterKey,
        message: "Beta or unreleased characters must stay plannerEligible: false until their planner-critical data is verified live.",
      });
    }
    if (draft.gemFamilyKey && !staticData.elementGemFamilies[draft.gemFamilyKey]) {
      issues.push({
        id: `character-${draft.characterKey}-gem-family`,
        severity: "warning",
        scope: "change_set",
        entityType: "characterAssignment",
        entityKey: draft.characterKey,
        message: `Gem family ${draft.gemFamilyKey} is not currently present in effective static data.`,
      });
    }
  }

  for (const weapon of Object.values(changeSet.weapons)) {
    const required = [
      ["display name", weapon.displayName],
      ["weapon ascension family", weapon.weaponAscensionMaterialFamilyKey],
      ["elite enemy family", weapon.eliteEnemyDropFamilyKey],
      ["common enemy family", weapon.commonEnemyDropFamilyKey],
    ] as const;
    const missing = required.filter(([, value]) => !hasValue(value));
    if (missing.length) {
      addValidationIssue(issues, {
        id: `weapon-${weapon.weaponKey}-missing`,
        severity: "error",
        scope: "change_set",
        entityType: "weaponProfile",
        entityKey: weapon.weaponKey,
        message: `Weapon profile is incomplete: ${missing.map(([label]) => label).join(", ")}.`,
      });
    }
    if (weapon.plannerEligible && weapon.releaseState !== "live") {
      addValidationIssue(issues, {
        id: `weapon-${weapon.weaponKey}-planner-beta`,
        severity: "error",
        scope: "change_set",
        entityType: "weaponProfile",
        entityKey: weapon.weaponKey,
        message: "Beta or unreleased weapons must stay plannerEligible: false until their planner-critical data is verified live.",
      });
    }
  }

  for (const domain of Object.values(changeSet.artifactDomains)) {
    if (!hasValue(domain.setKey) || !hasValue(domain.setName)) {
      addValidationIssue(issues, {
        id: `artifact-domain-${domain.setKey || "unknown"}-identity`,
        severity: "error",
        scope: "change_set",
        entityType: "artifactDomain",
        entityKey: domain.setKey || "unknown",
        message: "Artifact domain mappings need a set key and set name.",
      });
    }
    if (domain.hasStandardDomainSource && (!hasValue(domain.domainKey) || !hasValue(domain.domainName))) {
      addValidationIssue(issues, {
        id: `artifact-domain-${domain.setKey || "unknown"}-source`,
        severity: "error",
        scope: "change_set",
        entityType: "artifactDomain",
        entityKey: domain.setKey || "unknown",
        message: "Artifact sets with standard domain sources need domain key/name, plus region or location when known.",
      });
    }
  }

  for (const domain of Object.values(changeSet.sourceDomains)) {
    if (!hasValue(domain.domainKey) || !hasValue(domain.name) || !hasValue(domain.region) || !hasValue(domain.location)) {
      addValidationIssue(issues, {
        id: `source-domain-${domain.domainKey || "unknown"}-identity`,
        severity: "error",
        scope: "change_set",
        entityType: "sourceDomain",
        entityKey: domain.domainKey || "unknown",
        message: "Source domains need a key, name, region, and location.",
      });
    }
    if (domain.domainType !== "trounce" && !domain.availability) {
      addValidationIssue(issues, {
        id: `source-domain-${domain.domainKey || "unknown"}-availability`,
        severity: "error",
        scope: "change_set",
        entityType: "sourceDomain",
        entityKey: domain.domainKey || "unknown",
        message: "Mastery and Forgery domains must select explicit availability days.",
      });
    }
    if (!domain.linkedFamilyKeys.length) {
      addValidationIssue(issues, {
        id: `source-domain-${domain.domainKey || "unknown"}-links`,
        severity: "warning",
        scope: "change_set",
        entityType: "sourceDomain",
        entityKey: domain.domainKey || "unknown",
        message: "Source domains should link at least one talent, weapon, or weekly material family.",
      });
    }
  }

  for (const material of Object.values(changeSet.standaloneMaterials)) {
    if (!hasValue(material.sourceKey) || !hasValue(material.sourceName)) {
      issues.push({
        id: `standalone-${material.key}-source`,
        severity: "warning",
        scope: "change_set",
        entityType: "standaloneMaterial",
        entityKey: material.key,
        message: "Standalone materials should include source key and source name so export and preview stay actionable.",
      });
    }
  }

  return issues;
}

function materialDisplayName(staticData: StaticGameData, materialKey: string): string {
  return (
    staticData.materials[materialKey]?.displayName ??
    staticData.materialRecords[materialKey]?.displayName ??
    staticData.weeklyBossMaterials[materialKey]?.displayName ??
    staticData.specialProgressionMaterials[materialKey]?.displayName ??
    materialKey
  );
}

function buildCharacterAssignmentDraftFromCanonical(characterKey: string, staticData: StaticGameData): CharacterMaterialAssignmentDraft | null {
  const character = staticData.characters[characterKey];
  const profile = staticData.characterMaterialProfiles[characterKey];
  if (!character && !profile) {
    return null;
  }
  const status = profile?.status === "verified" || profile?.status === "beta" || profile?.status === "unresolved"
    ? profile.status
    : "beta";
  return {
    characterKey,
    displayName: character?.displayName ?? profile?.displayName ?? profile?.name ?? characterKey,
    element: character?.element ?? profile?.element,
    weaponType: character?.weaponType ?? profile?.weaponType,
    rarity: character?.rarity ?? profile?.rarity,
    region: character?.region,
    releaseState: "live",
    status,
    plannerEligible: status === "verified",
    aliases: [character?.displayName ?? profile?.displayName ?? profile?.name ?? characterKey].filter(Boolean),
    notes: profile?.notes ?? [],
    sourceRefs: [],
    gemFamilyKey: profile?.gemFamilyKey ?? profile?.elementGemFamilyKey ?? "",
    normalBossMaterialKey: profile?.normalBossMaterialKey ?? profile?.normalBossMaterial ?? "",
    commonEnemyDropFamilyKey: profile?.commonEnemyMaterialFamilyId ?? profile?.enemyDropFamilyKey ?? "",
    localSpecialtyKey: profile?.localSpecialtyKey ?? profile?.localSpecialty ?? "",
    talentBookFamilyKey: profile?.talentBookSeriesKey ?? profile?.talentBookFamilyKey ?? "",
    weeklyBossMaterialKey: profile?.weeklyBossMaterialKey ?? profile?.weeklyBossMaterial ?? "",
  };
}

function buildWeaponProfileDraftFromCanonical(weaponKey: string, staticData: StaticGameData): WeaponProfileDraft | null {
  const weapon = staticData.weapons[weaponKey];
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  if (!weapon && !profile) {
    return null;
  }
  const status = profile?.status === "verified" || profile?.status === "beta" || profile?.status === "unresolved"
    ? profile.status
    : "beta";
  return {
    weaponKey,
    displayName: weapon?.displayName ?? weaponKey,
    weaponType: weapon?.weaponType ?? profile?.weaponType,
    rarity: weapon?.rarity ?? profile?.rarity ?? 4,
    acquisitionType: weapon?.acquisitionType ?? "unknown",
    refinementTrackable: weapon?.refinementTrackable ?? true,
    refinementPolicy: weapon?.refinementPolicy ?? "normal",
    limited: weapon?.limited ?? false,
    eventExclusive: weapon?.eventExclusive ?? false,
    weaponAscensionMaterialFamilyKey: profile?.weaponAscensionFamilyKey ?? "",
    eliteEnemyDropFamilyKey: profile?.eliteEnemyDropFamilyId ?? profile?.eliteEnemyFamilyKey ?? "",
    commonEnemyDropFamilyKey: profile?.commonEnemyFamilyKey ?? "",
    releaseState: "live",
    status,
    plannerEligible: Boolean(profile?.goalTrackable),
    aliases: [weapon?.displayName ?? weaponKey].filter(Boolean),
    notes: profile?.notes ?? [],
  };
}

export function cloneCanonicalRecordToPatchManifest(
  kind: PatchManifestRecordKind,
  key: string,
  staticData: StaticGameData,
  baseChangeSet: DatabaseChangeSet = createEmptyDatabaseChangeSet(),
): DatabaseChangeSet {
  let draft: unknown | null = null;
  switch (kind) {
    case "characterAssignment":
      draft = buildCharacterAssignmentDraftFromCanonical(key, staticData);
      break;
    case "weaponProfile":
      draft = buildWeaponProfileDraftFromCanonical(key, staticData);
      break;
    case "talentBookFamily": {
      const family = staticData.talentBookFamilies[key];
      if (family) {
        draft = {
          key,
          teachingsKey: family.teachings,
          teachingsName: materialDisplayName(staticData, family.teachings),
          guideKey: family.guide,
          guideName: materialDisplayName(staticData, family.guide),
          philosophiesKey: family.philosophies,
          philosophiesName: materialDisplayName(staticData, family.philosophies),
          domainKey: family.domainKey ?? "",
          domainName: family.domainName ?? "",
          availability: family.availability ?? "UNKNOWN",
          region: family.region ?? "",
          status: "verified",
          notes: [],
        } satisfies TalentBookFamilyDraft;
      }
      break;
    }
    case "weaponAscensionFamily": {
      const family = staticData.weaponAscensionMaterialFamilies[key];
      const legacy = staticData.weaponAscensionFamilies[key];
      if (family || legacy) {
        draft = {
          key,
          displayName: family?.displayName ?? key,
          twoStarKey: family?.tiers.twoStar ?? legacy?.tier1 ?? "",
          twoStarName: materialDisplayName(staticData, family?.tiers.twoStar ?? legacy?.tier1 ?? ""),
          threeStarKey: family?.tiers.threeStar ?? legacy?.tier2 ?? "",
          threeStarName: materialDisplayName(staticData, family?.tiers.threeStar ?? legacy?.tier2 ?? ""),
          fourStarKey: family?.tiers.fourStar ?? legacy?.tier3 ?? "",
          fourStarName: materialDisplayName(staticData, family?.tiers.fourStar ?? legacy?.tier3 ?? ""),
          fiveStarKey: family?.tiers.fiveStar ?? legacy?.tier4 ?? "",
          fiveStarName: materialDisplayName(staticData, family?.tiers.fiveStar ?? legacy?.tier4 ?? ""),
          domainKey: legacy?.domainKey ?? "",
          domainName: legacy?.domainName ?? family?.source.domainName ?? "",
          availability: legacy?.availability ?? "UNKNOWN",
          region: legacy?.region ?? family?.source.region ?? "",
          status: family?.status === "verified" ? "verified" : "beta",
          notes: [],
        } satisfies WeaponAscensionFamilyDraft;
      }
      break;
    }
    case "commonEnemyDropFamily": {
      const family = staticData.generalEnemyDropFamilies[key];
      if (family) {
        draft = {
          familyId: key,
          displayName: family.displayName,
          sourceEnemyFamily: family.sourceEnemyFamily,
          lowKey: family.materialKeys[0],
          lowName: family.materialNames[0],
          midKey: family.materialKeys[1],
          midName: family.materialNames[1],
          highKey: family.materialKeys[2],
          highName: family.materialNames[2],
          status: "verified",
          notes: [],
        } satisfies CommonEnemyDropFamilyDraft;
      }
      break;
    }
    case "normalBossMaterial": {
      const material = staticData.normalBossMaterials[key];
      if (material) {
        draft = {
          key,
          displayName: material.displayName,
          bossKey: material.bossKey,
          bossDisplayName: material.bossDisplayName,
          status: "verified",
          notes: [],
        } satisfies NormalBossMaterialDraft;
      }
      break;
    }
    case "localSpecialty": {
      const material = staticData.localSpecialties[key];
      if (material) {
        draft = {
          key,
          displayName: material.displayName,
          region: material.region,
          isPurchasable: material.isPurchasable,
          purchaseVendors: material.purchaseVendors,
          searchHint: material.searchHint,
          notes: [],
        } satisfies LocalSpecialtyDraft;
      }
      break;
    }
    case "standaloneMaterial": {
      const descriptor = staticData.materials[key];
      const record = staticData.materialRecords[key];
      const source = staticData.materialSources[key]?.[0];
      if (descriptor || record) {
        draft = {
          key,
          displayName: descriptor?.displayName ?? record?.displayName ?? key,
          category: descriptor?.category ?? "other",
          recordCategory: record?.category ?? "special_progression_material",
          status: record?.status === "verified" || record?.status === "beta" || record?.status === "unresolved"
            ? record.status
            : "beta",
          usedFor: record?.usedFor ?? [],
          craftable: Boolean(record?.craftable),
          conversionRatio: record?.conversionRatio,
          sourceType: source?.sourceType ?? "other",
          sourceKey: source?.sourceKey ?? key,
          sourceName: source?.sourceName ?? "",
          availability: source?.availability ?? "UNKNOWN",
          region: source?.region,
          notes: record?.notes ?? [],
        } satisfies StandaloneMaterialDraft;
      }
      break;
    }
    case "artifactDomain": {
      const domain = staticData.artifactDomains[key];
      if (domain) {
        draft = { ...domain } satisfies ArtifactDomainDraft;
      }
      break;
    }
    case "sourceDomain": {
      const mastery = staticData.domainsOfMastery[key];
      const forgery = staticData.domainsOfForgery[key];
      const trounce = staticData.trounceDomains[key];
      if (mastery || forgery || trounce) {
        draft = {
          domainKey: key,
          domainType: mastery ? "mastery" : forgery ? "forgery" : "trounce",
          name: mastery?.name ?? forgery?.name ?? trounce?.name ?? key,
          region: mastery?.region ?? forgery?.region ?? trounce?.region ?? "",
          location: mastery?.location ?? forgery?.location ?? trounce?.location ?? "",
          availability: "UNKNOWN",
          linkedFamilyKeys: mastery?.talentFamilies ?? forgery?.weaponAscensionFamilies ?? [],
          listedRewards: mastery?.listedRewards ?? forgery?.listedRewards ?? trounce?.weeklyTalentMaterials ?? [],
          elements: mastery?.elements ?? forgery?.elements ?? [],
          notes: [],
        } satisfies SourceDomainDraft;
      }
      break;
    }
    case "weeklyBossGroup": {
      const material = staticData.weeklyBossMaterials[key];
      const source = material?.source.type === "weekly_boss" ? material.source : null;
      const bossKey = source?.bossKey ?? key;
      if (material && source) {
        const drops = Object.values(staticData.weeklyBossMaterials)
          .filter((entry) => entry.source.type === "weekly_boss" && entry.source.bossKey === bossKey)
          .slice(0, 3)
          .map((entry) => ({ key: entry.key, displayName: entry.displayName }));
        while (drops.length < 3) {
          drops.push({ key: `${bossKey}Drop${drops.length + 1}`, displayName: "" });
        }
        draft = {
          sourceKey: bossKey,
          bossKey,
          bossName: source.bossName ?? "",
          domainName: source.domainName ?? source.bossName ?? "",
          status: material.status === "verified" || material.status === "beta" || material.status === "unresolved"
            ? material.status
            : "beta",
          notes: material.notes ?? [],
          drops: [drops[0], drops[1], drops[2]],
        } satisfies WeeklyBossGroupDraft;
      }
      break;
    }
  }

  if (!draft) {
    return baseChangeSet;
  }
  return withPatchManifestMetadata(
    upsertPatchManifestDraft(baseChangeSet, kind, key, draft),
    kind,
    key,
    "modify",
    key,
  );
}

export function renamePatchManifestRecord(
  changeSet: DatabaseChangeSet,
  kind: PatchManifestRecordKind,
  oldKey: string,
  newKey: string,
): DatabaseChangeSet {
  const normalizedKey = newKey.trim();
  if (!normalizedKey || normalizedKey === oldKey) {
    return changeSet;
  }
  const draft = getPatchManifestDraft(changeSet, kind, oldKey);
  if (!draft || getPatchManifestDraft(changeSet, kind, normalizedKey)) {
    return changeSet;
  }
  const oldMetadataKey = getPatchManifestRecordMetadataKey(kind, oldKey);
  const newMetadataKey = getPatchManifestRecordMetadataKey(kind, normalizedKey);
  const metadata = { ...(changeSet.recordMetadata ?? {}) };
  const oldMetadata = metadata[oldMetadataKey];
  delete metadata[oldMetadataKey];
  const withoutOldDraft = withoutPatchManifestDraft({ ...changeSet, recordMetadata: metadata }, kind, oldKey);
  return upsertPatchManifestDraft(
    {
      ...withoutOldDraft,
      recordMetadata: {
        ...(withoutOldDraft.recordMetadata ?? {}),
        [newMetadataKey]: {
          ...(oldMetadata ?? createPatchManifestMetadata(kind, normalizedKey, "new")),
          id: newMetadataKey,
          kind,
          updatedAt: new Date().toISOString(),
        },
      },
    },
    kind,
    normalizedKey,
    renameDraftInternalKey(kind, draft, normalizedKey),
  );
}

export function deletePatchManifestRecord(
  changeSet: DatabaseChangeSet,
  kind: PatchManifestRecordKind,
  key: string,
): DatabaseChangeSet {
  const next = withoutPatchManifestDraft(changeSet, kind, key);
  const metadata = { ...(next.recordMetadata ?? {}) };
  delete metadata[getPatchManifestRecordMetadataKey(kind, key)];
  return { ...next, recordMetadata: metadata };
}

export function validatePatchManifestRecord(
  kind: PatchManifestRecordKind,
  key: string,
  draft: unknown,
  staticData: StaticGameData,
): ChangeSetValidationIssue[] {
  const changeSet = upsertPatchManifestDraft(createEmptyDatabaseChangeSet(), kind, key, draft);
  return validateChangeSet(changeSet, staticData).filter((issue) => issue.entityType === kind || issue.entityKey === key);
}

export type DatabasePatchManifest = DatabaseChangeSet;
export const createEmptyPatchManifest = createEmptyDatabaseChangeSet;
export const compilePatchManifestToOverridePack = compileChangeSetToOverridePack;
export const exportPatchManifestToCanonicalBundle = exportChangeSetToCanonicalBundle;
export const validatePatchManifest = validateChangeSet;
