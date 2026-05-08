import type { MaterialTotals } from "../../utils/collections";
import { BRILLIANT_DIAMOND_FAMILY, buildCanonicalMaterialRegistry } from "./canonicalMaterialRegistry";
import { loadGeneratedCharacterMaterialBundle } from "./characterMaterialIndexRegistry";
import { buildCraftingRegistry } from "./craftingRegistry";
import { buildEliteEnemyDropRegistry } from "./eliteEnemyDropRegistry";
import { buildGeneralEnemyDropRegistry } from "./generalEnemyDropRegistry";
import { buildLocalSpecialtyRegistry } from "./localSpecialtyRegistry";
import { buildNormalBossMaterialRegistry } from "./normalBossMaterialRegistry";
import { buildLocalSpecialtyRegionIndex } from "./normalizeStaticDataMaterialReferences";
import {
  BOSS_GEM_DROP_PACK_MEAN_BY_REWARD_LEVEL,
  BOSS_GEM_DROP_PACK_RARITY_DISTRIBUTION,
  BOSS_GEM_THREE_STAR_ROLL_MEAN,
  buildPlannerResinRules,
  DOMAINS_OF_FORGERY,
  DOMAINS_OF_MASTERY,
  LEY_LINE_REWARDS_BY_WORLD_LEVEL,
  NORMAL_BOSS_ASCENSION_GEM_DROPS_BY_WORLD_LEVEL,
  NORMAL_BOSS_UNIQUE_MATERIAL_DROP_MEAN_BY_WORLD_LEVEL,
  PLANNER_DEFAULTS,
  RESIN_ACTIVITY_COSTS,
  RESIN_SYSTEM,
  TALENT_BOOK_DOMAIN_DROP_MODEL,
  TROUNCE_DOMAINS,
  WEAPON_ASCENSION_DOMAIN_DROP_MODEL,
  WEEKLY_BOSS_ASCENSION_GEM_DROPS_BY_WORLD_LEVEL,
  WEEKLY_TALENT_MATERIAL_DROP_MEAN_BY_WORLD_LEVEL,
} from "./plannerResinRegistry";
import { runtimeSeedData } from "./runtimeSeedData";
import { buildSpecialProgressionMaterialRegistry } from "./specialProgressionMaterialRegistry";
import { resolveGeneratedCharacterMaterialReferences } from "./resolveGeneratedCharacterMaterialReferences";
import {
  buildTravelerCatalogEntries,
  buildTravelerCharacterProfiles,
  buildTravelerElementProfiles,
  TRAVELER_PROFILE,
} from "./travelerRegistry";
import {
  buildWeaponGoalProfileCatalogEntries,
  buildWeaponGoalProfileMaterialProfiles,
} from "./weaponGoalProfileRegistry";
import { buildWeaponAscensionMaterialRegistry } from "./weaponAscensionMaterialRegistry";
import {
  WEAPON_ASCENSION_COSTS,
  WEAPON_ASCENSION_PHASE_CAPS,
  WEAPON_ASCENSION_TOTALS_20_TO_90,
  WEAPON_EXP_MATERIALS,
  WEAPON_EXP_REQUIREMENTS,
  WEAPON_EXP_TOTALS_1_TO_90,
} from "./weaponProgressionRegistry";
import { buildWeeklyBossMaterialRegistry } from "./weeklyBossMaterialRegistry";
import type {
  CharacterCatalogEntry,
  CharacterMaterialProfile,
  CharacterProgressionEntry,
  ElementGemFamily,
  EnemyDropFamily,
  LocalSpecialtySource,
  MaterialDescriptor,
  MaterialSourceRecord,
  StaticGameData,
  TalentBookFamily,
  UniversalCharacterProgressionCore,
  UniversalTalentProgressionCore,
  UniversalWeaponProgressionCore,
  WeaponAscensionFamily,
  WeaponCatalogEntry,
  WeaponMaterialProfile,
  WeaponProgressionEntry,
} from "./types";

function mapByKey<T extends { key: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.key, item]));
}

function mapSourcesByMaterial(records: MaterialSourceRecord[]): Record<string, MaterialSourceRecord[]> {
  return records.reduce<Record<string, MaterialSourceRecord[]>>((accumulator, record) => {
    accumulator[record.materialKey] = [...(accumulator[record.materialKey] ?? []), record];
    return accumulator;
  }, {});
}

