import { validateExactRequirements } from "./validateExactRequirements";
import { farmingRequirements } from "./plannerReadiness";
import { isLegacyCompatibilityMaterialKey, resolveInventoryMaterialKey } from "./materialKeyMapping";
import { resolveEffectiveCharacterMetadata } from "./resolveEffectiveCharacterMetadata";
import { isGoalTrackableWeaponRecord, isIgnoredCharacterKey, isPlayableGoalCharacter } from "./targetability";
import {
  isTravelerElementKey,
  isTravelerSharedKey,
  TRAVELER_ELEMENT_KEYS,
  TRAVELER_SHARED_KEY,
} from "./travelerRegistry";
import type {
  CharacterCatalogEntry,
  CharacterElement,
  CharacterMaterialProfile,
  CharacterWeaponType,
  MaterialCategory,
  MaterialRecordCategory,
  MaterialSourceType,
  StaticGameData,
  TieredMaterialFamilyIndexEntry,
  WeaponGoalTrackableRarity,
  WeaponMaterialProfile,
} from "./types";

// Runtime/static-data validation must speak about canonical-backed runtime state.
// Legacy generated bundle comparisons belong in maintenance tooling, not in the
// normal app loader or database UI contract.

export type StaticDataIssueSeverity =
  | "error"
  | "warning"
  | "info";

export type StaticDataIssueCategory =
  | "character_profile"
  | "weapon_profile"
  | "material"
  | "material_record"
  | "material_source"
  | "ley_line_outcrop"
  | "family"
  | "crafting_recipe"
  | "progression"
  | "generated_data"
  | "legacy_compatibility"
  | "override"
  | "repository_hygiene";

export type StaticDataIssuePlannerImpact = "high" | "low" | "none";

export interface StaticDataIssue {
  condition?: { recordType: string; field: string; kind: string; value: unknown };
  evidence?: Array<{ origin: "canonical" | "effective"; code: string; message: string }>;
  id: string;
  severity: StaticDataIssueSeverity;
  category: StaticDataIssueCategory;
  subCategory?: string;
  plannerImpact?: StaticDataIssuePlannerImpact;
  actionGroup?: string;
  recordType?: string;
  entityKey?: string;
  entityName?: string;
  message: string;
  suggestedFix?: string;
  relatedKeys?: string[];
}

export interface StaticDataHealthSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;

  characterCount: number;
  characterProfileCount: number;
  completeCharacterProfileCount: number;
  incompleteCharacterProfileCount: number;

  weaponCount: number;
  weaponProfileCount: number;
  completeWeaponProfileCount: number;
  incompleteWeaponProfileCount: number;

  materialCount: number;
  materialRecordCount: number;
  materialSourceCount: number;
  missingMaterialSourceCount: number;

  craftingRecipeCount: number;
  invalidCraftingRecipeCount: number;
  unresolvedCharacterReferenceCount: number;
  unresolvedWeaponReferenceCount: number;
  unresolvedCharacterMaterialReferenceCount: number;
  generatedBetaMaterialCount: number;
  generatedManualReviewWeaponProfileCount: number;
  generatedCharacterSourceVersion: string;
  generatedWeaponSourceVersion: string;
}

export interface StaticDataHealthReport {
  generatedAt: string;
  summary: StaticDataHealthSummary;
  issues: StaticDataIssue[];
}

const VALID_CHARACTER_WEAPON_TYPES = new Set<CharacterWeaponType>(["Sword", "Polearm", "Claymore", "Bow", "Catalyst"]);
const VALID_CHARACTER_ELEMENTS = new Set<CharacterElement>(["Anemo", "Cryo", "Dendro", "Electro", "Geo", "Hydro", "Pyro"]);
const VALID_WEAPON_TYPES = new Set<CharacterWeaponType>(["Sword", "Claymore", "Polearm", "Bow", "Catalyst"]);
const VALID_WEAPON_RARITIES = new Set<WeaponGoalTrackableRarity>([3, 4, 5]);
const VALID_MATERIAL_CATEGORIES = new Set<MaterialCategory>([
  "mora",
  "character_exp",
  "weapon_exp_material",
  "weapon_fodder_exp",
  "character_ascension",
  "normal_boss_material",
  "talent_book",
  "weapon_ascension",
  "general_enemy_drop",
  "elite_enemy_drop",
  "enemy_drop",
  "weekly_boss",
  "local_specialty",
  "gemstone",
  "artifact_domain",
  "other",
]);
const VALID_MATERIAL_RECORD_CATEGORIES = new Set<MaterialRecordCategory>([
  "ascension_gem",
  "general_enemy_drop",
  "elite_enemy_drop",
  "weapon_ascension_material",
  "weapon_exp_material",
  "weapon_fodder_exp",
  "local_specialty",
  "normal_boss_material",
  "character_talent_material",
  "weekly_boss_material",
  "special_progression_material",
]);
const VALID_MATERIAL_SOURCE_TYPES = new Set<MaterialSourceType>([
  "domain_of_mastery",
  "domain_of_forgery",
  "artifact_domain",
  "normal_boss",
  "weekly_boss",
  "weapon_exp_material",
  "weapon_fodder",
  "forging",
  "world_gathering",
  "ley_line",
  "enemy_drop",
  "local_specialty",
  "alchemy",
  "other",
]);

const MATERIAL_CATEGORIES_REQUIRING_RECORDS = new Set<MaterialCategory>([
  "mora",
  "weapon_exp_material",
  "weapon_fodder_exp",
  "normal_boss_material",
  "talent_book",
  "weapon_ascension",
  "general_enemy_drop",
  "elite_enemy_drop",
  "weekly_boss",
  "local_specialty",
  "gemstone",
]);

const PLANNER_FACING_CATEGORIES = new Set<MaterialCategory>([
  "mora",
  "character_exp",
  "weapon_exp_material",
  "weapon_fodder_exp",
  "normal_boss_material",
  "talent_book",
  "weapon_ascension",
  "general_enemy_drop",
  "elite_enemy_drop",
  "weekly_boss",
  "local_specialty",
  "gemstone",
]);

const LEGACY_GENERATED_SOURCE_VERSION = "maintenance-only";

interface CompletenessCounters {
  completeCharacterProfileCount: number;
  incompleteCharacterProfileCount: number;
  completeWeaponProfileCount: number;
  incompleteWeaponProfileCount: number;
}

function makeIssue(
  severity: StaticDataIssueSeverity,
  category: StaticDataIssueCategory,
  code: string,
  message: string,
  options: {
    condition?: StaticDataIssue["condition"];
    subCategory?: string;
    plannerImpact?: StaticDataIssuePlannerImpact;
    actionGroup?: string;
    recordType?: string;
    entityKey?: string;
    entityName?: string;
    suggestedFix?: string;
    relatedKeys?: string[];
  } = {},
): StaticDataIssue {
  const idParts = [category, code, options.entityKey ?? options.entityName ?? "global"];
  return {
    condition: options.condition,
    evidence: [{ origin: "effective", code, message }],
    id: idParts.join(":").replace(/\s+/g, "_"),
    severity,
    category,
    subCategory: options.subCategory,
    plannerImpact: options.plannerImpact,
    actionGroup: options.actionGroup,
    recordType: options.recordType,
    entityKey: options.entityKey,
    entityName: options.entityName,
    message,
    suggestedFix: options.suggestedFix,
    relatedKeys: options.relatedKeys,
  };
}

function sortIssues(issues: StaticDataIssue[]): StaticDataIssue[] {
  const severityOrder: Record<StaticDataIssueSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };

  return [...issues].sort((left, right) => {
    return (
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.category.localeCompare(right.category) ||
      left.id.localeCompare(right.id)
    );
  });
}

function ensureUniqueIssueIds(issues: StaticDataIssue[]): StaticDataIssue[] {
  const seen = new Map<string, number>();
  return issues.map((issue) => {
    const count = seen.get(issue.id) ?? 0;
    seen.set(issue.id, count + 1);
    if (count === 0) {
      return issue;
    }

    return {
      ...issue,
      id: `${issue.id}#${count + 1}`,
    };
  });
}

function isPlaceholderKey(value: string | null | undefined): boolean {
  if (!value) {
    return true;
  }
  const normalized = value.trim();
  return normalized === "" || normalized === "???" || normalized === "i_n0";
}

function pushIssue(issues: StaticDataIssue[], issue: StaticDataIssue): void {
  issues.push(issue);
}

function getCharacterProfileFields(profile: CharacterMaterialProfile) {
  return {
    displayName: profile.displayName ?? profile.name ?? profile.characterKey,
    weaponType: profile.weaponType,
    rarity: profile.rarity,
    element: profile.element,
    gemFamilyKey: profile.gemFamilyKey ?? profile.elementGemFamilyKey,
    normalBossMaterialKey: profile.normalBossMaterialKey ?? profile.normalBossMaterial,
    commonEnemyMaterialFamilyId: profile.commonEnemyMaterialFamilyId ?? profile.enemyDropFamilyKey,
    localSpecialtyKey: profile.localSpecialtyKey ?? profile.localSpecialty,
    talentBookSeriesKey: profile.talentBookSeriesKey ?? profile.talentBookFamilyKey,
    weeklyBossMaterialKey: profile.weeklyBossMaterialKey ?? profile.weeklyBossMaterial,
    post90ResourceKey: profile.post90ResourceKey,
    status: profile.status ?? "unresolved",
  };
}

