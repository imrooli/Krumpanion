import type { PlannerSettings } from "../goals/types";
import type {
  CharacterPlan,
  GoalResolutionItem,
  InventoryDeficitKind,
  InventoryDeficitSlice,
  MaterialNeedRow,
  PlannerEstimationSettings,
  SourceAssignment,
  WeaponPlan,
} from "./types";
import type {
  CharacterMaterialProfile,
  EnemyDropFamily,
  MaterialRecord,
  StaticGameData,
  TalentBookFamily,
  WeaponMaterialProfile,
} from "../staticData/types";
import type { CraftingPlan } from "../crafting/types";
import { normalizePlannerEstimationSettings } from "./buildFarmingEstimates";

type CraftingCoverageMode = "none" | "guaranteed" | "expected";

function getRecord(staticData: StaticGameData, materialKey: string): MaterialRecord | null {
  return staticData.materialRecords[materialKey] ?? null;
}

function resolveCharacterEnemyFamily(profile: CharacterMaterialProfile | undefined, staticData: StaticGameData): string[] {
  if (!profile) {
    return [];
  }

  if (profile.enemyDropFamily?.length === 3) {
    return profile.enemyDropFamily;
  }

  if (profile.enemyDropFamilyKey && staticData.enemyDropFamilies[profile.enemyDropFamilyKey]) {
    const family = staticData.enemyDropFamilies[profile.enemyDropFamilyKey];
    return [family.low, family.mid, family.high];
  }

  if (profile.commonEnemyMaterialFamilyId && staticData.generalEnemyDropFamilies[profile.commonEnemyMaterialFamilyId]) {
    return staticData.generalEnemyDropFamilies[profile.commonEnemyMaterialFamilyId].materialKeys;
  }

  return [];
}

function resolveTalentBookFamily(profile: CharacterMaterialProfile | undefined, staticData: StaticGameData): string[] {
  if (!profile) {
    return [];
  }

  if (profile.talentBookFamily?.length === 3) {
    return profile.talentBookFamily;
  }

  const familyKey = profile.talentBookSeriesKey ?? profile.talentBookFamilyKey;
  if (familyKey && staticData.talentBookFamilies[familyKey]) {
    const family = staticData.talentBookFamilies[familyKey];
    return [family.teachings, family.guide, family.philosophies];
  }

  return [];
}

function resolveGemFamily(profile: CharacterMaterialProfile | undefined, staticData: StaticGameData): string[] {
  if (!profile) {
    return [];
  }

  if (profile.gemSeries?.length === 4) {
    return profile.gemSeries;
  }

  const familyKey = profile.gemFamilyKey ?? profile.elementGemFamilyKey;
  if (familyKey && staticData.elementGemFamilies[familyKey]) {
    const family = staticData.elementGemFamilies[familyKey];
    return [family.sliver, family.fragment, family.chunk, family.gemstone];
  }

  return [];
}

function resolveWeaponAscensionFamily(profile: WeaponMaterialProfile | undefined, staticData: StaticGameData): string[] {
  if (!profile) {
    return [];
  }

  if (profile.weaponAscensionMaterialFamily?.length === 4) {
    return profile.weaponAscensionMaterialFamily;
  }

  if (profile.weaponAscensionFamilyKey && staticData.weaponAscensionMaterialFamilies[profile.weaponAscensionFamilyKey]) {
    const family = staticData.weaponAscensionMaterialFamilies[profile.weaponAscensionFamilyKey];
    return [family.tiers.twoStar, family.tiers.threeStar, family.tiers.fourStar, family.tiers.fiveStar];
  }

  return [];
}

function resolveWeaponEnemyFamily(
  familyKey: string | undefined,
  directFamily: [string, string, string] | undefined,
  staticData: StaticGameData,
): string[] {
  if (directFamily?.length === 3) {
    return directFamily;
  }

  if (familyKey && staticData.enemyDropFamilies[familyKey]) {
    const family: EnemyDropFamily = staticData.enemyDropFamilies[familyKey];
    return [family.low, family.mid, family.high];
  }

  if (familyKey && staticData.generalEnemyDropFamilies[familyKey]) {
    return staticData.generalEnemyDropFamilies[familyKey].materialKeys;
  }

  if (familyKey && staticData.eliteEnemyDropFamilies[familyKey]) {
    return staticData.eliteEnemyDropFamilies[familyKey].materialKeys;
  }

  return [];
}