function buildTravelerAndOreSources(
  sources: Record<string, MaterialSourceRecord[]>,
): Record<string, MaterialSourceRecord[]> {
  return {
    ...sources,
    CrystalChunk: [
      {
        materialKey: "CrystalChunk",
        sourceType: "world_gathering",
        sourceKey: "CrystalChunkVeins",
        sourceName: "Crystal Chunk Veins",
        availability: "ALWAYS",
        resinCost: 0,
        notes: "Ore chunk veins respawn 3 days after mining.",
        respawnDays: 3,
      },
    ],
    RainbowdropCrystal: [
      {
        materialKey: "RainbowdropCrystal",
        sourceType: "world_gathering",
        sourceKey: "RainbowdropCrystalVeins",
        sourceName: "Rainbowdrop Crystal Veins",
        availability: "ALWAYS",
        resinCost: 0,
        notes: "Ore chunk veins respawn 3 days after mining.",
        respawnDays: 3,
      },
    ],
    CondessenceCrystal: [
      {
        materialKey: "CondessenceCrystal",
        sourceType: "world_gathering",
        sourceKey: "CondessenceCrystalVeins",
        sourceName: "Condessence Crystal Veins",
        availability: "ALWAYS",
        resinCost: 0,
        notes: "Ore chunk veins respawn 3 days after mining.",
        respawnDays: 3,
      },
    ],
    MysticEnhancementOre: [
      {
        materialKey: "MysticEnhancementOre",
        sourceType: "forging",
        sourceKey: "ForgeMysticEnhancementOreFromCrystalChunk",
        sourceName: "Forge from Crystal Chunk",
        availability: "ALWAYS",
        resinCost: 0,
        inputMaterialKey: "CrystalChunk",
        inputQuantity: 40,
        outputQuantity: 10,
        dailyOutputCap: 40,
        resetCadence: "daily",
        notes: "Forge 40 Crystal Chunk into 10 Mystic Enhancement Ore. Daily forging output is capped at 40 Mystic Enhancement Ore.",
      },
      {
        materialKey: "MysticEnhancementOre",
        sourceType: "forging",
        sourceKey: "ForgeMysticEnhancementOreFromRainbowdropCrystal",
        sourceName: "Forge from Rainbowdrop Crystal",
        availability: "ALWAYS",
        resinCost: 0,
        inputMaterialKey: "RainbowdropCrystal",
        inputQuantity: 40,
        outputQuantity: 10,
        dailyOutputCap: 40,
        resetCadence: "daily",
        notes: "Forge 40 Rainbowdrop Crystal into 10 Mystic Enhancement Ore. Daily forging output is capped at 40 Mystic Enhancement Ore.",
      },
      {
        materialKey: "MysticEnhancementOre",
        sourceType: "forging",
        sourceKey: "ForgeMysticEnhancementOreFromCondessenceCrystal",
        sourceName: "Forge from Condessence Crystal",
        availability: "ALWAYS",
        resinCost: 0,
        inputMaterialKey: "CondessenceCrystal",
        inputQuantity: 40,
        outputQuantity: 10,
        dailyOutputCap: 40,
        resetCadence: "daily",
        notes: "Forge 40 Condessence Crystal into 10 Mystic Enhancement Ore. Daily forging output is capped at 40 Mystic Enhancement Ore.",
      },
    ],
  };
}

