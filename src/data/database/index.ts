import characterProfiles from "./characters/characterProfiles.json";
import travelerProfile from "./characters/travelerProfile.json";
import artifactDomains from "./artifacts/artifactDomains.json";
import craftingPlannerDefaults from "./crafting/craftingPlannerDefaults.json";
import craftingUtilityPassives from "./crafting/craftingUtilityPassives.json";
import gemConversionDefaults from "./crafting/gemConversionDefaults.json";
import recipes from "./crafting/recipes.json";
import tieredMaterialIndex from "./crafting/tieredMaterialIndex.json";
import commonEnemyDropFamilies from "./materials/commonEnemyDropFamilies.json";
import elementalGemFamilies from "./materials/elementalGemFamilies.json";
import eliteEnemyDropFamilies from "./materials/eliteEnemyDropFamilies.json";
import localSpecialties from "./materials/localSpecialties.json";
import materials from "./materials/materials.json";
import normalBossMaterials from "./materials/normalBossMaterials.json";
import specialProgressionMaterials from "./materials/specialProgressionMaterials.json";
import talentBookFamilies from "./materials/talentBookFamilies.json";
import weaponAscensionMaterialFamilies from "./materials/weaponAscensionMaterialFamilies.json";
import weeklyBossMaterials from "./materials/weeklyBossMaterials.json";
import characterAscensionCosts from "./progression/characterAscensionCosts.json";
import characterLevelExp from "./progression/characterLevelExp.json";
import legacyCharacterProgressions from "./progression/legacyCharacterProgressions.json";
import legacyWeaponProgressions from "./progression/legacyWeaponProgressions.json";
import talentLevelCosts from "./progression/talentLevelCosts.json";
import weaponAscensionCosts from "./progression/weaponAscensionCosts.json";
import weaponExpItems from "./progression/weaponExpItems.json";
import weaponLevelExp from "./progression/weaponLevelExp.json";
import bossLootEstimates from "./sources/bossLootEstimates.json";
import domainLootEstimates from "./sources/domainLootEstimates.json";
import domainSchedule from "./sources/domainSchedule.json";
import enemyRouteSources from "./sources/enemyRouteSources.json";
import { leyLineNationCoverage } from "./sources/leyLineNationCoverage";
import { leyLineOutcropLocations } from "./sources/leyLineOutcropLocations";
import leyLineRewards from "./sources/leyLineRewards.json";
import materialSources from "./sources/materialSources.json";
import resinActivities from "./sources/resinActivities.json";
import weaponProfiles from "./weapons/weaponProfiles.json";
import type { CanonicalDatabase } from "./schema";

const typedCharacterProfiles = characterProfiles as unknown as CanonicalDatabase["characters"]["characterProfiles"];
const typedTravelerProfile = travelerProfile as unknown as CanonicalDatabase["characters"]["travelerProfile"];
const typedWeaponProfiles = weaponProfiles as unknown as CanonicalDatabase["weapons"]["weaponProfiles"];
const typedMaterials = materials as unknown as CanonicalDatabase["materials"]["materials"];
const typedElementGemFamilies = elementalGemFamilies as unknown as CanonicalDatabase["materials"]["elementalGemFamilies"];
const typedLocalSpecialties = localSpecialties as unknown as CanonicalDatabase["materials"]["localSpecialties"];
const typedCommonEnemyDropFamilies = commonEnemyDropFamilies as unknown as CanonicalDatabase["materials"]["commonEnemyDropFamilies"];
const typedEliteEnemyDropFamilies = eliteEnemyDropFamilies as unknown as CanonicalDatabase["materials"]["eliteEnemyDropFamilies"];
const typedNormalBossMaterials = normalBossMaterials as unknown as CanonicalDatabase["materials"]["normalBossMaterials"];
const typedWeeklyBossMaterials = weeklyBossMaterials as unknown as CanonicalDatabase["materials"]["weeklyBossMaterials"];
const typedTalentBookFamilies = talentBookFamilies as unknown as CanonicalDatabase["materials"]["talentBookFamilies"];
const typedWeaponAscensionMaterialFamilies =
  weaponAscensionMaterialFamilies as unknown as CanonicalDatabase["materials"]["weaponAscensionMaterialFamilies"];
const typedSpecialProgressionMaterials =
  specialProgressionMaterials as unknown as CanonicalDatabase["materials"]["specialProgressionMaterials"];
