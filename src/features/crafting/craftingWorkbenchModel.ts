import type { InventoryState, KrumpanionAccount } from "../../domain/account/types";
import { resolveGuaranteedCraftExecution } from "../../domain/crafting/resolveCraftingPlan";
import type { CraftingPassiveEffectType, CraftingPlanReport, CraftingStep } from "../../domain/crafting/types";
import type { KrumpanionGoals } from "../../domain/goals/types";
import { buildPlannerOutput } from "../../domain/planner/buildPlannerRows";
import type { DayOfWeek, PlannerOutput } from "../../domain/planner/types";
import type { StaticGameData } from "../../domain/staticData/types";

export type CraftingWorkbenchGroupKey =
  | "character_weapon_enhancement_material"
  | "weapon_ascension_material"
  | "talent_level_up_material"
  | "character_ascension_gem";

export type CraftingWorkbenchActionMode = "standard" | "dust_conversion";

export interface CraftingWorkbenchIngredient {
  materialKey: string;
  materialName: string;
  quantity: number;
}

export interface CraftingWorkbenchBenchStep {
  id: string;
  mode: CraftingWorkbenchActionMode;
  outputMaterialKey: string;
  outputMaterialName: string;
  perCraftOutputQuantity: number;
  recommendedCrafts: number;
  recommendedOutputQuantity: number;
  inputMaterialKey: string;
  inputMaterialName: string;
  inputQuantityPerCraft: number;
  totalInputQuantity: number;
  moraCostPerCraft: number;
  totalMoraCost: number;
  dustCostTotal: number;
  isFinalTargetStep: boolean;
  isTalentBookStep: boolean;
  yaeExtraCandidates: CraftingWorkbenchIngredient[];
}

export interface CraftingWorkbenchAction {
  id: string;
  groupKey: CraftingWorkbenchGroupKey;
  groupLabel: string;
  mode: CraftingWorkbenchActionMode;
  targetMaterialKey: string;
  targetMaterialName: string;
  recipeCategory: CraftingWorkbenchGroupKey;
  guaranteedOutput: number;
  recordableOutputAmount: number;
  shortageBefore: number;
  shortageAfter: number;
  shortageReduction: number;
  moraCost: number;
  recommendedPassiveName: string;
  recommendedPassiveTalent?: string;
  recommendedPassiveEffectType?: CraftingPassiveEffectType;
  passiveEffectLabel: string;
  possibleOutcomeHints: string[];
  warnings: string[];
  ingredients: CraftingWorkbenchIngredient[];
  ingredientSummary: string;
  affectedGoals: CraftingPlanReport["affectedGoals"];
  affectedRequirementEntries: CraftingPlanReport["affectedRequirementEntries"];
  steps: CraftingPlanReport["guaranteedCrafting"]["steps"];
  report: CraftingPlanReport;
  dustRequired?: number;
  benchSteps: CraftingWorkbenchBenchStep[];
  isMultiStep: boolean;
  stepCount: number;
  stepSummary: string;
}

export interface CraftingWorkbenchGroup {
  key: CraftingWorkbenchGroupKey;
  label: string;
  actions: CraftingWorkbenchAction[];
  totalShortageReduction: number;
}

export interface CraftingWorkbenchModel {
  actions: CraftingWorkbenchAction[];
  groups: CraftingWorkbenchGroup[];
  summary: {
    actionCount: number;
    guaranteedOutput: number;
    dustConversionCount: number;
    craftingMora: number;
    uniqueGoalsHelped: number;
  };
}

export interface CraftingWorkbenchStepRecord {
  stepId: string;
  completedCrafts: number;
  bonusOutputs: number;
  refundedInputs: number;
  yaeExtraMaterialKey: string;
  yaeExtraQuantity: number;
}

export interface CraftingRecordDraft {
  stepRecords: CraftingWorkbenchStepRecord[];
  correctionDeltas: Record<string, number>;
}

export interface CraftingDeltaLine {
  materialKey: string;
  materialName: string;
  before: number;
  after: number;
  delta: number;
}

export interface CraftingShortageDelta {
  materialKey: string;
  displayName: string;
  before: number;
  after: number;
}

