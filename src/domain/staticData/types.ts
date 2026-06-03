import type { AvailabilityGroupKey } from "../planner/types";
import type { MaterialTotals } from "../../utils/collections";
import type {
  CraftingPlannerDefaults,
  CraftingRecipe,
  CraftingUtilityPassive,
  GemConversionDefaults,
} from "../crafting/types";

export type MaterialCategory =
  | "mora"
  | "character_exp"
  | "weapon_exp_material"
  | "weapon_fodder_exp"
  | "character_ascension"
  | "normal_boss_material"
  | "talent_book"
  | "weapon_ascension"
  | "general_enemy_drop"
  | "elite_enemy_drop"
  | "enemy_drop"
  | "weekly_boss"
  | "local_specialty"
  | "gemstone"
  | "artifact_domain"
  | "other";

export type MaterialStatus =
  | "verified"
  | "beta"
  | "unresolved"
  | "needs_manual_review";

export type MaterialRecordCategory =
  | "ascension_gem"
  | "general_enemy_drop"
  | "elite_enemy_drop"
  | "weapon_ascension_material"
  | "weapon_exp_material"
  | "weapon_fodder_exp"
  | "local_specialty"
  | "normal_boss_material"
  | "character_talent_material"
  | "weekly_boss_material"
  | "special_progression_material";

export type MaterialUse =
  | "character_ascension"
  | "character_leveling"
  | "weapon_leveling"
  | "talent_leveling"
  | "weapon_ascension"
  | "post_90_unlock"
  | "general_currency";

export type MaterialSourceType =
  | "domain_of_mastery"
  | "domain_of_forgery"
  | "artifact_domain"
  | "normal_boss"
  | "weekly_boss"
  | "weapon_exp_material"
  | "weapon_fodder"
  | "forging"
  | "world_gathering"
  | "ley_line"
  | "enemy_drop"
  | "local_specialty"
  | "alchemy"
  | "other";

export interface LeyLineEnemySpawn {
  enemyName: string;
  count: number;
  dropFamilyKey?: string;
  isOptionalNearby?: boolean;
  notes?: string[];
}

export interface LeyLineDerivedDropFamilyCoverage {
  familyKey: string;
  familyDisplayName: string;
  materialKeys: string[];
  materialNames: string[];
  guaranteedEnemySpawns: Array<{
    enemyName: string;
    count: number;
  }>;
  optionalNearbyEnemySpawns: Array<{
    enemyName: string;
    count: number;
  }>;
  totalGuaranteedEnemyCount: number;
  notes?: string[];
}

export interface LeyLineOutcropLocation {
  locationKey: string;
  region: string;
  areaName: string;
  locationNumber: number;
  waves: number[];
  transitionsTo?: string[];
  notes?: string[];
  spawns: LeyLineEnemySpawn[];
  derivedDropFamilies: LeyLineDerivedDropFamilyCoverage[];
  unresolvedSpawnWarnings?: string[];
}

export interface LeyLineNationCoverage {
  nationKey: string;
  displayName: string;
  releaseState: "live" | "beta" | "unreleased" | "special_case" | "ignored" | "deprecated";
  enabledForRecommendations: boolean;
  familyKeys: string[];
}

export type CanonicalMaterialSource =
  | {
      type: "elemental_boss_drop_or_crafting";
      element?: CharacterElement | "Traveler";
    }
  | {
      type: "domain_of_forgery";
      region: string | null;
      domainName: string | null;
      availableDays?: string[];
      sourceHint?: string;
    }
  | {
      type: "enemy_drop";
      enemyFamily: string;
    }
  | {
      type: "local_specialty";
      region: LocalSpecialtyRegion;
      purchaseVendors: string[];
      searchHint: string;
    }
  | {
      type: "normal_boss";
      bossKey: string;
      bossName: string;
    }
  | {
      type: "domain_of_mastery";
      region: string;
      domainName: string;
      availableDays: string[];
    }
  | {
      type: "weekly_boss";
      bossKey: string | null;
      bossName: string | null;
      domainName?: string | null;
    }
  | {
      type: "special";
      sourceHint: string;
    }
  | {
      type: "weapon_exp_material";
      sourceHint: string;
    }
  | {
      type: "weapon_fodder";
      sourceHint: string;
    }
  | {
      type: "forging";
      sourceHint: string;
      inputMaterialKeys: string[];
      outputDailyCap?: number;
      resetCadence?: "daily";
    }
  | {
      type: "world_gathering";
      sourceHint: string;
      respawnDays?: number;
    }
  | {
      type: "unresolved";
      reason: string;
    };

export type LocalSpecialtyRegion =
  | "Mondstadt"
  | "Liyue"
  | "Inazuma"
  | "Sumeru"
  | "Fontaine"
  | "Natlan"
  | "Nod-Krai";

