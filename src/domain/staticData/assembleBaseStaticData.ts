import { canonicalDatabase } from "../../data/database";
import { buildLocalSpecialtyRegionIndex } from "./normalizeStaticDataMaterialReferences";
import type {
  CharacterCatalogEntry,
  CharacterMaterialProfile,
  CharacterMaterialStatus,
  CharacterProgressionEntry,
  LocalSpecialtySource,
  MaterialCategory,
  MaterialRecord,
  MaterialRecordCategory,
  MaterialSourceRecord,
  MaterialStatus,
  StaticGameData,
  TravelerElementKey,
  TravelerElementProfile,
  TravelerProfile,
  WeaponCatalogEntry,
  WeaponMaterialProfile,
  WeaponProgressionEntry,
  WeaponAscensionFamily,
  MaterialFamilyReference,
  UnresolvedCharacterMaterialReference,
} from "./types";
import type { CanonicalCharacterProfile, CanonicalMaterialRecord, CanonicalRecordStatus, CanonicalTravelerProfile, CanonicalWeaponProfile } from "../../data/database/schema";
import type { CraftingRecipe } from "../crafting/types";

function mapCanonicalStatusToMaterialStatus(status: CanonicalRecordStatus): MaterialStatus {
  switch (status) {
    case "verified":
      return "verified";
    case "beta":
      return "beta";
    case "unresolved":
      return "unresolved";
    default:
      return "needs_manual_review";
  }
}

function mapCanonicalStatusToCharacterStatus(status: CanonicalRecordStatus): CharacterMaterialStatus {
  switch (status) {
    case "verified":
      return "verified";
    case "beta":
      return "beta";
    case "unresolved":
      return "unresolved";
    default:
      return "needs_manual_review";
  }
}

function mapCanonicalMaterialCategory(category: string): MaterialCategory {
  switch (category) {
    case "currency":
      return "mora";
    case "character_exp":
      return "character_exp";
    case "weapon_exp":
      return "weapon_exp_material";
    case "elemental_gem":
      return "gemstone";
    case "common_enemy_drop":
      return "general_enemy_drop";
    case "elite_enemy_drop":
      return "elite_enemy_drop";
    case "normal_boss_material":
      return "normal_boss_material";
    case "weekly_boss_material":
      return "weekly_boss";
    case "talent_book":
      return "talent_book";
    case "weapon_ascension_material":
      return "weapon_ascension";
    case "local_specialty":
      return "local_specialty";
    case "special_progression_material":
      return "other";
    default:
      return (category as MaterialCategory) ?? "other";
  }
}

function mapRecordCategory(material: CanonicalMaterialRecord): MaterialRecordCategory | null {
  switch (material.recordCategory) {
    case "ascension_gem":
    case "general_enemy_drop":
    case "elite_enemy_drop":
    case "weapon_ascension_material":
    case "weapon_exp_material":
    case "weapon_fodder_exp":
    case "local_specialty":
    case "normal_boss_material":
    case "character_talent_material":
    case "weekly_boss_material":
    case "special_progression_material":
      return material.recordCategory;
    default:
      switch (material.category) {
        case "elemental_gem":
          return "ascension_gem";
        case "weapon_exp":
          return "weapon_exp_material";
        case "local_specialty":
          return "local_specialty";
        case "normal_boss_material":
          return "normal_boss_material";
        case "weekly_boss_material":
          return "weekly_boss_material";
        case "talent_book":
          return "character_talent_material";
        case "weapon_ascension_material":
          return "weapon_ascension_material";
        case "common_enemy_drop":
          return "general_enemy_drop";
        case "elite_enemy_drop":
          return "elite_enemy_drop";
        case "special_progression_material":
          return "special_progression_material";
        default:
          return null;
      }
  }
}

function buildCharacterCatalogEntry(profile: CanonicalCharacterProfile): CharacterCatalogEntry {
  return {
    key: profile.characterKey,
    displayName: profile.displayName,
    element: profile.element,
    weaponType: profile.weaponType,
    rarity: profile.rarity,
    region: profile.region ?? undefined,
    playable: profile.status !== "ignored",
    characterKind: profile.status === "ignored" ? "non_playable" : undefined,
  };
}

