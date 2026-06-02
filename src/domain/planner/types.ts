import type { AccountInventoryState, AccountOwnershipState } from "../account/types";
import type { GoalPlanningMode, KrumpanionGoals, PlannerSettings } from "../goals/types";
import type { MaterialTotals } from "../../utils/collections";
import type { PlannerDomainLevel, StaticGameData, MaterialCategory, MaterialSourceRecord } from "../staticData/types";
import type { CraftingPlan } from "../crafting/types";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type AvailabilityGroupKey =
  | "MON_THU_SUN"
  | "TUE_FRI_SUN"
  | "WED_SAT_SUN"
  | "ALWAYS"
  | "WEEKLY"
  | "UNKNOWN";

export type PlannerWarningType =
  | "unknown_character"
  | "unknown_material"
  | "missing_cost_table"
  | "missing_character_profile"
  | "missing_weapon_profile"
  | "missing_element_gem_family"
  | "missing_talent_book_family"
  | "missing_enemy_drop_family"
  | "missing_weapon_ascension_family"
  | "weapon_requires_manual_review"
  | "missing_source_metadata"
  | "post_90_profile_incomplete"
  | "insufficient_ascension_for_talent_goal"
  | "weapon_partial_level_range_requires_curve"
  | "invalid_weapon_goal"
  | "unsupported_weapon_rarity"
  | "invalid_override_record"
  | "migration_notice"
  | "estimate_source_unresolved"
  | "planner_advisory";

export interface PlannerWarning {
  type: PlannerWarningType;
  message: string;
  key?: string;
}

export interface GoalUsage {
  goalType: "character" | "talent" | "weapon" | "artifact";
  key: string;
  amount: number;
  requirementLabel?: string;
  displayName?: string;
}

export interface MaterialNeedRow {
  materialKey: string;
  displayName: string;
  progressionNeeded: number;
  extraNeeded: number;
  needed: number;
  owned: number;
  missing: number;
  rawMissing: number;
  craftableQuantity: number;
  effectiveOwned: number;
  effectiveDeficit: number;
  category: MaterialCategory | "other";
  familyId?: string;
  familyDisplayName?: string;
  sourceEnemyFamily?: string;
  region?: string;
  isPurchasable?: boolean;
  purchaseVendors?: string[];
  searchHint?: string;
  usedBy: GoalUsage[];
  sources: MaterialSourceRecord[];
  craftingReport?: import("../crafting/types").CraftingPlanReport;
}

export interface DeterministicRequirement {
  materialKey: string;
  displayName: string;
  quantityRequired: number;
  category: MaterialCategory | "other";
  requiredByGoals: string[];
  requirementType:
    | "character_level"
    | "character_ascension"
    | "talent_level"
    | "weapon_level"
    | "weapon_ascension"
    | "artifact_goal"
    | "other";
}

export interface InventoryCoverage {
  materialKey: string;
  quantityRequired: number;
  quantityOwned: number;
  quantityReserved: number;
  quantityUsable: number;
  quantityConsumed: number;
  remainingAfterInventory: number;
  surplusAfterInventory: number;
}

export interface MaterialDeficit {
  materialKey: string;
  displayName: string;
  category: MaterialCategory | "other";
  missingQuantity: number;
  sourceKeys: string[];
  familyKey?: string;
  requiredByGoals: string[];
  canCraftFromLowerTiers: boolean;
  noResin: boolean;
  resinGated: boolean;
  warnings: string[];
}

export type FarmingEstimateSourceType =
  | "ley_line_wealth"
  | "ley_line_revelation"
  | "ley_line_enemy_drop"
  | "domain_of_forgery"
  | "domain_of_mastery"
  | "normal_boss"
  | "weekly_boss"
  | "open_world_enemy"
  | "local_specialty"
  | "unknown";

export type LootModelDataQuality = "exact" | "observed_estimate" | "inferred" | "partial" | "unknown";

export interface LootTableModel {
  sourceKey: string;
  activityType: FarmingEstimateSourceType;
  resinCostPerClaim: number | null;
  levelDimension: "world_level" | "domain_level" | "enemy_level" | "reward_tier" | "adventure_rank" | "none";
  outputFamilies: string[];
  outputMaterials: string[];
  rolls: string[];
  expectedOutputs: Record<string, number>;
  knownDataQuality: LootModelDataQuality;
  notes: string[];
  warnings?: string[];
}

