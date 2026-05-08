import type { MaterialTotals } from "../../utils/collections";

export type CraftingRecipeCategory =
  | "character_weapon_enhancement_material"
  | "weapon_ascension_material"
  | "talent_level_up_material"
  | "character_ascension_gem"
  | "potion"
  | "gadget";

export type CraftingBonusType =
  | "double_product_character_talent_material"
  | "refund_character_talent_material"
  | "regional_extra_character_talent_material"
  | "double_product_weapon_ascension_material"
  | "refund_weapon_ascension_material"
  | "double_product_character_weapon_enhancement_material"
  | "refund_character_weapon_material"
  | "refund_potion"
  | "none";

export type CraftingPassiveEffectType =
  | "double_product"
  | "refund_one_input"
  | "regional_extra_same_rarity_talent_material";

export type CraftingPassiveApplicableCategory =
  | "character_talent_material"
  | "weapon_ascension_material"
  | "character_weapon_enhancement_material"
  | "potion";

export type CraftingPlanningMode = "guaranteed" | "expected_value";

export interface CraftingRecipeInput {
  materialKey: string;
  materialName: string;
  quantity: number;
}

export interface CraftingRecipe {
  outputKey?: string;
  outputMaterialKey: string;
  outputName?: string;
  outputQuantity: number;
  category?: CraftingRecipeCategory;
  inputMaterials?: CraftingRecipeInput[];
  ingredients: MaterialTotals;
  moraCost?: number;
  craftingMethod?: "alchemy";
  isTierUpgrade?: boolean;
  isElementConversion?: boolean;
  eligibleCraftingBonusTypes?: CraftingBonusType[];
  familyKey?: string;
  tierIndex?: number;
}

export interface CraftingUtilityPassive {
  key: string;
  characterName: string;
  talentName: string;
  appliesTo: CraftingPassiveApplicableCategory[];
  effectType: CraftingPassiveEffectType;
  chance: number;
  description: string;
}

export interface CraftingPlannerDefaults {
  craftingModeForRequirementSatisfaction: CraftingPlanningMode;
  craftingModeForResinEstimate: CraftingPlanningMode;
  allowCraftingTalentExpectedValue: boolean;
  showCraftingVarianceWarning: boolean;
}

export interface GemConversionDefaults {
  allowDustOfAzothConversion: boolean;
  preserveOffElementGemsByDefault: boolean;
  showDustOfAzothOption: boolean;
}

export interface RecommendedCraftingPassive {
  passiveKey: string;
  characterName: string;
  talentName: string;
  effectType: CraftingPassiveEffectType;
  expectedInputPerOutput: number;
  expectedSavingsPercent: number;
  expectedMoraPerOutput?: number;
  warning: string;
  rationale: string;
}

export interface CraftingStep {
  outputKey: string;
  outputMaterialKey: string;
  outputName: string;
  outputQuantity: number;
  inputKey: string;
  inputName: string;
  inputQuantity: number;
  crafts: number;
  moraCostPerCraft: number;
  totalMoraCost: number;
  passiveUsed?: string | null;
  isElementConversion?: boolean;
}

export interface CraftingResinImpact {
  resinBeforeCrafting: number | null;
  resinAfterGuaranteedCrafting: number | null;
  resinAfterExpectedPassive: number | null;
  resinSavedGuaranteed: number | null;
  resinSavedExpected: number | null;
}

export interface CraftingPlanReport {
  targetMaterialKey: string;
  targetMaterialName: string;
  requiredAmount: number;
  ownedAmount: number;
  lowerTierAvailable: Record<string, number>;
  guaranteedCrafting: {
    canSatisfy: boolean;
    outputAmount: number;
    steps: CraftingStep[];
    moraCost: number;
    leftovers: Record<string, number>;
    remainingMissing: number;
  };
  recommendedPassive?: RecommendedCraftingPassive;
  expectedValue?: {
    passiveKey: string;
    outputEquivalent: number;
    expectedInputPerOutput: number;
    expectedSavingsPercent: number;
    expectedAdditionalCoverage: number;
  };
  dustOfAzothOption?: {
    outputAmount: number;
    dustRequired: number;
    conversions: CraftingStep[];
    remainingMissing: number;
  };
  resinImpact: CraftingResinImpact;
  warnings: string[];
}

export interface CraftingSuggestion {
  outputMaterialKey: string;
  outputDisplayName: string;
  craftableQuantity: number;
  missingQuantityCovered: number;
  ingredientsConsumed: MaterialTotals;
  reason: string;
  moraCost: number;
  steps: CraftingStep[];
  recommendedPassive?: RecommendedCraftingPassive;
}

export interface CraftingPlan {
  reports: CraftingPlanReport[];
  suggestions: CraftingSuggestion[];
  warnings: string[];
  guaranteedCoverageByMaterial: MaterialTotals;
  guaranteedRemainingByMaterial: MaterialTotals;
  expectedCoverageByMaterial: Record<string, number>;
  craftingMoraByMaterial: MaterialTotals;
  totalCraftingMora: number;
  progressionMora: number;
  totalMora: number;
}