function getWeaponProfileFields(profile: WeaponMaterialProfile) {
  return {
    weaponType: profile.weaponType,
    rarity: profile.rarity,
    weaponAscensionFamilyKey: profile.weaponAscensionFamilyKey,
    eliteEnemyDropFamilyId: profile.eliteEnemyDropFamilyId ?? profile.eliteEnemyFamilyKey,
    commonEnemyMaterialFamilyId: profile.commonEnemyFamilyKey,
    goalTrackable: profile.goalTrackable ?? false,
    status: profile.status ?? "unresolved",
  };
}

function severityForProfileStatus(
  status: CharacterMaterialProfile["status"] | WeaponMaterialProfile["status"] | undefined,
  fallback: StaticDataIssueSeverity,
): StaticDataIssueSeverity {
  if (status === "beta") {
    return "info";
  }
  if (status === "needs_manual_review" || status === "unresolved") {
    return "warning";
  }
  return fallback;
}

function validateTravelerModel(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  if (!staticData.travelerProfile || staticData.travelerProfile.baseCharacterKey !== TRAVELER_SHARED_KEY) {
    pushIssue(
      issues,
      makeIssue("error", "character_profile", "traveler_base_missing", "Traveler base shared progression profile is missing.", {
        entityKey: TRAVELER_SHARED_KEY,
      }),
    );
    return;
  }

  if (!staticData.characters[TRAVELER_SHARED_KEY]) {
    pushIssue(
      issues,
      makeIssue("error", "character_profile", "traveler_catalog_missing", "Traveler base character record is missing from the static catalog.", {
        entityKey: TRAVELER_SHARED_KEY,
      }),
    );
  }

  for (const travelerKey of TRAVELER_ELEMENT_KEYS) {
    const entry = staticData.characters[travelerKey];
    const profile = staticData.travelerElementProfiles[travelerKey];
    if (!entry) {
      pushIssue(
        issues,
        makeIssue("error", "character_profile", "traveler_element_catalog_missing", `${travelerKey} is missing from the static character catalog.`, {
          entityKey: travelerKey,
        }),
      );
      continue;
    }
    if (!profile) {
      pushIssue(
        issues,
        makeIssue("error", "character_profile", "traveler_element_profile_missing", `${entry.displayName} is missing its Traveler element profile.`, {
          entityKey: travelerKey,
          entityName: entry.displayName,
        }),
      );
      continue;
    }
    if (!profile.talentBookFamilyKey || !staticData.talentBookFamilies[profile.talentBookFamilyKey]) {
      pushIssue(
        issues,
        makeIssue(
          profile.status === "manual_review" ? "warning" : "error",
          "character_profile",
          "traveler_element_missing_talent_books",
          `${entry.displayName} does not resolve a valid Traveler talent book family.`,
          {
            entityKey: travelerKey,
            entityName: entry.displayName,
            relatedKeys: profile.talentBookFamilyKey ? [profile.talentBookFamilyKey] : [],
          },
        ),
      );
    }
    if (!profile.commonEnemyDropFamilyKey || !staticData.generalEnemyDropFamilies[profile.commonEnemyDropFamilyKey]) {
      pushIssue(
        issues,
        makeIssue(
          profile.status === "manual_review" ? "warning" : "error",
          "character_profile",
          "traveler_element_missing_enemy_family",
          `${entry.displayName} does not resolve a valid Traveler common-enemy family.`,
          {
            entityKey: travelerKey,
            entityName: entry.displayName,
            relatedKeys: profile.commonEnemyDropFamilyKey ? [profile.commonEnemyDropFamilyKey] : [],
          },
        ),
      );
    }
    if (profile.weeklyBossMaterialKey && !staticData.materials[profile.weeklyBossMaterialKey] && !staticData.specialProgressionMaterials[profile.weeklyBossMaterialKey]) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "character_profile",
          "traveler_element_missing_weekly_material",
          `${entry.displayName} references an unknown Traveler talent gate material.`,
          {
            entityKey: travelerKey,
            entityName: entry.displayName,
            relatedKeys: [profile.weeklyBossMaterialKey],
          },
        ),
      );
    }
  }

  if (staticData.characters.traveler_cryo || (staticData as { travelerElementProfiles?: Record<string, unknown> }).travelerElementProfiles?.traveler_cryo) {
    pushIssue(
      issues,
      makeIssue("warning", "character_profile", "traveler_cryo_present_without_verification", "Cryo Traveler is present in static data without explicit verification support.", {
        entityKey: "traveler_cryo",
      }),
    );
  }
}

function validateTravelerCharacterProfile(
  staticData: StaticGameData,
  characterKey: string,
  character: CharacterCatalogEntry,
  issues: StaticDataIssue[],
): boolean {
  if (isTravelerSharedKey(characterKey)) {
    const profile = staticData.characterMaterialProfiles[characterKey];
    if (!profile) {
      pushIssue(
        issues,
        makeIssue("error", "character_profile", "traveler_shared_profile_missing", "Traveler shared level profile is missing.", {
          entityKey: characterKey,
          entityName: character.displayName,
        }),
      );
      return false;
    }

    if (!profile.gemFamilyKey || !staticData.elementGemFamilies[profile.gemFamilyKey]) {
      pushIssue(
        issues,
        makeIssue("error", "character_profile", "traveler_shared_missing_gem_family", "Traveler shared level profile must resolve Brilliant Diamond correctly.", {
          entityKey: characterKey,
          entityName: character.displayName,
        }),
      );
      return false;
    }
    if (!profile.localSpecialtyKey || !staticData.localSpecialties[profile.localSpecialtyKey]) {
      pushIssue(
        issues,
        makeIssue("warning", "character_profile", "traveler_shared_missing_local_specialty", "Traveler shared level profile should resolve Windwheel Aster for ascension planning.", {
          entityKey: characterKey,
          entityName: character.displayName,
        }),
      );
      return false;
    }
    if (!profile.commonEnemyMaterialFamilyId || !staticData.generalEnemyDropFamilies[profile.commonEnemyMaterialFamilyId]) {
      pushIssue(
        issues,
        makeIssue("warning", "character_profile", "traveler_shared_missing_enemy_family", "Traveler shared level profile should resolve the mask enemy-drop family.", {
          entityKey: characterKey,
          entityName: character.displayName,
        }),
      );
      return false;
    }
    return true;
  }

  if (isTravelerElementKey(characterKey)) {
    const profile = staticData.travelerElementProfiles[characterKey];
    if (!profile) {
      pushIssue(
        issues,
        makeIssue("error", "character_profile", "traveler_element_profile_missing", `${character.displayName} is missing its Traveler element profile.`, {
          entityKey: characterKey,
          entityName: character.displayName,
        }),
      );
      return false;
    }

    if (profile.status === "manual_review") {
      pushIssue(
        issues,
        makeIssue("warning", "character_profile", "traveler_element_manual_review", `${character.displayName} still requires Traveler element manual review.`, {
          entityKey: characterKey,
          entityName: character.displayName,
        }),
      );
    }

    return profile.status === "complete" || profile.status === "partial";
  }

  return false;
}