export interface FarmingEstimate {
  estimateKey?: string;
  sourceKey?: string;
  materialKey: string;
  materialName: string;
  missingAmount: number;
  sourceType: FarmingEstimateSourceType;
  sourceName: string | null;
  deterministicRequirement: number;
  relatedMaterialKeys?: string[];
  relatedMaterialDisplayNames?: Record<string, string>;
  deterministicRequirementsByMaterial?: Record<string, number>;
  remainingDeficitsByMaterial?: Record<string, number>;
  estimatedRuns: number | null;
  actionableRuns?: number | null;
  estimatedResin: number | null;
  estimatedDaysNaturalResin: number | null;
  estimatedWeeksNaturalResin: number | null;
  weeklyGate?: {
    isWeeklyGated: boolean;
    estimatedWeeks: number | null;
    rewardLimit: string | null;
    discountedClaims?: number;
    fullCostClaims?: number;
  };
  availability?: AvailabilityGroupKey;
  relatedGoalKeys?: string[];
  relatedGoalLabels?: string[];
  isAvailableToday?: boolean;
  assumptions: string[];
  warnings: string[];
  estimateBasis?: string;
  dataQuality?: LootModelDataQuality;
}

export interface SourceEstimate extends FarmingEstimate {
  sourceKey: string;
  sourceDisplayName: string;
  resinCostPerRun: number | null;
  actionableRuns: number | null;
  affectedMaterialKeys: string[];
  deficitsCovered: Record<string, number>;
  details?: Record<string, string | number | boolean | null>;
}

export interface PlanMaterialBreakdown {
  label: string;
  materialTotals: MaterialTotals;
}

export type GoalResolutionType = "character" | "weapon";

export interface GoalResolutionBase {
  goalType: GoalResolutionType;
  goalKey: string;
  displayName: string;
  missingByMaterial: MaterialTotals;
  breakdown: PlanMaterialBreakdown[];
  missingSummary: MaterialNeedRow[];
  estimatedResin: number;
  warnings: PlannerWarning[];
}

export interface CharacterPlan extends GoalResolutionBase {
  goalType: "character";
  goalKey: string;
  characterKey: string;
}

export interface WeaponPlan extends GoalResolutionBase {
  goalType: "weapon";
  goalKey: string;
  weaponId: string;
  weaponKey: string;
}

export type GoalResolutionItem = CharacterPlan | WeaponPlan;

export interface PlannerGoal {
  id: string;
  goalType: "character" | "weapon" | "artifact";
  entityKey: string;
  label: string;
  planningMode?: GoalPlanningMode;
  currentSummary: string;
  currentSource?: string;
  targetSummary: string;
  enabled: boolean;
  priority: number;
  shortageCount: number;
  estimatedResin: number;
  warningCount: number;
  notes?: string;
}

export interface PlannerGoalGroup {
  key: "all" | "character" | "weapon" | "artifact";
  label: string;
  goals: PlannerGoal[];
}

export interface ArtifactFarmPlan {
  id: string;
  label: string;
  domainKey: string;
  domainName: string;
  targetSetKeys: string[];
  availability: AvailabilityGroupKey;
  weeklyResinBudget: number | null;
  priority: number;
  notes?: string;
}

export interface PlannerActivityRow {
  id: string;
  label: string;
  materialKey?: string;
  sourceName: string;
  sourceType: string;
  availability: AvailabilityGroupKey;
  missingAmount?: number;
  usedBy: string[];
  resinCost: number | null;
  estimatedRuns: number | null;
  priorityScore: number;
  isAvailableToday: boolean;
  notes?: string;
}

export interface MaterialQuantity {
  materialId: string;
  quantity: number;
}

export interface LeyLineEnemyDropLocationRecommendation {
  locationKey: string;
  region: string;
  areaName: string;
  locationNumber: number;
  totalGuaranteedEnemyCount: number;
  guaranteedEnemySpawns: Array<{
    enemyName: string;
    count: number;
  }>;
  optionalNearbyEnemySpawns: Array<{
    enemyName: string;
    count: number;
  }>;
  coveredFamilyKeys: string[];
  notes?: string[];
  isOptionalOnly: boolean;
}