export type CharacterWeaponType = "Sword" | "Polearm" | "Claymore" | "Bow" | "Catalyst";
export type CharacterElement = "Anemo" | "Cryo" | "Dendro" | "Electro" | "Geo" | "Hydro" | "Pyro";
export type CharacterKind = "normal" | "traveler" | "traveler_element" | "non_playable" | "manual_review";
export type TravelerElementKey =
  | "traveler_anemo"
  | "traveler_geo"
  | "traveler_electro"
  | "traveler_dendro"
  | "traveler_hydro"
  | "traveler_pyro";
export type WeaponRarity = 1 | 2 | 3 | 4 | 5;
export type WeaponAcquisitionType =
  | "standard_wish"
  | "limited_wish"
  | "event"
  | "craftable"
  | "battle_pass"
  | "starglitter"
  | "fishing"
  | "quest"
  | "chest"
  | "unknown";
export type WeaponRefinementPolicy = "normal" | "manual_review" | "preserve_all" | "not_trackable";
export type WeaponGoalTrackableRarity = 3 | 4 | 5;
export type WeaponRarityLabel = "1-Star" | "2-Star" | "3-Star" | "4-Star" | "5-Star";
export type WeaponGoalTrackableRarityLabel = "3-Star" | "4-Star" | "5-Star";
export type WeaponAscensionMaterialRarity = "2-Star" | "3-Star" | "4-Star" | "5-Star";
export type WeaponEnemyMaterialRarity = "2-Star" | "3-Star" | "4-Star";
export type WeaponCommonEnemyMaterialRarity = "1-Star" | "2-Star" | "3-Star";
export type GemTier = "sliver" | "fragment" | "chunk" | "gemstone";
export type GeneralEnemyDropTier = 1 | 2 | 3;
export type TalentBookTier = "teachings" | "guide" | "philosophies";
export type AscensionPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TalentLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ElementGemFamily {
  key: string;
  element?: string;
  sliver: string;
  fragment: string;
  chunk: string;
  gemstone: string;
}

export interface TalentBookFamily {
  key: string;
  teachings: string;
  guide: string;
  philosophies: string;
  domainKey?: string;
  domainName?: string;
  availability?: AvailabilityGroupKey;
  region?: string;
}

export interface EnemyDropFamily {
  key: string;
  low: string;
  mid: string;
  high: string;
  top?: string;
  notes?: string;
}

export interface EliteEnemyDropFamily {
  familyId: string;
  displayName: string;
  category: "elite_enemy_drop";
  sourceType: "Elite Enemies";
  sourceEnemyFamily: string;
  materialNames: [string, string, string];
  materialKeys: [string, string, string];
  rarity: [2, 3, 4];
  usedFor: ["weapon_ascension"];
  usedByWeapons: string[];
  usedByWeaponKeys?: string[];
}

export interface CharacterReferenceMetadata {
  displayName: string;
  characterKey: string;
  travelerElement?: string;
}

export type CharacterMaterialStatus =
  | "verified"
  | "beta"
  | "unresolved"
  | "needs_manual_review";

export interface UnresolvedCharacterMaterialReference {
  characterKey: string;
  displayName: string;
  materialSlot:
    | "ascensionGem"
    | "normalBossMaterial"
    | "enemyDrop"
    | "localSpecialty"
    | "talentBook"
    | "weeklyBossMaterial";
  rawName: string;
  generatedKey: string;
  reason: string;
  status: CharacterMaterialStatus;
}

export interface GeneralEnemyDropFamily {
  familyId: string;
  displayName: string;
  category: "general_enemy_drop";
  sourceType: "Common Enemies and some Elite Enemies";
  sourceEnemyFamily: string;
  materialNames: [string, string, string];
  materialKeys: [string, string, string];
  rarity: [1, 2, 3];
  usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"];
  usedByCharacters: string[];
  usedByCharacterKeys?: string[];
  usedByCharacterReferences?: CharacterReferenceMetadata[];
  usedByWeapons: string[];
  usedByWeaponKeys?: string[];
}

export interface UnresolvedCharacterReference {
  familyId: string;
  displayName: string;
  generatedKey: string;
  travelerElement?: string;
}

export interface UnresolvedWeaponReference {
  familyId: string;
  weaponName: string;
  generatedKey: string;
}

export interface MaterialFamilyReference {
  familyId: string;
  displayName: string;
  category: "general_enemy_drop" | "elite_enemy_drop";
  sourceType: "Common Enemies and some Elite Enemies" | "Elite Enemies";
  sourceEnemyFamily: string;
}

export interface WeaponAscensionFamily {
  key: string;
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;
  domainKey?: string;
  domainName?: string;
  availability?: AvailabilityGroupKey;
  region?: string;
}

export interface LocalSpecialtySource {
  key: string;
  materialKey: string;
  region?: string;
  notes?: string;
}