function validateCharacterProfiles(staticData: StaticGameData, issues: StaticDataIssue[]): CompletenessCounters {
  let completeCharacterProfileCount = 0;
  let incompleteCharacterProfileCount = 0;

  validateTravelerModel(staticData, issues);

  for (const [characterKey, character] of Object.entries(staticData.characters)) {
    if (staticData.exactCharacterRequirements?.[characterKey]) { completeCharacterProfileCount++; continue; }
    const effectiveCharacter = resolveEffectiveCharacterMetadata(staticData, characterKey);
    if (isIgnoredCharacterKey(characterKey)) {
      pushIssue(
        issues,
        makeIssue(
          "info",
          "character_profile",
          "ignored_non_playable_character",
          `Character ${effectiveCharacter.displayName || characterKey} is intentionally ignored for progression planning.`,
          {
            entityKey: characterKey,
            entityName: effectiveCharacter.displayName,
            subCategory: "ignored_record",
            plannerImpact: "none",
            actionGroup: "ignored_records",
            recordType: "character",
          },
        ),
      );
      continue;
    }

    if (!isPlayableGoalCharacter(staticData, characterKey)) {
      pushIssue(
        issues,
        makeIssue(
          "info",
          "character_profile",
          "non_goal_playable_character",
          `Character ${effectiveCharacter.displayName || characterKey} is not currently goal-pickable and is excluded from normal progression planning.`,
          {
            entityKey: characterKey,
            entityName: effectiveCharacter.displayName,
            subCategory: "ignored_record",
            plannerImpact: "none",
            actionGroup: "ignored_records",
            recordType: "character",
          },
        ),
      );
      continue;
    }

    if (isTravelerSharedKey(characterKey) || isTravelerElementKey(characterKey)) {
      if (validateTravelerCharacterProfile(staticData, characterKey, character, issues)) {
        completeCharacterProfileCount += 1;
      } else {
        incompleteCharacterProfileCount += 1;
      }
      continue;
    }

    const profile = staticData.characterMaterialProfiles[characterKey];
    if (!profile) {
      incompleteCharacterProfileCount += 1;
      pushIssue(
        issues,
        makeIssue(
          "error",
          "character_profile",
          "missing_profile",
          `Character ${effectiveCharacter.displayName || characterKey} does not have a planner-ready material profile.`,
          {
            entityKey: characterKey,
            entityName: effectiveCharacter.displayName,
            subCategory: "character_material_profile",
            plannerImpact: "high",
            actionGroup: "character_material_profile",
            recordType: "character",
            suggestedFix: "Add or update the canonical character material profile before relying on this character in planning.",
          },
        ),
      );
      continue;
    }

    const fields = getCharacterProfileFields(profile);
    const effectiveWeaponType = effectiveCharacter.weaponType;
    const effectiveRarity = effectiveCharacter.rarity;
    const effectiveElement = effectiveCharacter.element;
    let profileComplete = true;

    if (!fields.displayName) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "character_profile",
          "missing_display_name",
          `Character profile ${characterKey} is missing a display name.`,
          { entityKey: characterKey, entityName: character.displayName },
        ),
      );
    }

    if (!effectiveWeaponType || !VALID_CHARACTER_WEAPON_TYPES.has(effectiveWeaponType)) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "character_profile",
          "invalid_weapon_type",
          `Character ${effectiveCharacter.displayName || characterKey} is missing valid catalog weapon-type metadata.`,
          {
            entityKey: characterKey,
            entityName: effectiveCharacter.displayName,
            suggestedFix: "Add verified catalog metadata for the character weapon type.",
            condition: { recordType: "character", field: "weaponType", kind: effectiveWeaponType == null ? "missing" : "invalid", value: effectiveWeaponType ?? null },
            subCategory: "character_catalog_metadata",
            plannerImpact: "low",
            actionGroup: "character_catalog_metadata",
            recordType: "character",
          },
        ),
      );
    }

    if (effectiveRarity !== 4 && effectiveRarity !== 5) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "character_profile",
          "invalid_rarity",
          `Character ${effectiveCharacter.displayName || characterKey} is missing valid catalog rarity metadata.`,
          {
            entityKey: characterKey,
            entityName: effectiveCharacter.displayName,
            suggestedFix: "Add verified catalog metadata for rarity instead of blocking the material profile.",
            condition: { recordType: "character", field: "rarity", kind: effectiveRarity == null ? "missing" : "invalid", value: effectiveRarity ?? null },
            subCategory: "character_catalog_metadata",
            plannerImpact: "low",
            actionGroup: "character_catalog_metadata",
            recordType: "character",
          },
        ),
      );
    }

    const isTravelerPath = effectiveElement === undefined && characterKey.toLowerCase().includes("traveler");
    if (!effectiveElement || (!VALID_CHARACTER_ELEMENTS.has(effectiveElement) && !isTravelerPath)) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "character_profile",
          "invalid_element",
          `Character ${effectiveCharacter.displayName || characterKey} is missing valid catalog element metadata.`,
          {
            entityKey: characterKey,
            entityName: effectiveCharacter.displayName,
            suggestedFix: "Add verified catalog metadata for element or route the record through an explicit Traveler special-case path.",
            subCategory: "character_catalog_metadata",
            plannerImpact: "low",
            actionGroup: "character_catalog_metadata",
            recordType: "character",
          },
        ),
      );
    }

    if (!fields.gemFamilyKey || !staticData.elementGemFamilies[fields.gemFamilyKey]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "character_profile",
          "missing_gem_family",
          `Character profile ${character.displayName || characterKey} does not resolve a valid elemental gem family.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: fields.gemFamilyKey ? [fields.gemFamilyKey] : [],
          },
        ),
      );
    }

    if (!fields.normalBossMaterialKey || !staticData.normalBossMaterials[fields.normalBossMaterialKey]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "warning"),
          "character_profile",
          "missing_normal_boss_material",
          `Character profile ${character.displayName || characterKey} does not resolve a valid normal boss material.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: fields.normalBossMaterialKey ? [fields.normalBossMaterialKey] : [],
            suggestedFix: "Align the profile with a canonical normal boss material key or mark it manual review.",
          },
        ),
      );
    }

    if (!fields.commonEnemyMaterialFamilyId || !staticData.generalEnemyDropFamilies[fields.commonEnemyMaterialFamilyId]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "character_profile",
          "missing_enemy_family",
          `Character profile ${character.displayName || characterKey} does not resolve a valid common enemy material family.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: fields.commonEnemyMaterialFamilyId ? [fields.commonEnemyMaterialFamilyId] : [],
          },
        ),
      );
    }

    if (!fields.localSpecialtyKey || !staticData.localSpecialties[fields.localSpecialtyKey]) {
      const severity = characterKey.toLowerCase().includes("traveler")
        ? "info"
        : severityForProfileStatus(fields.status, "warning");
      profileComplete = severity === "info" ? profileComplete : false;
      pushIssue(
        issues,
        makeIssue(
          severity,
          "character_profile",
          "missing_local_specialty",
          `Character profile ${character.displayName || characterKey} does not resolve a valid local specialty.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: fields.localSpecialtyKey ? [fields.localSpecialtyKey] : [],
          },
        ),
      );
    }

    if (!fields.talentBookSeriesKey || !staticData.talentBookFamilies[fields.talentBookSeriesKey]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "character_profile",
          "missing_talent_book_family",
          `Character profile ${character.displayName || characterKey} does not resolve a valid talent book family.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: fields.talentBookSeriesKey ? [fields.talentBookSeriesKey] : [],
          },
        ),
      );
    }

    if (!fields.weeklyBossMaterialKey || !staticData.materials[fields.weeklyBossMaterialKey]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "warning"),
          "character_profile",
          "missing_weekly_boss_material",
          `Character profile ${character.displayName || characterKey} does not resolve a valid weekly boss material.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: fields.weeklyBossMaterialKey ? [fields.weeklyBossMaterialKey] : [],
          },
        ),
      );
    }

    if (fields.post90ResourceKey && !staticData.specialProgressionMaterials[fields.post90ResourceKey]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "character_profile",
          "invalid_post90_resource",
          `Character profile ${character.displayName || characterKey} references an unknown post-90 resource.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            relatedKeys: [fields.post90ResourceKey],
          },
        ),
      );
    }

    if (fields.status !== "verified" && profileComplete) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "character_profile",
          "profile_status_lags_resolution",
          `Character profile ${character.displayName || characterKey} looks complete but is still marked ${fields.status}.`,
          {
            entityKey: characterKey,
            entityName: character.displayName,
            suggestedFix: "Review the canonical character profile status and promote it only when the record is planner-safe.",
          },
        ),
      );
    }

    if (profileComplete && fields.status === "verified") {
      completeCharacterProfileCount += 1;
    } else {
      incompleteCharacterProfileCount += 1;
    }
  }

  return {
    completeCharacterProfileCount,
    incompleteCharacterProfileCount,
    completeWeaponProfileCount: 0,
    incompleteWeaponProfileCount: 0,
  };
}

function validateWeaponProfiles(staticData: StaticGameData, issues: StaticDataIssue[]): Pick<CompletenessCounters, "completeWeaponProfileCount" | "incompleteWeaponProfileCount"> {
  let completeWeaponProfileCount = 0;
  let incompleteWeaponProfileCount = 0;

  for (const [weaponKey, weapon] of Object.entries(staticData.weapons)) {
    if (staticData.exactWeaponRequirements?.[weaponKey]) { completeWeaponProfileCount++; continue; }
    const rarity = weapon.rarity;
    if (!rarity) {
      continue;
    }

    const profile = staticData.weaponMaterialProfiles[weaponKey];
    if ((rarity === 1 || rarity === 2) && profile?.goalTrackable) {
      pushIssue(
        issues,
        makeIssue(
          "error",
          "weapon_profile",
          "invalid_goal_trackable_low_rarity_weapon",
          `Weapon ${weapon.displayName || weaponKey} is marked goal-trackable despite rarity ${rarity}.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            suggestedFix: "Restrict goal-trackable weapons to 3-star, 4-star, and 5-star weapons only.",
          },
        ),
      );
    }

    if (!VALID_WEAPON_RARITIES.has(rarity as WeaponGoalTrackableRarity)) {
      continue;
    }

    if (!profile) {
      incompleteWeaponProfileCount += 1;
      pushIssue(
        issues,
        makeIssue(
          "error",
          "weapon_profile",
          "missing_profile",
          `Goal-trackable weapon ${weapon.displayName || weaponKey} does not have a planner-ready weapon profile.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            suggestedFix: "Add a canonical weapon material profile with family-driven ascension and enemy-drop links.",
            subCategory: "weapon_profile",
            plannerImpact: "high",
            actionGroup: "weapon_profile",
            recordType: "weapon",
          },
        ),
      );
      continue;
    }

    if (!isGoalTrackableWeaponRecord(staticData, weaponKey) && !profile.goalTrackable) {
      continue;
    }

    const fields = getWeaponProfileFields(profile);
    let profileComplete = true;

    if (!fields.weaponType || !VALID_WEAPON_TYPES.has(fields.weaponType)) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "weapon_profile",
          "invalid_weapon_type",
          `Weapon profile ${weapon.displayName || weaponKey} has an invalid or missing weapon type.`,
          { entityKey: weaponKey, entityName: weapon.displayName },
        ),
      );
    }

    if (!fields.rarity || !VALID_WEAPON_RARITIES.has(fields.rarity as WeaponGoalTrackableRarity)) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "weapon_profile",
          "invalid_rarity",
          `Weapon profile ${weapon.displayName || weaponKey} has an invalid or missing goal-trackable rarity.`,
          { entityKey: weaponKey, entityName: weapon.displayName },
        ),
      );
    }

    if (!fields.weaponAscensionFamilyKey || !staticData.weaponAscensionMaterialFamilies[fields.weaponAscensionFamilyKey]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "weapon_profile",
          "missing_weapon_family",
          `Weapon profile ${weapon.displayName || weaponKey} does not resolve a valid weapon ascension family.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            relatedKeys: fields.weaponAscensionFamilyKey ? [fields.weaponAscensionFamilyKey] : [],
          },
        ),
      );
    }

    if (!fields.eliteEnemyDropFamilyId || !staticData.eliteEnemyDropFamilies[fields.eliteEnemyDropFamilyId]) {
      const selectedCommonFamily = fields.eliteEnemyDropFamilyId
        ? staticData.generalEnemyDropFamilies[fields.eliteEnemyDropFamilyId]
        : undefined;
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "weapon_profile",
          "missing_elite_enemy_family",
          selectedCommonFamily
            ? `Weapon profile ${weapon.displayName || weaponKey} uses ${fields.eliteEnemyDropFamilyId}, but that key resolves as a common/general enemy drop family instead of an elite enemy drop family.`
            : `Weapon profile ${weapon.displayName || weaponKey} does not resolve a valid elite enemy drop family.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            relatedKeys: fields.eliteEnemyDropFamilyId ? [fields.eliteEnemyDropFamilyId] : [],
            suggestedFix: selectedCommonFamily
              ? "Use an Elite Enemy Drop family key, or add this enemy family as an elite weapon-ascension family in the patch manifest."
              : undefined,
          },
        ),
      );
    }

    if (!fields.commonEnemyMaterialFamilyId || !staticData.generalEnemyDropFamilies[fields.commonEnemyMaterialFamilyId]) {
      profileComplete = false;
      pushIssue(
        issues,
        makeIssue(
          severityForProfileStatus(fields.status, "error"),
          "weapon_profile",
          "missing_common_enemy_family",
          `Weapon profile ${weapon.displayName || weaponKey} does not resolve a valid common enemy drop family.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            relatedKeys: fields.commonEnemyMaterialFamilyId ? [fields.commonEnemyMaterialFamilyId] : [],
          },
        ),
      );
    }

    if (
      profile.goalTrackable &&
      (profile.weaponAscensionMaterialFamily || profile.eliteEnemyFamily || profile.commonEnemyFamily)
    ) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "weapon_profile",
          "stores_exact_tier_materials",
          `Weapon profile ${weapon.displayName || weaponKey} still stores exact tier arrays alongside family keys.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            suggestedFix: "Prefer family keys and derive exact tiers from the shared family registries.",
          },
        ),
      );
    }

    if (fields.status === "needs_manual_review" && profile.goalTrackable) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "weapon_profile",
          "manual_review_goal_trackable",
          `Manual-review weapon ${weapon.displayName || weaponKey} is still marked goal-trackable.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            suggestedFix: "Exclude manual-review weapons from normal planning until their families are verified.",
          },
        ),
      );
    }

    if (fields.status !== "verified" && profileComplete) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "weapon_profile",
          "weapon_profile_status_lags_resolution",
          `Weapon profile ${weapon.displayName || weaponKey} looks complete but is still marked ${fields.status}.`,
          {
            entityKey: weaponKey,
            entityName: weapon.displayName,
            suggestedFix: "Review the canonical weapon profile status and promote it only when the family mappings are verified.",
          },
        ),
      );
    }

    if (profileComplete && fields.status === "verified" && profile.goalTrackable) {
      completeWeaponProfileCount += 1;
    } else {
      incompleteWeaponProfileCount += 1;
    }
  }

  return {
    completeWeaponProfileCount,
    incompleteWeaponProfileCount,
  };
}

