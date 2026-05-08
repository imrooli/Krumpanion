import type { AccountOwnershipState } from "../account/types";
import {
  getWeaponGoalId,
  getWeaponGoalTargetAscension,
  resolveCharacterGoalCurrentState,
  resolveWeaponGoalCurrentState,
} from "../goals/goalState";
import type { CharacterGoal, WeaponGoal } from "../goals/types";
import type { CharacterPlan, PlanMaterialBreakdown, PlannerInput, PlannerWarning, WeaponPlan } from "./types";
import type { StaticGameData, TalentUpgradeCost } from "../staticData/types";
import { addMaterialAmounts, subtractMaterialAmounts, type MaterialTotals } from "../../utils/collections";
import { resolveCharacterProgression } from "../progression/resolveCharacterProgression";
import { resolveWeaponProgression } from "../progression/resolveWeaponProgression";
import {
  inferRequiredWeaponAscensionPhase,
  resolveGoalTrackableWeaponRarityLabel,
  WEAPON_LEVEL_BOUNDARIES,
} from "../staticData/weaponProgressionRegistry";
import { getTravelerGoalLabel, isTravelerElementKey, TRAVELER_SHARED_KEY } from "../staticData/travelerRegistry";

function hasProgressionResolutionWarning(warnings: PlannerWarning[], key: string): boolean {
  return warnings.some(
    (warning) =>
      warning.key === key &&
      [
        "missing_character_profile",
        "missing_weapon_profile",
        "missing_element_gem_family",
        "missing_talent_book_family",
        "missing_enemy_drop_family",
        "missing_weapon_ascension_family",
        "weapon_requires_manual_review",
        "unsupported_weapon_rarity",
      ].includes(warning.type),
  );
}

function getMaterialTotalsForTarget(table: Record<string, MaterialTotals> | undefined, target: number | undefined): MaterialTotals {
  if (!table || target === undefined) {
    return {};
  }

  return table[String(target)] ?? {};
}

function addBreakdownEntry(
  breakdown: PlanMaterialBreakdown[],
  label: string,
  materialTotals: MaterialTotals,
): void {
  if (Object.keys(materialTotals).length === 0) {
    return;
  }

  breakdown.push({ label, materialTotals });
}

function determineRequiredAscensionPhaseForLevel(targetLevel: number | undefined, staticData: StaticGameData): number | undefined {
  if (targetLevel === undefined) {
    return undefined;
  }

  const cappedTargetLevel = Math.min(targetLevel, 90);
  const phases = Object.entries(staticData.universalCharacterProgressionCore.levelCapByAscension)
    .map(([phase, maxLevel]) => [Number(phase), maxLevel] as const)
    .sort((left, right) => left[0] - right[0]);

  return phases.find(([, maxLevel]) => cappedTargetLevel <= maxLevel)?.[0] ?? 6;
}

function determinePost90LevelCapKey(level: number): 90 | 95 | 100 {
  if (level >= 100) {
    return 100;
  }
  if (level > 90) {
    return 95;
  }
  return 90;
}

function determineHighestRequiredAscensionForTalentRange(
  currentLevel: number,
  targetLevel: number,
  upgradeCosts: TalentUpgradeCost[],
): number {
  if (targetLevel <= currentLevel) {
    return 0;
  }

  return upgradeCosts.reduce((highest, upgradeCost) => {
    if (upgradeCost.fromLevel < currentLevel || upgradeCost.toLevel > targetLevel) {
      return highest;
    }

    return Math.max(highest, upgradeCost.requiredAscensionPhase);
  }, 0);
}