export interface CraftingPreviewResult {
  errors: string[];
  deltaLines: CraftingDeltaLine[];
  nextInventory: InventoryState;
  changedMaterialKeys: string[];
  targetShortageBefore: number;
  targetShortageAfter: number;
  affectedGoalsImproved: Array<{ goalKey: string; displayName: string; amount: number }>;
  worsenedShortages: CraftingShortageDelta[];
  simulatedPlannerOutput: PlannerOutput | null;
}

const GROUP_ORDER: CraftingWorkbenchGroupKey[] = [
  "character_weapon_enhancement_material",
  "weapon_ascension_material",
  "talent_level_up_material",
  "character_ascension_gem",
];

const GROUP_LABELS: Record<CraftingWorkbenchGroupKey, string> = {
  character_weapon_enhancement_material: "Character and Weapon Enhancement Material",
  weapon_ascension_material: "Weapon Ascension Materials",
  talent_level_up_material: "Character Talent Material",
  character_ascension_gem: "Character Ascension Material",
};

function getMaterialName(materialKey: string, staticData: StaticGameData): string {
  return staticData.materials[materialKey]?.displayName ?? staticData.materialRecords[materialKey]?.displayName ?? materialKey;
}

function getDirectShortage(report: CraftingPlanReport): number {
  return Math.max(report.requiredAmount - report.ownedAmount, 0);
}

function getSupportedRecipeCategory(
  report: CraftingPlanReport,
  staticData: StaticGameData,
): CraftingWorkbenchGroupKey | null {
  const recipe = staticData.craftingRecipes[report.targetMaterialKey] ?? staticData.recipes[report.targetMaterialKey];
  const category = recipe?.category;
  if (
    category === "character_weapon_enhancement_material" ||
    category === "weapon_ascension_material" ||
    category === "talent_level_up_material" ||
    category === "character_ascension_gem"
  ) {
    return category;
  }
  return null;
}

function buildIngredientTotals(
  ingredients: Array<{ materialKey: string; materialName: string; quantity: number }>,
): CraftingWorkbenchIngredient[] {
  const totals = new Map<string, CraftingWorkbenchIngredient>();

  for (const ingredient of ingredients) {
    const existing = totals.get(ingredient.materialKey);
    if (existing) {
      existing.quantity += ingredient.quantity;
      continue;
    }
    totals.set(ingredient.materialKey, { ...ingredient });
  }

  return [...totals.values()].filter((entry) => entry.quantity > 0);
}

function buildStepIngredients(steps: CraftingPlanReport["guaranteedCrafting"]["steps"]): CraftingWorkbenchIngredient[] {
  return buildIngredientTotals(
    steps.map((step) => ({
      materialKey: step.inputKey,
      materialName: step.inputName,
      quantity: step.inputQuantity * step.crafts,
    })),
  );
}

function buildGuaranteedPlanIngredients(
  report: CraftingPlanReport,
  staticData: StaticGameData,
): CraftingWorkbenchIngredient[] {
  const tierKeys = staticData.tieredMaterialIndex[report.targetMaterialKey]?.tierKeys ?? [report.targetMaterialKey];
  const inputs: CraftingWorkbenchIngredient[] = [];

  for (const materialKey of tierKeys) {
    if (materialKey === report.targetMaterialKey) {
      continue;
    }
    const before = report.lowerTierAvailable[materialKey] ?? 0;
    const after = report.guaranteedCrafting.leftovers[materialKey] ?? before;
    const consumed = Math.max(before - after, 0);
    if (consumed <= 0) {
      continue;
    }
    inputs.push({
      materialKey,
      materialName: getMaterialName(materialKey, staticData),
      quantity: consumed,
    });
  }

  if (inputs.length > 0) {
    return inputs;
  }

  return buildStepIngredients(report.guaranteedCrafting.steps);
}

function summarizeIngredients(ingredients: CraftingWorkbenchIngredient[]): string {
  if (!ingredients.length) {
    return "No ingredient spend required";
  }
  return ingredients
    .slice(0, 3)
    .map((ingredient) => `${ingredient.materialName} x${ingredient.quantity}`)
    .join(" | ");
}