function validateMaterials(staticData: StaticGameData, issues: StaticDataIssue[]): { missingMaterialSourceCount: number } {
  let missingMaterialSourceCount = 0;

  for (const [materialKey, material] of Object.entries(staticData.materials)) {
    if (!materialKey.trim()) {
      pushIssue(
        issues,
        makeIssue("error", "material", "empty_key", "A material entry has an empty key.", { entityKey: materialKey }),
      );
    }
    if (!material.displayName?.trim()) {
      pushIssue(
        issues,
        makeIssue("error", "material", "missing_display_name", `Material ${materialKey} is missing a display name.`, {
          entityKey: materialKey,
        }),
      );
    }
    if (!VALID_MATERIAL_CATEGORIES.has(material.category)) {
      pushIssue(
        issues,
        makeIssue("error", "material", "invalid_category", `Material ${materialKey} uses an invalid category ${String(material.category)}.`, {
          entityKey: materialKey,
        }),
      );
    }

    const canonicalKey = resolveInventoryMaterialKey(material.displayName ?? materialKey);
    if (canonicalKey !== materialKey) {
      const legacyCompatibilityKey = isLegacyCompatibilityMaterialKey(materialKey);
      pushIssue(
        issues,
        makeIssue(
          legacyCompatibilityKey ? "info" : "warning",
          legacyCompatibilityKey ? "legacy_compatibility" : "material",
          "noncanonical_key",
          `Material ${material.displayName || materialKey} normalizes to ${canonicalKey}, not ${materialKey}.`,
          {
            entityKey: materialKey,
            entityName: material.displayName,
            relatedKeys: [canonicalKey],
            suggestedFix: legacyCompatibilityKey
              ? "This key is intentionally retained for save/import compatibility and should continue resolving as a legacy alias."
              : "Confirm whether this material key should be canonicalized or intentionally preserved as an alias.",
            subCategory: legacyCompatibilityKey ? "legacy_compatibility" : "material_record",
            plannerImpact: legacyCompatibilityKey ? "none" : "low",
            actionGroup: legacyCompatibilityKey ? "legacy_compatibility" : "material_records",
            recordType: "material",
          },
        ),
      );
    }

    if (MATERIAL_CATEGORIES_REQUIRING_RECORDS.has(material.category) && !staticData.materialRecords[materialKey]) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "material",
          "missing_material_record",
          `Planner-facing material ${material.displayName || materialKey} does not have a canonical material record.`,
          {
            entityKey: materialKey,
            entityName: material.displayName,
          },
        ),
      );
    }

    const sourceRows = staticData.materialSources[materialKey] ?? [];
    if (PLANNER_FACING_CATEGORIES.has(material.category) && sourceRows.length === 0) {
      missingMaterialSourceCount += 1;
      pushIssue(
        issues,
        makeIssue(
          material.category === "weekly_boss" ? "warning" : "warning",
          "material_source",
          "missing_source_rows",
          `Planner-facing material ${material.displayName || materialKey} does not have any material source rows.`,
          {
            entityKey: materialKey,
            entityName: material.displayName,
            suggestedFix: "Add at least one source row or document why this material is intentionally source-less.",
            subCategory: "material_source",
            plannerImpact: "high",
            actionGroup: "material_sources",
            recordType: "material",
          },
        ),
      );
    }
  }

  const displayNameGroups = new Map<string, string[]>();
  for (const record of Object.values(staticData.materialRecords)) {
    const normalized = record.displayName.trim().toLowerCase();
    displayNameGroups.set(normalized, [...(displayNameGroups.get(normalized) ?? []), record.key]);
  }
  for (const [normalizedName, keys] of displayNameGroups) {
    const uniqueKeys = [...new Set(keys)];
    if (normalizedName && uniqueKeys.length > 1) {
      pushIssue(
        issues,
        makeIssue(
          "warning",
          "material_record",
          "duplicate_display_name",
          `Multiple material record keys share the display name ${normalizedName}.`,
          {
            entityKey: uniqueKeys[0],
            relatedKeys: uniqueKeys,
            suggestedFix: "Confirm whether these are intentional aliases or duplicate canonical records.",
          },
        ),
      );
    }
  }

  return { missingMaterialSourceCount };
}

function validateMaterialRecords(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  for (const [recordKey, record] of Object.entries(staticData.materialRecords)) {
    if (!staticData.materials[recordKey]) {
      pushIssue(
        issues,
        makeIssue("error", "material_record", "missing_material_descriptor", `Material record ${recordKey} is missing a matching material descriptor.`, {
          entityKey: recordKey,
          entityName: record.displayName,
        }),
      );
    }
    if (!VALID_MATERIAL_RECORD_CATEGORIES.has(record.category)) {
      pushIssue(
        issues,
        makeIssue("error", "material_record", "invalid_category", `Material record ${recordKey} uses an invalid category ${String(record.category)}.`, {
          entityKey: recordKey,
          entityName: record.displayName,
        }),
      );
    }
    if (!record.displayName?.trim()) {
      pushIssue(
        issues,
        makeIssue("error", "material_record", "missing_display_name", `Material record ${recordKey} is missing a display name.`, {
          entityKey: recordKey,
        }),
      );
    }
    if (!record.source?.type) {
      pushIssue(
        issues,
        makeIssue("error", "material_record", "missing_source", `Material record ${recordKey} is missing canonical source metadata.`, {
          entityKey: recordKey,
          entityName: record.displayName,
        }),
      );
    }
    if (record.category === "weapon_exp_material" || record.category === "weapon_fodder_exp") {
      if (typeof record.expValue !== "number" || record.expValue <= 0) {
        pushIssue(
          issues,
          makeIssue("error", "material_record", "missing_exp_value", `Weapon EXP material record ${recordKey} is missing a valid EXP value.`, {
            entityKey: recordKey,
            entityName: record.displayName,
          }),
        );
      }
    }

    const tierEntry = staticData.tieredMaterialIndex[recordKey];
    if (tierEntry) {
      validateTierEntry(recordKey, tierEntry, issues);
    }
  }
}

function validateTierEntry(materialKey: string, tierEntry: TieredMaterialFamilyIndexEntry, issues: StaticDataIssue[]): void {
  if (tierEntry.tierIndex < 0 || tierEntry.tierIndex > tierEntry.maxTierIndex) {
    pushIssue(
      issues,
      makeIssue("error", "family", "invalid_tier_index", `Tiered material ${materialKey} has an invalid tier index.`, {
        entityKey: materialKey,
        relatedKeys: tierEntry.tierKeys,
      }),
    );
  }
}