function buildCharacterMissingTotals(
  ownership: AccountOwnershipState,
  characterGoal: CharacterGoal,
  input: PlannerInput,
  warnings: PlannerWarning[],
): { totals: MaterialTotals; breakdown: PlanMaterialBreakdown[] } {
  const breakdown: PlanMaterialBreakdown[] = [];
  const isPost90Goal = (characterGoal.targetLevel ?? 0) > 90;
  if (isPost90Goal && !input.enablePost90Planning) {
    warnings.push({
      type: "post_90_profile_incomplete",
      key: characterGoal.characterKey,
      message: `Character ${characterGoal.characterKey} has a post-90 goal, but post-90 planning is disabled.`,
    });
  }
  const resolved = resolveCharacterProgression(characterGoal.characterKey, input.staticData, input.enablePost90Planning ?? false);
  const progression = resolved.progression;
  warnings.push(...resolved.warnings);

  if (!progression) {
    if (!hasProgressionResolutionWarning(warnings, characterGoal.characterKey)) {
      warnings.push({
        type: "missing_cost_table",
        key: characterGoal.characterKey,
        message: `No character progression data is available for ${characterGoal.characterKey}.`,
      });
    }
    return { totals: {}, breakdown };
  }

  const resolvedCurrent = resolveCharacterGoalCurrentState(characterGoal, ownership);
  const character = resolvedCurrent.state;

  const cappedCurrentLevel = Math.min(character.currentLevel, 90);
  const cappedTargetLevel = Math.min(characterGoal.targetLevel ?? character.currentLevel, 90);
  addBreakdownEntry(
    breakdown,
    "Leveling",
    subtractMaterialAmounts(
      getMaterialTotalsForTarget(progression.levelTotals, cappedTargetLevel),
      getMaterialTotalsForTarget(progression.levelTotals, cappedCurrentLevel),
    ),
  );

  const requiredAscensionForTargetLevel = determineRequiredAscensionPhaseForLevel(characterGoal.targetLevel, input.staticData);
  const effectiveTargetAscension = Math.max(
    character.currentAscension,
    characterGoal.targetAscension ?? character.currentAscension,
    requiredAscensionForTargetLevel ?? character.currentAscension,
  );
  addBreakdownEntry(
    breakdown,
    "Ascension",
    subtractMaterialAmounts(
      getMaterialTotalsForTarget(progression.ascensionTotals, effectiveTargetAscension),
      getMaterialTotalsForTarget(progression.ascensionTotals, character.currentAscension),
    ),
  );

  if ((characterGoal.targetLevel ?? 0) > 90 && input.enablePost90Planning && progression.levelCapExtensionTotals) {
    addBreakdownEntry(
      breakdown,
      "Level Cap Extension",
      subtractMaterialAmounts(
        getMaterialTotalsForTarget(progression.levelCapExtensionTotals, determinePost90LevelCapKey(characterGoal.targetLevel ?? 90)),
        getMaterialTotalsForTarget(progression.levelCapExtensionTotals, determinePost90LevelCapKey(character.currentLevel)),
      ),
    );
  }

  const desiredTalents = characterGoal.talents;
  if (desiredTalents) {
    const sharedTravelerGoal = isTravelerElementKey(characterGoal.characterKey)
      ? input.goals.characterGoals[TRAVELER_SHARED_KEY]
      : undefined;
    const sharedTravelerAscensionTarget = sharedTravelerGoal?.enabled
      ? Math.max(
          sharedTravelerGoal.targetAscension ?? character.currentAscension,
          determineRequiredAscensionPhaseForLevel(sharedTravelerGoal.targetLevel, input.staticData) ?? character.currentAscension,
        )
      : character.currentAscension;
    const talentLevels = {
      auto: character.currentTalents.normal,
      skill: character.currentTalents.skill,
      burst: character.currentTalents.burst,
    } as const;

    for (const talentKey of ["auto", "skill", "burst"] as const) {
      const currentLevel = talentLevels[talentKey];
      const targetLevel = desiredTalents[talentKey] ?? currentLevel;
      const label = talentKey === "auto" ? "Talent: Auto" : talentKey === "skill" ? "Talent: Skill" : "Talent: Burst";

      addBreakdownEntry(
        breakdown,
        label,
        subtractMaterialAmounts(
          getMaterialTotalsForTarget(progression.talentTotals, targetLevel),
          getMaterialTotalsForTarget(progression.talentTotals, currentLevel),
        ),
      );

      const highestRequiredAscension = determineHighestRequiredAscensionForTalentRange(
        currentLevel,
        targetLevel,
        input.staticData.universalTalentProgressionCore.upgradeCosts,
      );

      if (highestRequiredAscension > sharedTravelerAscensionTarget) {
        warnings.push({
          type: "insufficient_ascension_for_talent_goal",
          key: characterGoal.characterKey,
          message: `${characterGoal.characterKey} needs ascension phase ${highestRequiredAscension} before ${label.toLowerCase()} can reach Lv. ${targetLevel}.`,
        });
      }
    }
  }

  const totals = breakdown.reduce<MaterialTotals>(
    (accumulator, entry) => addMaterialAmounts(accumulator, entry.materialTotals),
    {},
  );

  return { totals, breakdown };
}