function buildPassiveEffectLabel(effectType: CraftingPassiveEffectType | undefined): string {
  switch (effectType) {
    case "double_product":
      return "Possible bonus product";
    case "refund_one_input":
      return "Possible input refund";
    case "regional_extra_same_rarity_talent_material":
      return "Possible extra same-rarity regional material";
    default:
      return "No special passive";
  }
}

function buildPossibleOutcomeHints(
  report: CraftingPlanReport,
  mode: CraftingWorkbenchActionMode,
): string[] {
  if (mode === "dust_conversion") {
    return ["Dust conversion has no crafting passive bonus."];
  }

  switch (report.recommendedPassive?.effectType) {
    case "double_product":
      return ["Bonus products are possible but not guaranteed."];
    case "refund_one_input":
      return ["Refunded inputs are probabilistic and usually return the step input material."];
    case "regional_extra_same_rarity_talent_material":
      return ["Yae Miko may grant an extra same-rarity regional talent material."];
    default:
      return [];
  }
}

function getYaeExtraCandidatesForMaterial(materialKey: string, staticData: StaticGameData): CraftingWorkbenchIngredient[] {
  const familyEntry = staticData.tieredMaterialIndex[materialKey];
  if (!familyEntry || familyEntry.familyType !== "talent_book_family") {
    return [];
  }

  return Object.values(staticData.tieredMaterialIndex)
    .filter((entry) => entry.familyType === "talent_book_family")
    .filter((entry) => entry.tierIndex === familyEntry.tierIndex)
    .filter((entry) => entry.materialKey !== materialKey)
    .map((entry) => ({
      materialKey: entry.materialKey,
      materialName: getMaterialName(entry.materialKey, staticData),
      quantity: 0,
    }))
    .sort((left, right) => left.materialName.localeCompare(right.materialName));
}

function buildBenchStepsFromCraftingSteps(params: {
  steps: CraftingStep[];
  mode: CraftingWorkbenchActionMode;
  recipeCategory: CraftingWorkbenchGroupKey;
  targetMaterialKey: string;
  staticData: StaticGameData;
  dustPerCraft?: number;
}): CraftingWorkbenchBenchStep[] {
  const { steps, mode, recipeCategory, targetMaterialKey, staticData, dustPerCraft = 0 } = params;
  const merged: CraftingWorkbenchBenchStep[] = [];

  for (const step of steps) {
    const previous = merged[merged.length - 1];
    const sameAsPrevious =
      previous &&
      previous.outputMaterialKey === step.outputMaterialKey &&
      previous.inputMaterialKey === step.inputKey &&
      previous.moraCostPerCraft === step.moraCostPerCraft &&
      previous.mode === mode;

    const isTalentBookStep = recipeCategory === "talent_level_up_material";
    const perStepDust = mode === "dust_conversion" ? dustPerCraft * step.crafts : 0;

    if (sameAsPrevious) {
      previous.recommendedCrafts += step.crafts;
      previous.recommendedOutputQuantity += step.outputQuantity * step.crafts;
      previous.totalInputQuantity += step.inputQuantity * step.crafts;
      previous.totalMoraCost += step.totalMoraCost;
      previous.dustCostTotal += perStepDust;
      continue;
    }

    merged.push({
      id: `${mode}:${step.outputMaterialKey}:${merged.length + 1}`,
      mode,
      outputMaterialKey: step.outputMaterialKey,
      outputMaterialName: step.outputName,
      perCraftOutputQuantity: step.outputQuantity,
      recommendedCrafts: step.crafts,
      recommendedOutputQuantity: step.outputQuantity * step.crafts,
      inputMaterialKey: step.inputKey,
      inputMaterialName: step.inputName,
      inputQuantityPerCraft: step.inputQuantity,
      totalInputQuantity: step.inputQuantity * step.crafts,
      moraCostPerCraft: step.moraCostPerCraft,
      totalMoraCost: step.totalMoraCost,
      dustCostTotal: perStepDust,
      isFinalTargetStep: step.outputMaterialKey === targetMaterialKey,
      isTalentBookStep,
      yaeExtraCandidates: isTalentBookStep ? getYaeExtraCandidatesForMaterial(step.outputMaterialKey, staticData) : [],
    });
  }

  if (merged.length > 0) {
    merged[merged.length - 1].isFinalTargetStep = merged[merged.length - 1].outputMaterialKey === targetMaterialKey;
  }

  return merged;
}

