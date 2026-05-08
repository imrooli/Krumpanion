import type {
  ArtifactDomainRecord,
  BossGemDropPackMeanRecord,
  BossGemDropPackDistributionRecord,
  BossGemWorldLevelDropRecord,
  DomainOfForgeryRecord,
  DomainOfMasteryRecord,
  ElementGemFamily,
  EliteEnemyDropFamily,
  GeneralEnemyDropFamily,
  LeyLineRewardRecord,
  LocalSpecialtyMaterial,
  MaterialSourceRecord,
  PlannerDefaults,
  PlannerDomainLevel,
  ResinActivityCosts,
  ResinRules,
  ResinSystem,
  SpecialProgressionMaterial,
  TalentBookDomainDropModelRecord,
  TalentBookFamily,
  TrounceDomainRecord,
  UniversalCharacterProgressionCore,
  UniversalTalentProgressionCore,
  UniversalWeaponProgressionCore,
  WeaponAscensionFamily,
  WeaponAscensionMaterialFamilyRecord,
  WeaponAscensionPhaseCap,
  WeaponAscensionPhaseCost,
  WeaponExpMaterialRecord,
  WeaponExpRangeRequirement,
  WeaponExpTotalSummary,
  WeaponGoalTrackableRarityLabel,
  WeeklyBossMaterial,
  WeeklyTalentMaterialDropRecord,
  NormalBossMaterial,
  NormalBossUniqueMaterialDropRecord,
  TieredMaterialFamilyIndexEntry,
  CharacterWeaponType,
  CharacterElement,
  WeaponAscensionDomainDropModelRecord,
} from "../../domain/staticData/types";
import type {
  CraftingPlannerDefaults,
  CraftingRecipe,
  CraftingUtilityPassive,
  GemConversionDefaults,
} from "../../domain/crafting/types";
import type { MaterialTotals } from "../../utils/collections";

export type CanonicalRecordStatus =
  | "verified"
  | "unresolved"
  | "beta"
  | "special_case"
  | "ignored"
  | "deprecated";

export type CanonicalReleaseState =
  | "live"
  | "beta"
  | "unreleased"
  | "special_case"
  | "ignored"
  | "deprecated";

export interface CanonicalCharacterProfile {
  characterKey: string;
  displayName: string;
  rarity?: 4 | 5;
  weaponType?: CharacterWeaponType;
  element?: CharacterElement;
  elementGemFamilyKey: string;
  localSpecialtyKey: string;
  commonEnemyDropFamilyKey: string;
  talentBookFamilyKey: string;
  normalBossMaterialKey: string;
  weeklyBossMaterialKey: string;
  releaseState: CanonicalReleaseState;
  status: CanonicalRecordStatus;
  plannerEligible: boolean;
  region?: string | null;
  notes: string[];
  aliases?: string[];
  sourceRefs?: string[];
}

export interface CanonicalTravelerElementProfile {
  element: Exclude<CharacterElement, "Cryo">;
  talentBookFamilyKey: string;
  commonEnemyDropFamilyKey: string;
  weeklyBossMaterialKey: string;
  status: CanonicalRecordStatus;
  notes: string[];
}

export interface CanonicalTravelerProfile {
  characterKey: "Traveler";
  displayName: "Traveler";
  status: "special_case";
  releaseState: "special_case";
  plannerEligible: true;
  sharedCharacterLevel: true;
  sharedAscension: true;
  rarity: 5;
  weaponType: "Sword";
  localSpecialtyKey: string;
  commonEnemyDropFamilyKey: string;
  notes: string[];
  elementVariants: Record<string, CanonicalTravelerElementProfile>;
}

export interface CanonicalWeaponProfile {
  weaponKey: string;
  displayName: string;
  weaponType?: CharacterWeaponType | null;
  rarity: 3 | 4 | 5;
  weaponAscensionMaterialFamilyKey: string;
  eliteEnemyDropFamilyKey: string;
  commonEnemyDropFamilyKey: string;
  releaseState: CanonicalReleaseState;
  status: CanonicalRecordStatus;
  plannerEligible: boolean;
  notes: string[];
  aliases?: string[];
}

export interface CanonicalMaterialRecord {
  materialKey: string;
  displayName: string;
  category: string;
  legacyCategory: string;
  recordCategory?: string | null;
  rarity?: string | null;
  familyKey?: string | null;
  tier?: string | number | null;
  sourceKeys: string[];
  status: CanonicalRecordStatus;
  notes: string[];
  usedFor: string[];
  craftable: boolean;
  conversionRatio?: number | null;
  source?: Record<string, unknown> | null;
  characterExpValue?: number | null;
  weaponExpValue?: number | null;
}