function buildCharacterMaterialProfile(profile: CanonicalCharacterProfile): CharacterMaterialProfile {
  return {
    characterKey: profile.characterKey,
    name: profile.displayName,
    displayName: profile.displayName,
    weaponType: profile.weaponType,
    rarity: profile.rarity,
    element: profile.element,
    gemFamilyKey: profile.elementGemFamilyKey,
    elementGemFamilyKey: profile.elementGemFamilyKey,
    normalBossMaterialKey: profile.normalBossMaterialKey,
    normalBossMaterial: profile.normalBossMaterialKey,
    commonEnemyMaterialFamilyId: profile.commonEnemyDropFamilyKey,
    enemyDropFamilyKey: profile.commonEnemyDropFamilyKey,
    localSpecialtyKey: profile.localSpecialtyKey,
    localSpecialty: profile.localSpecialtyKey,
    talentBookSeriesKey: profile.talentBookFamilyKey,
    talentBookFamilyKey: profile.talentBookFamilyKey,
    weeklyBossMaterialKey: profile.weeklyBossMaterialKey,
    weeklyBossMaterial: profile.weeklyBossMaterialKey,
    status: mapCanonicalStatusToCharacterStatus(profile.status),
    notes: profile.notes,
    sourceVersion: profile.sourceRefs?.join("; "),
  };
}

function buildTravelerRuntimeProfile(profile: CanonicalTravelerProfile): TravelerProfile {
  return {
    baseCharacterKey: "Traveler",
    displayName: "Traveler",
    sharedLevelProfileKey: "Traveler",
    availableElements: Object.keys(profile.elementVariants).map((element) => `traveler_${element.toLowerCase()}` as TravelerElementKey),
  };
}

function buildTravelerElementProfiles(profile: CanonicalTravelerProfile): Record<TravelerElementKey, TravelerElementProfile> {
  return Object.fromEntries(
    Object.entries(profile.elementVariants).map(([element, variant]) => {
      const key = `traveler_${element.toLowerCase()}` as TravelerElementKey;
      return [
        key,
      {
        key,
        displayName: `Traveler (${element})`,
        element: variant.element,
        playable: true,
        characterKind: "traveler_element",
        talentBookFamilyKey: variant.talentBookFamilyKey,
        commonEnemyDropFamilyKey: variant.commonEnemyDropFamilyKey,
        weeklyBossMaterialKey: variant.weeklyBossMaterialKey || undefined,
        status: variant.status === "verified" ? "complete" : "partial",
        warnings: variant.notes.length > 0 ? variant.notes : undefined,
      },
      ];
    }),
  ) as Record<TravelerElementKey, TravelerElementProfile>;
}

function buildTravelerElementCatalogEntries(profile: CanonicalTravelerProfile): Record<TravelerElementKey, CharacterCatalogEntry> {
  return Object.fromEntries(
    Object.entries(profile.elementVariants).map(([element, variant]) => {
      const key = `traveler_${element.toLowerCase()}` as TravelerElementKey;
      return [
        key,
        {
          key,
          displayName: `Traveler (${element})`,
          element: variant.element,
          weaponType: "Sword",
          rarity: 5,
          playable: true,
          characterKind: "traveler_element",
          region: "Mondstadt",
        },
      ];
    }),
  ) as Record<TravelerElementKey, CharacterCatalogEntry>;
}

function buildTravelerCharacterMaterialProfile(profile: CanonicalTravelerProfile): CharacterMaterialProfile {
  return {
    characterKey: "Traveler",
    name: "Traveler",
    displayName: "Traveler",
    weaponType: profile.weaponType,
    rarity: profile.rarity,
    element: "Anemo",
    gemFamilyKey: "Traveler",
    elementGemFamilyKey: "Traveler",
    normalBossMaterialKey: "",
    normalBossMaterial: "",
    commonEnemyMaterialFamilyId: profile.commonEnemyDropFamilyKey,
    enemyDropFamilyKey: profile.commonEnemyDropFamilyKey,
    localSpecialtyKey: profile.localSpecialtyKey,
    localSpecialty: profile.localSpecialtyKey,
    talentBookSeriesKey: "",
    talentBookFamilyKey: "",
    weeklyBossMaterialKey: "",
    weeklyBossMaterial: "",
    status: "verified",
    notes: profile.notes,
  };
}

