import type { AvailabilityGroupKey } from "../planner/types";
import type {
  CharacterCatalogEntry,
  CharacterElement,
  CharacterMaterialProfile,
  CharacterWeaponType,
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
  WeaponAscensionFamily,
  WeaponAscensionMaterialFamilyRecord,
  WeeklyBossMaterial,
  NormalBossMaterial,
} from "./types";

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

export interface DatabaseChangeSet {
  version: 1;
  label: string;
  releaseTag: string;
  notes: string;
  weeklyBossGroups: Record<string, WeeklyBossGroupDraft>;
  talentBookFamilies: Record<string, TalentBookFamilyDraft>;
  weaponAscensionFamilies: Record<string, WeaponAscensionFamilyDraft>;
  commonEnemyDropFamilies: Record<string, CommonEnemyDropFamilyDraft>;
  normalBossMaterials: Record<string, NormalBossMaterialDraft>;
  localSpecialties: Record<string, LocalSpecialtyDraft>;
  standaloneMaterials: Record<string, StandaloneMaterialDraft>;
  characters: Record<string, CharacterMaterialAssignmentDraft>;
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
    weeklyBossGroups: {},
    talentBookFamilies: {},
    weaponAscensionFamilies: {},
    commonEnemyDropFamilies: {},
    normalBossMaterials: {},
    localSpecialties: {},
    standaloneMaterials: {},
    characters: {},
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
    Object.keys(changeSet.characters).length
  );
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
  usedFor: string[],
  options: {
    familyKey?: string;
    tier?: number | string;
    rarity?: string | null;
    craftable?: boolean;
    conversionRatio?: number;
    notes?: string[];
  } = {},
): void {
  target[materialKey] = {
    key: materialKey,
    displayName,
    category,
    familyKey: options.familyKey,
    rarity: options.rarity ?? null,
    source,
    sourceKeys: [sourceKey],
    status,
    usedFor,
    craftable: options.craftable ?? false,
    conversionRatio: options.conversionRatio,
    notes: options.notes ?? [],
    tier: options.tier,
    legacyCategory: runtimeCategory,
  } as MaterialRecord;
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
    version: 1,
    label: patch.label ?? base.label,
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
    enemyDropFamilies: { ...(base.enemyDropFamilies ?? {}), ...(patch.enemyDropFamilies ?? {}) },
    normalBossMaterials: { ...(base.normalBossMaterials ?? {}), ...(patch.normalBossMaterials ?? {}) },
    localSpecialties: { ...(base.localSpecialties ?? {}), ...(patch.localSpecialties ?? {}) },
    materialSources: { ...(base.materialSources ?? {}), ...(patch.materialSources ?? {}) },
  };
}

export function compileChangeSetToOverridePack(changeSet: DatabaseChangeSet): OverrideDataPack {
  const overridePack: OverrideDataPack = {
    version: 1,
    label: changeSet.label || "Database Change Set Preview",
    characters: {},
    materials: {},
    materialRecords: {},
    characterMaterialProfiles: {},
    weeklyBossMaterials: {},
    talentBookFamilies: {},
    weaponAscensionFamilies: {},
    weaponAscensionMaterialFamilies: {},
    generalEnemyDropFamilies: {},
    enemyDropFamilies: {},
    normalBossMaterials: {},
    localSpecialties: {},
    materialSources: {},
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
      availableDays: family.availability === "MON_THU_SUN"
        ? ["Monday", "Thursday", "Sunday"]
        : family.availability === "TUE_FRI_SUN"
          ? ["Tuesday", "Friday", "Sunday"]
          : family.availability === "WED_SAT_SUN"
            ? ["Wednesday", "Saturday", "Sunday"]
            : [],
    };
    const materials = [
      { key: family.teachingsKey, displayName: family.teachingsName, tier: 0 },
      { key: family.guideKey, displayName: family.guideName, tier: 1 },
      { key: family.philosophiesKey, displayName: family.philosophiesName, tier: 2 },
    ];
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
        availableDays: family.availability === "MON_THU_SUN"
          ? ["Monday", "Thursday", "Sunday"]
          : family.availability === "TUE_FRI_SUN"
            ? ["Tuesday", "Friday", "Sunday"]
            : family.availability === "WED_SAT_SUN"
              ? ["Wednesday", "Saturday", "Sunday"]
              : [],
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
      availableDays: family.availability === "MON_THU_SUN"
        ? ["Monday", "Thursday", "Sunday"]
        : family.availability === "TUE_FRI_SUN"
          ? ["Tuesday", "Friday", "Sunday"]
          : family.availability === "WED_SAT_SUN"
            ? ["Wednesday", "Saturday", "Sunday"]
            : [],
    };
    const materials = [
      { key: family.twoStarKey, displayName: family.twoStarName, tier: 0, rarity: "2-Star" },
      { key: family.threeStarKey, displayName: family.threeStarName, tier: 1, rarity: "3-Star" },
      { key: family.fourStarKey, displayName: family.fourStarName, tier: 2, rarity: "4-Star" },
      { key: family.fiveStarKey, displayName: family.fiveStarName, tier: 3, rarity: "5-Star" },
    ];
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
          rarity: material.rarity,
          craftable: true,
          conversionRatio: 3,
          notes: family.notes,
        },
      );
      overridePack.materialSources![material.key] = createWeaponAscensionMaterialSource(material.key, family);
    }
  }

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
    const source = {
      type: "enemy_drop" as const,
      enemyFamily: family.sourceEnemyFamily,
    };
    const materials = [
      { key: family.lowKey, displayName: family.lowName, tier: 1 },
      { key: family.midKey, displayName: family.midName, tier: 2 },
      { key: family.highKey, displayName: family.highName, tier: 3 },
    ];
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
      material.usedFor,
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

export function validateChangeSet(changeSet: DatabaseChangeSet, staticData: StaticGameData): ChangeSetValidationIssue[] {
  const issues: ChangeSetValidationIssue[] = [];

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
    if (draft.gemFamilyKey && !staticData.elementGemFamilies[draft.gemFamilyKey] && !changeSet.talentBookFamilies[draft.gemFamilyKey]) {
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
