import { addMaterialAmounts, type MaterialTotals } from "../../utils/collections";
import type { PlannerWarning } from "../planner/types";
import type {
  CharacterMaterialProfile,
  CharacterProgressionEntry,
  CharacterLevelCapExtensionCost,
  CharacterAscensionCost,
  GemTier,
  StaticGameData,
  TalentUpgradeCost,
} from "../staticData/types";
import { resolveCharacterExpMaterials } from "./materialResolvers";
import { isTravelerElementKey, isTravelerSharedKey } from "../staticData/travelerRegistry";

function warning(type: PlannerWarning["type"], key: string, message: string): PlannerWarning {
  return { type, key, message };
}

function pushWarning(
  warnings: PlannerWarning[],
  seenWarnings: Set<string>,
  type: PlannerWarning["type"],
  key: string,
  message: string,
): void {
  const signature = `${type}:${key}:${message}`;
  if (seenWarnings.has(signature)) {
    return;
  }

  seenWarnings.add(signature);
  warnings.push(warning(type, key, message));
}

function resolveCharacterLevelTotals(staticData: StaticGameData): Record<string, MaterialTotals> {
  return Object.fromEntries(
    Object.entries(staticData.universalCharacterProgressionCore.levelTotals).map(([level, total]) => [
      level,
      addMaterialAmounts(
        total.moraUsingRecommendedBooks ? { Mora: total.moraUsingRecommendedBooks } : {},
        total.recommendedBooks ?? resolveCharacterExpMaterials(total.exp),
      ),
    ]),
  );
}

function resolveCharacterProfile(characterKey: string, staticData: StaticGameData): CharacterMaterialProfile | undefined {
  const profile = staticData.characterMaterialProfiles[characterKey];
  if (!profile) {
    return undefined;
  }

  return {
    ...profile,
    gemFamilyKey: profile.gemFamilyKey ?? profile.elementGemFamilyKey ?? profile.element ?? staticData.characters[characterKey]?.element,
    normalBossMaterialKey: profile.normalBossMaterialKey ?? profile.normalBossMaterial,
    commonEnemyMaterialFamilyId:
      profile.commonEnemyMaterialFamilyId ?? profile.enemyDropFamilyKey ?? staticData.characterGeneralEnemyDropFamilyByKey[characterKey],
    localSpecialtyKey:
      profile.localSpecialtyKey ??
      profile.localSpecialty ??
      (profile.localSpecialtySourceKey ? staticData.localSpecialtySources[profile.localSpecialtySourceKey]?.materialKey : undefined),
    talentBookSeriesKey: profile.talentBookSeriesKey ?? profile.talentBookFamilyKey,
    weeklyBossMaterialKey: profile.weeklyBossMaterialKey ?? profile.weeklyBossMaterial,
  };
}

function resolveGemSeries(profile: CharacterMaterialProfile, staticData: StaticGameData): [string, string, string, string] | undefined {
  if (profile.gemSeries?.every(Boolean)) {
    return profile.gemSeries;
  }

  const familyKey = profile.gemFamilyKey;
  if (!familyKey) {
    return undefined;
  }

  const family = staticData.elementGemFamilies[familyKey];
  if (!family) {
    return undefined;
  }

  return [family.sliver, family.fragment, family.chunk, family.gemstone];
}

function resolveGeneralEnemyFamily(profile: CharacterMaterialProfile, staticData: StaticGameData): [string, string, string] | undefined {
  if (profile.enemyDropFamily?.every(Boolean)) {
    return profile.enemyDropFamily;
  }

  const familyKey = profile.commonEnemyMaterialFamilyId;
  if (!familyKey) {
    return undefined;
  }

  const generalFamily = staticData.generalEnemyDropFamilies[familyKey];
  if (generalFamily) {
    return generalFamily.materialKeys;
  }

  const compatibilityFamily = staticData.enemyDropFamilies[familyKey];
  if (compatibilityFamily) {
    return [compatibilityFamily.low, compatibilityFamily.mid, compatibilityFamily.high];
  }

  return undefined;
}