function inferCharacterSliceKind(
  profile: CharacterMaterialProfile | undefined,
  materialKey: string,
  label: string,
  staticData: StaticGameData,
): InventoryDeficitKind {
  const materialCategory = staticData.materials[materialKey]?.category;

  if (materialKey === "Mora") {
    return "mora";
  }
  if (materialCategory === "character_exp") {
    return "character_exp";
  }
  if (label === "Ascension") {
    if ((profile?.normalBossMaterialKey && profile.normalBossMaterialKey === materialKey) || materialCategory === "normal_boss_material") {
      return "normal_boss_material";
    }
    if (resolveGemFamily(profile, staticData).includes(materialKey) || getRecord(staticData, materialKey)?.category === "ascension_gem") {
      return "ascension_gem";
    }
    if ((profile?.localSpecialtyKey && profile.localSpecialtyKey === materialKey) || materialCategory === "local_specialty") {
      return "local_specialty";
    }
    if (resolveCharacterEnemyFamily(profile, staticData).includes(materialKey) || materialCategory === "general_enemy_drop") {
      return "general_enemy_drop";
    }
  }
  if (label.startsWith("Talent:")) {
    if ((profile?.weeklyBossMaterialKey && profile.weeklyBossMaterialKey === materialKey) || materialCategory === "weekly_boss") {
      return "weekly_boss_material";
    }
    if (resolveTalentBookFamily(profile, staticData).includes(materialKey) || materialCategory === "talent_book") {
      return "talent_book";
    }
    if (resolveCharacterEnemyFamily(profile, staticData).includes(materialKey) || materialCategory === "general_enemy_drop") {
      return "general_enemy_drop";
    }
    if (materialKey === "CrownOfInsight" || getRecord(staticData, materialKey)?.category === "special_progression_material") {
      return "special";
    }
  }

  if (label === "Level Cap Extension") {
    return "special";
  }

  return "unknown";
}

function inferWeaponSliceKind(
  profile: WeaponMaterialProfile | undefined,
  materialKey: string,
  label: string,
  staticData: StaticGameData,
): InventoryDeficitKind {
  const materialCategory = staticData.materials[materialKey]?.category;

  if (materialKey === "Mora") {
    return "mora";
  }
  if (materialCategory === "weapon_exp_material") {
    return "weapon_exp";
  }
  if (label.startsWith("Ascension")) {
    if (resolveWeaponAscensionFamily(profile, staticData).includes(materialKey) || getRecord(staticData, materialKey)?.category === "weapon_ascension_material") {
      return "weapon_ascension_material";
    }
    if (
      resolveWeaponEnemyFamily(profile?.eliteEnemyFamilyKey ?? profile?.eliteEnemyDropFamilyId, profile?.eliteEnemyFamily, staticData).includes(materialKey) ||
      materialCategory === "elite_enemy_drop"
    ) {
      return "elite_enemy_drop";
    }
    if (
      resolveWeaponEnemyFamily(profile?.commonEnemyFamilyKey, profile?.commonEnemyFamily, staticData).includes(materialKey) ||
      materialCategory === "general_enemy_drop"
    ) {
      return "general_enemy_drop";
    }
  }

  return "unknown";
}

function sliceAvailabilityForMaterial(materialKey: string, staticData: StaticGameData) {
  return staticData.materialSources[materialKey]?.[0]?.availability ?? "UNKNOWN";
}