function summarizeBenchSteps(benchSteps: CraftingWorkbenchBenchStep[]): string {
  if (!benchSteps.length) {
    return "No bench steps available";
  }
  if (benchSteps.length === 1) {
    return `1 step | ${benchSteps[0].outputMaterialName}`;
  }
  return `${benchSteps.length} steps | start with ${benchSteps[0].outputMaterialName}`;
}

function buildStandardAction(report: CraftingPlanReport, staticData: StaticGameData): CraftingWorkbenchAction | null {
  const category = getSupportedRecipeCategory(report, staticData);
  if (!category || report.guaranteedCrafting.outputAmount <= 0) {
    return null;
  }

  const ingredients = buildGuaranteedPlanIngredients(report, staticData);
  const benchSteps = buildBenchStepsFromCraftingSteps({
    steps: report.guaranteedCrafting.steps,
    mode: "standard",
    recipeCategory: category,
    targetMaterialKey: report.targetMaterialKey,
    staticData,
  });

  return {
    id: `standard:${report.targetMaterialKey}`,
    groupKey: category,
    groupLabel: GROUP_LABELS[category],
    mode: "standard",
    targetMaterialKey: report.targetMaterialKey,
    targetMaterialName: report.targetMaterialName,
    recipeCategory: category,
    guaranteedOutput: report.guaranteedCrafting.outputAmount,
    recordableOutputAmount: report.guaranteedCrafting.outputAmount,
    shortageBefore: getDirectShortage(report),
    shortageAfter: Math.max(report.guaranteedCrafting.remainingMissing, 0),
    shortageReduction: Math.min(report.guaranteedCrafting.outputAmount, getDirectShortage(report)),
    moraCost: report.guaranteedCrafting.moraCost,
    recommendedPassiveName: report.recommendedPassive?.characterName ?? "No special passive",
    recommendedPassiveTalent: report.recommendedPassive?.talentName,
    recommendedPassiveEffectType: report.recommendedPassive?.effectType,
    passiveEffectLabel: buildPassiveEffectLabel(report.recommendedPassive?.effectType),
    possibleOutcomeHints: buildPossibleOutcomeHints(report, "standard"),
    warnings: report.warnings,
    ingredients,
    ingredientSummary: summarizeIngredients(ingredients),
    affectedGoals: report.affectedGoals,
    affectedRequirementEntries: report.affectedRequirementEntries,
    steps: report.guaranteedCrafting.steps,
    report,
    benchSteps,
    isMultiStep: benchSteps.length > 1,
    stepCount: benchSteps.length,
    stepSummary: summarizeBenchSteps(benchSteps),
  };
}