function resolveTalentBookFamily(profile: CharacterMaterialProfile, staticData: StaticGameData): [string, string, string] | undefined {
  if (profile.talentBookFamily?.every(Boolean)) {
    return profile.talentBookFamily;
  }

  const familyKey = profile.talentBookSeriesKey;
  if (!familyKey) {
    return undefined;
  }

  const family = staticData.talentBookFamilies[familyKey];
  if (!family) {
    return undefined;
  }

  return [family.teachings, family.guide, family.philosophies];
}

function resolveGemMaterialKey(gemSeries: readonly string[] | undefined, tier: GemTier | undefined): string | undefined {
  if (!gemSeries || !tier) {
    return undefined;
  }

  const indexByTier: Record<GemTier, number> = {
    sliver: 0,
    fragment: 1,
    chunk: 2,
    gemstone: 3,
  };

  return gemSeries[indexByTier[tier]];
}

function resolveCommonEnemyMaterialKey(
  enemyFamily: readonly string[] | undefined,
  tier: number | undefined,
): string | undefined {
  if (!enemyFamily || !tier) {
    return undefined;
  }

  return enemyFamily[tier - 1];
}

function resolveTalentBookMaterialKey(
  talentBookFamily: readonly string[] | undefined,
  tier: TalentUpgradeCost["talentBookTier"],
): string | undefined {
  if (!talentBookFamily || !tier) {
    return undefined;
  }

  const indexByTier: Record<NonNullable<TalentUpgradeCost["talentBookTier"]>, number> = {
    teachings: 0,
    guide: 1,
    philosophies: 2,
  };

  return talentBookFamily[indexByTier[tier]];
}

function applyAscensionStepCost(
  runningTotals: MaterialTotals,
  stepCost: CharacterAscensionCost,
  profile: CharacterMaterialProfile,
  gemSeries: readonly string[] | undefined,
  enemyFamily: readonly string[] | undefined,
  warnings: PlannerWarning[],
  seenWarnings: Set<string>,
): MaterialTotals {
  let next = { ...runningTotals };
  const characterKey = profile.characterKey;

  next = addMaterialAmounts(next, { Mora: stepCost.mora });

  if (stepCost.gemTier && stepCost.gemCount) {
    const gemKey = resolveGemMaterialKey(gemSeries, stepCost.gemTier);
    if (!gemKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_element_gem_family",
        characterKey,
        `Character ${characterKey} is missing a valid gem family mapping.`,
      );
    } else {
      next = addMaterialAmounts(next, { [gemKey]: stepCost.gemCount });
    }
  }

  if (stepCost.localSpecialtyCount) {
    if (!profile.localSpecialtyKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_character_profile",
        characterKey,
        `Character ${characterKey} is missing local specialty data.`,
      );
    } else {
      next = addMaterialAmounts(next, { [profile.localSpecialtyKey]: stepCost.localSpecialtyCount });
    }
  }

  if (stepCost.normalBossMaterialCount) {
    if (!profile.normalBossMaterialKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_character_profile",
        characterKey,
        `Character ${characterKey} is missing normal boss material data.`,
      );
    } else {
      next = addMaterialAmounts(next, { [profile.normalBossMaterialKey]: stepCost.normalBossMaterialCount });
    }
  }

  if (stepCost.commonEnemyTier && stepCost.commonEnemyCount) {
    const commonEnemyKey = resolveCommonEnemyMaterialKey(enemyFamily, stepCost.commonEnemyTier);
    if (!commonEnemyKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_enemy_drop_family",
        characterKey,
        `Character ${characterKey} is missing a valid general enemy drop family mapping.`,
      );
    } else {
      next = addMaterialAmounts(next, { [commonEnemyKey]: stepCost.commonEnemyCount });
    }
  }

  return next;
}