function buildTravelerElementMaterialProfiles(profile: CanonicalTravelerProfile): Record<TravelerElementKey, CharacterMaterialProfile> {
  return Object.fromEntries(
    Object.entries(profile.elementVariants).map(([element, variant]) => {
      const key = `traveler_${element.toLowerCase()}` as TravelerElementKey;
      return [
        key,
        {
          characterKey: key,
          name: `Traveler (${element})`,
          displayName: `Traveler (${element})`,
          weaponType: "Sword",
          rarity: 5,
          element: variant.element,
          gemFamilyKey: variant.element,
          elementGemFamilyKey: variant.element,
          normalBossMaterialKey: "",
          normalBossMaterial: "",
          commonEnemyMaterialFamilyId: variant.commonEnemyDropFamilyKey,
          enemyDropFamilyKey: variant.commonEnemyDropFamilyKey,
          localSpecialtyKey: "",
          localSpecialty: "",
          talentBookSeriesKey: variant.talentBookFamilyKey,
          talentBookFamilyKey: variant.talentBookFamilyKey,
          weeklyBossMaterialKey: variant.weeklyBossMaterialKey,
          weeklyBossMaterial: variant.weeklyBossMaterialKey,
          status: variant.status === "verified" ? "verified" : "unresolved",
          notes: variant.notes,
        },
      ];
    }),
  ) as Record<TravelerElementKey, CharacterMaterialProfile>;
}

function buildWeaponCatalogEntry(profile: CanonicalWeaponProfile): WeaponCatalogEntry {
  return {
    key: profile.weaponKey,
    displayName: profile.displayName,
    weaponType: profile.weaponType ?? undefined,
    rarity: profile.rarity,
  };
}

function buildWeaponMaterialProfile(profile: CanonicalWeaponProfile): WeaponMaterialProfile {
  return {
    weaponKey: profile.weaponKey,
    rarity: profile.rarity,
    weaponType: profile.weaponType ?? undefined,
    weaponAscensionFamilyKey: profile.weaponAscensionMaterialFamilyKey,
    eliteEnemyDropFamilyId: profile.eliteEnemyDropFamilyKey,
    eliteEnemyFamilyKey: profile.eliteEnemyDropFamilyKey,
    commonEnemyFamilyKey: profile.commonEnemyDropFamilyKey,
    goalTrackable: profile.plannerEligible,
    status: mapCanonicalStatusToMaterialStatus(profile.status),
    notes: profile.notes,
  };
}

function buildMaterialDescriptor(material: CanonicalMaterialRecord) {
  return {
    key: material.materialKey,
    displayName: material.displayName,
    category: mapCanonicalMaterialCategory(material.legacyCategory),
    characterExpValue: material.characterExpValue ?? undefined,
    weaponExpValue: material.weaponExpValue ?? undefined,
  };
}

function buildMaterialRecord(material: CanonicalMaterialRecord): MaterialRecord | null {
  const category = mapRecordCategory(material);
  if (!category) {
    return null;
  }

  return {
    key: material.materialKey,
    displayName: material.displayName,
    category,
    rarity: material.rarity as MaterialRecord["rarity"] | undefined,
    expValue: material.weaponExpValue ?? undefined,
    familyKey: material.familyKey ?? undefined,
    source: (material.source as MaterialRecord["source"]) ?? { type: "unresolved", reason: "Missing canonical source metadata." },
    usedFor: material.usedFor as MaterialRecord["usedFor"],
    craftable: material.craftable,
    conversionRatio: material.conversionRatio ?? undefined,
    status: mapCanonicalStatusToMaterialStatus(material.status),
    notes: material.notes,
  };
}

function buildCompatibilityEnemyDropFamilies(staticData: Pick<StaticGameData, "generalEnemyDropFamilies" | "eliteEnemyDropFamilies">) {
  const compatibility: StaticGameData["enemyDropFamilies"] = {};

  for (const family of Object.values(staticData.generalEnemyDropFamilies)) {
    compatibility[family.familyId] = {
      key: family.familyId,
      low: family.materialKeys[0],
      mid: family.materialKeys[1],
      high: family.materialKeys[2],
    };
  }

  for (const family of Object.values(staticData.eliteEnemyDropFamilies)) {
    compatibility[family.familyId] = {
      key: family.familyId,
      low: family.materialKeys[0],
      mid: family.materialKeys[1],
      high: family.materialKeys[2],
    };
  }

  return compatibility;
}