export interface LocalSpecialtyMaterial {
  key: string;
  displayName: string;
  category: "local_specialty";
  region: LocalSpecialtyRegion;
  usedFor: ["character_ascension"];
  isPurchasable: boolean;
  purchaseVendors: string[];
  searchHint: string;
  craftable: false;
}

export interface NormalBossMaterial {
  key: string;
  displayName: string;
  bossKey: string;
  bossDisplayName: string;
  category: "normal_boss_material";
  usedFor: ["character_ascension"];
  craftable: false;
}

export interface WeeklyBossMaterial {
  key: string;
  displayName: string;
  category: "weekly_boss_material";
  source: Extract<CanonicalMaterialSource, { type: "weekly_boss" | "unresolved" }>;
  usedFor: ["talent_leveling"];
  craftable: false;
  status: MaterialStatus;
  notes?: string[];
}

export interface SpecialProgressionMaterial {
  key: string;
  displayName: string;
  category: "special_progression_material";
  source: Extract<CanonicalMaterialSource, { type: "special" | "unresolved" }>;
  usedFor: MaterialUse[];
  craftable: false;
  status: MaterialStatus;
  notes?: string[];
}

export interface CharacterCatalogEntry {
  key: string;
  displayName: string;
  element?: CharacterElement;
  weaponType?: CharacterWeaponType;
  rarity?: 4 | 5;
  region?: string;
  playable?: boolean;
  characterKind?: CharacterKind;
}

export interface WeaponCatalogEntry {
  key: string;
  displayName: string;
  weaponType?: CharacterWeaponType;
  rarity?: WeaponRarity;
  acquisitionType?: WeaponAcquisitionType;
  refinementTrackable?: boolean;
  refinementPolicy?: WeaponRefinementPolicy;
  limited?: boolean;
  eventExclusive?: boolean;
}

export interface MaterialDescriptor {
  key: string;
  displayName: string;
  category: MaterialCategory;
  characterExpValue?: number;
  weaponExpValue?: number;
}

export interface MaterialRecord {
  key: string;
  displayName: string;
  category: MaterialRecordCategory;
  rarity?: WeaponRarityLabel;
  expValue?: number;
  familyKey?: string;
  source: CanonicalMaterialSource;
  usedFor: MaterialUse[];
  craftable: boolean;
  conversionRatio?: number;
  status: MaterialStatus;
  notes?: string[];
}

export interface MaterialSourceRecord {
  materialKey: string;
  sourceType: MaterialSourceType;
  sourceKey: string;
  sourceName: string;
  resinCost?: number;
  availability: AvailabilityGroupKey;
  region?: string;
  notes?: string;
  inputMaterialKey?: string;
  inputQuantity?: number;
  outputQuantity?: number;
  dailyOutputCap?: number;
  resetCadence?: "daily";
  respawnDays?: number;
}

export interface ArtifactDomainRecord {
  setKey: string;
  domainKey: string;
  domainName: string;
  availability: AvailabilityGroupKey;
  resinCost: number;
}

export interface ResinRules {
  version: number;
  originalResinCap: number;
  regenMinutesPerResin: number;
  naturalResinPerDay: number;
  naturalResinPerWeek: number;
  costs: {
    domain: number;
    leyLine: number;
    normalBoss: number;
    weeklyBossDiscounted: number;
    weeklyBossFull: number;
    condensedResinCraft: number;
  };
  fragileResinRestores: number;
  transientResinRestores: number;
}

export type PlannerDomainLevel = "I" | "II" | "III" | "IV";

export interface ResinSystem {
  originalResin: {
    softCap: number;
    hardCapAfterManualRefill: number;
    regenMinutesPerResin: number;
    resinPerHour: number;
    resinPerDay: number;
    resinPerWeek: number;
    fullRechargeFromZeroMinutes: number;
    fullRechargeFromZeroHours: number;
  };
  adventureExpRatio: {
    resinToAdventureExp: number;
    note: string;
  };
  manualRefill: {
    resinPerUse: number;
    canExceedSoftCap: boolean;
    cannotRefillAbove: number;
    maxAfterRefill: number;
    fragileResinRestores: number;
    transientResinRestores: number;
    primogemRefillsPerDay: number;
    primogemRefillSchedule: Array<{
      refillNumber: number;
      primogems: number;
      totalPrimogems: number;
      maxTotalResin: number;
      resinPerPrimogemTotal: number;
    }>;
  };
}

export interface ResinActivityCosts {
  leyLineOutcrop: {
    resin: number;
    condensedResinAllowed: boolean;
    condensedResinEquivalentResin: number;
    adventureExpPer20ResinClaim: number;
  };
  domain: {
    resin: number;
    condensedResinAllowed: boolean;
    condensedResinEquivalentResin: number;
    adventureExpPer20ResinClaim: number;
  };
  normalBoss: {
    resin: number;
    condensedResinAllowed: boolean;
    adventureExpPerClaim: number;
  };
  weeklyBoss: {
    firstThreePerWeekResin: number;
    afterFirstThreePerWeekResin: number;
    condensedResinAllowed: boolean;
    adventureExpPerDiscountedClaim: number;
    adventureExpPerFullCostClaim: number;
    rewardLimitPerBossPerWeek: number;
    weeklyDiscountedClaims: number;
  };
}