function applyTalentUpgradeCost(
  runningTotals: MaterialTotals,
  upgradeCost: TalentUpgradeCost,
  profile: CharacterMaterialProfile,
  enemyFamily: readonly string[] | undefined,
  talentBookFamily: readonly string[] | undefined,
  warnings: PlannerWarning[],
  seenWarnings: Set<string>,
): MaterialTotals {
  let next = { ...runningTotals };
  const characterKey = profile.characterKey;

  next = addMaterialAmounts(next, { Mora: upgradeCost.mora });

  if (upgradeCost.commonEnemyTier && upgradeCost.commonEnemyCount) {
    const commonEnemyKey = resolveCommonEnemyMaterialKey(enemyFamily, upgradeCost.commonEnemyTier);
    if (!commonEnemyKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_enemy_drop_family",
        characterKey,
        `Character ${characterKey} is missing a valid general enemy drop family mapping.`,
      );
    } else {
      next = addMaterialAmounts(next, { [commonEnemyKey]: upgradeCost.commonEnemyCount });
    }
  }

  if (upgradeCost.talentBookTier && upgradeCost.talentBookCount) {
    const talentBookKey = resolveTalentBookMaterialKey(talentBookFamily, upgradeCost.talentBookTier);
    if (!talentBookKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_talent_book_family",
        characterKey,
        `Character ${characterKey} is missing a valid talent book series mapping.`,
      );
    } else {
      next = addMaterialAmounts(next, { [talentBookKey]: upgradeCost.talentBookCount });
    }
  }

  if (upgradeCost.weeklyBossMaterialCount) {
    if (!profile.weeklyBossMaterialKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "missing_character_profile",
        characterKey,
        `Character ${characterKey} is missing weekly boss material data.`,
      );
    } else {
      next = addMaterialAmounts(next, { [profile.weeklyBossMaterialKey]: upgradeCost.weeklyBossMaterialCount });
    }
  }

  if (upgradeCost.crownOfInsightCount) {
    next = addMaterialAmounts(next, { CrownOfInsight: upgradeCost.crownOfInsightCount });
  }

  return next;
}

function buildAscensionTotals(
  staticData: StaticGameData,
  profile: CharacterMaterialProfile,
  gemSeries: readonly string[] | undefined,
  enemyFamily: readonly string[] | undefined,
  warnings: PlannerWarning[],
  seenWarnings: Set<string>,
): Record<string, MaterialTotals> {
  const totals: Record<string, MaterialTotals> = {
    "0": {},
  };
  let runningTotals: MaterialTotals = {};

  for (const stepCost of staticData.universalCharacterProgressionCore.ascensionCosts) {
    runningTotals = applyAscensionStepCost(runningTotals, stepCost, profile, gemSeries, enemyFamily, warnings, seenWarnings);
    totals[String(stepCost.toPhase)] = { ...runningTotals };
  }

  return totals;
}

function buildTravelerSharedAscensionTotals(
  staticData: StaticGameData,
  profile: CharacterMaterialProfile,
  gemSeries: readonly string[] | undefined,
  enemyFamily: readonly string[] | undefined,
  warnings: PlannerWarning[],
  seenWarnings: Set<string>,
): Record<string, MaterialTotals> {
  const totals: Record<string, MaterialTotals> = {
    "0": {},
  };
  let runningTotals: MaterialTotals = {};

  for (const stepCost of staticData.universalCharacterProgressionCore.ascensionCosts) {
    runningTotals = applyAscensionStepCost(
      runningTotals,
      {
        ...stepCost,
        normalBossMaterialCount: undefined,
      },
      profile,
      gemSeries,
      enemyFamily,
      warnings,
      seenWarnings,
    );
    totals[String(stepCost.toPhase)] = { ...runningTotals };
  }

  return totals;
}

function buildTalentTotals(
  staticData: StaticGameData,
  profile: CharacterMaterialProfile,
  enemyFamily: readonly string[] | undefined,
  talentBookFamily: readonly string[] | undefined,
  warnings: PlannerWarning[],
  seenWarnings: Set<string>,
): Record<string, MaterialTotals> {
  const totals: Record<string, MaterialTotals> = {
    "1": {},
  };
  let runningTotals: MaterialTotals = {};

  for (const upgradeCost of staticData.universalTalentProgressionCore.upgradeCosts) {
    runningTotals = applyTalentUpgradeCost(
      runningTotals,
      upgradeCost,
      profile,
      enemyFamily,
      talentBookFamily,
      warnings,
      seenWarnings,
    );
    totals[String(upgradeCost.toLevel)] = { ...runningTotals };
  }

  return totals;
}

