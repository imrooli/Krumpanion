import { cumulativeRequirements } from "./exactRequirements";
import { addMaterialAmounts, type MaterialTotals } from "../../utils/collections";
import type { PlannerWarning } from "../planner/types";
import type { StaticGameData, WeaponProgressionEntry } from "../staticData/types";
import {
  commonEnemyTierIndexForRarity,
  eliteEnemyTierIndexForRarity,
  resolveGoalTrackableWeaponRarityLabel,
  weaponAscensionTierKeyForRarity,
} from "../staticData/weaponProgressionRegistry";

function warning(type: PlannerWarning["type"], key: string, message: string): PlannerWarning {
  return { type, key, message };
}

function resolveWeaponAscensionFamily(
  weaponKey: string,
  staticData: StaticGameData,
): { twoStar: string; threeStar: string; fourStar: string; fiveStar: string } | undefined {
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  if (profile?.weaponAscensionMaterialFamily?.every(Boolean)) {
    return {
      twoStar: profile.weaponAscensionMaterialFamily[0],
      threeStar: profile.weaponAscensionMaterialFamily[1],
      fourStar: profile.weaponAscensionMaterialFamily[2],
      fiveStar: profile.weaponAscensionMaterialFamily[3],
    };
  }

  const familyKey = profile?.weaponAscensionFamilyKey;
  if (!familyKey) {
    return undefined;
  }

  const canonicalFamily = staticData.weaponAscensionMaterialFamilies[familyKey];
  if (canonicalFamily) {
    return canonicalFamily.tiers;
  }

  const compatibilityFamily = staticData.weaponAscensionFamilies[familyKey];
  if (!compatibilityFamily) {
    return undefined;
  }

  return {
    twoStar: compatibilityFamily.tier1,
    threeStar: compatibilityFamily.tier2,
    fourStar: compatibilityFamily.tier3,
    fiveStar: compatibilityFamily.tier4,
  };
}

function resolveCommonEnemyFamily(
  weaponKey: string,
  staticData: StaticGameData,
): [string, string, string] | undefined {
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  if (profile?.commonEnemyFamily?.every(Boolean)) {
    return profile.commonEnemyFamily;
  }

  const familyId = profile?.commonEnemyFamilyKey ?? staticData.weaponGeneralEnemyDropFamilyByKey[weaponKey];
  if (!familyId) {
    return undefined;
  }

  const canonicalFamily = staticData.generalEnemyDropFamilies[familyId];
  if (canonicalFamily) {
    return canonicalFamily.materialKeys;
  }

  const compatibilityFamily = staticData.enemyDropFamilies[familyId];
  if (!compatibilityFamily) {
    return undefined;
  }

  return [compatibilityFamily.low, compatibilityFamily.mid, compatibilityFamily.high];
}

function resolveEliteEnemyFamily(
  weaponKey: string,
  staticData: StaticGameData,
): [string, string, string] | undefined {
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  if (profile?.eliteEnemyFamily?.every(Boolean)) {
    return profile.eliteEnemyFamily;
  }

  const familyId =
    profile?.eliteEnemyDropFamilyId ??
    profile?.eliteEnemyFamilyKey ??
    staticData.weaponEliteEnemyDropFamilyByKey[weaponKey];
  if (!familyId) {
    return undefined;
  }

  const eliteFamily = staticData.eliteEnemyDropFamilies[familyId];
  if (eliteFamily) {
    return eliteFamily.materialKeys;
  }

  const compatibilityFamily = staticData.enemyDropFamilies[familyId];
  if (!compatibilityFamily) {
    return undefined;
  }

  return [compatibilityFamily.low, compatibilityFamily.mid, compatibilityFamily.high];
}

function buildExactLevelTotals(
  rarityLabel: "3-Star" | "4-Star" | "5-Star",
  staticData: StaticGameData,
): Record<string, MaterialTotals> {
  const totals: Record<string, MaterialTotals> = {
    "1": {},
  };
  let running: MaterialTotals = {};

  for (const row of staticData.weaponExpRequirements[rarityLabel]) {
    running = addMaterialAmounts(running, {
      Mora: row.mora,
      MysticEnhancementOre: row.mysticOre,
      FineEnhancementOre: row.fineOre,
      EnhancementOre: row.enhancementOre,
    });
    totals[String(row.endLevel)] = running;
  }

  return totals;
}

function addResolvedStepMaterial(
  accumulator: MaterialTotals,
  materialKey: string | undefined,
  amount: number,
): MaterialTotals {
  if (!materialKey || amount <= 0) {
    return accumulator;
  }

  return addMaterialAmounts(accumulator, { [materialKey]: amount });
}