function buildLocalSpecialtySources(localSpecialties: StaticGameData["localSpecialties"]): Record<string, LocalSpecialtySource> {
  return Object.fromEntries(
    Object.values(localSpecialties).map((specialty) => [
      specialty.key,
      {
        key: specialty.key,
        materialKey: specialty.key,
        region: specialty.region,
        notes: specialty.searchHint,
      },
    ]),
  );
}

function buildMaterialFamilyByKey(
  generalEnemyDropFamilies: StaticGameData["generalEnemyDropFamilies"],
  eliteEnemyDropFamilies: StaticGameData["eliteEnemyDropFamilies"],
): Record<string, MaterialFamilyReference> {
  const records: Record<string, MaterialFamilyReference> = {};

  for (const family of Object.values(generalEnemyDropFamilies)) {
    for (const materialKey of family.materialKeys) {
      records[materialKey] = {
        familyId: family.familyId,
        displayName: family.displayName,
        category: "general_enemy_drop",
        sourceType: "Common Enemies and some Elite Enemies",
        sourceEnemyFamily: family.sourceEnemyFamily,
      };
    }
  }

  for (const family of Object.values(eliteEnemyDropFamilies)) {
    for (const materialKey of family.materialKeys) {
      records[materialKey] = {
        familyId: family.familyId,
        displayName: family.displayName,
        category: "elite_enemy_drop",
        sourceType: "Elite Enemies",
        sourceEnemyFamily: family.sourceEnemyFamily,
      };
    }
  }

  return records;
}

function buildUnresolvedCharacterMaterialReferences(
  profiles: Record<string, CanonicalCharacterProfile>,
): UnresolvedCharacterMaterialReference[] {
  const rows: UnresolvedCharacterMaterialReference[] = [];
  const slots: Array<{
    field: keyof CanonicalCharacterProfile;
    materialSlot: UnresolvedCharacterMaterialReference["materialSlot"];
  }> = [
    { field: "elementGemFamilyKey", materialSlot: "ascensionGem" },
    { field: "normalBossMaterialKey", materialSlot: "normalBossMaterial" },
    { field: "commonEnemyDropFamilyKey", materialSlot: "enemyDrop" },
    { field: "localSpecialtyKey", materialSlot: "localSpecialty" },
    { field: "talentBookFamilyKey", materialSlot: "talentBook" },
    { field: "weeklyBossMaterialKey", materialSlot: "weeklyBossMaterial" },
  ];

  for (const profile of Object.values(profiles)) {
    if (profile.status === "verified" || profile.status === "ignored") {
      continue;
    }
    for (const slot of slots) {
      const rawValue = String(profile[slot.field] ?? "");
      if (rawValue.trim() !== "") {
        continue;
      }
      rows.push({
        characterKey: profile.characterKey,
        displayName: profile.displayName,
        materialSlot: slot.materialSlot,
        rawName: "???",
        generatedKey: "",
        reason: `Canonical ${slot.field} is unresolved.`,
        status: "unresolved",
      });
    }
  }

  return rows;
}

function cloneRecipes<T extends Record<string, CraftingRecipe>>(recipes: T): T {
  return JSON.parse(JSON.stringify(recipes)) as T;
}