function buildDustAction(report: CraftingPlanReport, staticData: StaticGameData): CraftingWorkbenchAction | null {
  const category = getSupportedRecipeCategory(report, staticData);
  const dustOption = report.dustOfAzothOption;
  if (!category || category !== "character_ascension_gem" || !dustOption || dustOption.outputAmount <= 0) {
    return null;
  }

  const ingredients = buildIngredientTotals([
    ...dustOption.conversions.map((step) => ({
      materialKey: step.inputKey,
      materialName: step.inputName,
      quantity: step.inputQuantity * step.crafts,
    })),
    {
      materialKey: "DustOfAzoth",
      materialName: getMaterialName("DustOfAzoth", staticData),
      quantity: dustOption.dustRequired,
    },
  ]);

  const dustPerCraft = dustOption.outputAmount > 0 ? dustOption.dustRequired / dustOption.outputAmount : 0;
  const benchSteps = buildBenchStepsFromCraftingSteps({
    steps: dustOption.conversions,
    mode: "dust_conversion",
    recipeCategory: category,
    targetMaterialKey: report.targetMaterialKey,
    staticData,
    dustPerCraft,
  });

  return {
    id: `dust:${report.targetMaterialKey}`,
    groupKey: category,
    groupLabel: GROUP_LABELS[category],
    mode: "dust_conversion",
    targetMaterialKey: report.targetMaterialKey,
    targetMaterialName: report.targetMaterialName,
    recipeCategory: category,
    guaranteedOutput: dustOption.outputAmount,
    recordableOutputAmount: dustOption.outputAmount,
    shortageBefore: Math.max(report.guaranteedCrafting.remainingMissing, 0),
    shortageAfter: Math.max(dustOption.remainingMissing, 0),
    shortageReduction: Math.min(dustOption.outputAmount, Math.max(report.guaranteedCrafting.remainingMissing, 0)),
    moraCost: 0,
    recommendedPassiveName: "No special passive",
    passiveEffectLabel: buildPassiveEffectLabel(undefined),
    possibleOutcomeHints: buildPossibleOutcomeHints(report, "dust_conversion"),
    warnings: report.warnings,
    ingredients,
    ingredientSummary: summarizeIngredients(ingredients),
    affectedGoals: report.affectedGoals,
    affectedRequirementEntries: report.affectedRequirementEntries,
    steps: dustOption.conversions,
    report,
    dustRequired: dustOption.dustRequired,
    benchSteps,
    isMultiStep: benchSteps.length > 1,
    stepCount: benchSteps.length,
    stepSummary: summarizeBenchSteps(benchSteps),
  };
}

function compareActions(left: CraftingWorkbenchAction, right: CraftingWorkbenchAction): number {
  const groupOrderDelta = GROUP_ORDER.indexOf(left.groupKey) - GROUP_ORDER.indexOf(right.groupKey);
  if (groupOrderDelta !== 0) {
    return groupOrderDelta;
  }
  return (
    right.shortageReduction - left.shortageReduction ||
    (left.mode === right.mode ? 0 : left.mode === "standard" ? -1 : 1) ||
    left.targetMaterialName.localeCompare(right.targetMaterialName)
  );
}

export function buildCraftingWorkbenchModel(
  plannerOutput: PlannerOutput,
  staticData: StaticGameData,
): CraftingWorkbenchModel {
  const reports = plannerOutput.craftingPlan.reports.filter((report) => getDirectShortage(report) > 0);
  const actions = reports
    .flatMap((report) => {
      const standard = buildStandardAction(report, staticData);
      const dust = buildDustAction(report, staticData);
      return [standard, dust].filter((action): action is CraftingWorkbenchAction => Boolean(action));
    })
    .sort(compareActions);

  const groups = GROUP_ORDER.map((groupKey) => {
    const groupActions = actions.filter((action) => action.groupKey === groupKey);
    return {
      key: groupKey,
      label: GROUP_LABELS[groupKey],
      actions: groupActions,
      totalShortageReduction: groupActions.reduce((sum, action) => sum + action.shortageReduction, 0),
    };
  }).filter((group) => group.actions.length > 0);

  const uniqueGoalKeys = new Set(
    actions.flatMap((action) => action.affectedGoals.map((goal) => `${goal.goalType}:${goal.goalKey}`)),
  );

  return {
    actions,
    groups,
    summary: {
      actionCount: actions.length,
      guaranteedOutput: actions.reduce((sum, action) => sum + action.guaranteedOutput, 0),
      dustConversionCount: actions.filter((action) => action.mode === "dust_conversion").length,
      craftingMora: actions.reduce((sum, action) => sum + action.moraCost, 0),
      uniqueGoalsHelped: uniqueGoalKeys.size,
    },
  };
}