function buildExactAscensionTotals(
  weaponKey: string,
  rarityLabel: "3-Star" | "4-Star" | "5-Star",
  staticData: StaticGameData,
  warnings: PlannerWarning[],
): Record<string, MaterialTotals> {
  const totals: Record<string, MaterialTotals> = {
    "0": {},
  };
  let running: MaterialTotals = {};
  const weaponAscensionFamily = resolveWeaponAscensionFamily(weaponKey, staticData);
  const eliteEnemyFamily = resolveEliteEnemyFamily(weaponKey, staticData);
  const commonEnemyFamily = resolveCommonEnemyFamily(weaponKey, staticData);

  if (!weaponAscensionFamily) {
    warnings.push(warning("missing_weapon_ascension_family", weaponKey, `Weapon ${weaponKey} is missing weapon ascension family data.`));
  }
  if (!eliteEnemyFamily) {
    warnings.push(warning("missing_enemy_drop_family", weaponKey, `Weapon ${weaponKey} is missing elite enemy family data.`));
  }
  if (!commonEnemyFamily) {
    warnings.push(warning("missing_enemy_drop_family", weaponKey, `Weapon ${weaponKey} is missing common enemy family data.`));
  }

  for (const phase of [1, 2, 3, 4, 5, 6] as const) {
    const step = staticData.weaponAscensionCosts[rarityLabel][String(phase)];
    let stepTotals: MaterialTotals = { Mora: step.mora };

    stepTotals = addResolvedStepMaterial(
      stepTotals,
      weaponAscensionFamily?.[weaponAscensionTierKeyForRarity(step.weaponAscensionMaterial.tier)],
      step.weaponAscensionMaterial.amount,
    );
    stepTotals = addResolvedStepMaterial(
      stepTotals,
      eliteEnemyFamily?.[eliteEnemyTierIndexForRarity(step.eliteEnemyMaterial.tier)],
      step.eliteEnemyMaterial.amount,
    );
    stepTotals = addResolvedStepMaterial(
      stepTotals,
      commonEnemyFamily?.[commonEnemyTierIndexForRarity(step.commonEnemyMaterial.tier)],
      step.commonEnemyMaterial.amount,
    );

    running = addMaterialAmounts(running, stepTotals);
    totals[String(phase)] = running;
  }

  return totals;
}

export function resolveWeaponProgression(
  weaponKey: string,
  staticData: StaticGameData,
): { progression: WeaponProgressionEntry | null; warnings: PlannerWarning[]; usingLegacyExact: boolean } {
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  const exact = staticData.exactWeaponRequirements?.[weaponKey];
  const exactRarity = resolveGoalTrackableWeaponRarityLabel(staticData.weapons[weaponKey]?.rarity);
  if (exact && exactRarity) return { progression: { key: weaponKey, levelTotals: buildExactLevelTotals(exactRarity, staticData), ascensionTotals: cumulativeRequirements(exact.ascension, 0) }, warnings: [], usingLegacyExact: false };
  const legacy = staticData.legacyWeaponProgressions[weaponKey];
  const warnings: PlannerWarning[] = [];

  if (!profile) {
    if (legacy) {
      warnings.push(warning("migration_notice", weaponKey, `Weapon ${weaponKey} is still using migrated legacy exact progression data.`));
      return { progression: legacy, warnings, usingLegacyExact: true };
    }

    warnings.push(warning("missing_weapon_profile", weaponKey, `Weapon ${weaponKey} has no material profile yet.`));
    return { progression: null, warnings, usingLegacyExact: false };
  }

  if (profile.goalTrackable === false || profile.status === "needs_manual_review") {
    warnings.push(
      warning(
        "weapon_requires_manual_review",
        weaponKey,
        `Weapon ${weaponKey} is marked for manual review and is not available for normal goal calculation.`,
      ),
    );
    return { progression: null, warnings, usingLegacyExact: false };
  }

  const rarityLabel = resolveGoalTrackableWeaponRarityLabel(profile.rarity);
  if (!rarityLabel) {
    warnings.push(warning("unsupported_weapon_rarity", weaponKey, `Weapon ${weaponKey} uses unsupported rarity ${profile.rarity}.`));
    return { progression: legacy ?? null, warnings, usingLegacyExact: Boolean(legacy) };
  }

  return {
    progression: {
      key: weaponKey,
      levelTotals: buildExactLevelTotals(rarityLabel, staticData),
      ascensionTotals: buildExactAscensionTotals(weaponKey, rarityLabel, staticData, warnings),
    },
    warnings,
    usingLegacyExact: false,
  };
}