const typedCharacterProgressionCore = {
  ...characterAscensionCosts,
  ...characterLevelExp,
} as unknown as CanonicalDatabase["progression"]["universalCharacterProgressionCore"];
const typedTalentProgressionCore = talentLevelCosts as unknown as CanonicalDatabase["progression"]["universalTalentProgressionCore"];
const typedWeaponLevelExp = weaponLevelExp as unknown as {
  universalWeaponProgressionCore: CanonicalDatabase["progression"]["universalWeaponProgressionCore"];
  weaponExpRequirements: CanonicalDatabase["progression"]["weaponExpRequirements"];
  weaponExpTotals1To90: CanonicalDatabase["progression"]["weaponExpTotals1To90"];
};
const typedWeaponAscensionCosts = weaponAscensionCosts as unknown as {
  weaponAscensionPhaseCaps: CanonicalDatabase["progression"]["weaponAscensionPhaseCaps"];
  weaponAscensionCosts: CanonicalDatabase["progression"]["weaponAscensionCosts"];
  weaponAscensionTotals20To90: CanonicalDatabase["progression"]["weaponAscensionTotals20To90"];
};
const typedWeaponExpItems = weaponExpItems as unknown as CanonicalDatabase["progression"]["weaponExpMaterials"];
const typedMaterialSources = materialSources as unknown as CanonicalDatabase["sources"]["materialSources"];
const typedResinActivities = resinActivities as unknown as {
  resinRules: CanonicalDatabase["sources"]["resinRules"];
  resinSystem: CanonicalDatabase["sources"]["resinSystem"];
  resinActivityCosts: CanonicalDatabase["sources"]["resinActivityCosts"];
  plannerDefaults: CanonicalDatabase["sources"]["plannerDefaults"];
};
const typedLeyLineRewards = leyLineRewards as unknown as CanonicalDatabase["sources"]["leyLineRewardsByWorldLevel"];
const typedDomainSchedule = domainSchedule as unknown as {
  domainsOfForgery: CanonicalDatabase["sources"]["domainsOfForgery"];
  domainsOfMastery: CanonicalDatabase["sources"]["domainsOfMastery"];
  trounceDomains: CanonicalDatabase["sources"]["trounceDomains"];
};
const typedDomainLootEstimates = domainLootEstimates as unknown as {
  weaponAscensionDomainDropModel: CanonicalDatabase["sources"]["weaponAscensionDomainDropModel"];
  talentBookDomainDropModel: CanonicalDatabase["sources"]["talentBookDomainDropModel"];
};
const typedBossLootEstimates = bossLootEstimates as unknown as {
  normalBossAscensionGemDropsByWorldLevel: CanonicalDatabase["sources"]["normalBossAscensionGemDropsByWorldLevel"];
  weeklyBossAscensionGemDropsByWorldLevel: CanonicalDatabase["sources"]["weeklyBossAscensionGemDropsByWorldLevel"];
  normalBossUniqueMaterialDropMeanByWorldLevel: CanonicalDatabase["sources"]["normalBossUniqueMaterialDropMeanByWorldLevel"];
  weeklyTalentMaterialDropMeanByWorldLevel: CanonicalDatabase["sources"]["weeklyTalentMaterialDropMeanByWorldLevel"];
  bossGemThreeStarRollMean: CanonicalDatabase["sources"]["bossGemThreeStarRollMean"];
  bossGemDropPackMeanByRewardLevel: CanonicalDatabase["sources"]["bossGemDropPackMeanByRewardLevel"];
  bossGemDropPackRarityDistribution: CanonicalDatabase["sources"]["bossGemDropPackRarityDistribution"];
};
const typedEnemyRouteSources = enemyRouteSources as unknown as CanonicalDatabase["sources"]["enemyRouteSources"];
const typedLeyLineOutcropLocations = leyLineOutcropLocations as unknown as CanonicalDatabase["sources"]["leyLineOutcropLocations"];
const typedLeyLineNationCoverage = leyLineNationCoverage as unknown as CanonicalDatabase["sources"]["leyLineNationCoverage"];
const typedRecipes = recipes as unknown as CanonicalDatabase["crafting"]["recipes"];
const typedTieredMaterialIndex = tieredMaterialIndex as unknown as CanonicalDatabase["crafting"]["tieredMaterialIndex"];
const typedCraftingUtilityPassives =
  craftingUtilityPassives as unknown as CanonicalDatabase["crafting"]["craftingUtilityPassives"];
const typedCraftingPlannerDefaults =
  craftingPlannerDefaults as unknown as CanonicalDatabase["crafting"]["craftingPlannerDefaults"];
const typedGemConversionDefaults =
  gemConversionDefaults as unknown as CanonicalDatabase["crafting"]["gemConversionDefaults"];
const typedArtifactDomains = artifactDomains as unknown as CanonicalDatabase["artifacts"]["artifactDomains"];

function buildWeaponAscensionCompatibilityFamilies() {
  return Object.fromEntries(
    Object.entries(typedWeaponAscensionMaterialFamilies).map(([familyKey, family]) => [
      familyKey,
      {
        key: familyKey,
        tier1: family.tiers.twoStar,
        tier2: family.tiers.threeStar,
        tier3: family.tiers.fourStar,
        tier4: family.tiers.fiveStar,
      },
    ]),
  );
}