function validateMaterialSources(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  for (const [materialKey, sourceRows] of Object.entries(staticData.materialSources)) {
    for (const [index, row] of sourceRows.entries()) {
      if (!staticData.materials[row.materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "material_source", "source_material_missing", `Material source row ${materialKey}[${index}] points to an unknown material key ${row.materialKey}.`, {
            entityKey: materialKey,
            relatedKeys: [row.materialKey],
          }),
        );
      }
      if (!VALID_MATERIAL_SOURCE_TYPES.has(row.sourceType)) {
        pushIssue(
          issues,
          makeIssue("error", "material_source", "invalid_source_type", `Material source row ${materialKey}[${index}] uses an invalid source type ${String(row.sourceType)}.`, {
            entityKey: materialKey,
          }),
        );
      }
      if (!row.sourceKey?.trim() || !row.sourceName?.trim()) {
        pushIssue(
          issues,
          makeIssue("warning", "material_source", "missing_source_identity", `Material source row ${materialKey}[${index}] is missing a source key or name.`, {
            entityKey: materialKey,
          }),
        );
      }
    }
  }
}

function validateLeyLineOutcropLocations(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  const seenKeys = new Set<string>();
  const validFamilyKeys = new Set([
    ...Object.keys(staticData.generalEnemyDropFamilies),
    ...Object.keys(staticData.eliteEnemyDropFamilies),
  ]);

  for (const [locationKey, location] of Object.entries(staticData.leyLineOutcropLocations)) {
    if (seenKeys.has(locationKey)) {
      pushIssue(
        issues,
        makeIssue("error", "ley_line_outcrop", "duplicate_location_key", `Duplicate Ley Line location key ${locationKey}.`, {
          entityKey: locationKey,
        }),
      );
    }
    seenKeys.add(locationKey);

    if (location.locationKey !== locationKey) {
      pushIssue(
        issues,
        makeIssue("error", "ley_line_outcrop", "mismatched_location_key", `Ley Line location ${locationKey} does not match its internal locationKey ${location.locationKey}.`, {
          entityKey: locationKey,
        }),
      );
    }
    if (!location.region?.trim() || !location.areaName?.trim() || location.locationNumber <= 0) {
      pushIssue(
        issues,
        makeIssue("error", "ley_line_outcrop", "invalid_location_metadata", `Ley Line location ${locationKey} is missing region, area name, or a positive location number.`, {
          entityKey: locationKey,
        }),
      );
    }

    for (const [index, spawn] of location.spawns.entries()) {
      if (!Number.isFinite(spawn.count) || spawn.count <= 0) {
        pushIssue(
          issues,
          makeIssue("error", "ley_line_outcrop", "invalid_spawn_count", `Ley Line location ${locationKey} spawn ${index} must have a positive count.`, {
            entityKey: locationKey,
          }),
        );
      }
    }

    for (const [index, spawn] of location.spawns.entries()) {
      if (spawn.dropFamilyKey && validFamilyKeys.has(spawn.dropFamilyKey)) continue;
      pushIssue(issues, makeIssue("warning", "ley_line_outcrop", "unresolved_spawn_mapping", `${locationKey}: Unresolved drop family mapping for ${spawn.enemyName}${spawn.notes?.length ? ` (${spawn.notes.join("; ")})` : ""}.`, {
        entityKey: locationKey,
        condition: { recordType: "ley_line", field: `spawns.${index}.dropFamilyKey`, kind: spawn.dropFamilyKey ? "invalid" : "missing", value: spawn.dropFamilyKey ?? null },
      }));
    }

    for (const coverage of location.derivedDropFamilies) {
      if (!validFamilyKeys.has(coverage.familyKey)) {
        pushIssue(
          issues,
          makeIssue("error", "ley_line_outcrop", "invalid_family_reference", `Ley Line location ${locationKey} references unknown family ${coverage.familyKey}.`, {
            entityKey: locationKey,
            relatedKeys: [coverage.familyKey],
          }),
        );
      }
      for (const materialKey of coverage.materialKeys) {
        if (!staticData.materials[materialKey]) {
          pushIssue(
            issues,
            makeIssue("error", "ley_line_outcrop", "invalid_material_reference", `Ley Line location ${locationKey} references unknown material ${materialKey} under ${coverage.familyKey}.`, {
              entityKey: locationKey,
              relatedKeys: [materialKey, coverage.familyKey],
            }),
          );
        }
      }
      for (const spawn of coverage.guaranteedEnemySpawns) {
        if (!Number.isFinite(spawn.count) || spawn.count <= 0) {
          pushIssue(
            issues,
            makeIssue("error", "ley_line_outcrop", "invalid_guaranteed_spawn", `Ley Line location ${locationKey} has a non-positive guaranteed spawn count for ${spawn.enemyName}.`, {
              entityKey: locationKey,
            }),
          );
        }
      }
    }
  }
}

function validateFamilyMembership(
  familyType: StaticDataIssueCategory,
  membershipMap: Map<string, string[]>,
  issues: StaticDataIssue[],
): void {
  for (const [materialKey, familyKeys] of membershipMap.entries()) {
    const uniqueFamilyKeys = [...new Set(familyKeys)];
    if (uniqueFamilyKeys.length > 1) {
      pushIssue(
        issues,
        makeIssue(
          "error",
          familyType,
          "conflicting_family_membership",
          `Material ${materialKey} is assigned to multiple ${familyType.replace(/_/g, " ")} entries.`,
          {
            entityKey: materialKey,
            relatedKeys: uniqueFamilyKeys,
            suggestedFix: "Ensure every tiered material belongs to exactly one first-class family registry.",
          },
        ),
      );
    }
  }
}

function validateFamilies(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  const gemMembership = new Map<string, string[]>();
  const talentMembership = new Map<string, string[]>();
  const generalMembership = new Map<string, string[]>();
  const eliteMembership = new Map<string, string[]>();
  const weaponMembership = new Map<string, string[]>();

  for (const [familyKey, family] of Object.entries(staticData.elementGemFamilies)) {
    const keys = [family.sliver, family.fragment, family.chunk, family.gemstone];
    if (keys.length !== 4 || keys.some((key) => isPlaceholderKey(key))) {
      pushIssue(
        issues,
        makeIssue("error", "family", "invalid_gem_family", `Element gem family ${familyKey} is missing one or more valid tier keys.`, {
          entityKey: familyKey,
          relatedKeys: keys,
        }),
      );
    }
    for (const materialKey of keys) {
      if (!staticData.materials[materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "family", "unknown_family_material", `Element gem family ${familyKey} references unknown material ${materialKey}.`, {
            entityKey: familyKey,
            relatedKeys: [materialKey],
          }),
        );
      }
      gemMembership.set(materialKey, [...(gemMembership.get(materialKey) ?? []), familyKey]);
    }
  }

  for (const [familyKey, family] of Object.entries(staticData.talentBookFamilies)) {
    const keys = [family.teachings, family.guide, family.philosophies];
    if (keys.some((key) => isPlaceholderKey(key))) {
      pushIssue(
        issues,
        makeIssue("error", "family", "invalid_talent_family", `Talent book family ${familyKey} is missing one or more valid tier keys.`, {
          entityKey: familyKey,
          relatedKeys: keys,
        }),
      );
    }
    if (!family.domainName || !family.availability) {
      pushIssue(
        issues,
        makeIssue("warning", "family", "missing_talent_source_metadata", `Talent book family ${familyKey} is missing domain source metadata.`, {
          entityKey: familyKey,
        }),
      );
    }
    for (const materialKey of keys) {
      if (!staticData.materials[materialKey] || !staticData.materialRecords[materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "family", "unknown_family_material", `Talent book family ${familyKey} references invalid material ${materialKey}.`, {
            entityKey: familyKey,
            relatedKeys: [materialKey],
          }),
        );
      }
      talentMembership.set(materialKey, [...(talentMembership.get(materialKey) ?? []), familyKey]);
    }
  }

  for (const [familyKey, family] of Object.entries(staticData.generalEnemyDropFamilies)) {
    for (const materialKey of family.materialKeys) {
      if (!staticData.materials[materialKey] || !staticData.materialRecords[materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "family", "unknown_family_material", `General enemy family ${familyKey} references invalid material ${materialKey}.`, {
            entityKey: familyKey,
            relatedKeys: [materialKey],
          }),
        );
      }
      generalMembership.set(materialKey, [...(generalMembership.get(materialKey) ?? []), familyKey]);
    }
  }

  for (const [familyKey, family] of Object.entries(staticData.eliteEnemyDropFamilies)) {
    for (const materialKey of family.materialKeys) {
      if (!staticData.materials[materialKey] || !staticData.materialRecords[materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "family", "unknown_family_material", `Elite enemy family ${familyKey} references invalid material ${materialKey}.`, {
            entityKey: familyKey,
            relatedKeys: [materialKey],
          }),
        );
      }
      eliteMembership.set(materialKey, [...(eliteMembership.get(materialKey) ?? []), familyKey]);
    }
  }

  for (const [familyKey, family] of Object.entries(staticData.weaponAscensionMaterialFamilies)) {
    const keys = [family.tiers.twoStar, family.tiers.threeStar, family.tiers.fourStar, family.tiers.fiveStar];
    if (keys.some((key) => isPlaceholderKey(key))) {
      pushIssue(
        issues,
        makeIssue("error", "family", "invalid_weapon_ascension_family", `Weapon ascension family ${familyKey} is missing one or more valid tier keys.`, {
          entityKey: familyKey,
          relatedKeys: keys,
        }),
      );
    }
    if (!family.source.domainName) {
      pushIssue(
        issues,
        makeIssue("warning", "family", "missing_weapon_family_source_metadata", `Weapon ascension family ${familyKey} is missing domain/day metadata.`, {
          entityKey: familyKey,
          subCategory: "family_source_metadata",
          plannerImpact: "high",
          actionGroup: "family_source_metadata",
          recordType: "weapon_ascension_family",
        }),
      );
    } else if (!(family.source.availableDays?.length ?? 0)) {
      pushIssue(
        issues,
        makeIssue("info", "family", "missing_weapon_family_day_schedule", `Weapon ascension family ${familyKey} has a verified domain mapping but still needs day-schedule review.`, {
          entityKey: familyKey,
          subCategory: "family_source_metadata",
          plannerImpact: "low",
          actionGroup: "manual_review",
          recordType: "weapon_ascension_family",
        }),
      );
    }
    for (const materialKey of keys) {
      if (!staticData.materials[materialKey] || !staticData.materialRecords[materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "family", "unknown_family_material", `Weapon ascension family ${familyKey} references invalid material ${materialKey}.`, {
            entityKey: familyKey,
            relatedKeys: [materialKey],
          }),
        );
      }
      weaponMembership.set(materialKey, [...(weaponMembership.get(materialKey) ?? []), familyKey]);
    }
  }

  for (const [specialtyKey, specialty] of Object.entries(staticData.localSpecialties)) {
    if (!staticData.materials[specialtyKey] || !staticData.materialRecords[specialtyKey]) {
      pushIssue(
        issues,
        makeIssue("error", "family", "invalid_local_specialty", `Local specialty ${specialty.displayName} does not resolve to a canonical material and record.`, {
          entityKey: specialtyKey,
        }),
      );
    }
  }

  for (const [bossKey, bossMaterial] of Object.entries(staticData.normalBossMaterials)) {
    if (!staticData.materials[bossKey] || !staticData.materialRecords[bossKey]) {
      pushIssue(
        issues,
        makeIssue("error", "family", "invalid_normal_boss_material", `Normal boss material ${bossMaterial.displayName} does not resolve to a canonical material and record.`, {
          entityKey: bossKey,
        }),
      );
    }
  }

  for (const [bossKey, material] of Object.entries(staticData.weeklyBossMaterials)) {
    if (!staticData.materials[bossKey] || !staticData.materialRecords[bossKey]) {
      pushIssue(
        issues,
        makeIssue("warning", "family", "invalid_weekly_boss_material", `Weekly boss material ${material.displayName} does not resolve to a canonical material and record.`, {
          entityKey: bossKey,
        }),
      );
    }
  }

  validateFamilyMembership("family", gemMembership, issues);
  validateFamilyMembership("family", talentMembership, issues);
  validateFamilyMembership("family", generalMembership, issues);
  validateFamilyMembership("family", eliteMembership, issues);
  validateFamilyMembership("family", weaponMembership, issues);
}