export function assembleBaseStaticData(): StaticGameData {
  const characterProfiles = canonicalDatabase.characters.characterProfiles;
  const travelerProfile = canonicalDatabase.characters.travelerProfile;
  const travelerElementCatalogEntries = buildTravelerElementCatalogEntries(travelerProfile);
  const travelerElementMaterialProfiles = buildTravelerElementMaterialProfiles(travelerProfile);
  const weaponProfiles = canonicalDatabase.weapons.weaponProfiles;
  const materialDefinitions = canonicalDatabase.materials.materials;

  const characters: StaticGameData["characters"] = Object.fromEntries(
    Object.values(characterProfiles).map((profile) => [profile.characterKey, buildCharacterCatalogEntry(profile)]),
  );
  characters.Traveler = {
    key: "Traveler",
    displayName: "Traveler",
    element: "Anemo",
    weaponType: "Sword",
    rarity: 5,
    playable: true,
    characterKind: "traveler",
    region: "Mondstadt",
  };
  Object.assign(characters, travelerElementCatalogEntries);
  characters.Manekin = characters.Manekin ?? {
    key: "Manekin",
    displayName: "Manekin",
    playable: false,
    characterKind: "non_playable",
  };
  characters.Manekina = characters.Manekina ?? {
    key: "Manekina",
    displayName: "Manekina",
    playable: false,
    characterKind: "non_playable",
  };

  const characterMaterialProfiles: StaticGameData["characterMaterialProfiles"] = Object.fromEntries(
    Object.values(characterProfiles).map((profile) => [profile.characterKey, buildCharacterMaterialProfile(profile)]),
  );
  characterMaterialProfiles.Traveler = buildTravelerCharacterMaterialProfile(travelerProfile);
  Object.assign(characterMaterialProfiles, travelerElementMaterialProfiles);

  const weapons: StaticGameData["weapons"] = Object.fromEntries(
    Object.values(weaponProfiles).map((profile) => [profile.weaponKey, buildWeaponCatalogEntry(profile)]),
  );
  const weaponMaterialProfiles: StaticGameData["weaponMaterialProfiles"] = Object.fromEntries(
    Object.values(weaponProfiles).map((profile) => [profile.weaponKey, buildWeaponMaterialProfile(profile)]),
  );

  const materials: StaticGameData["materials"] = Object.fromEntries(
    Object.values(materialDefinitions).map((material) => [material.materialKey, buildMaterialDescriptor(material)]),
  );
  const materialRecords: StaticGameData["materialRecords"] = Object.fromEntries(
    Object.values(materialDefinitions)
      .map((material) => buildMaterialRecord(material))
      .filter((record): record is MaterialRecord => record !== null)
      .map((record) => [record.key, record]),
  );

  const localSpecialtySources = buildLocalSpecialtySources(canonicalDatabase.materials.localSpecialties);
  const baseRecipes = cloneRecipes(canonicalDatabase.crafting.recipes);
  const staticData: StaticGameData = {
    version: canonicalDatabase.version,
    characters,
    travelerProfile: buildTravelerRuntimeProfile(travelerProfile),
    travelerElementProfiles: buildTravelerElementProfiles(travelerProfile),
    materials,
    weapons,
    universalCharacterProgressionCore: canonicalDatabase.progression.universalCharacterProgressionCore,
    universalTalentProgressionCore: canonicalDatabase.progression.universalTalentProgressionCore,
    universalWeaponProgressionCore: canonicalDatabase.progression.universalWeaponProgressionCore,
    weaponAscensionPhaseCaps: canonicalDatabase.progression.weaponAscensionPhaseCaps,
    weaponExpMaterials: canonicalDatabase.progression.weaponExpMaterials,
    weaponExpRequirements: canonicalDatabase.progression.weaponExpRequirements,
    weaponExpTotals1To90: canonicalDatabase.progression.weaponExpTotals1To90,
    weaponAscensionCosts: canonicalDatabase.progression.weaponAscensionCosts,
    weaponAscensionTotals20To90: canonicalDatabase.progression.weaponAscensionTotals20To90,
    elementGemFamilies: canonicalDatabase.materials.elementalGemFamilies,
    talentBookFamilies: canonicalDatabase.materials.talentBookFamilies,
    enemyDropFamilies: {},
    generalEnemyDropFamilies: canonicalDatabase.materials.commonEnemyDropFamilies,
    eliteEnemyDropFamilies: canonicalDatabase.materials.eliteEnemyDropFamilies,
    weaponAscensionMaterialFamilies: canonicalDatabase.materials.weaponAscensionMaterialFamilies,
    localSpecialties: canonicalDatabase.materials.localSpecialties,
    localSpecialtiesByRegion: buildLocalSpecialtyRegionIndex(canonicalDatabase.materials.localSpecialties),
    normalBossMaterials: canonicalDatabase.materials.normalBossMaterials,
    weeklyBossMaterials: canonicalDatabase.materials.weeklyBossMaterials,
    specialProgressionMaterials: canonicalDatabase.materials.specialProgressionMaterials,
    materialRecords,
    tieredMaterialIndex: canonicalDatabase.crafting.tieredMaterialIndex,
    weaponAscensionFamilies: canonicalDatabase.compatibility.weaponAscensionFamilies as Record<string, WeaponAscensionFamily>,
    localSpecialtySources,
    characterMaterialProfiles,
    weaponMaterialProfiles,
    characterProgressions: canonicalDatabase.progression.legacyCharacterProgressions as Record<string, CharacterProgressionEntry>,
    weaponProgressions: canonicalDatabase.progression.legacyWeaponProgressions as Record<string, WeaponProgressionEntry>,
    legacyCharacterProgressions: canonicalDatabase.progression.legacyCharacterProgressions as Record<string, CharacterProgressionEntry>,
    legacyWeaponProgressions: canonicalDatabase.progression.legacyWeaponProgressions as Record<string, WeaponProgressionEntry>,
    materialSources: canonicalDatabase.sources.materialSources as Record<string, MaterialSourceRecord[]>,
    materialFamilyByKey: buildMaterialFamilyByKey(
      canonicalDatabase.materials.commonEnemyDropFamilies,
      canonicalDatabase.materials.eliteEnemyDropFamilies,
    ),
    characterGeneralEnemyDropFamilyByKey: {},
    weaponGeneralEnemyDropFamilyByKey: {},
    weaponEliteEnemyDropFamilyByKey: {},
    generalEnemyDropCharacterReferences: [],
    unresolvedCharacterReferences: [],
    unresolvedCharacterMaterialReferences: buildUnresolvedCharacterMaterialReferences(characterProfiles),
    unresolvedWeaponReferences: [],
    artifactDomains: canonicalDatabase.artifacts.artifactDomains,
    recipes: baseRecipes,
    craftingRecipes: cloneRecipes(baseRecipes),
    craftingUtilityPassives: canonicalDatabase.crafting.craftingUtilityPassives,
    craftingPlannerDefaults: canonicalDatabase.crafting.craftingPlannerDefaults,
    gemConversionDefaults: canonicalDatabase.crafting.gemConversionDefaults,
    resinRules: canonicalDatabase.sources.resinRules,
    resinSystem: canonicalDatabase.sources.resinSystem,
    resinActivityCosts: canonicalDatabase.sources.resinActivityCosts,
    leyLineRewardsByWorldLevel: canonicalDatabase.sources.leyLineRewardsByWorldLevel,
    domainsOfForgery: canonicalDatabase.sources.domainsOfForgery,
    domainsOfMastery: canonicalDatabase.sources.domainsOfMastery,
    trounceDomains: canonicalDatabase.sources.trounceDomains,
    weaponAscensionDomainDropModel: canonicalDatabase.sources.weaponAscensionDomainDropModel,
    talentBookDomainDropModel: canonicalDatabase.sources.talentBookDomainDropModel,
    normalBossAscensionGemDropsByWorldLevel: canonicalDatabase.sources.normalBossAscensionGemDropsByWorldLevel,
    weeklyBossAscensionGemDropsByWorldLevel: canonicalDatabase.sources.weeklyBossAscensionGemDropsByWorldLevel,
    normalBossUniqueMaterialDropMeanByWorldLevel: canonicalDatabase.sources.normalBossUniqueMaterialDropMeanByWorldLevel,
    weeklyTalentMaterialDropMeanByWorldLevel: canonicalDatabase.sources.weeklyTalentMaterialDropMeanByWorldLevel,
    bossGemThreeStarRollMean: canonicalDatabase.sources.bossGemThreeStarRollMean,
    bossGemDropPackMeanByRewardLevel: canonicalDatabase.sources.bossGemDropPackMeanByRewardLevel,
    bossGemDropPackRarityDistribution: canonicalDatabase.sources.bossGemDropPackRarityDistribution,
    plannerDefaults: canonicalDatabase.sources.plannerDefaults,
    appliedOverrideKeys: [],
  };

  staticData.enemyDropFamilies = buildCompatibilityEnemyDropFamilies(staticData);
  return staticData;
}