function buildWeaponMissingTotals(
  ownership: AccountOwnershipState,
  weaponGoal: WeaponGoal,
  input: PlannerInput,
  warnings: PlannerWarning[],
): { totals: MaterialTotals; breakdown: PlanMaterialBreakdown[] } {
  const resolved = resolveWeaponProgression(weaponGoal.weaponKey, input.staticData);
  const progression = resolved.progression;
  const breakdown: PlanMaterialBreakdown[] = [];
  warnings.push(...resolved.warnings);

  if (!progression) {
    if (!hasProgressionResolutionWarning(warnings, weaponGoal.weaponKey)) {
      warnings.push({
        type: "missing_cost_table",
        key: weaponGoal.weaponKey,
        message: `No weapon progression data is available for ${weaponGoal.weaponKey}.`,
      });
    }
    return { totals: {}, breakdown };
  }

  const resolvedCurrent = resolveWeaponGoalCurrentState(weaponGoal, ownership);
  const weapon = resolvedCurrent.state;

  const profile = input.staticData.weaponMaterialProfiles[weaponGoal.weaponKey];
  const rarityLabel = profile ? resolveGoalTrackableWeaponRarityLabel(profile.rarity) : null;
  const currentLevel = Math.max(1, Math.min(weapon.currentLevel, 90));
  const targetLevel = Math.max(1, Math.min(weaponGoal.targetLevel ?? weapon.currentLevel, 90));
  const requiredAscension = inferRequiredWeaponAscensionPhase(targetLevel);
  const finalTargetAscension = Math.max(
    weapon.currentAscension,
    getWeaponGoalTargetAscension(weaponGoal) ?? weapon.currentAscension,
    requiredAscension,
  );
  const finalPhaseCap = input.staticData.weaponAscensionPhaseCaps[String(finalTargetAscension)]?.maxLevel ?? 90;

  if ((weaponGoal.targetLevel ?? weapon.currentLevel) > 90) {
    warnings.push({
      type: "invalid_weapon_goal",
      key: weaponGoal.weaponKey,
      message: `Weapon ${weaponGoal.weaponKey} target level exceeds 90 and was capped to 90 for planning.`,
    });
  }

  if ((weaponGoal.targetLevel ?? weapon.currentLevel) > finalPhaseCap) {
    warnings.push({
      type: "invalid_weapon_goal",
      key: weaponGoal.weaponKey,
      message: `Weapon ${weaponGoal.weaponKey} target level exceeds the level cap unlocked by ascension phase ${finalTargetAscension}.`,
    });
  }

  if (rarityLabel && targetLevel > currentLevel) {
    const supportedBoundaries = new Set<number>(WEAPON_LEVEL_BOUNDARIES);
    if (supportedBoundaries.has(currentLevel) && supportedBoundaries.has(targetLevel)) {
      for (const row of input.staticData.weaponExpRequirements[rarityLabel]) {
        if (row.startLevel < currentLevel || row.endLevel > targetLevel) {
          continue;
        }

        addBreakdownEntry(breakdown, `Leveling ${row.startLevel} -> ${row.endLevel}`, {
          Mora: row.mora,
          MysticEnhancementOre: row.mysticOre,
          FineEnhancementOre: row.fineOre,
          EnhancementOre: row.enhancementOre,
        });
      }
    } else {
      warnings.push({
        type: "weapon_partial_level_range_requires_curve",
        key: weaponGoal.weaponKey,
        message: `Weapon ${weaponGoal.weaponKey} uses a partial level range (${currentLevel} -> ${targetLevel}) that needs an exact per-level weapon EXP curve. Leveling materials were not approximated.`,
      });
    }
  }

  for (let phase = weapon.currentAscension + 1; phase <= finalTargetAscension; phase += 1) {
    addBreakdownEntry(
      breakdown,
      `Ascension ${phase}`,
      subtractMaterialAmounts(
        getMaterialTotalsForTarget(progression.ascensionTotals, phase),
        getMaterialTotalsForTarget(progression.ascensionTotals, phase - 1),
      ),
    );
  }

  const totals = breakdown.reduce<MaterialTotals>(
    (accumulator, entry) => addMaterialAmounts(accumulator, entry.materialTotals),
    {},
  );

  return { totals, breakdown };
}

export function calculateCharacterPlans(input: PlannerInput): CharacterPlan[] {
  const { ownership, goals, staticData } = input;

  return Object.values(goals.characterGoals)
    .filter((goal) => goal.enabled)
    .map((goal) => {
      const warnings: PlannerWarning[] = [];
      const { totals, breakdown } = buildCharacterMissingTotals(ownership, goal, input, warnings);
      return {
        goalType: "character" as const,
        goalKey: goal.characterKey,
        characterKey: goal.characterKey,
        displayName: getTravelerGoalLabel(goal.characterKey) ?? staticData.characters[goal.characterKey]?.displayName ?? goal.characterKey,
        missingByMaterial: totals,
        breakdown,
        missingSummary: [],
        estimatedResin: 0,
        warnings,
      };
    });
}

export function calculateWeaponPlans(input: PlannerInput): WeaponPlan[] {
  const { ownership, goals, staticData } = input;

  return Object.values(goals.weaponGoals)
    .filter((goal) => goal.enabled)
    .map((goal) => {
      const warnings: PlannerWarning[] = [];
      const { totals: missingByMaterial, breakdown } = buildWeaponMissingTotals(ownership, goal, input, warnings);
      return {
        goalType: "weapon" as const,
        goalKey: getWeaponGoalId(goal, goal.weaponKey),
        weaponId: getWeaponGoalId(goal, goal.weaponKey),
        weaponKey: goal.weaponKey,
        displayName: staticData.weapons[goal.weaponKey]?.displayName ?? goal.weaponKey,
        missingByMaterial,
        breakdown,
        missingSummary: [],
        estimatedResin: 0,
        warnings,
      };
    });
}

export function aggregateNeededMaterials(input: PlannerInput): {
  characterPlans: CharacterPlan[];
  weaponPlans: WeaponPlan[];
  warnings: PlannerWarning[];
} {
  const characterPlans = calculateCharacterPlans(input);
  const weaponPlans = calculateWeaponPlans(input);
  const warnings = [...characterPlans.flatMap((plan) => plan.warnings), ...weaponPlans.flatMap((plan) => plan.warnings)];
  return { characterPlans, weaponPlans, warnings };
}