export function getCraftingRecordableQuantity(
  action: CraftingWorkbenchAction,
  inventory: InventoryState,
  staticData: StaticGameData,
): number {
  if (action.mode === "standard") {
    return resolveGuaranteedCraftExecution(
      action.targetMaterialKey,
      action.recordableOutputAmount,
      inventory,
      staticData,
    ).outputAmount;
  }

  const dustPerOutput = action.recordableOutputAmount > 0 ? (action.dustRequired ?? 0) / action.recordableOutputAmount : 0;
  if (!Number.isInteger(dustPerOutput) || dustPerOutput < 0) {
    return 0;
  }

  const outputByDust =
    dustPerOutput === 0 ? action.recordableOutputAmount : Math.floor((inventory.DustOfAzoth ?? 0) / dustPerOutput);
  const outputByInputs = action.steps.reduce((minimum, step) => {
    const available = inventory[step.inputKey] ?? 0;
    const craftable = step.inputQuantity > 0 ? Math.floor(available / step.inputQuantity) : step.crafts;
    return Math.min(minimum, craftable, step.crafts);
  }, action.recordableOutputAmount);

  return Math.max(0, Math.min(action.recordableOutputAmount, outputByDust, outputByInputs));
}

export function getCraftingBenchStepsForInventory(
  action: CraftingWorkbenchAction,
  inventory: InventoryState,
  staticData: StaticGameData,
): CraftingWorkbenchBenchStep[] {
  if (action.mode === "standard") {
    const livePlan = resolveGuaranteedCraftExecution(
      action.targetMaterialKey,
      action.recordableOutputAmount,
      inventory,
      staticData,
    );
    const liveSteps = buildBenchStepsFromCraftingSteps({
      steps: livePlan.steps,
      mode: "standard",
      recipeCategory: action.recipeCategory,
      targetMaterialKey: action.targetMaterialKey,
      staticData,
    });
    return liveSteps.length > 0 ? liveSteps : action.benchSteps;
  }

  const allowedOutput = getCraftingRecordableQuantity(action, inventory, staticData);
  if (allowedOutput <= 0) {
    return action.benchSteps;
  }

  let remaining = allowedOutput;
  const liveSteps: CraftingStep[] = [];
  for (const step of action.steps) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(step.crafts, remaining);
    if (take <= 0) {
      continue;
    }
    liveSteps.push({
      ...step,
      crafts: take,
      totalMoraCost: step.moraCostPerCraft * take,
    });
    remaining -= take;
  }

  const dustPerCraft = action.recordableOutputAmount > 0 ? (action.dustRequired ?? 0) / action.recordableOutputAmount : 0;
  const benchSteps = buildBenchStepsFromCraftingSteps({
    steps: liveSteps,
    mode: "dust_conversion",
    recipeCategory: action.recipeCategory,
    targetMaterialKey: action.targetMaterialKey,
    staticData,
    dustPerCraft,
  });
  return benchSteps.length > 0 ? benchSteps : action.benchSteps;
}

function createStepRecords(benchSteps: CraftingWorkbenchBenchStep[]): CraftingWorkbenchStepRecord[] {
  return benchSteps.map((step) => ({
    stepId: step.id,
    completedCrafts: step.recommendedCrafts,
    bonusOutputs: 0,
    refundedInputs: 0,
    yaeExtraMaterialKey: "",
    yaeExtraQuantity: 0,
  }));
}

export function createCraftingRecordDraft(
  action: CraftingWorkbenchAction,
  inventory?: InventoryState,
  staticData?: StaticGameData,
): CraftingRecordDraft {
  const benchSteps =
    inventory && staticData ? getCraftingBenchStepsForInventory(action, inventory, staticData) : action.benchSteps;
  const seedSteps = benchSteps.length > 0 ? benchSteps : action.benchSteps;

  return {
    stepRecords: createStepRecords(seedSteps),
    correctionDeltas: {},
  };
}

function addDelta(deltaByKey: Map<string, number>, materialKey: string, quantity: number) {
  if (!quantity) {
    return;
  }
  deltaByKey.set(materialKey, (deltaByKey.get(materialKey) ?? 0) + quantity);
}

function normalizeCorrectionDeltas(correctionDeltas: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(correctionDeltas).filter(([, quantity]) => Number.isInteger(quantity) && quantity !== 0),
  );
}