export function assembleBaseStaticData(): StaticGameData {
  const {
    artifactDomains,
    characterAscensionCosts,
    characters,
    discoveredCharacters,
    discoveredMaterials,
    discoveredWeapons,
    materialSources,
    materials,
    recipes,
    resinRules,
    talentCosts,
    weaponAscensionCosts,
    weapons,
    progressionCore,
  } = runtimeSeedData;

  const talentProgressions = talentCosts.progressions as Record<string, Record<string, MaterialTotals>>;
  const legacyCharacterProgressions: Record<string, CharacterProgressionEntry> = {};
  for (const [key, value] of Object.entries(characterAscensionCosts.progressions)) {
    legacyCharacterProgressions[key] = {
      key,
      levelTotals: value.levelTotals,
      ascensionTotals: value.ascensionTotals,
      talentTotals: talentProgressions[key] ?? { "1": {} },
    };
  }

  const legacyWeaponProgressions: Record<string, WeaponProgressionEntry> = {};
  for (const [key, value] of Object.entries(weaponAscensionCosts.progressions)) {
    legacyWeaponProgressions[key] = {
      key,
      levelTotals: value.levelTotals,
      ascensionTotals: value.ascensionTotals,
    };
  }

  const progressionMaterials = mapByKey(
    (progressionCore.universalMaterials.materials as Array<MaterialDescriptor & { expValue?: number; weaponExpValue?: number }>).map((material) => ({
      key: material.key,
      displayName: material.displayName,
      category: material.category,
      characterExpValue: material.expValue,
      weaponExpValue: material.weaponExpValue,
    })),
  );

  const progressionSourceMap = mapSourcesByMaterial(
    progressionCore.universalMaterialSources.materialSources as unknown as MaterialSourceRecord[],
  );
  const travelerCatalogEntries = buildTravelerCatalogEntries();
  const travelerCharacterProfiles = buildTravelerCharacterProfiles();
  const travelerElementProfiles = buildTravelerElementProfiles();
  const weaponGoalCatalogEntries = buildWeaponGoalProfileCatalogEntries();
  const weaponGoalMaterialProfiles = buildWeaponGoalProfileMaterialProfiles();

  const baseWeaponsRecord = {
    ...(discoveredWeapons.weapons as Record<string, WeaponCatalogEntry>),
    ...(weapons.weapons as Record<string, WeaponCatalogEntry>),
    ...weaponGoalCatalogEntries,
  };
  const baseCharactersRecord = {
    ...(discoveredCharacters.characters as Record<string, CharacterCatalogEntry>),
    ...(characters.characters as Record<string, CharacterCatalogEntry>),
    ...travelerCatalogEntries,
  };
  const generalRegistry = buildGeneralEnemyDropRegistry(baseCharactersRecord, baseWeaponsRecord);
  const eliteRegistry = buildEliteEnemyDropRegistry(baseWeaponsRecord);
  const localSpecialtyRegistry = buildLocalSpecialtyRegistry();
  const normalBossMaterialRegistry = buildNormalBossMaterialRegistry();
  const weeklyBossMaterialRegistry = buildWeeklyBossMaterialRegistry();
  const specialProgressionMaterialRegistry = buildSpecialProgressionMaterialRegistry();
  const weaponAscensionMaterialRegistry = buildWeaponAscensionMaterialRegistry(baseWeaponsRecord);
  const generatedCharacterMaterialBundle = loadGeneratedCharacterMaterialBundle();
  const baseElementGemFamilies = {
    ...mapByKey(progressionCore.elementGemFamilies.families as ElementGemFamily[]),
    Traveler: BRILLIANT_DIAMOND_FAMILY,
  };
  const baseTalentBookFamilies = mapByKey(progressionCore.talentBookFamilies.families as TalentBookFamily[]);

  const craftingRegistry = buildCraftingRegistry({
    materials: {
      ...(discoveredMaterials.materials as Record<string, MaterialDescriptor>),
      ...progressionMaterials,
      ...localSpecialtyRegistry.materials,
      ...normalBossMaterialRegistry.materials,
      ...weeklyBossMaterialRegistry.materials,
      ...specialProgressionMaterialRegistry.materials,
      ...generalRegistry.materials,
      ...eliteRegistry.materials,
      ...generatedCharacterMaterialBundle.materials,
      ...(materials.materials as Record<string, MaterialDescriptor>),
    },
    elementGemFamilies: baseElementGemFamilies,
    talentBookFamilies: baseTalentBookFamilies,
    generalEnemyDropFamilies: generalRegistry.families,
    eliteEnemyDropFamilies: eliteRegistry.families,
    weaponAscensionMaterialFamilies: weaponAscensionMaterialRegistry.families,
  });

  const baseData: StaticGameData = {
    version: 1,
    characters: {
      ...baseCharactersRecord,
      ...generatedCharacterMaterialBundle.characters,
      ...travelerCatalogEntries,
    },
    travelerProfile: TRAVELER_PROFILE,
    travelerElementProfiles,
    materials: {
      ...(discoveredMaterials.materials as Record<string, MaterialDescriptor>),
      ...progressionMaterials,
      ...localSpecialtyRegistry.materials,
      ...normalBossMaterialRegistry.materials,
      ...weeklyBossMaterialRegistry.materials,
      ...specialProgressionMaterialRegistry.materials,
      ...generalRegistry.materials,
      ...eliteRegistry.materials,
      ...generatedCharacterMaterialBundle.materials,
      ...(materials.materials as Record<string, MaterialDescriptor>),
    },
    weapons: {
      ...baseWeaponsRecord,
      ...weaponAscensionMaterialRegistry.catalogUpdates,
    },
    universalCharacterProgressionCore: progressionCore.universalCharacterProgression as UniversalCharacterProgressionCore,
    universalTalentProgressionCore: progressionCore.universalTalentProgression as UniversalTalentProgressionCore,
    universalWeaponProgressionCore: progressionCore.universalWeaponProgression as UniversalWeaponProgressionCore,
    weaponAscensionPhaseCaps: WEAPON_ASCENSION_PHASE_CAPS,
    weaponExpMaterials: WEAPON_EXP_MATERIALS,
    weaponExpRequirements: WEAPON_EXP_REQUIREMENTS,
    weaponExpTotals1To90: WEAPON_EXP_TOTALS_1_TO_90,
    weaponAscensionCosts: WEAPON_ASCENSION_COSTS,
    weaponAscensionTotals20To90: WEAPON_ASCENSION_TOTALS_20_TO_90,
    elementGemFamilies: baseElementGemFamilies,
    talentBookFamilies: baseTalentBookFamilies,
    enemyDropFamilies: {
      ...mapByKey(progressionCore.enemyDropFamilies.families as EnemyDropFamily[]),
      ...generalRegistry.compatibilityFamilies,
      ...eliteRegistry.compatibilityFamilies,
    },
    generalEnemyDropFamilies: generalRegistry.families,
    eliteEnemyDropFamilies: eliteRegistry.families,
    weaponAscensionMaterialFamilies: weaponAscensionMaterialRegistry.families,
    localSpecialties: localSpecialtyRegistry.localSpecialties,
    localSpecialtiesByRegion: buildLocalSpecialtyRegionIndex(localSpecialtyRegistry.localSpecialties),
    normalBossMaterials: normalBossMaterialRegistry.normalBossMaterials,
    weeklyBossMaterials: weeklyBossMaterialRegistry.weeklyBossMaterials,
    specialProgressionMaterials: specialProgressionMaterialRegistry.specialProgressionMaterials,
    materialRecords: {},
    tieredMaterialIndex: craftingRegistry.tieredMaterialIndex,
    weaponAscensionFamilies: {
      ...weaponAscensionMaterialRegistry.compatibilityFamilies,
      ...mapByKey(progressionCore.weaponAscensionFamilies.families as WeaponAscensionFamily[]),
    },
    localSpecialtySources: mapByKey(progressionCore.localSpecialtySources.sources as LocalSpecialtySource[]),
    characterMaterialProfiles: {
      ...(progressionCore.characterMaterialProfiles.profiles as Record<string, CharacterMaterialProfile>),
      ...generatedCharacterMaterialBundle.profiles,
      ...travelerCharacterProfiles,
    },
    weaponMaterialProfiles: {
      ...weaponAscensionMaterialRegistry.weaponMaterialProfiles,
      ...(progressionCore.weaponMaterialProfiles.profiles as Record<string, WeaponMaterialProfile>),
      ...weaponGoalMaterialProfiles,
    },
    characterProgressions: legacyCharacterProgressions,
    weaponProgressions: legacyWeaponProgressions,
    legacyCharacterProgressions,
    legacyWeaponProgressions,
    materialSources: {
      ...buildTravelerAndOreSources(progressionSourceMap),
      ...localSpecialtyRegistry.materialSources,
      ...normalBossMaterialRegistry.materialSources,
      ...weeklyBossMaterialRegistry.materialSources,
      ...specialProgressionMaterialRegistry.materialSources,
      ...weaponAscensionMaterialRegistry.materialSources,
      ...generalRegistry.materialSources,
      ...eliteRegistry.materialSources,
      ...(materialSources.sources as Record<string, MaterialSourceRecord[]>),
    },
    materialFamilyByKey: {
      ...generalRegistry.materialFamilyByKey,
      ...eliteRegistry.materialFamilyByKey,
    },
    characterGeneralEnemyDropFamilyByKey: generalRegistry.characterGeneralEnemyDropFamilyByKey,
    weaponGeneralEnemyDropFamilyByKey: generalRegistry.weaponGeneralEnemyDropFamilyByKey,
    weaponEliteEnemyDropFamilyByKey: eliteRegistry.weaponEliteEnemyDropFamilyByKey,
    generalEnemyDropCharacterReferences: generalRegistry.generalEnemyDropCharacterReferences,
    unresolvedCharacterReferences: generalRegistry.unresolvedCharacterReferences,
    unresolvedCharacterMaterialReferences: generatedCharacterMaterialBundle.unresolvedReferences,
    unresolvedWeaponReferences: [
      ...generalRegistry.unresolvedWeaponReferences,
      ...eliteRegistry.unresolvedWeaponReferences,
      ...weaponAscensionMaterialRegistry.unresolvedWeaponReferences,
    ],
    artifactDomains: { ...(artifactDomains.domains as StaticGameData["artifactDomains"]) },
    recipes: {
      ...(recipes.recipes as StaticGameData["recipes"]),
      ...weaponAscensionMaterialRegistry.recipes,
      ...generalRegistry.recipes,
      ...eliteRegistry.recipes,
      ...craftingRegistry.recipes,
    },
    craftingRecipes: {
      ...(recipes.recipes as StaticGameData["recipes"]),
      ...weaponAscensionMaterialRegistry.recipes,
      ...generalRegistry.recipes,
      ...eliteRegistry.recipes,
      ...craftingRegistry.craftingRecipes,
    },
    craftingUtilityPassives: craftingRegistry.craftingUtilityPassives,
    craftingPlannerDefaults: craftingRegistry.craftingPlannerDefaults,
    gemConversionDefaults: craftingRegistry.gemConversionDefaults,
    resinRules: resinRules ?? buildPlannerResinRules(),
    resinSystem: RESIN_SYSTEM,
    resinActivityCosts: RESIN_ACTIVITY_COSTS,
    leyLineRewardsByWorldLevel: LEY_LINE_REWARDS_BY_WORLD_LEVEL,
    domainsOfForgery: DOMAINS_OF_FORGERY,
    domainsOfMastery: DOMAINS_OF_MASTERY,
    trounceDomains: TROUNCE_DOMAINS,
    weaponAscensionDomainDropModel: WEAPON_ASCENSION_DOMAIN_DROP_MODEL,
    talentBookDomainDropModel: TALENT_BOOK_DOMAIN_DROP_MODEL,
    normalBossAscensionGemDropsByWorldLevel: NORMAL_BOSS_ASCENSION_GEM_DROPS_BY_WORLD_LEVEL,
    weeklyBossAscensionGemDropsByWorldLevel: WEEKLY_BOSS_ASCENSION_GEM_DROPS_BY_WORLD_LEVEL,
    normalBossUniqueMaterialDropMeanByWorldLevel: NORMAL_BOSS_UNIQUE_MATERIAL_DROP_MEAN_BY_WORLD_LEVEL,
    weeklyTalentMaterialDropMeanByWorldLevel: WEEKLY_TALENT_MATERIAL_DROP_MEAN_BY_WORLD_LEVEL,
    bossGemThreeStarRollMean: BOSS_GEM_THREE_STAR_ROLL_MEAN,
    bossGemDropPackMeanByRewardLevel: BOSS_GEM_DROP_PACK_MEAN_BY_REWARD_LEVEL,
    bossGemDropPackRarityDistribution: BOSS_GEM_DROP_PACK_RARITY_DISTRIBUTION,
    plannerDefaults: PLANNER_DEFAULTS,
    appliedOverrideKeys: [],
  };

  const canonicalRegistry = buildCanonicalMaterialRegistry(baseData);

  return resolveGeneratedCharacterMaterialReferences({
    ...baseData,
    materials: {
      ...baseData.materials,
      ...canonicalRegistry.materials,
    },
    materialSources: {
      ...canonicalRegistry.materialSources,
      ...baseData.materialSources,
    },
    materialRecords: canonicalRegistry.materialRecords,
  });
}
