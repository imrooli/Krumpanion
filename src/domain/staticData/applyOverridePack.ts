import { buildLocalSpecialtyRegionIndex } from "./normalizeStaticDataMaterialReferences";
import type {
  OverrideDataPack,
  StaticGameData,
} from "./types";

function mergeProgression<T extends { key: string }>(
  base: Record<string, T>,
  overrides: Record<string, Partial<T>> | undefined,
): Record<string, T> {
  if (!overrides) {
    return base;
  }

  const next = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    next[key] = {
      ...(next[key] ?? { key }),
      ...value,
      key,
    } as T;
  }

  return next;
}

function mergeCore<T extends object>(base: T, overrideValue: Partial<T> | undefined): T {
  return {
    ...base,
    ...(overrideValue ?? {}),
  };
}

export function applyOverridePack(baseData: StaticGameData, overridePack?: OverrideDataPack | null): StaticGameData {
  if (!overridePack) {
    return baseData;
  }

  return {
    ...baseData,
    characters: {
      ...baseData.characters,
      ...(overridePack.characters ?? {}),
    },
    materials: {
      ...baseData.materials,
      ...(overridePack.materials ?? {}),
    },
    weapons: {
      ...baseData.weapons,
      ...(overridePack.weapons ?? {}),
    },
    universalCharacterProgressionCore: mergeCore(baseData.universalCharacterProgressionCore, overridePack.universalCharacterProgressionCore),
    universalTalentProgressionCore: mergeCore(baseData.universalTalentProgressionCore, overridePack.universalTalentProgressionCore),
    universalWeaponProgressionCore: mergeCore(baseData.universalWeaponProgressionCore, overridePack.universalWeaponProgressionCore),
    weaponAscensionPhaseCaps: {
      ...baseData.weaponAscensionPhaseCaps,
      ...(overridePack.weaponAscensionPhaseCaps ?? {}),
    },
    weaponExpMaterials: {
      ...baseData.weaponExpMaterials,
      ...(overridePack.weaponExpMaterials ?? {}),
    },
    weaponExpRequirements: {
      ...baseData.weaponExpRequirements,
      ...(overridePack.weaponExpRequirements ?? {}),
    },
    weaponExpTotals1To90: {
      ...baseData.weaponExpTotals1To90,
      ...(overridePack.weaponExpTotals1To90 ?? {}),
    },
    weaponAscensionCosts: {
      ...baseData.weaponAscensionCosts,
      ...(overridePack.weaponAscensionCosts ?? {}),
    },
    weaponAscensionTotals20To90: {
      ...baseData.weaponAscensionTotals20To90,
      ...(overridePack.weaponAscensionTotals20To90 ?? {}),
    },
    elementGemFamilies: {
      ...baseData.elementGemFamilies,
      ...(overridePack.elementGemFamilies ?? {}),
    },
    talentBookFamilies: {
      ...baseData.talentBookFamilies,
      ...(overridePack.talentBookFamilies ?? {}),
    },
    enemyDropFamilies: {
      ...baseData.enemyDropFamilies,
      ...(overridePack.enemyDropFamilies ?? {}),
    },
    generalEnemyDropFamilies: {
      ...baseData.generalEnemyDropFamilies,
      ...(overridePack.generalEnemyDropFamilies ?? {}),
    },
    eliteEnemyDropFamilies: {
      ...baseData.eliteEnemyDropFamilies,
      ...(overridePack.eliteEnemyDropFamilies ?? {}),
    },
    weaponAscensionMaterialFamilies: {
      ...baseData.weaponAscensionMaterialFamilies,
      ...(overridePack.weaponAscensionMaterialFamilies ?? {}),
    },
    localSpecialties: {
      ...baseData.localSpecialties,
      ...(overridePack.localSpecialties ?? {}),
    },
    localSpecialtiesByRegion: buildLocalSpecialtyRegionIndex({
      ...baseData.localSpecialties,
      ...(overridePack.localSpecialties ?? {}),
    }),
    normalBossMaterials: {
      ...baseData.normalBossMaterials,
      ...(overridePack.normalBossMaterials ?? {}),
    },
    weeklyBossMaterials: {
      ...baseData.weeklyBossMaterials,
      ...(overridePack.weeklyBossMaterials ?? {}),
    },
    specialProgressionMaterials: {
      ...baseData.specialProgressionMaterials,
      ...(overridePack.specialProgressionMaterials ?? {}),
    },
    materialRecords: {
      ...baseData.materialRecords,
      ...(overridePack.materialRecords ?? {}),
    },
    tieredMaterialIndex: {
      ...baseData.tieredMaterialIndex,
      ...(overridePack.tieredMaterialIndex ?? {}),
    },
    weaponAscensionFamilies: {
      ...baseData.weaponAscensionFamilies,
      ...(overridePack.weaponAscensionFamilies ?? {}),
    },
    localSpecialtySources: {
      ...baseData.localSpecialtySources,
      ...(overridePack.localSpecialtySources ?? {}),
    },
    characterMaterialProfiles: {
      ...baseData.characterMaterialProfiles,
      ...(overridePack.characterMaterialProfiles ?? {}),
    },
    weaponMaterialProfiles: {
      ...baseData.weaponMaterialProfiles,
      ...(overridePack.weaponMaterialProfiles ?? {}),
    },
    characterProgressions: mergeProgression(
      baseData.characterProgressions,
      overridePack.legacyExactCharacterProgressions ?? overridePack.characterProgressions,
    ),
    weaponProgressions: mergeProgression(
      baseData.weaponProgressions,
      overridePack.legacyExactWeaponProgressions ?? overridePack.weaponProgressions,
    ),
    legacyCharacterProgressions: mergeProgression(baseData.legacyCharacterProgressions, overridePack.legacyExactCharacterProgressions),
    legacyWeaponProgressions: mergeProgression(baseData.legacyWeaponProgressions, overridePack.legacyExactWeaponProgressions),
    materialSources: {
      ...baseData.materialSources,
      ...(overridePack.materialSources ?? {}),
    },
    artifactDomains: {
      ...baseData.artifactDomains,
      ...(overridePack.artifactDomains ?? {}),
    },
    recipes: {
      ...baseData.recipes,
      ...(overridePack.recipes ?? {}),
    },
    craftingRecipes: {
      ...baseData.craftingRecipes,
      ...(overridePack.craftingRecipes ?? {}),
    },
    craftingUtilityPassives: {
      ...baseData.craftingUtilityPassives,
      ...(overridePack.craftingUtilityPassives ?? {}),
    },
    craftingPlannerDefaults: {
      ...baseData.craftingPlannerDefaults,
      ...(overridePack.craftingPlannerDefaults ?? {}),
    },
    gemConversionDefaults: {
      ...baseData.gemConversionDefaults,
      ...(overridePack.gemConversionDefaults ?? {}),
    },
    resinSystem: mergeCore(baseData.resinSystem, overridePack.resinSystem),
    resinActivityCosts: mergeCore(baseData.resinActivityCosts, overridePack.resinActivityCosts),
    leyLineRewardsByWorldLevel: {
      ...baseData.leyLineRewardsByWorldLevel,
      ...(overridePack.leyLineRewardsByWorldLevel ?? {}),
    },
    domainsOfForgery: {
      ...baseData.domainsOfForgery,
      ...(overridePack.domainsOfForgery ?? {}),
    },
    domainsOfMastery: {
      ...baseData.domainsOfMastery,
      ...(overridePack.domainsOfMastery ?? {}),
    },
    trounceDomains: {
      ...baseData.trounceDomains,
      ...(overridePack.trounceDomains ?? {}),
    },
    leyLineOutcropLocations: {
      ...baseData.leyLineOutcropLocations,
      ...(overridePack.leyLineOutcropLocations ?? {}),
    },
    leyLineOutcropLocationList: baseData.leyLineOutcropLocationList,
    weaponAscensionDomainDropModel: {
      ...baseData.weaponAscensionDomainDropModel,
      ...(overridePack.weaponAscensionDomainDropModel ?? {}),
    },
    talentBookDomainDropModel: {
      ...baseData.talentBookDomainDropModel,
      ...(overridePack.talentBookDomainDropModel ?? {}),
    },
    normalBossAscensionGemDropsByWorldLevel: {
      ...baseData.normalBossAscensionGemDropsByWorldLevel,
      ...(overridePack.normalBossAscensionGemDropsByWorldLevel ?? {}),
    },
    weeklyBossAscensionGemDropsByWorldLevel: {
      ...baseData.weeklyBossAscensionGemDropsByWorldLevel,
      ...(overridePack.weeklyBossAscensionGemDropsByWorldLevel ?? {}),
    },
    normalBossUniqueMaterialDropMeanByWorldLevel: {
      ...baseData.normalBossUniqueMaterialDropMeanByWorldLevel,
      ...(overridePack.normalBossUniqueMaterialDropMeanByWorldLevel ?? {}),
    },
    weeklyTalentMaterialDropMeanByWorldLevel: {
      ...baseData.weeklyTalentMaterialDropMeanByWorldLevel,
      ...(overridePack.weeklyTalentMaterialDropMeanByWorldLevel ?? {}),
    },
    bossGemThreeStarRollMean: {
      ...baseData.bossGemThreeStarRollMean,
      ...(overridePack.bossGemThreeStarRollMean ?? {}),
    },
    bossGemDropPackMeanByRewardLevel:
      overridePack.bossGemDropPackMeanByRewardLevel ?? baseData.bossGemDropPackMeanByRewardLevel,
    bossGemDropPackRarityDistribution:
      overridePack.bossGemDropPackRarityDistribution ?? baseData.bossGemDropPackRarityDistribution,
    plannerDefaults: {
      ...baseData.plannerDefaults,
      ...(overridePack.plannerDefaults ?? {}),
    },
    appliedOverrideKeys: [
      ...Object.keys(overridePack.characters ?? {}),
      ...Object.keys(overridePack.materials ?? {}),
      ...Object.keys(overridePack.weapons ?? {}),
      ...Object.keys(overridePack.characterMaterialProfiles ?? {}),
      ...Object.keys(overridePack.weaponMaterialProfiles ?? {}),
      ...(overridePack.universalCharacterProgressionCore ? ["universalCharacterProgressionCore"] : []),
      ...(overridePack.universalTalentProgressionCore ? ["universalTalentProgressionCore"] : []),
      ...(overridePack.universalWeaponProgressionCore ? ["universalWeaponProgressionCore"] : []),
      ...Object.keys(overridePack.weaponAscensionPhaseCaps ?? {}),
      ...Object.keys(overridePack.weaponExpMaterials ?? {}),
      ...Object.keys(overridePack.weaponExpRequirements ?? {}),
      ...Object.keys(overridePack.weaponExpTotals1To90 ?? {}),
      ...Object.keys(overridePack.weaponAscensionCosts ?? {}),
      ...Object.keys(overridePack.weaponAscensionTotals20To90 ?? {}),
      ...Object.keys(overridePack.elementGemFamilies ?? {}),
      ...Object.keys(overridePack.talentBookFamilies ?? {}),
      ...Object.keys(overridePack.enemyDropFamilies ?? {}),
      ...Object.keys(overridePack.generalEnemyDropFamilies ?? {}),
      ...Object.keys(overridePack.eliteEnemyDropFamilies ?? {}),
      ...Object.keys(overridePack.weaponAscensionMaterialFamilies ?? {}),
      ...Object.keys(overridePack.localSpecialties ?? {}),
      ...Object.keys(overridePack.normalBossMaterials ?? {}),
      ...Object.keys(overridePack.weeklyBossMaterials ?? {}),
      ...Object.keys(overridePack.specialProgressionMaterials ?? {}),
      ...Object.keys(overridePack.materialRecords ?? {}),
      ...Object.keys(overridePack.tieredMaterialIndex ?? {}),
      ...Object.keys(overridePack.weaponAscensionFamilies ?? {}),
      ...Object.keys(overridePack.localSpecialtySources ?? {}),
      ...Object.keys(overridePack.characterProgressions ?? {}),
      ...Object.keys(overridePack.weaponProgressions ?? {}),
      ...Object.keys(overridePack.legacyExactCharacterProgressions ?? {}),
      ...Object.keys(overridePack.legacyExactWeaponProgressions ?? {}),
      ...Object.keys(overridePack.materialSources ?? {}),
      ...Object.keys(overridePack.artifactDomains ?? {}),
      ...Object.keys(overridePack.recipes ?? {}),
      ...Object.keys(overridePack.craftingRecipes ?? {}),
      ...(overridePack.craftingUtilityPassives ? ["craftingUtilityPassives"] : []),
      ...(overridePack.craftingPlannerDefaults ? ["craftingPlannerDefaults"] : []),
      ...(overridePack.gemConversionDefaults ? ["gemConversionDefaults"] : []),
      ...(overridePack.resinSystem ? ["resinSystem"] : []),
      ...(overridePack.resinActivityCosts ? ["resinActivityCosts"] : []),
      ...Object.keys(overridePack.leyLineRewardsByWorldLevel ?? {}),
      ...Object.keys(overridePack.domainsOfForgery ?? {}),
      ...Object.keys(overridePack.domainsOfMastery ?? {}),
      ...Object.keys(overridePack.trounceDomains ?? {}),
      ...Object.keys(overridePack.leyLineOutcropLocations ?? {}),
      ...Object.keys(overridePack.weaponAscensionDomainDropModel ?? {}),
      ...Object.keys(overridePack.talentBookDomainDropModel ?? {}),
      ...Object.keys(overridePack.normalBossAscensionGemDropsByWorldLevel ?? {}),
      ...Object.keys(overridePack.weeklyBossAscensionGemDropsByWorldLevel ?? {}),
      ...Object.keys(overridePack.normalBossUniqueMaterialDropMeanByWorldLevel ?? {}),
      ...Object.keys(overridePack.weeklyTalentMaterialDropMeanByWorldLevel ?? {}),
      ...(overridePack.bossGemThreeStarRollMean ? ["bossGemThreeStarRollMean"] : []),
      ...(overridePack.bossGemDropPackMeanByRewardLevel ? ["bossGemDropPackMeanByRewardLevel"] : []),
      ...(overridePack.bossGemDropPackRarityDistribution ? ["bossGemDropPackRarityDistribution"] : []),
      ...(overridePack.plannerDefaults ? ["plannerDefaults"] : []),
    ],
  };
}