function buildCharacterSlices(plan: CharacterPlan, staticData: StaticGameData): InventoryDeficitSlice[] {
  const profile = staticData.characterMaterialProfiles[plan.characterKey];
  return plan.breakdown.flatMap((entry, entryIndex) =>
    Object.entries(entry.materialTotals).map(([materialKey, requiredAmount], materialIndex) => ({
      id: `${plan.characterKey}-${entryIndex}-${materialIndex}-${materialKey}`,
      goalKey: plan.goalKey,
      goalType: "character" as const,
      displayName: plan.displayName,
      materialKey,
      materialName: staticData.materials[materialKey]?.displayName ?? materialKey,
      requiredAmount,
      missingAmount: 0,
      kind: inferCharacterSliceKind(profile, materialKey, entry.label, staticData),
      characterKey: plan.characterKey,
      normalBossMaterialKey: profile?.normalBossMaterialKey || profile?.normalBossMaterial || undefined,
      weeklyBossMaterialKey: profile?.weeklyBossMaterialKey || profile?.weeklyBossMaterial || undefined,
      talentBookFamilyKey: profile?.talentBookSeriesKey ?? profile?.talentBookFamilyKey,
      availability: sliceAvailabilityForMaterial(materialKey, staticData),
      assumptions: [],
      warnings: [],
    })),
  );
}

function buildWeaponSlices(plan: WeaponPlan, staticData: StaticGameData): InventoryDeficitSlice[] {
  const profile = staticData.weaponMaterialProfiles[plan.weaponKey];
  return plan.breakdown.flatMap((entry, entryIndex) =>
    Object.entries(entry.materialTotals).map(([materialKey, requiredAmount], materialIndex) => ({
      id: `${plan.weaponId}-${entryIndex}-${materialIndex}-${materialKey}`,
      goalKey: plan.goalKey,
      goalType: "weapon" as const,
      displayName: plan.displayName,
      materialKey,
      materialName: staticData.materials[materialKey]?.displayName ?? materialKey,
      requiredAmount,
      missingAmount: 0,
      kind: inferWeaponSliceKind(profile, materialKey, entry.label, staticData),
      weaponKey: plan.weaponKey,
      weaponAscensionFamilyKey: profile?.weaponAscensionFamilyKey,
      availability: sliceAvailabilityForMaterial(materialKey, staticData),
      assumptions: [],
      warnings: [],
    })),
  );
}

function allocateMissingAcrossSlices(slices: InventoryDeficitSlice[], materialRows: MaterialNeedRow[]): InventoryDeficitSlice[] {
  const rowsByKey = new Map(materialRows.map((row) => [row.materialKey, row]));
  const byMaterial = new Map<string, InventoryDeficitSlice[]>();

  for (const slice of slices) {
    byMaterial.set(slice.materialKey, [...(byMaterial.get(slice.materialKey) ?? []), slice]);
  }

  const allocated: InventoryDeficitSlice[] = [];
  for (const [materialKey, materialSlices] of byMaterial.entries()) {
    let remainingAvailable = rowsByKey.get(materialKey)?.owned ?? 0;

    for (const slice of materialSlices) {
      const covered = Math.min(slice.requiredAmount, remainingAvailable);
      const missingAmount = Math.max(slice.requiredAmount - covered, 0);
      remainingAvailable = Math.max(remainingAvailable - covered, 0);
      allocated.push({ ...slice, missingAmount });
    }
  }

  return allocated;
}

function applyGuaranteedCraftingCoverage(
  slices: InventoryDeficitSlice[],
  craftingPlan: CraftingPlan | undefined,
): InventoryDeficitSlice[] {
  if (!craftingPlan) {
    return slices;
  }

  const grouped = new Map<string, InventoryDeficitSlice[]>();
  for (const slice of slices) {
    grouped.set(slice.materialKey, [...(grouped.get(slice.materialKey) ?? []), slice]);
  }

  const adjusted: InventoryDeficitSlice[] = [];
  for (const [materialKey, materialSlices] of grouped.entries()) {
    const totalMissing = materialSlices.reduce((sum, slice) => sum + slice.missingAmount, 0);
    let reductionRemaining = Math.min(totalMissing, craftingPlan.guaranteedCoverageByMaterial[materialKey] ?? 0);
    for (const slice of materialSlices) {
      if (reductionRemaining <= 0) {
        adjusted.push(slice);
        continue;
      }
      const reduction = Math.min(slice.missingAmount, reductionRemaining);
      reductionRemaining -= reduction;
      adjusted.push({
        ...slice,
        missingAmount: slice.missingAmount - reduction,
        assumptions:
          reduction > 0 ? [...slice.assumptions, "Guaranteed same-family crafting applied before farming estimates."] : slice.assumptions,
      });
    }
  }

  return adjusted;
}