export const canonicalDatabase: CanonicalDatabase = {
  version: 1,
  metadata: {
    sourceOfTruthDirectory: "src/data/database",
    deprecatedRuntimeSources: [
      "src/data/runtime/characters.json",
      "src/data/runtime/discoveredCharacters.json",
      "src/data/runtime/materials.json",
      "src/data/runtime/discoveredMaterials.json",
      "src/data/runtime/weapons.json",
      "src/data/runtime/discoveredWeapons.json",
      "src/data/runtime/generated/characterMaterialProfiles.generated.json",
      "src/data/runtime/generated/generatedCharacters.generated.json",
      "src/data/runtime/generated/betaMaterials.generated.json",
      "src/data/runtime/generated/unresolvedCharacterMaterialReferences.generated.json",
      "src/data/runtime/progressionCore/*",
    ],
  },
  characters: {
    characterProfiles: typedCharacterProfiles,
    travelerProfile: typedTravelerProfile,
  },
  weapons: {
    weaponProfiles: typedWeaponProfiles,
  },
  materials: {
    materials: typedMaterials,
    elementalGemFamilies: typedElementGemFamilies,
    localSpecialties: typedLocalSpecialties,
    commonEnemyDropFamilies: typedCommonEnemyDropFamilies,
    eliteEnemyDropFamilies: typedEliteEnemyDropFamilies,
    normalBossMaterials: typedNormalBossMaterials,
    weeklyBossMaterials: typedWeeklyBossMaterials,
    talentBookFamilies: typedTalentBookFamilies,
    weaponAscensionMaterialFamilies: typedWeaponAscensionMaterialFamilies,
    specialProgressionMaterials: typedSpecialProgressionMaterials,
  },
  progression: {
    universalCharacterProgressionCore: typedCharacterProgressionCore,
    universalTalentProgressionCore: typedTalentProgressionCore,
    universalWeaponProgressionCore: typedWeaponLevelExp.universalWeaponProgressionCore,
    weaponAscensionPhaseCaps: typedWeaponAscensionCosts.weaponAscensionPhaseCaps,
    weaponExpMaterials: typedWeaponExpItems,
    weaponExpRequirements: typedWeaponLevelExp.weaponExpRequirements,
    weaponExpTotals1To90: typedWeaponLevelExp.weaponExpTotals1To90,
    weaponAscensionCosts: typedWeaponAscensionCosts.weaponAscensionCosts,
    weaponAscensionTotals20To90: typedWeaponAscensionCosts.weaponAscensionTotals20To90,
    legacyCharacterProgressions: legacyCharacterProgressions as unknown as CanonicalDatabase["progression"]["legacyCharacterProgressions"],
    legacyWeaponProgressions: legacyWeaponProgressions as unknown as CanonicalDatabase["progression"]["legacyWeaponProgressions"],
  },
  sources: {
    materialSources: typedMaterialSources,
    resinRules: typedResinActivities.resinRules,
    resinSystem: typedResinActivities.resinSystem,
    resinActivityCosts: typedResinActivities.resinActivityCosts,
    plannerDefaults: typedResinActivities.plannerDefaults,
    leyLineRewardsByWorldLevel: typedLeyLineRewards,
    domainsOfForgery: typedDomainSchedule.domainsOfForgery,
    domainsOfMastery: typedDomainSchedule.domainsOfMastery,
    trounceDomains: typedDomainSchedule.trounceDomains,
    weaponAscensionDomainDropModel: typedDomainLootEstimates.weaponAscensionDomainDropModel,
    talentBookDomainDropModel: typedDomainLootEstimates.talentBookDomainDropModel,
    normalBossAscensionGemDropsByWorldLevel: typedBossLootEstimates.normalBossAscensionGemDropsByWorldLevel,
    weeklyBossAscensionGemDropsByWorldLevel: typedBossLootEstimates.weeklyBossAscensionGemDropsByWorldLevel,
    normalBossUniqueMaterialDropMeanByWorldLevel: typedBossLootEstimates.normalBossUniqueMaterialDropMeanByWorldLevel,
    weeklyTalentMaterialDropMeanByWorldLevel: typedBossLootEstimates.weeklyTalentMaterialDropMeanByWorldLevel,
    bossGemThreeStarRollMean: typedBossLootEstimates.bossGemThreeStarRollMean,
    bossGemDropPackMeanByRewardLevel: typedBossLootEstimates.bossGemDropPackMeanByRewardLevel,
    bossGemDropPackRarityDistribution: typedBossLootEstimates.bossGemDropPackRarityDistribution,
    enemyRouteSources: typedEnemyRouteSources,
    leyLineOutcropLocations: typedLeyLineOutcropLocations,
    leyLineNationCoverage: typedLeyLineNationCoverage,
  },
  crafting: {
    recipes: typedRecipes,
    tieredMaterialIndex: typedTieredMaterialIndex,
    craftingUtilityPassives: typedCraftingUtilityPassives,
    craftingPlannerDefaults: typedCraftingPlannerDefaults,
    gemConversionDefaults: typedGemConversionDefaults,
  },
  artifacts: {
    artifactDomains: typedArtifactDomains,
  },
  compatibility: {
    weaponAscensionFamilies: buildWeaponAscensionCompatibilityFamilies(),
  },
};

export type { CanonicalDatabase } from "./schema";