function validateRecipeRegistry(
  registryKey: "recipes" | "craftingRecipes",
  recipes: StaticGameData["recipes"],
  staticData: StaticGameData,
  issues: StaticDataIssue[],
): void {
  for (const [recipeKey, recipe] of Object.entries(recipes)) {
    const outputKey = recipe.outputMaterialKey || recipe.outputKey;
    if (!outputKey || !staticData.materials[outputKey]) {
      pushIssue(
        issues,
        makeIssue("error", "crafting_recipe", "unknown_output", `Recipe ${registryKey}.${recipeKey} points to an unknown output material.`, {
          entityKey: recipeKey,
          relatedKeys: outputKey ? [outputKey] : [],
        }),
      );
      continue;
    }

    if (recipe.outputKey && recipe.outputMaterialKey && recipe.outputKey !== recipe.outputMaterialKey) {
      pushIssue(
        issues,
        makeIssue("warning", "crafting_recipe", "mismatched_output_keys", `Recipe ${registryKey}.${recipeKey} has mismatched outputKey and outputMaterialKey values.`, {
          entityKey: recipeKey,
          relatedKeys: [recipe.outputKey, recipe.outputMaterialKey],
        }),
      );
    }
    if (!recipe.outputQuantity || recipe.outputQuantity <= 0) {
      pushIssue(
        issues,
        makeIssue("error", "crafting_recipe", "invalid_output_quantity", `Recipe ${registryKey}.${recipeKey} has an invalid output quantity.`, {
          entityKey: recipeKey,
        }),
      );
    }
    if ((recipe.moraCost ?? 0) < 0) {
      pushIssue(
        issues,
        makeIssue("error", "crafting_recipe", "negative_mora_cost", `Recipe ${registryKey}.${recipeKey} has a negative Mora cost.`, {
          entityKey: recipeKey,
        }),
      );
    }

    for (const [ingredientKey, quantity] of Object.entries(recipe.ingredients ?? {})) {
      if (!staticData.materials[ingredientKey]) {
        pushIssue(
          issues,
          makeIssue("error", "crafting_recipe", "unknown_ingredient", `Recipe ${registryKey}.${recipeKey} references unknown ingredient ${ingredientKey}.`, {
            entityKey: recipeKey,
            relatedKeys: [ingredientKey],
          }),
        );
      }
      if (typeof quantity !== "number" || quantity <= 0) {
        pushIssue(
          issues,
          makeIssue("error", "crafting_recipe", "invalid_ingredient_quantity", `Recipe ${registryKey}.${recipeKey} uses an invalid quantity for ingredient ${ingredientKey}.`, {
            entityKey: recipeKey,
            relatedKeys: [ingredientKey],
          }),
        );
      }
    }

    for (const input of recipe.inputMaterials ?? []) {
      if (!staticData.materials[input.materialKey]) {
        pushIssue(
          issues,
          makeIssue("error", "crafting_recipe", "unknown_input_material", `Recipe ${registryKey}.${recipeKey} references unknown input material ${input.materialKey}.`, {
            entityKey: recipeKey,
            relatedKeys: [input.materialKey],
          }),
        );
      }
      if (input.quantity <= 0) {
        pushIssue(
          issues,
          makeIssue("error", "crafting_recipe", "invalid_input_quantity", `Recipe ${registryKey}.${recipeKey} references non-positive input quantity for ${input.materialKey}.`, {
            entityKey: recipeKey,
            relatedKeys: [input.materialKey],
          }),
        );
      }
    }

    if (recipe.category) {
      const outputCategory = staticData.materials[outputKey]?.category;
      const categoryMatches =
        (recipe.category === "talent_level_up_material" && outputCategory === "talent_book") ||
        (recipe.category === "weapon_ascension_material" && outputCategory === "weapon_ascension") ||
        (recipe.category === "character_weapon_enhancement_material" &&
          (outputCategory === "general_enemy_drop" || outputCategory === "elite_enemy_drop")) ||
        (recipe.category === "character_ascension_gem" && outputCategory === "gemstone") ||
        recipe.category === "potion" ||
        recipe.category === "gadget";

      if (!categoryMatches) {
        pushIssue(
          issues,
          makeIssue("warning", "crafting_recipe", "category_mismatch", `Recipe ${registryKey}.${recipeKey} category does not match output material category ${String(outputCategory)}.`, {
            entityKey: recipeKey,
            relatedKeys: [outputKey],
          }),
        );
      }
    }

    if (recipe.isTierUpgrade && staticData.tieredMaterialIndex[outputKey] == null) {
      pushIssue(
        issues,
        makeIssue("warning", "crafting_recipe", "tier_recipe_without_family", `Tier-up recipe ${registryKey}.${recipeKey} does not align with the tiered material index.`, {
          entityKey: recipeKey,
          relatedKeys: [outputKey],
        }),
      );
    }
  }
}

function validateWeaponExpSourceModel(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  const requiredOres = ["EnhancementOre", "FineEnhancementOre", "MysticEnhancementOre"] as const;
  for (const oreKey of requiredOres) {
    const material = staticData.weaponExpMaterials[oreKey];
    if (!material || material.category !== "weapon_exp_material" || !material.expValue) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_weapon_exp_ore", `${oreKey} must exist as a valid weapon EXP material.`, {
          entityKey: oreKey,
        }),
      );
    }
  }

  for (const crystalKey of ["CrystalChunk", "RainbowdropCrystal", "CondessenceCrystal"] as const) {
    if (!staticData.materials[crystalKey]) {
      pushIssue(
        issues,
        makeIssue("warning", "material", "missing_weapon_exp_crystal_material", `${crystalKey} is missing from the canonical material registry.`, {
          entityKey: crystalKey,
        }),
      );
      continue;
    }
    const sources = staticData.materialSources[crystalKey] ?? [];
    if (!sources.some((source) => source.sourceType === "world_gathering" && source.respawnDays === 3)) {
      pushIssue(
        issues,
        makeIssue("warning", "material_source", "missing_ore_respawn_metadata", `${crystalKey} should expose a non-resin world-gathering source with a 3-day respawn note.`, {
          entityKey: crystalKey,
        }),
      );
    }
  }

  const mysticSources = staticData.materialSources.MysticEnhancementOre ?? [];
  const forgeSources = mysticSources.filter((source) => source.sourceType === "forging");
  for (const crystalKey of ["CrystalChunk", "RainbowdropCrystal", "CondessenceCrystal"] as const) {
    if (!forgeSources.some((source) => source.inputMaterialKey === crystalKey && source.inputQuantity === 40 && source.outputQuantity === 10 && source.dailyOutputCap === 40)) {
      pushIssue(
        issues,
        makeIssue("warning", "material_source", "missing_mystic_forging_recipe", `Mystic Enhancement Ore should expose a 40 ${crystalKey} -> 10 Mystic Enhancement Ore forging source with a 40-daily cap.`, {
          entityKey: "MysticEnhancementOre",
          relatedKeys: [crystalKey],
        }),
      );
    }
  }
}