function applyExpectedCraftingCoverage(
  slices: InventoryDeficitSlice[],
  materialRows: MaterialNeedRow[],
  craftingPlan: CraftingPlan | undefined,
): InventoryDeficitSlice[] {
  if (!craftingPlan) {
    return slices;
  }

  const rowsByKey = new Map(materialRows.map((row) => [row.materialKey, row]));
  const grouped = new Map<string, InventoryDeficitSlice[]>();
  for (const slice of slices) {
    grouped.set(slice.materialKey, [...(grouped.get(slice.materialKey) ?? []), slice]);
  }

  const adjusted: InventoryDeficitSlice[] = [];
  for (const [materialKey, materialSlices] of grouped.entries()) {
    const row = rowsByKey.get(materialKey);
    const rawMissing = row?.rawMissing ?? materialSlices.reduce((sum, slice) => sum + slice.missingAmount, 0);
    const targetRemaining = Math.max(rawMissing - (craftingPlan.expectedCoverageByMaterial[materialKey] ?? 0), 0);
    let extraReduction = Math.max(
      0,
      materialSlices.reduce((sum, slice) => sum + slice.missingAmount, 0) - targetRemaining,
    );

    for (const slice of materialSlices) {
      if (extraReduction <= 0) {
        adjusted.push(slice);
        continue;
      }
      const reduction = Math.min(slice.missingAmount, extraReduction);
      extraReduction -= reduction;
      adjusted.push({
        ...slice,
        missingAmount: slice.missingAmount - reduction,
        assumptions:
          reduction > 0 ? [...slice.assumptions, "Expected-value crafting passive savings applied to farming estimates."] : slice.assumptions,
      });
    }
  }

  return adjusted;
}

function sourceNameFromSlice(slice: InventoryDeficitSlice, staticData: StaticGameData): string | null {
  switch (slice.kind) {
    case "normal_boss_material": {
      const bossKey = slice.normalBossMaterialKey ?? slice.materialKey;
      return staticData.normalBossMaterials[bossKey]?.bossDisplayName ?? staticData.materialSources[slice.materialKey]?.[0]?.sourceName ?? null;
    }
    case "ascension_gem": {
      const bossKey = slice.normalBossMaterialKey ?? slice.materialKey;
      return staticData.normalBossMaterials[bossKey]?.bossDisplayName ?? null;
    }
    case "talent_book": {
      const familyKey = slice.talentBookFamilyKey;
      return familyKey ? staticData.talentBookFamilies[familyKey]?.domainName ?? staticData.materialSources[slice.materialKey]?.[0]?.sourceName ?? null : null;
    }
    case "weapon_ascension_material": {
      const familyKey = slice.weaponAscensionFamilyKey ?? getRecord(staticData, slice.materialKey)?.familyKey;
      if (familyKey && staticData.weaponAscensionMaterialFamilies[familyKey]) {
        return staticData.weaponAscensionMaterialFamilies[familyKey].source.domainName ?? staticData.materialSources[slice.materialKey]?.[0]?.sourceName ?? null;
      }
      return staticData.materialSources[slice.materialKey]?.[0]?.sourceName ?? null;
    }
    case "weekly_boss_material": {
      const source = getRecord(staticData, slice.materialKey)?.source;
      return source?.type === "weekly_boss"
        ? source.domainName ?? source.bossName ?? null
        : staticData.materialSources[slice.materialKey]?.[0]?.sourceName ?? null;
    }
    default:
      return staticData.materialSources[slice.materialKey]?.[0]?.sourceName ?? null;
  }
}