export interface WorldLevelRewardRange {
  min: number;
  max: number;
}

export interface LeyLineRewardRecord {
  enemyLevel: string;
  adventureExp: number;
  companionshipExp: number;
  revelation: {
    characterExpMaterials: Record<string, WorldLevelRewardRange>;
    averageCharacterExp: number;
    averageEfficiencyPercent: number | null;
  };
  wealth: {
    mora: number;
    efficiencyPercent: number | null;
  };
}

export interface DomainOfForgeryRecord {
  name: string;
  region: string;
  location: string;
  activityType: "domain_of_forgery";
  resinCost: number;
  condensedResinAllowed: boolean;
  adventureRankRequirements: number[];
  partyLevelRecommendations: number[];
  elements: string[];
  weaponAscensionFamilies: string[];
  listedRewards: string[];
}

export interface DomainOfMasteryRecord {
  name: string;
  region: string;
  location: string;
  activityType: "domain_of_mastery";
  resinCost: number;
  condensedResinAllowed: boolean;
  adventureRankRequirements: number[];
  partyLevelRecommendations: number[];
  elements: string[];
  talentFamilies: string[];
  listedRewards: string[];
}

export interface TrounceDomainRecord {
  name: string;
  region: string;
  location: string;
  activityType: "trounce_domain";
  resinCostFirstThreeWeekly: number;
  resinCostAfterFirstThreeWeekly: number;
  rewardLimit: "once_per_boss_per_week";
  adventureRankRequirements: number[];
  partyLevelRecommendations: number[];
  weeklyTalentMaterials: string[];
}

export interface TierDropAverage {
  range: string;
  average: number;
}

export interface WeaponAscensionDomainDropModelRecord {
  domainLevel: PlannerDomainLevel;
  resinCost: number;
  overall: {
    twoStar: TierDropAverage | null;
    threeStar: TierDropAverage | null;
    fourStar: TierDropAverage | null;
    fiveStar: TierDropAverage | null;
  };
  twoStarRollMean: number;
  dropPackMean: number;
  dropPackDistribution: {
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  };
}

export interface TalentBookDomainDropModelRecord {
  domainLevel: PlannerDomainLevel;
  resinCost: number;
  overall: {
    twoStar: TierDropAverage | null;
    threeStar: TierDropAverage | null;
    fourStar: TierDropAverage | null;
  };
  twoStarRollMean: number;
  dropPackMean: number;
  dropPackDistribution: {
    twoStar: number;
    threeStar: number;
    fourStar: number;
  };
}

export interface BossGemWorldLevelDropRecord {
  enemyLevel: number | string;
  twoStar: TierDropAverage | null;
  threeStar: TierDropAverage | null;
  fourStar: TierDropAverage | null;
  fiveStar: TierDropAverage | null;
}

export interface NormalBossUniqueMaterialDropRecord {
  bossLevel: string;
  rewardTier: number;
  dropMean: number;
}

export interface WeeklyTalentMaterialDropRecord {
  enemyLevel: number;
  dropMean: number;
}

export interface BossGemDropPackMeanRecord {
  enemyLevel: string;
  rewardLevel: number;
  normalBoss: number;
  weeklyBoss: number;
}