function validateProgression(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  const ascensionCosts = staticData.universalCharacterProgressionCore.ascensionCosts ?? [];
  const ascensionTargets = new Set(ascensionCosts.map((row) => row.toPhase));
  for (const phase of [1, 2, 3, 4, 5, 6] as const) {
    if (!ascensionTargets.has(phase)) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_character_ascension_phase", `Universal character progression is missing ascension phase ${phase}.`, {
          entityKey: String(phase),
        }),
      );
    }
  }

  const talentUpgrades = staticData.universalTalentProgressionCore.upgradeCosts ?? [];
  const talentEdges = new Set(talentUpgrades.map((row) => `${row.fromLevel}-${row.toLevel}`));
  for (const pair of ["1-2", "2-3", "3-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10"]) {
    if (!talentEdges.has(pair)) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_talent_upgrade", `Universal talent progression is missing upgrade row ${pair}.`, {
          entityKey: pair,
        }),
      );
    }
  }

  for (const rarity of ["3-Star", "4-Star", "5-Star"] as const) {
    const costs = staticData.weaponAscensionCosts[rarity];
    const requirements = staticData.weaponExpRequirements[rarity];
    if (!costs || !["1", "2", "3", "4", "5", "6"].every((phase) => phase in costs)) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_weapon_ascension_costs", `Weapon ascension costs are incomplete for rarity ${rarity}.`, {
          entityKey: rarity,
        }),
      );
    }
    if (!requirements || requirements.length < 7) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_weapon_exp_ranges", `Weapon EXP requirements are incomplete for rarity ${rarity}.`, {
          entityKey: rarity,
        }),
      );
    }
  }

  for (const [materialKey, material] of Object.entries(staticData.weaponExpMaterials)) {
    if (!material.expValue || material.expValue <= 0) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_weapon_exp_value", `Weapon EXP material ${material.displayName} is missing a valid EXP value.`, {
          entityKey: materialKey,
        }),
      );
    }
  }

  if ((staticData.universalCharacterProgressionCore.post90LevelCapExtensionCosts ?? []).length === 0) {
    pushIssue(
      issues,
      makeIssue("warning", "progression", "missing_post90_extension_table", "Post-90 character extension costs are not loaded.", {
        entityKey: "post90",
      }),
    );
  }

  validateWeaponExpSourceModel(staticData, issues);
}

function validateGuaranteedPlannerRewards(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  for (const [worldLevel, reward] of Object.entries(staticData.leyLineRewardsByWorldLevel)) {
    if (!Number.isFinite(reward.revelation.minimumCharacterExp) || reward.revelation.minimumCharacterExp <= 0) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_revelation_minimum", `World Level ${worldLevel} is missing minimum guaranteed Character EXP.`, {
          entityKey: worldLevel,
          plannerImpact: "high",
        }),
      );
    }
    if (reward.revelation.minimumCharacterExp > reward.revelation.averageCharacterExp) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "revelation_minimum_exceeds_average", `World Level ${worldLevel} minimum Character EXP exceeds its average.`, {
          entityKey: worldLevel,
          plannerImpact: "high",
        }),
      );
    }
  }

  const domainModels = [
    ...Object.values(staticData.talentBookDomainDropModel),
    ...Object.values(staticData.weaponAscensionDomainDropModel),
  ];
  for (const model of domainModels) {
    if (!Number.isInteger(model.guaranteed.lowerTierEquivalent) || model.guaranteed.lowerTierEquivalent <= 0) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_domain_guaranteed_floor", `Domain level ${model.domainLevel} is missing a valid guaranteed equivalent reward.`, {
          entityKey: model.domainLevel,
          plannerImpact: "high",
        }),
      );
    }
  }

  for (const [worldLevel, record] of Object.entries(staticData.normalBossUniqueMaterialDropMeanByWorldLevel)) {
    if (!Number.isInteger(record.guaranteedUniqueDrops) || record.guaranteedUniqueDrops <= 0) {
      pushIssue(
        issues,
        makeIssue("error", "progression", "missing_normal_boss_floor", `World Level ${worldLevel} is missing guaranteed unique boss-material drops.`, {
          entityKey: worldLevel,
          plannerImpact: "high",
        }),
      );
    }
    if (record.guaranteedUniqueDrops > record.dropMean) {
      pushIssue(
        issues,
        makeIssue("warning", "progression", "normal_boss_floor_exceeds_mean", `World Level ${worldLevel} guaranteed boss floor exceeds its recorded mean.`, {
          entityKey: worldLevel,
          plannerImpact: "high",
        }),
      );
    }
  }
}

function validateUnresolvedReferences(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  for (const unresolved of staticData.unresolvedCharacterMaterialReferences) {
    if (isTravelerSharedKey(unresolved.characterKey)) {
      pushIssue(
        issues,
        makeIssue(
          "info",
          "character_profile",
          "traveler_special_case_reference",
          "Traveler shared progression keeps special-case reference rows for diagnostics only.",
          {
            entityKey: unresolved.characterKey,
            entityName: unresolved.displayName,
            subCategory: "traveler_special_case",
            plannerImpact: "none",
            actionGroup: "manual_review",
            recordType: "character",
          },
        ),
      );
      continue;
    }
    pushIssue(
      issues,
      makeIssue(
        unresolved.status === "needs_manual_review" ? "info" : "warning",
        "character_profile",
        "unresolved_character_material_reference",
        `${unresolved.displayName} still has an unresolved ${unresolved.materialSlot} reference (${unresolved.rawName || "empty"}).`,
        {
          entityKey: `${unresolved.characterKey}:${unresolved.materialSlot}`,
          entityName: unresolved.displayName,
          relatedKeys: unresolved.generatedKey ? [unresolved.generatedKey] : [],
          suggestedFix: unresolved.reason,
        },
      ),
    );
  }

  for (const unresolved of staticData.unresolvedCharacterReferences) {
    pushIssue(
      issues,
      makeIssue(
        "warning",
        "family",
        "unresolved_character_reference",
        `Derived family references still point to unknown character ${unresolved.displayName}.`,
        {
          entityKey: unresolved.generatedKey,
          entityName: unresolved.displayName,
          relatedKeys: [unresolved.familyId],
        },
      ),
    );
  }

  for (const unresolved of staticData.unresolvedWeaponReferences) {
    pushIssue(
      issues,
      makeIssue(
        "warning",
        "family",
        "unresolved_weapon_reference",
        `Derived family references still point to unknown weapon ${unresolved.weaponName}.`,
        {
          entityKey: unresolved.generatedKey,
          entityName: unresolved.weaponName,
          relatedKeys: [unresolved.familyId],
        },
      ),
    );
  }
}

function validateLegacyAndOverrides(staticData: StaticGameData, issues: StaticDataIssue[]): void {
  if (Object.keys(staticData.legacyCharacterProgressions).length > 0) {
    pushIssue(
      issues,
      makeIssue(
        "info",
        "legacy_compatibility",
        "legacy_character_progressions_loaded",
        `Legacy exact character progression tables remain loaded as compatibility data (${Object.keys(staticData.legacyCharacterProgressions).length} entries).`,
        {
          entityKey: "legacyCharacterProgressions",
          suggestedFix: "Keep these until profile-first universal progression fully covers all required character cases.",
        },
      ),
    );
  }
  if (Object.keys(staticData.legacyWeaponProgressions).length > 0) {
    pushIssue(
      issues,
      makeIssue(
        "info",
        "legacy_compatibility",
        "legacy_weapon_progressions_loaded",
        `Legacy exact weapon progression tables remain loaded as compatibility data (${Object.keys(staticData.legacyWeaponProgressions).length} entries).`,
        {
          entityKey: "legacyWeaponProgressions",
          suggestedFix: "Keep these until the rarity/family-driven weapon progression path no longer needs exact fallbacks.",
        },
      ),
    );
  }
  if (staticData.appliedOverrideKeys.length > 0) {
    for (const overrideKey of staticData.appliedOverrideKeys) {
      pushIssue(
        issues,
        makeIssue(
          "info",
          "override",
          "override_applied",
          `Override data is currently active for ${overrideKey}.`,
          { entityKey: overrideKey },
        ),
      );
    }
  }
}