export interface LeyLineEnemyDropRegionRecommendation {
  region: string;
  totalGuaranteedEnemyCount: number;
  locationCount: number;
  optionalOnlyLocationCount: number;
  coveredFamilyKeys: string[];
  coveredMaterialKeys: string[];
  affectedGoalLabels: string[];
  locations: Array<{
    locationKey: string;
    areaName: string;
    locationNumber: number;
  }>;
}

export interface LeyLineEnemyDropRecommendationDetails {
  familyKey: string;
  familyDisplayName: string;
  materialChain: string[];
  bestRegion: string | null;
  regionRecommendations: LeyLineEnemyDropRegionRecommendation[];
  locationRecommendations: LeyLineEnemyDropLocationRecommendation[];
  incidentalDropNote: string;
}

export interface PlannerRecommendation {
  id: string;
  title: string;
  category:
    | "talent_domain"
    | "weapon_domain"
    | "boss"
    | "weekly_boss"
    | "leyline"
    | "crafting"
    | "forging"
    | "artifact_domain"
    | "custom";
  actionGroup:
    | "resin_gated"
    | "time_gated_non_resin"
    | "crafting"
    | "open_world"
    | "passive_incidental";
  actionSubgroup?:
    | "weekly_resin"
    | "domains"
    | "bosses"
    | "ley_lines"
    | "ley_line_enemy_drops"
    | "local_specialty"
    | "forging"
    | "unknown_estimates";
  priority: number;
  priorityLabel?: "High" | "Medium" | "Low" | "Optional" | "Blocked";
  availability: AvailabilityGroupKey;
  sourceName?: string;
  resinCost?: number;
  resinPerRun?: number | null;
  totalEstimatedResin?: number | null;
  resinLabel?: string;
  estimatedRuns?: number | null;
  actionableRuns?: number | null;
  estimatedDaysNaturalResin?: number | null;
  estimatedWeeksNaturalResin?: number | null;
  weeklyGate?: FarmingEstimate["weeklyGate"];
  relatedGoalKeys: string[];
  relatedGoalLabels?: string[];
  requiredMaterials: MaterialQuantity[];
  expectedRewards?: MaterialQuantity[];
  reason: string;
  blockedBy?: string[];
  isAvailableToday: boolean;
  warnings?: string[];
  estimateBasis?: string;
  dataQuality?: LootModelDataQuality;
  leyLineEnemyDropDetails?: LeyLineEnemyDropRecommendationDetails;
}

export interface AvailabilityGroup {
  key: AvailabilityGroupKey;
  label: string;
  rows: PlannerRecommendation[];
}

export interface RecommendationGroup {
  key: string;
  label: string;
  rows: PlannerRecommendation[];
}

export interface ResinSummary {
  progressionMora: number;
  craftingMora: number;
  totalMora: number;
  totalEstimatedResin: number;
  totalEstimatedNaturalResinDays: number;
  totalEstimatedNaturalResinWeeks: number;
  weeklyGatedEstimateCount: number;
  resinGatedEstimateCount: number;
  openWorldEstimateCount: number;
  noResinTaskCount: number;
  unknownEstimateCount: number;
  dailyResinBudget: number;
  weeklyResinBudget: number;
  artifactBudget: number;
}

export interface WeaponExpPlannerSummary {
  totalWeaponExpNeeded: number;
  totalWeaponLevelingMoraNeeded: number;
  enhancementOreOwned: number;
  fineEnhancementOreOwned: number;
  mysticEnhancementOreOwned: number;
  crystalChunkOwned: number;
  rainbowdropCrystalOwned: number;
  condessenceCrystalOwned: number;
  ownedWeaponExpValue: number;
  remainingWeaponExpAfterOwnedOre: number;
  mysticEquivalentNeeded: number;
  mysticForgeableFromCrystals: number;
  remainingMysticEquivalentUnforgeable: number;
  dailyMysticForgeCap: number;
  minimumDailyResetsRequired: number;
  oreRespawnDays: number;
  notes: string[];
}

export interface PlannerRecommendationSection {
  key:
    | "summary"
    | "resin_gated"
    | "weekly_resin"
    | "domains"
    | "bosses"
    | "ley_lines"
    | "ley_line_enemy_drops"
    | "time_gated_non_resin"
    | "crafting"
    | "forging"
    | "open_world"
    | "local_specialty"
    | "passive_incidental"
    | "unknown_estimates";
  label: string;
  rows: PlannerRecommendation[];
}