function buildNextInventory(
  inventory: InventoryState,
  deltaByKey: Map<string, number>,
): { nextInventory: InventoryState; changedMaterialKeys: string[]; errors: string[] } {
  const nextInventory = { ...inventory };
  const changedMaterialKeys = [...deltaByKey.keys()];
  const errors: string[] = [];

  for (const materialKey of changedMaterialKeys) {
    const delta = deltaByKey.get(materialKey) ?? 0;
    if (!Number.isInteger(delta)) {
      errors.push(`Inventory delta for ${materialKey} is invalid.`);
      continue;
    }
    const nextValue = (inventory[materialKey] ?? 0) + delta;
    if (!Number.isInteger(nextValue) || nextValue < 0) {
      errors.push(`${materialKey} would drop below zero.`);
      continue;
    }
    if (nextValue <= 0) {
      delete nextInventory[materialKey];
      continue;
    }
    nextInventory[materialKey] = nextValue;
  }

  return { nextInventory, changedMaterialKeys, errors };
}

function getEffectiveDeficit(output: PlannerOutput, materialKey: string): number {
  return output.totalMissingByMaterial.find((row) => row.materialKey === materialKey)?.effectiveDeficit ?? 0;
}

function buildDeltaLines(
  inventory: InventoryState,
  nextInventory: InventoryState,
  changedMaterialKeys: string[],
  staticData: StaticGameData,
): CraftingDeltaLine[] {
  return changedMaterialKeys
    .map((materialKey) => {
      const before = inventory[materialKey] ?? 0;
      const after = nextInventory[materialKey] ?? 0;
      return {
        materialKey,
        materialName: getMaterialName(materialKey, staticData),
        before,
        after,
        delta: after - before,
      };
    })
    .filter((line) => line.delta !== 0)
    .sort((left, right) => left.materialName.localeCompare(right.materialName));
}