export function buildStaticDataHealthSummary(
  staticData: StaticGameData,
  issues: StaticDataIssue[],
  counts: CompletenessCounters & { missingMaterialSourceCount: number },
): StaticDataHealthSummary {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;
  const invalidCraftingRecipeCount = issues.filter((issue) => issue.category === "crafting_recipe" && issue.severity === "error").length;

  return {
    totalIssues: issues.length,
    errorCount,
    warningCount,
    infoCount,
    characterCount: Object.keys(staticData.characters).length,
    characterProfileCount: Object.keys(staticData.characterMaterialProfiles).length,
    completeCharacterProfileCount: counts.completeCharacterProfileCount,
    incompleteCharacterProfileCount: counts.incompleteCharacterProfileCount,
    weaponCount: Object.keys(staticData.weapons).length,
    weaponProfileCount: Object.keys(staticData.weaponMaterialProfiles).length,
    completeWeaponProfileCount: counts.completeWeaponProfileCount,
    incompleteWeaponProfileCount: counts.incompleteWeaponProfileCount,
    materialCount: Object.keys(staticData.materials).length,
    materialRecordCount: Object.keys(staticData.materialRecords).length,
    materialSourceCount: Object.values(staticData.materialSources).reduce((sum, rows) => sum + rows.length, 0),
    missingMaterialSourceCount: counts.missingMaterialSourceCount,
    craftingRecipeCount: Object.keys(staticData.craftingRecipes).length,
    invalidCraftingRecipeCount,
    unresolvedCharacterReferenceCount: staticData.unresolvedCharacterReferences.length,
    unresolvedWeaponReferenceCount: staticData.unresolvedWeaponReferences.length,
    unresolvedCharacterMaterialReferenceCount: staticData.unresolvedCharacterMaterialReferences.length,
    generatedBetaMaterialCount: 0,
    generatedManualReviewWeaponProfileCount: 0,
    generatedCharacterSourceVersion: LEGACY_GENERATED_SOURCE_VERSION,
    generatedWeaponSourceVersion: LEGACY_GENERATED_SOURCE_VERSION,
  };
}

export function mergeHealthEvidence(issues: StaticDataIssue[]): StaticDataIssue[] {
  const result: StaticDataIssue[] = [];
  const seen = new Map<string, StaticDataIssue>();
  for (const issue of issues) {
    const signature = issue.condition ? JSON.stringify([issue.entityKey, issue.severity, issue.condition]) : undefined;
    const previous = signature ? seen.get(signature) : undefined;
    if (previous) previous.evidence = [...(previous.evidence ?? []), ...(issue.evidence ?? [])];
    else { const copy = { ...issue }; result.push(copy); if (signature) seen.set(signature, copy); }
  }
  return result;
}

export function extendStaticDataHealthReport(
  report: StaticDataHealthReport,
  staticData: StaticGameData,
  extraIssues: StaticDataIssue[],
): StaticDataHealthReport {
  const issues = ensureUniqueIssueIds(sortIssues(mergeHealthEvidence([...report.issues, ...extraIssues])));
  const counts = {
    completeCharacterProfileCount: report.summary.completeCharacterProfileCount,
    incompleteCharacterProfileCount: report.summary.incompleteCharacterProfileCount,
    completeWeaponProfileCount: report.summary.completeWeaponProfileCount,
    incompleteWeaponProfileCount: report.summary.incompleteWeaponProfileCount,
    missingMaterialSourceCount: report.summary.missingMaterialSourceCount,
  };

  return {
    generatedAt: new Date().toISOString(),
    summary: buildStaticDataHealthSummary(staticData, issues, counts),
    issues,
  };
}

export function formatStaticDataHealthMarkdown(report: StaticDataHealthReport): string {
  const blockingErrors = report.issues.filter((issue) => issue.severity === "error");
  const warningsByCategory = new Map<StaticDataIssueCategory, StaticDataIssue[]>();
  for (const issue of report.issues.filter((entry) => entry.severity === "warning")) {
    warningsByCategory.set(issue.category, [...(warningsByCategory.get(issue.category) ?? []), issue]);
  }

  const prioritizedFixes = [
    {
      id: "resolve_character_profile_gaps",
      label: "Resolve canonical character profile gaps and unresolved material references.",
      active: report.issues.some((issue) => issue.category === "character_profile"),
    },
    {
      id: "resolve_weapon_profile_gaps",
      label: "Resolve goal-trackable weapon profile gaps and verify any manual-review weapon exclusions.",
      active: report.issues.some((issue) => issue.category === "weapon_profile"),
    },
    {
      id: "patch_material_sources",
      label: "Add or normalize source metadata for planner-facing materials that still lack source rows.",
      active: report.issues.some((issue) => issue.id.includes("missing_source_rows") || issue.category === "material_source"),
    },
    {
      id: "clean_crafting_registry",
      label: "Repair invalid crafting recipes and ensure tier-up recipes line up with the tiered material index.",
      active: report.issues.some((issue) => issue.category === "crafting_recipe"),
    },
    {
      id: "review_legacy_fallbacks",
      label: "Reassess legacy compatibility tables and document whether they remain necessary fallbacks.",
      active: report.issues.some((issue) => issue.category === "legacy_compatibility"),
    },
    {
      id: "repository_hygiene",
      label: "Clean repository hygiene findings such as generated build output, node_modules, or missing ignore rules.",
      active: report.issues.some((issue) => issue.category === "repository_hygiene"),
    },
  ].filter((item) => item.active).slice(0, 5);

  const warningSections = [...warningsByCategory.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, issues]) => {
      const conditions = new Map<string, StaticDataIssue[]>();
      for (const issue of issues) { const condition = issue.id.split(":")[1]; conditions.set(condition, [...conditions.get(condition) ?? [], issue]); }
      const rows = [...conditions.entries()].map(([condition, entries]) => `<details><summary>${condition}: ${entries.length} finding(s)</summary>\n\n${entries.map(issue => `- \`${issue.id}\` ${issue.message}`).join("\n")}\n\n</details>`).join("\n\n");
      return `### ${category}\n${rows}`;
    })
    .join("\n\n");

  const blockingErrorSection = blockingErrors.length
    ? blockingErrors.map((issue) => `- \`${issue.id}\` ${issue.message}`).join("\n")
    : "- None";

  const fixQueueSection = prioritizedFixes.length
    ? prioritizedFixes.map((item, index) => `${index + 1}. ${item.label}`).join("\n")
    : "1. No prioritized cleanup tasks were generated from the current issue set.";

  const issueIdSection = report.issues.length
    ? report.issues.map((issue) => `- \`${issue.id}\``).join("\n")
    : "- None";

  return [
    "# Static Data Health Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    `- Characters: catalog ${report.summary.characterCount}, profiles ${report.summary.characterProfileCount}, complete ${report.summary.completeCharacterProfileCount}, incomplete ${report.summary.incompleteCharacterProfileCount}`,
    `- Weapons: catalog ${report.summary.weaponCount}, profiles ${report.summary.weaponProfileCount}, complete ${report.summary.completeWeaponProfileCount}, incomplete ${report.summary.incompleteWeaponProfileCount}`,
    `- Materials: descriptors ${report.summary.materialCount}, material records ${report.summary.materialRecordCount}, source rows ${report.summary.materialSourceCount}, missing sources ${report.summary.missingMaterialSourceCount}`,
    `- Families: gem validated, talent ${report.summary.materialRecordCount > 0 ? "validated" : "unknown"}, general enemy validated, elite enemy validated, weapon ascension validated`,
    `- Crafting: recipes ${report.summary.craftingRecipeCount}, invalid recipe errors ${report.summary.invalidCraftingRecipeCount}`,
    `- Runtime unresolved references: character material refs ${report.summary.unresolvedCharacterMaterialReferenceCount}, character refs ${report.summary.unresolvedCharacterReferenceCount}, weapon refs ${report.summary.unresolvedWeaponReferenceCount}`,
    `- Legacy generated bundles: ${report.summary.generatedCharacterSourceVersion}`,
    `- Issue counts: errors ${report.summary.errorCount}, warnings ${report.summary.warningCount}, info ${report.summary.infoCount}`,
    "",
    "## Blocking Errors",
    blockingErrorSection,
    "",
    "## Warnings",
    warningSections || "- None",
    "",
    "## Suggested Fix Queue",
    fixQueueSection,
    "",
    "## Machine-Readable Issue IDs",
    issueIdSection,
  ].join("\n");
}

export function validateStaticData(staticData: StaticGameData): StaticDataHealthReport {
  const issues: StaticDataIssue[] = [];
  try { validateExactRequirements(staticData); } catch (error) {
    issues.push(makeIssue("error", "progression", "invalid_exact_requirements", String(error)));
  }
  for (const requirement of farmingRequirements(staticData)) issues.push(makeIssue("warning", "material_source", "farming_setup_required", `${staticData.materials[requirement.materialKey]?.displayName ?? requirement.materialKey}: ${requirement.fields.join(", ")}`, { entityKey: requirement.materialKey, relatedKeys: requirement.affectedKeys, suggestedFix: "Complete Farming Setup in Database.", plannerImpact: "high", actionGroup: "farming_setup" }));

  const characterCounts = validateCharacterProfiles(staticData, issues);
  const weaponCounts = validateWeaponProfiles(staticData, issues);
  const materialCounts = validateMaterials(staticData, issues);
  validateMaterialRecords(staticData, issues);
  validateMaterialSources(staticData, issues);
  validateLeyLineOutcropLocations(staticData, issues);
  validateFamilies(staticData, issues);
  validateRecipeRegistry("recipes", staticData.recipes, staticData, issues);
  validateRecipeRegistry("craftingRecipes", staticData.craftingRecipes, staticData, issues);
  validateProgression(staticData, issues);
  validateGuaranteedPlannerRewards(staticData, issues);
  validateUnresolvedReferences(staticData, issues);
  validateLegacyAndOverrides(staticData, issues);

  const sortedIssues = ensureUniqueIssueIds(sortIssues(issues));
  return {
    generatedAt: new Date().toISOString(),
    summary: buildStaticDataHealthSummary(staticData, sortedIssues, {
      ...characterCounts,
      ...weaponCounts,
      missingMaterialSourceCount: materialCounts.missingMaterialSourceCount,
    }),
    issues: sortedIssues,
  };
}