export interface BossGemDropPackDistributionRecord {
  enemyLevel: string;
  rewardLevel: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

export interface PlannerDefaults {
  worldLevel: number;
  domainLevel: PlannerDomainLevel;
  useHighestUnlockedDomain: boolean;
  craftAwareEstimates: boolean;
  naturalResinPerDay: number;
  naturalResinPerWeek: number;
  assumeCondensedResinEquivalentForDomains: boolean;
  weeklyBossDiscountedClaimsAvailable: number;
  includeAdventureExpEstimate: boolean;
  estimateOpenWorldEnemyDrops: boolean;
}

export interface TieredMaterialFamilyIndexEntry {
  materialKey: string;
  familyKey: string;
  familyType:
    | "element_gem_family"
    | "talent_book_family"
    | "weapon_ascension_material_family"
    | "general_enemy_drop_family"
    | "elite_enemy_drop_family";
  tierIndex: number;
  maxTierIndex: number;
  tierKeys: string[];
}

export interface CharacterProgressionEntry {
  key: string;
  levelTotals: Record<string, MaterialTotals>;
  ascensionTotals: Record<string, MaterialTotals>;
  talentTotals: Record<string, MaterialTotals>;
  levelCapExtensionTotals?: Record<string, MaterialTotals>;
}

export interface WeaponProgressionEntry {
  key: string;
  levelTotals: Record<string, MaterialTotals>;
  ascensionTotals: Record<string, MaterialTotals>;
}

export interface UniversalCharacterLevelCoreTotal {
  exp: number;
  moraUsingRecommendedBooks: number;
  recommendedBooks?: MaterialTotals;
}

export interface UniversalCharacterAscensionCoreTotal {
  maxLevelAfter?: number;
  requiredAdventureRank?: number | null;
  rewards?: MaterialTotals;
  unlocks?: string[];
  mora?: number;
  gem?: Partial<Record<GemTier, number>>;
  localSpecialty?: number;
  normalBossMaterial?: number;
  enemyDrop?: Partial<Record<"low" | "mid" | "high", number>>;
}

export interface CharacterAscensionCost {
  fromPhase: AscensionPhase;
  toPhase: AscensionPhase;
  resultingMaxLevel: number;
  requiredAdventureRank: number | null;
  mora: number;
  gemTier?: GemTier;
  gemCount?: number;
  normalBossMaterialCount?: number;
  localSpecialtyCount?: number;
  commonEnemyTier?: GeneralEnemyDropTier;
  commonEnemyCount?: number;
  unlocks: string[];
  rewards?: Array<{ key: string; count: number }>;
}

export interface CharacterLevelCapExtensionCost {
  fromMaxLevel: number;
  toMaxLevel: number;
  materialKey: "MasterlessStellaFortuna";
  materialCount: number;
}

export interface UniversalCharacterProgressionCore {
  schemaVersion: number;
  mode: "cumulative";
  levelCapByAscension: Record<string, number>;
  ascensionCosts: CharacterAscensionCost[];
  post90LevelCapExtensionCosts: CharacterLevelCapExtensionCost[];
  levelTotals: Record<string, UniversalCharacterLevelCoreTotal>;
  ascensionTotals: Record<string, UniversalCharacterAscensionCoreTotal>;
}

export interface UniversalTalentCoreTotal {
  mora: number;
  talentBook: Partial<Record<"teachings" | "guide" | "philosophies", number>>;
  enemyDrop: Partial<Record<"low" | "mid" | "high", number>>;
  weeklyBossMaterial: number;
  CrownOfInsight: number;
  requiredAscension: number;
}

export interface TalentUpgradeCost {
  fromLevel: TalentLevel;
  toLevel: TalentLevel;
  requiredAscensionPhase: AscensionPhase;
  mora: number;
  commonEnemyTier?: GeneralEnemyDropTier;
  commonEnemyCount?: number;
  talentBookTier?: TalentBookTier;
  talentBookCount?: number;
  weeklyBossMaterialCount?: number;
  crownOfInsightCount?: number;
}

export interface UniversalTalentProgressionCore {
  schemaVersion: number;
  mode: "cumulative";
  appliesPerTalent: boolean;
  talentSlots: Array<"auto" | "skill" | "burst">;
  talentCapByCharacterAscension: Record<string, number>;
  upgradeCosts: TalentUpgradeCost[];
  totalsPerTalent: Record<string, UniversalTalentCoreTotal>;
}

export interface UniversalWeaponLevelCoreTotal {
  exp: number;
  mora: number;
}

export interface UniversalWeaponAscensionCoreTotal {
  requiredLevel?: number;
  maxLevelAfter?: number;
  requiredAdventureRank?: number;
  mora: number;
  weaponAscensionMaterial?: Partial<Record<"tier1" | "tier2" | "tier3" | "tier4", number>>;
  eliteEnemyDrop?: Partial<Record<"low" | "mid" | "high", number>>;
  commonEnemyDrop?: Partial<Record<"low" | "mid" | "high", number>>;
}

export interface UniversalWeaponProgressionCore {
  schemaVersion: number;
  mode: "cumulative";
  levelCapByAscension: Record<string, number>;
  levelTotalsByRarity: Record<string, Record<string, UniversalWeaponLevelCoreTotal>>;
  ascensionTotalsByRarity: Record<string, Record<string, UniversalWeaponAscensionCoreTotal>>;
}

export interface WeaponAscensionPhaseCap {
  phaseName: string;
  maxLevel: number;
  requiredAdventureRank: number | null;
}

export interface WeaponExpMaterialRecord {
  key: string;
  displayName: string;
  category: "weapon_exp_material" | "weapon_fodder_exp";
  rarity: "1-Star" | "2-Star" | "3-Star";
  expValue: number;
  usedFor: ["weapon_leveling"];
  craftable: false;
  source: Extract<CanonicalMaterialSource, { type: "weapon_exp_material" | "weapon_fodder" }>;
  status: MaterialStatus;
}

export interface WeaponExpRangeRequirement {
  range: string;
  startLevel: number;
  endLevel: number;
  mysticOre: number;
  fineOre: number;
  threeStarWeapons: number;
  twoStarWeapons: number;
  oneStarWeapons: number;
  enhancementOre: number;
  expNeeded: number;
  wastedExp: number;
  mora: number;
}

export interface WeaponExpTotalSummary {
  mysticOre: number;
  fineOre: number;
  threeStarWeapons: number;
  twoStarWeapons: number;
  oneStarWeapons: number;
  enhancementOre: number;
  expNeeded: number;
  wastedExp: number;
  mora: number;
}

export interface WeaponAscensionTierCost<TTier extends string> {
  tier: TTier;
  amount: number;
}

export interface WeaponAscensionPhaseCost {
  maxLevelAfter: number;
  requiredAdventureRank: number;
  mora: number;
  weaponAscensionMaterial: WeaponAscensionTierCost<WeaponAscensionMaterialRarity>;
  eliteEnemyMaterial: WeaponAscensionTierCost<WeaponEnemyMaterialRarity>;
  commonEnemyMaterial: WeaponAscensionTierCost<WeaponCommonEnemyMaterialRarity>;
}

export interface WeaponAscensionMaterialFamilyRecord {
  key: string;
  displayName: string;
  category: "weapon_ascension_material_family";
  source: Extract<CanonicalMaterialSource, { type: "domain_of_forgery" }>;
  tiers: {
    twoStar: string;
    threeStar: string;
    fourStar: string;
    fiveStar: string;
  };
  tierDisplayNames: {
    twoStar: string;
    threeStar: string;
    fourStar: string;
    fiveStar: string;
  };
  usedByWeapons: string[];
  usedByWeaponKeys?: string[];
  craftable: true;
  conversionRatio: 3;
  status: "verified" | "needs_manual_review";
}

export interface CharacterMaterialProfile {
  characterKey: string;
  name?: string;
  weaponType?: CharacterWeaponType;
  rarity?: 4 | 5;
  element?: CharacterElement;
  gemFamilyKey?: string;
  normalBossMaterialKey?: string;
  commonEnemyMaterialFamilyId?: string;
  localSpecialtyKey?: string;
  talentBookSeriesKey?: string;
  weeklyBossMaterialKey?: string;
  displayName?: string;
  status?: CharacterMaterialStatus;
  sourceVersion?: string;
  ascensionGemRepresentativeName?: string;
  ascensionGemRepresentativeKey?: string;
  elementGemFamilyKey?: string;
  gemSeries?: [string, string, string, string];
  localSpecialtySourceKey?: string;
  localSpecialtyName?: string;
  localSpecialtyStatus?: CharacterMaterialStatus;
  localSpecialty?: string;
  normalBossMaterialName?: string;
  normalBossMaterialStatus?: CharacterMaterialStatus;
  normalBossMaterial: string;
  enemyDropRepresentativeName?: string;
  enemyDropRepresentativeKey?: string;
  enemyDropFamilyKey?: string;
  enemyDropFamily?: [string, string, string];
  talentBookRepresentativeName?: string;
  talentBookRepresentativeKey?: string;
  talentBookFamilyKey?: string;
  talentBookFamily?: [string, string, string];
  weeklyBossMaterialName?: string;
  weeklyBossMaterialStatus?: CharacterMaterialStatus;
  weeklyBossMaterial: string;
  post90ResourceKey?: string;
  notes?: string[];
}

export interface TravelerProfile {
  baseCharacterKey: "Traveler";
  displayName: "Traveler";
  sharedLevelProfileKey: "Traveler";
  availableElements: TravelerElementKey[];
}

export interface TravelerElementProfile {
  key: TravelerElementKey;
  displayName: string;
  element: Exclude<CharacterElement, "Cryo">;
  playable: true;
  characterKind: "traveler_element";
  talentBookFamilyKey: string;
  commonEnemyDropFamilyKey: string;
  weeklyBossMaterialKey?: string;
  status: "complete" | "partial" | "manual_review";
  warnings?: string[];
}

export interface WeaponMaterialProfile {
  weaponKey: string;
  rarity?: WeaponRarity;
  weaponType?: CharacterWeaponType;
  weaponAscensionFamilyKey?: string;
  weaponAscensionMaterialFamily?: [string, string, string, string];
  eliteEnemyDropFamilyId?: string;
  eliteEnemyFamilyKey?: string;
  eliteEnemyFamily?: [string, string, string];
  commonEnemyFamilyKey?: string;
  commonEnemyFamily?: [string, string, string];
  goalTrackable?: boolean;
  status?: MaterialStatus;
  notes?: string[];
  domainKey?: string;
  availability?: AvailabilityGroupKey;
}

export interface CharacterMaterialImportRow {
  displayName: string;
  gemRepresentativeName: string;
  trailingCells: string[];
}

export interface GeneratedCharacterMaterialBundle {
  sourceVersion: string;
  characters: Record<string, CharacterCatalogEntry>;
  materials: Record<string, MaterialDescriptor>;
  profiles: Record<string, CharacterMaterialProfile>;
  unresolvedReferences: UnresolvedCharacterMaterialReference[];
}

export interface StaticGameData {
  version: number;
  characters: Record<string, CharacterCatalogEntry>;
  travelerProfile: TravelerProfile;
  travelerElementProfiles: Record<TravelerElementKey, TravelerElementProfile>;
  materials: Record<string, MaterialDescriptor>;
  weapons: Record<string, WeaponCatalogEntry>;
  universalCharacterProgressionCore: UniversalCharacterProgressionCore;
  universalTalentProgressionCore: UniversalTalentProgressionCore;
  universalWeaponProgressionCore: UniversalWeaponProgressionCore;
  weaponAscensionPhaseCaps: Record<string, WeaponAscensionPhaseCap>;
  weaponExpMaterials: Record<string, WeaponExpMaterialRecord>;
  weaponExpRequirements: Record<WeaponGoalTrackableRarityLabel, WeaponExpRangeRequirement[]>;
  weaponExpTotals1To90: Record<WeaponGoalTrackableRarityLabel, WeaponExpTotalSummary>;
  weaponAscensionCosts: Record<WeaponGoalTrackableRarityLabel, Record<string, WeaponAscensionPhaseCost>>;
  weaponAscensionTotals20To90: Record<string, MaterialTotals>;
  elementGemFamilies: Record<string, ElementGemFamily>;
  talentBookFamilies: Record<string, TalentBookFamily>;
  enemyDropFamilies: Record<string, EnemyDropFamily>;
  generalEnemyDropFamilies: Record<string, GeneralEnemyDropFamily>;
  eliteEnemyDropFamilies: Record<string, EliteEnemyDropFamily>;
  weaponAscensionMaterialFamilies: Record<string, WeaponAscensionMaterialFamilyRecord>;
  localSpecialties: Record<string, LocalSpecialtyMaterial>;
  localSpecialtiesByRegion: Record<LocalSpecialtyRegion, LocalSpecialtyMaterial[]>;
  normalBossMaterials: Record<string, NormalBossMaterial>;
  weeklyBossMaterials: Record<string, WeeklyBossMaterial>;
  specialProgressionMaterials: Record<string, SpecialProgressionMaterial>;
  materialRecords: Record<string, MaterialRecord>;
  tieredMaterialIndex: Record<string, TieredMaterialFamilyIndexEntry>;
  weaponAscensionFamilies: Record<string, WeaponAscensionFamily>;
  localSpecialtySources: Record<string, LocalSpecialtySource>;
  characterMaterialProfiles: Record<string, CharacterMaterialProfile>;
  weaponMaterialProfiles: Record<string, WeaponMaterialProfile>;
  characterProgressions: Record<string, CharacterProgressionEntry>;
  weaponProgressions: Record<string, WeaponProgressionEntry>;
  legacyCharacterProgressions: Record<string, CharacterProgressionEntry>;
  legacyWeaponProgressions: Record<string, WeaponProgressionEntry>;
  materialSources: Record<string, MaterialSourceRecord[]>;
  materialFamilyByKey: Record<string, MaterialFamilyReference>;
  characterGeneralEnemyDropFamilyByKey: Record<string, string>;
  weaponGeneralEnemyDropFamilyByKey: Record<string, string>;
  weaponEliteEnemyDropFamilyByKey: Record<string, string>;
  generalEnemyDropCharacterReferences: CharacterReferenceMetadata[];
  unresolvedCharacterReferences: UnresolvedCharacterReference[];
  unresolvedCharacterMaterialReferences: UnresolvedCharacterMaterialReference[];
  unresolvedWeaponReferences: UnresolvedWeaponReference[];
  artifactDomains: Record<string, ArtifactDomainRecord>;
  recipes: Record<string, CraftingRecipe>;
  craftingRecipes: Record<string, CraftingRecipe>;
  craftingUtilityPassives: Record<string, CraftingUtilityPassive>;
  craftingPlannerDefaults: CraftingPlannerDefaults;
  gemConversionDefaults: GemConversionDefaults;
  resinRules: ResinRules;
  resinSystem: ResinSystem;
  resinActivityCosts: ResinActivityCosts;
  leyLineRewardsByWorldLevel: Record<string, LeyLineRewardRecord>;
  domainsOfForgery: Record<string, DomainOfForgeryRecord>;
  domainsOfMastery: Record<string, DomainOfMasteryRecord>;
  trounceDomains: Record<string, TrounceDomainRecord>;
  leyLineOutcropLocations: Record<string, LeyLineOutcropLocation>;
  leyLineOutcropLocationList: LeyLineOutcropLocation[];
  leyLineNationCoverage: Record<string, LeyLineNationCoverage>;
  leyLineNationCoverageList: LeyLineNationCoverage[];
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
  plannerDefaults: PlannerDefaults;
  appliedOverrideKeys: string[];
}

export interface OverrideDataPack {
  version: number;
  label?: string;
  characters?: Record<string, CharacterCatalogEntry>;
  materials?: Record<string, MaterialDescriptor>;
  characterProgressions?: Record<string, Partial<CharacterProgressionEntry>>;
  universalCharacterProgressionCore?: Partial<UniversalCharacterProgressionCore>;
  universalTalentProgressionCore?: Partial<UniversalTalentProgressionCore>;
  universalWeaponProgressionCore?: Partial<UniversalWeaponProgressionCore>;
  weaponAscensionPhaseCaps?: Record<string, WeaponAscensionPhaseCap>;
  weaponExpMaterials?: Record<string, WeaponExpMaterialRecord>;
  weaponExpRequirements?: Record<WeaponGoalTrackableRarityLabel, WeaponExpRangeRequirement[]>;
  weaponExpTotals1To90?: Record<WeaponGoalTrackableRarityLabel, WeaponExpTotalSummary>;
  weaponAscensionCosts?: Record<WeaponGoalTrackableRarityLabel, Record<string, WeaponAscensionPhaseCost>>;
  weaponAscensionTotals20To90?: Record<string, MaterialTotals>;
  elementGemFamilies?: Record<string, ElementGemFamily>;
  talentBookFamilies?: Record<string, TalentBookFamily>;
  enemyDropFamilies?: Record<string, EnemyDropFamily>;
  generalEnemyDropFamilies?: Record<string, GeneralEnemyDropFamily>;
  eliteEnemyDropFamilies?: Record<string, EliteEnemyDropFamily>;
  weaponAscensionMaterialFamilies?: Record<string, WeaponAscensionMaterialFamilyRecord>;
  localSpecialties?: Record<string, LocalSpecialtyMaterial>;
  normalBossMaterials?: Record<string, NormalBossMaterial>;
  weeklyBossMaterials?: Record<string, WeeklyBossMaterial>;
  specialProgressionMaterials?: Record<string, SpecialProgressionMaterial>;
  materialRecords?: Record<string, MaterialRecord>;
  tieredMaterialIndex?: Record<string, TieredMaterialFamilyIndexEntry>;
  weaponAscensionFamilies?: Record<string, WeaponAscensionFamily>;
  localSpecialtySources?: Record<string, LocalSpecialtySource>;
  characterMaterialProfiles?: Record<string, CharacterMaterialProfile>;
  weapons?: Record<string, WeaponCatalogEntry>;
  weaponProgressions?: Record<string, Partial<WeaponProgressionEntry>>;
  weaponMaterialProfiles?: Record<string, WeaponMaterialProfile>;
  materialSources?: Record<string, MaterialSourceRecord[]>;
  artifactDomains?: Record<string, ArtifactDomainRecord>;
  recipes?: Record<string, CraftingRecipe>;
  craftingRecipes?: Record<string, CraftingRecipe>;
  craftingUtilityPassives?: Record<string, CraftingUtilityPassive>;
  craftingPlannerDefaults?: Partial<CraftingPlannerDefaults>;
  gemConversionDefaults?: Partial<GemConversionDefaults>;
  resinSystem?: Partial<ResinSystem>;
  resinActivityCosts?: Partial<ResinActivityCosts>;
  leyLineRewardsByWorldLevel?: Record<string, LeyLineRewardRecord>;
  domainsOfForgery?: Record<string, DomainOfForgeryRecord>;
  domainsOfMastery?: Record<string, DomainOfMasteryRecord>;
  trounceDomains?: Record<string, TrounceDomainRecord>;
  leyLineOutcropLocations?: Record<string, LeyLineOutcropLocation>;
  weaponAscensionDomainDropModel?: Record<PlannerDomainLevel, WeaponAscensionDomainDropModelRecord>;
  talentBookDomainDropModel?: Record<PlannerDomainLevel, TalentBookDomainDropModelRecord>;
  normalBossAscensionGemDropsByWorldLevel?: Record<string, BossGemWorldLevelDropRecord>;
  weeklyBossAscensionGemDropsByWorldLevel?: Record<string, BossGemWorldLevelDropRecord>;
  normalBossUniqueMaterialDropMeanByWorldLevel?: Record<string, NormalBossUniqueMaterialDropRecord>;
  weeklyTalentMaterialDropMeanByWorldLevel?: Record<string, WeeklyTalentMaterialDropRecord>;
  bossGemThreeStarRollMean?: {
    normalBoss: number;
    weeklyBoss: number;
    appliesFromRewardLevel: number;
  };
  bossGemDropPackMeanByRewardLevel?: BossGemDropPackMeanRecord[];
  bossGemDropPackRarityDistribution?: BossGemDropPackDistributionRecord[];
  plannerDefaults?: Partial<PlannerDefaults>;
  legacyExactCharacterProgressions?: Record<string, Partial<CharacterProgressionEntry>>;
  legacyExactWeaponProgressions?: Record<string, Partial<WeaponProgressionEntry>>;
}