export interface CanonicalDatabase {
  version: number;
  metadata: {
    sourceOfTruthDirectory: string;
    deprecatedRuntimeSources: string[];
  };
  characters: {
    characterProfiles: Record<string, CanonicalCharacterProfile>;
    travelerProfile: CanonicalTravelerProfile;
  };
  weapons: {
    weaponProfiles: Record<string, CanonicalWeaponProfile>;
  };
  materials: {
    materials: Record<string, CanonicalMaterialRecord>;
    elementalGemFamilies: Record<string, ElementGemFamily>;
    localSpecialties: Record<string, LocalSpecialtyMaterial>;
    commonEnemyDropFamilies: Record<string, GeneralEnemyDropFamily>;
    eliteEnemyDropFamilies: Record<string, EliteEnemyDropFamily>;
    normalBossMaterials: Record<string, NormalBossMaterial>;
    weeklyBossMaterials: Record<string, WeeklyBossMaterial>;
    talentBookFamilies: Record<string, TalentBookFamily>;
    weaponAscensionMaterialFamilies: Record<string, WeaponAscensionMaterialFamilyRecord>;
    specialProgressionMaterials: Record<string, SpecialProgressionMaterial>;
  };
  progression: {
    universalCharacterProgressionCore: UniversalCharacterProgressionCore;
    universalTalentProgressionCore: UniversalTalentProgressionCore;
    universalWeaponProgressionCore: UniversalWeaponProgressionCore;
    weaponAscensionPhaseCaps: Record<string, WeaponAscensionPhaseCap>;
    weaponExpMaterials: Record<string, WeaponExpMaterialRecord>;
    weaponExpRequirements: Record<WeaponGoalTrackableRarityLabel, WeaponExpRangeRequirement[]>;
    weaponExpTotals1To90: Record<WeaponGoalTrackableRarityLabel, WeaponExpTotalSummary>;
    weaponAscensionCosts: Record<WeaponGoalTrackableRarityLabel, Record<string, WeaponAscensionPhaseCost>>;
    weaponAscensionTotals20To90: Record<string, MaterialTotals>;
    legacyCharacterProgressions: Record<string, unknown>;
    legacyWeaponProgressions: Record<string, unknown>;
  };
  sources: {
    materialSources: Record<string, MaterialSourceRecord[]>;
    resinRules: ResinRules;
    resinSystem: ResinSystem;
    resinActivityCosts: ResinActivityCosts;
    plannerDefaults: PlannerDefaults;
    leyLineRewardsByWorldLevel: Record<string, LeyLineRewardRecord>;
    domainsOfForgery: Record<string, DomainOfForgeryRecord>;
    domainsOfMastery: Record<string, DomainOfMasteryRecord>;
    trounceDomains: Record<string, TrounceDomainRecord>;
    weaponAscensionDomainDropModel: Record<PlannerDomainLevel, WeaponAscensionDomainDropModelRecord>;
    talentBookDomainDropModel: Record<PlannerDomainLevel, TalentBookDomainDropModelRecord>;
    normalBossAscensionGemDropsByWorldLevel: Record<string, BossGemWorldLevelDropRecord>;
    weeklyBossAscensionGemDropsByWorldLevel: Record<string, BossGemWorldLevelDropRecord>;
    normalBossUniqueMaterialDropMeanByWorldLevel: Record<string, NormalBossUniqueMaterialDropRecord>;
    weeklyTalentMaterialDropMeanByWorldLevel: Record<string, WeeklyTalentMaterialDropRecord>;
    bossGemThreeStarRollMean: {
      normalBoss: number;
      weeklyBoss: number;
      appliesFromRewardLevel: number;
    };
    bossGemDropPackMeanByRewardLevel: BossGemDropPackMeanRecord[];
    bossGemDropPackRarityDistribution: BossGemDropPackDistributionRecord[];
    enemyRouteSources: Record<string, MaterialSourceRecord[]>;
  };
  crafting: {
    recipes: Record<string, CraftingRecipe>;
    tieredMaterialIndex: Record<string, TieredMaterialFamilyIndexEntry>;
    craftingUtilityPassives: Record<string, CraftingUtilityPassive>;
    craftingPlannerDefaults: CraftingPlannerDefaults;
    gemConversionDefaults: GemConversionDefaults;
  };
  artifacts: {
    artifactDomains: Record<string, ArtifactDomainRecord>;
  };
  compatibility: {
    weaponAscensionFamilies: Record<string, WeaponAscensionFamily>;
  };
}