function targetTierIndexForMaterial(materialKey: string, kind: InventoryDeficitKind, staticData: StaticGameData): number {
  const record = getRecord(staticData, materialKey);
  if (kind === "weapon_ascension_material") {
    const familyKey = record?.familyKey;
    if (familyKey && staticData.weaponAscensionMaterialFamilies[familyKey]) {
      const family = staticData.weaponAscensionMaterialFamilies[familyKey].tiers;
      return [family.twoStar, family.threeStar, family.fourStar, family.fiveStar].indexOf(materialKey);
    }
  }
  if (kind === "talent_book") {
    const family = Object.values(staticData.talentBookFamilies).find((item: TalentBookFamily) =>
      [item.teachings, item.guide, item.philosophies].includes(materialKey),
    );
    if (family) {
      return [family.teachings, family.guide, family.philosophies].indexOf(materialKey);
    }
  }
  if (kind === "ascension_gem") {
    const family = Object.values(staticData.elementGemFamilies).find((item) =>
      [item.sliver, item.fragment, item.chunk, item.gemstone].includes(materialKey),
    );
    if (family) {
      return [family.sliver, family.fragment, family.chunk, family.gemstone].indexOf(materialKey);
    }
  }
  return 0;
}

function classifySourceType(kind: InventoryDeficitKind): SourceAssignment["sourceType"] {
  switch (kind) {
    case "mora":
      return "ley_line_wealth";
    case "character_exp":
      return "ley_line_revelation";
    case "talent_book":
      return "domain_of_mastery";
    case "weapon_ascension_material":
      return "domain_of_forgery";
    case "normal_boss_material":
    case "ascension_gem":
      return "normal_boss";
    case "weekly_boss_material":
      return "weekly_boss";
    case "general_enemy_drop":
    case "elite_enemy_drop":
      return "open_world_enemy";
    case "local_specialty":
      return "local_specialty";
    default:
      return "unknown";
  }
}

export function buildSourceAssignments(params: {
  goalResolutions: GoalResolutionItem[];
  exactMaterialRows: MaterialNeedRow[];
  craftingPlan?: CraftingPlan;
  staticData: StaticGameData;
  resinSettings: PlannerSettings;
  coverageMode: CraftingCoverageMode;
}): {
  sourceAssignments: SourceAssignment[];
  settings: PlannerEstimationSettings;
} {
  const settings = normalizePlannerEstimationSettings(params.resinSettings, params.staticData);
  const slices = params.goalResolutions.flatMap((plan) =>
    plan.goalType === "character"
      ? buildCharacterSlices(plan, params.staticData)
      : buildWeaponSlices(plan, params.staticData),
  );

  let adjustedSlices = allocateMissingAcrossSlices(slices, params.exactMaterialRows);
  if (params.coverageMode !== "none" && params.craftingPlan?.totalCraftingMora) {
    adjustedSlices.push({
      id: "crafting-mora",
      goalKey: "crafting",
      goalType: "character",
      displayName: "Crafting Mora",
      materialKey: "Mora",
      materialName: "Mora",
      requiredAmount: params.craftingPlan.totalCraftingMora,
      missingAmount: params.craftingPlan.totalCraftingMora,
      kind: "mora",
      availability: "ALWAYS",
      assumptions: ["Crafting Mora is estimated separately from progression Mora."],
      warnings: [],
    });
  }

  if (params.coverageMode !== "none") {
    adjustedSlices = applyGuaranteedCraftingCoverage(adjustedSlices, params.craftingPlan);
  }
  if (params.coverageMode === "expected") {
    adjustedSlices = applyExpectedCraftingCoverage(adjustedSlices, params.exactMaterialRows, params.craftingPlan);
  }

  const sourceAssignments = adjustedSlices
    .filter((slice) => slice.missingAmount > 0)
    .map((slice) => ({
      ...slice,
      sourceType: classifySourceType(slice.kind),
      sourceName: sourceNameFromSlice(slice, params.staticData),
      targetTierIndex: targetTierIndexForMaterial(slice.materialKey, slice.kind, params.staticData),
    }));

  return {
    sourceAssignments,
    settings,
  };
}