export interface PlannerReport {
  summary: ResinSummary;
  sections: PlannerRecommendationSection[];
  warnings: PlannerWarning[];
}

export interface PlannerOutput {
  plannerGoals: PlannerGoal[];
  plannerGoalGroups: PlannerGoalGroup[];
  goalResolutions: GoalResolutionItem[];
  deterministicRequirements: DeterministicRequirement[];
  inventoryCoverage: InventoryCoverage[];
  materialDeficits: MaterialDeficit[];
  exactRequirementsByMaterial: MaterialNeedRow[];
  totalMissingByMaterial: MaterialNeedRow[];
  farmingEstimates: FarmingEstimate[];
  plannerReport: PlannerReport;
  byCharacter: CharacterPlan[];
  byWeapon: WeaponPlan[];
  artifactFarmGoals: ArtifactFarmPlan[];
  craftingPlan: CraftingPlan;
  recommendations: PlannerRecommendation[];
  recommendationSections: PlannerRecommendationSection[];
  byAvailability: AvailabilityGroup[];
  today: PlannerRecommendation[];
  bySource: RecommendationGroup[];
  resinSummary: ResinSummary;
  summary: ResinSummary;
  weaponExpSummary: WeaponExpPlannerSummary;
  warnings: PlannerWarning[];
}

export interface PlannerEstimationSettings {
  worldLevel: number;
  domainLevel: PlannerDomainLevel;
  useHighestUnlockedDomain: boolean;
  craftAwareEstimates: boolean;
  craftingModeForRequirementSatisfaction: "guaranteed" | "expected_value";
  craftingModeForResinEstimate: "guaranteed" | "expected_value";
  allowCraftingTalentExpectedValue: boolean;
  showCraftingVarianceWarning: boolean;
  allowDustOfAzothConversion: boolean;
  preserveOffElementGemsByDefault: boolean;
  showDustOfAzothOption: boolean;
  craftingPassiveOverrides?: {
    talentMaterials?: string | null;
    weaponAscensionMaterials?: string | null;
    characterWeaponEnhancementMaterials?: string | null;
    potions?: string | null;
  };
  naturalResinPerDay: number;
  naturalResinPerWeek: number;
  currentResin: number;
  condensedResinOwned: number;
  fragileResinOwned: number;
  transientResinOwned: number;
  includePrimogemRefillPlanning: boolean;
  weeklyBossDiscountClaimsUsed: number;
  assumeCondensedResinEquivalentForDomains: boolean;
  estimateOpenWorldEnemyDrops: boolean;
  dailyResinBudget: number;
  includeArtifactGoals: boolean;
}

export interface PlannerPriorityConfig {
  goalPriorityWeight: number;
  farmableTodayBonus: number;
  sharedMaterialWeight: number;
  sourceKnownBonus: number;
  weeklyPenalty: number;
}

export type InventoryDeficitKind =
  | "mora"
  | "character_exp"
  | "weapon_exp"
  | "ascension_gem"
  | "normal_boss_material"
  | "talent_book"
  | "weekly_boss_material"
  | "weapon_ascension_material"
  | "general_enemy_drop"
  | "elite_enemy_drop"
  | "local_specialty"
  | "special"
  | "unknown";

export interface InventoryDeficitSlice {
  id: string;
  goalKey: string;
  goalType: GoalResolutionType;
  displayName: string;
  materialKey: string;
  materialName: string;
  requiredAmount: number;
  missingAmount: number;
  kind: InventoryDeficitKind;
  characterKey?: string;
  weaponKey?: string;
  normalBossMaterialKey?: string;
  weeklyBossMaterialKey?: string;
  weaponAscensionFamilyKey?: string;
  talentBookFamilyKey?: string;
  availability: AvailabilityGroupKey;
  assumptions: string[];
  warnings: string[];
}

export interface SourceAssignment extends InventoryDeficitSlice {
  sourceType: FarmingEstimateSourceType;
  sourceName: string | null;
  targetTierIndex: number;
}

export interface PlannerInput {
  inventory: AccountInventoryState;
  ownership: AccountOwnershipState;
  goals: KrumpanionGoals;
  staticData: StaticGameData;
  today: DayOfWeek;
  resinSettings: PlannerSettings;
  enablePost90Planning?: boolean;
  priorityConfig?: PlannerPriorityConfig;
}