export function buildCraftingPreview(params: {
  action: CraftingWorkbenchAction;
  draft: CraftingRecordDraft;
  inventory: InventoryState;
  plannerOutput: PlannerOutput;
  account: Pick<KrumpanionAccount, "characters" | "weapons" | "artifacts">;
  goals: KrumpanionGoals;
  staticData: StaticGameData;
  today: DayOfWeek;
}): CraftingPreviewResult {
  const { action, draft, inventory, plannerOutput, account, goals, staticData, today } = params;
  const errors: string[] = [];
  const liveBenchSteps = getCraftingBenchStepsForInventory(action, inventory, staticData);
  const previewSteps = liveBenchSteps.length > 0 ? liveBenchSteps : action.benchSteps;
  const recordById = new Map(draft.stepRecords.map((record) => [record.stepId, record]));

  for (const step of previewSteps) {
    const record = recordById.get(step.id);
    if (!record) {
      continue;
    }
    if (!Number.isInteger(record.completedCrafts) || record.completedCrafts < 0) {
      errors.push(`Completed crafts for ${step.outputMaterialName} must be a non-negative integer.`);
    }
    if (record.completedCrafts > step.recommendedCrafts) {
      errors.push(`Completed crafts for ${step.outputMaterialName} cannot exceed ${step.recommendedCrafts}.`);
    }
    if (!Number.isInteger(record.bonusOutputs) || record.bonusOutputs < 0) {
      errors.push(`Bonus outputs for ${step.outputMaterialName} must be a non-negative integer.`);
    }
    if (!Number.isInteger(record.refundedInputs) || record.refundedInputs < 0) {
      errors.push(`Refunded inputs for ${step.outputMaterialName} must be a non-negative integer.`);
    }
    if (!Number.isInteger(record.yaeExtraQuantity) || record.yaeExtraQuantity < 0) {
      errors.push(`Yae extra quantity for ${step.outputMaterialName} must be a non-negative integer.`);
    }
  }

  const normalizedCorrections = normalizeCorrectionDeltas(draft.correctionDeltas);
  if (Object.values(normalizedCorrections).some((quantity) => !Number.isInteger(quantity))) {
    errors.push("All correction values must be integers.");
  }

  if (errors.length > 0) {
    return {
      errors,
      deltaLines: [],
      nextInventory: inventory,
      changedMaterialKeys: [],
      targetShortageBefore: action.shortageBefore,
      targetShortageAfter: action.shortageBefore,
      affectedGoalsImproved: [],
      worsenedShortages: [],
      simulatedPlannerOutput: null,
    };
  }

  const deltaByKey = new Map<string, number>();
  for (const step of previewSteps) {
    const record = recordById.get(step.id);
    if (!record || record.completedCrafts <= 0) {
      continue;
    }

    addDelta(deltaByKey, step.inputMaterialKey, -(step.inputQuantityPerCraft * record.completedCrafts));
    addDelta(deltaByKey, step.outputMaterialKey, step.perCraftOutputQuantity * record.completedCrafts);
    addDelta(deltaByKey, "Mora", -(step.moraCostPerCraft * record.completedCrafts));

    if (step.dustCostTotal > 0 && step.recommendedCrafts > 0) {
      const dustPerCraft = step.dustCostTotal / step.recommendedCrafts;
      if (!Number.isInteger(dustPerCraft)) {
        errors.push("Dust conversion data is inconsistent and could not be previewed safely.");
      } else {
        addDelta(deltaByKey, "DustOfAzoth", -(dustPerCraft * record.completedCrafts));
      }
    }

    if (record.bonusOutputs > 0) {
      addDelta(deltaByKey, step.outputMaterialKey, record.bonusOutputs);
    }
    if (record.refundedInputs > 0 && action.mode === "standard") {
      addDelta(deltaByKey, step.inputMaterialKey, record.refundedInputs);
    }
    if (record.yaeExtraQuantity > 0) {
      const validYaeMaterial = step.yaeExtraCandidates.some((candidate) => candidate.materialKey === record.yaeExtraMaterialKey);
      if (!record.yaeExtraMaterialKey || !validYaeMaterial) {
        errors.push(`Yae extra material for ${step.outputMaterialName} must stay on the same talent-book tier.`);
      } else {
        addDelta(deltaByKey, record.yaeExtraMaterialKey, record.yaeExtraQuantity);
      }
    }
  }

  for (const [materialKey, adjustment] of Object.entries(normalizedCorrections)) {
    addDelta(deltaByKey, materialKey, adjustment);
  }

  const { nextInventory, changedMaterialKeys, errors: inventoryErrors } = buildNextInventory(inventory, deltaByKey);
  errors.push(...inventoryErrors);

  if (errors.length > 0) {
    return {
      errors,
      deltaLines: buildDeltaLines(inventory, inventory, [...deltaByKey.keys()], staticData),
      nextInventory: inventory,
      changedMaterialKeys: [],
      targetShortageBefore: action.shortageBefore,
      targetShortageAfter: action.shortageBefore,
      affectedGoalsImproved: [],
      worsenedShortages: [],
      simulatedPlannerOutput: null,
    };
  }

  const simulatedPlannerOutput = buildPlannerOutput({
    inventory: nextInventory,
    ownership: {
      characters: account.characters,
      weapons: account.weapons,
      artifacts: account.artifacts,
    },
    goals,
    staticData,
    today,
    resinSettings: goals.plannerSettings,
    enablePost90Planning: false,
  });

  const deltaLines = buildDeltaLines(inventory, nextInventory, changedMaterialKeys, staticData);
  const targetShortageAfter = getEffectiveDeficit(simulatedPlannerOutput, action.targetMaterialKey);
  const beforeDeficits = new Map(plannerOutput.totalMissingByMaterial.map((row) => [row.materialKey, row.effectiveDeficit]));
  const worsenedShortages = simulatedPlannerOutput.totalMissingByMaterial
    .map((row) => ({
      materialKey: row.materialKey,
      displayName: row.displayName,
      before: beforeDeficits.get(row.materialKey) ?? 0,
      after: row.effectiveDeficit,
    }))
    .filter((row) => row.materialKey !== action.targetMaterialKey)
    .filter((row) => row.after > row.before)
    .sort((left, right) => right.after - left.after || left.displayName.localeCompare(right.displayName));

  return {
    errors: [],
    deltaLines,
    nextInventory,
    changedMaterialKeys,
    targetShortageBefore: action.shortageBefore,
    targetShortageAfter,
    affectedGoalsImproved: action.affectedGoals.map((goal) => ({
      goalKey: goal.goalKey,
      displayName: goal.displayName,
      amount: goal.amount,
    })),
    worsenedShortages,
    simulatedPlannerOutput,
  };
}