function buildLevelCapExtensionTotals(
  extensionCosts: CharacterLevelCapExtensionCost[],
  post90ResourceKey: string | undefined,
): Record<string, MaterialTotals> {
  const totals: Record<string, MaterialTotals> = {
    "90": {},
  };
  let runningTotals: MaterialTotals = {};

  for (const extension of extensionCosts) {
    const materialKey = extension.materialKey === "MasterlessStellaFortuna"
      ? post90ResourceKey ?? "MasterlessStellaFortuna"
      : extension.materialKey;
    runningTotals = addMaterialAmounts(runningTotals, { [materialKey]: extension.materialCount });
    totals[String(extension.toMaxLevel)] = { ...runningTotals };
  }

  return totals;
}

export function resolveCharacterProgression(
  characterKey: string,
  staticData: StaticGameData,
  enablePost90Planning: boolean,
): { progression: CharacterProgressionEntry | null; warnings: PlannerWarning[]; usingLegacyExact: boolean } {
  const profile = resolveCharacterProfile(characterKey, staticData);
  const legacy = staticData.legacyCharacterProgressions[characterKey];
  const warnings: PlannerWarning[] = [];
  const seenWarnings = new Set<string>();

  if (!profile) {
    if (legacy) {
      pushWarning(
        warnings,
        seenWarnings,
        "migration_notice",
        characterKey,
        `Character ${characterKey} is still using migrated legacy exact progression data.`,
      );
      return { progression: legacy, warnings, usingLegacyExact: true };
    }

    pushWarning(
      warnings,
      seenWarnings,
      "missing_character_profile",
      characterKey,
      `Character ${characterKey} has no material profile yet.`,
    );
    return { progression: null, warnings, usingLegacyExact: false };
  }

  const gemSeries = resolveGemSeries(profile, staticData);
  const enemyFamily = resolveGeneralEnemyFamily(profile, staticData);
  const talentBookFamily = resolveTalentBookFamily(profile, staticData);
  const travelerShared = isTravelerSharedKey(characterKey);
  const travelerElement = isTravelerElementKey(characterKey);

  if (!travelerElement && !profile.gemFamilyKey && !gemSeries) {
    pushWarning(
      warnings,
      seenWarnings,
      "missing_element_gem_family",
      characterKey,
      `Character ${characterKey} is missing element gem family data.`,
    );
  }

  if (!profile.commonEnemyMaterialFamilyId && !enemyFamily) {
    pushWarning(
      warnings,
      seenWarnings,
      "missing_enemy_drop_family",
      characterKey,
      `Character ${characterKey} is missing general enemy drop family data.`,
    );
  } else if (profile.commonEnemyMaterialFamilyId && staticData.eliteEnemyDropFamilies[profile.commonEnemyMaterialFamilyId]) {
    pushWarning(
      warnings,
      seenWarnings,
      "missing_enemy_drop_family",
      characterKey,
      `Character ${characterKey} references elite enemy drop family ${profile.commonEnemyMaterialFamilyId} where a general enemy drop family is required.`,
    );
  }

  if (!travelerShared && !profile.talentBookSeriesKey && !talentBookFamily) {
    pushWarning(
      warnings,
      seenWarnings,
      "missing_talent_book_family",
      characterKey,
      `Character ${characterKey} is missing talent book series data.`,
    );
  }

  const progression: CharacterProgressionEntry = {
    key: characterKey,
    levelTotals: travelerElement ? { "1": {} } : resolveCharacterLevelTotals(staticData),
    ascensionTotals: travelerElement
      ? Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((phase) => [String(phase), {}]))
      : travelerShared
        ? buildTravelerSharedAscensionTotals(staticData, profile, gemSeries, enemyFamily, warnings, seenWarnings)
        : buildAscensionTotals(staticData, profile, gemSeries, enemyFamily, warnings, seenWarnings),
    talentTotals: travelerShared
      ? { "1": {} }
      : buildTalentTotals(staticData, profile, enemyFamily, talentBookFamily, warnings, seenWarnings),
  };

  if (enablePost90Planning && !travelerElement) {
    if (!profile.post90ResourceKey) {
      pushWarning(
        warnings,
        seenWarnings,
        "post_90_profile_incomplete",
        characterKey,
        `Character ${characterKey} is using default post-90 resource mapping.`,
      );
    }
    progression.levelCapExtensionTotals = buildLevelCapExtensionTotals(
      staticData.universalCharacterProgressionCore.post90LevelCapExtensionCosts,
      profile.post90ResourceKey,
    );
  }

  return {
    progression,
    warnings,
    usingLegacyExact: false,
  };
}
