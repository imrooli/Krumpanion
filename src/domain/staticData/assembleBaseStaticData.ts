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
    gameId: profile.gameId, aliases: profile.aliases, provenance: profile.provenance,
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
  const refinementPolicy =
    profile.refinementPolicy ??
    (profile.refinementTrackable === false
      ? "not_trackable"
      : profile.rarity === 5
        ? "manual_review"
        : "normal");
  return {
    key: profile.weaponKey,
    gameId: profile.gameId, aliases: profile.aliases, provenance: profile.provenance,
    displayName: profile.displayName,
    weaponType: profile.weaponType ?? undefined,
    rarity: profile.rarity,
    acquisitionType: profile.acquisitionType ?? "unknown",
    refinementTrackable: profile.refinementTrackable ?? profile.rarity >= 3,
    refinementPolicy,
    limited: profile.limited ?? false,
    eventExclusive: profile.eventExclusive ?? false,
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
    gameId: material.gameId, aliases: material.aliases, provenance: material.provenance,
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
    gameId: material.gameId, aliases: material.aliases, provenance: material.provenance,
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

export function assembleBaseStaticData(database = canonicalDatabase): StaticGameData {
  const characterProfiles = database.characters.characterProfiles;
  const travelerProfile = database.characters.travelerProfile;
  const travelerElementCatalogEntries = buildTravelerElementCatalogEntries(travelerProfile);
  const travelerElementMaterialProfiles = buildTravelerElementMaterialProfiles(travelerProfile);
  const weaponProfiles = database.weapons.weaponProfiles;
  const materialDefinitions = database.materials.materials;

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

  const localSpecialtySources = buildLocalSpecialtySources(database.materials.localSpecialties);
  const baseRecipes = cloneRecipes(database.crafting.recipes);
  const staticData: StaticGameData = {
    version: database.version,
    characters,
    travelerProfile: buildTravelerRuntimeProfile(travelerProfile),
    travelerElementProfiles: buildTravelerElementProfiles(travelerProfile),
    materials,
    weapons,
    universalCharacterProgressionCore: database.progression.universalCharacterProgressionCore,
    universalTalentProgressionCore: database.progression.universalTalentProgressionCore,
    universalWeaponProgressionCore: database.progression.universalWeaponProgressionCore,
    weaponAscensionPhaseCaps: database.progression.weaponAscensionPhaseCaps,
    weaponExpMaterials: database.progression.weaponExpMaterials,
    weaponExpRequirements: database.progression.weaponExpRequirements,
    weaponExpTotals1To90: database.progression.weaponExpTotals1To90,
    weaponAscensionCosts: database.progression.weaponAscensionCosts,
    weaponAscensionTotals20To90: database.progression.weaponAscensionTotals20To90,
    elementGemFamilies: database.materials.elementalGemFamilies,
    talentBookFamilies: database.materials.talentBookFamilies,
    enemyDropFamilies: {},
    generalEnemyDropFamilies: database.materials.commonEnemyDropFamilies,
    eliteEnemyDropFamilies: database.materials.eliteEnemyDropFamilies,
    weaponAscensionMaterialFamilies: database.materials.weaponAscensionMaterialFamilies,
    localSpecialties: database.materials.localSpecialties,
    localSpecialtiesByRegion: buildLocalSpecialtyRegionIndex(database.materials.localSpecialties),
    normalBossMaterials: database.materials.normalBossMaterials,
    weeklyBossMaterials: database.materials.weeklyBossMaterials,
    specialProgressionMaterials: database.materials.specialProgressionMaterials,
    materialRecords,
    tieredMaterialIndex: database.crafting.tieredMaterialIndex,
    weaponAscensionFamilies: database.compatibility.weaponAscensionFamilies as Record<string, WeaponAscensionFamily>,
    localSpecialtySources,
    characterMaterialProfiles,
    weaponMaterialProfiles,
    characterProgressions: database.progression.legacyCharacterProgressions as Record<string, CharacterProgressionEntry>,
    weaponProgressions: database.progression.legacyWeaponProgressions as Record<string, WeaponProgressionEntry>,
    legacyCharacterProgressions: database.progression.legacyCharacterProgressions as Record<string, CharacterProgressionEntry>,
    legacyWeaponProgressions: database.progression.legacyWeaponProgressions as Record<string, WeaponProgressionEntry>,
    materialSources: database.sources.materialSources as Record<string, MaterialSourceRecord[]>,
    materialFamilyByKey: buildMaterialFamilyByKey(
      database.materials.commonEnemyDropFamilies,
      database.materials.eliteEnemyDropFamilies,
    ),
    characterGeneralEnemyDropFamilyByKey: {},
    weaponGeneralEnemyDropFamilyByKey: {},
    weaponEliteEnemyDropFamilyByKey: {},
    generalEnemyDropCharacterReferences: [],
    unresolvedCharacterReferences: [],
    unresolvedCharacterMaterialReferences: buildUnresolvedCharacterMaterialReferences(characterProfiles),
    unresolvedWeaponReferences: [],
    artifactDomains: database.artifacts.artifactDomains,
    recipes: baseRecipes,
    craftingRecipes: cloneRecipes(baseRecipes),
    craftingUtilityPassives: database.crafting.craftingUtilityPassives,
    craftingPlannerDefaults: database.crafting.craftingPlannerDefaults,
    gemConversionDefaults: database.crafting.gemConversionDefaults,
    resinRules: database.sources.resinRules,
    resinSystem: database.sources.resinSystem,
    resinActivityCosts: database.sources.resinActivityCosts,
    leyLineRewardsByWorldLevel: database.sources.leyLineRewardsByWorldLevel,
    domainsOfForgery: database.sources.domainsOfForgery,
    domainsOfMastery: database.sources.domainsOfMastery,
    trounceDomains: database.sources.trounceDomains,
    leyLineNationCoverage: database.sources.leyLineNationCoverage,
    leyLineNationCoverageList: Object.values(database.sources.leyLineNationCoverage),
    leyLineOutcropLocations: Object.fromEntries(
      Object.entries(database.sources.leyLineOutcropLocations).map(([locationKey, location]) => [
        locationKey,
        {
          ...location,
          derivedDropFamilies: [],
        },
      ]),
    ),
    leyLineOutcropLocationList: [],
    weaponAscensionDomainDropModel: database.sources.weaponAscensionDomainDropModel,
    talentBookDomainDropModel: database.sources.talentBookDomainDropModel,
    normalBossAscensionGemDropsByWorldLevel: database.sources.normalBossAscensionGemDropsByWorldLevel,
    weeklyBossAscensionGemDropsByWorldLevel: database.sources.weeklyBossAscensionGemDropsByWorldLevel,
    normalBossUniqueMaterialDropMeanByWorldLevel: database.sources.normalBossUniqueMaterialDropMeanByWorldLevel,
    weeklyTalentMaterialDropMeanByWorldLevel: database.sources.weeklyTalentMaterialDropMeanByWorldLevel,
    bossGemThreeStarRollMean: database.sources.bossGemThreeStarRollMean,
    bossGemDropPackMeanByRewardLevel: database.sources.bossGemDropPackMeanByRewardLevel,
    bossGemDropPackRarityDistribution: database.sources.bossGemDropPackRarityDistribution,
    plannerDefaults: database.sources.plannerDefaults,
    appliedOverrideKeys: [],
  };

  staticData.enemyDropFamilies = buildCompatibilityEnemyDropFamilies(staticData);
  return staticData;
}
