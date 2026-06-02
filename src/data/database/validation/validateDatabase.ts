import { canonicalDatabase } from "../index";
import type { CanonicalDatabase } from "../schema";
import {
  CANONICAL_CHARACTER_STATUSES,
  CANONICAL_RELEASE_STATES,
  REQUIRED_CANONICAL_MATERIAL_KEYS,
  REQUIRED_CHARACTER_FIXES,
  VALID_CHARACTER_ELEMENTS,
  VALID_CHARACTER_WEAPON_TYPES,
  VALID_WEAPON_ACQUISITION_TYPES,
  VALID_WEAPON_REFINEMENT_POLICIES,
  VALID_WEAPON_RARITIES,
} from "./databaseValidationRules";

export interface DatabaseValidationIssue {
  severity: "error" | "warning";
  category:
    | "character"
    | "traveler"
    | "weapon"
    | "material"
    | "family"
    | "source"
    | "progression";
  key: string;
  message: string;
}

export interface DatabaseValidationReport {
  issues: DatabaseValidationIssue[];
  errorCount: number;
  warningCount: number;
}

function issue(
  severity: "error" | "warning",
  category: DatabaseValidationIssue["category"],
  key: string,
  message: string,
): DatabaseValidationIssue {
  return { severity, category, key, message };
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

function collectDuplicateDisplayNames(records: Record<string, { displayName?: string }>): Map<string, string[]> {
  const buckets = new Map<string, string[]>();
  for (const [key, record] of Object.entries(records)) {
    const displayName = record.displayName;
    if (!displayName) {
      continue;
    }
    const list = buckets.get(displayName) ?? [];
    list.push(key);
    buckets.set(displayName, list);
  }
  return new Map([...buckets.entries()].filter(([, keys]) => keys.length > 1));
}

function validateCharacters(database: CanonicalDatabase, issues: DatabaseValidationIssue[]): void {
  const duplicateNames = collectDuplicateDisplayNames(database.characters.characterProfiles);
  for (const [displayName, keys] of duplicateNames) {
    issues.push(issue("warning", "character", displayName, `Duplicate character display name used by ${keys.join(", ")}.`));
  }

  for (const [characterKey, profile] of Object.entries(database.characters.characterProfiles)) {
    if (profile.characterKey !== characterKey) {
      issues.push(issue("error", "character", characterKey, "Character object key does not match characterKey."));
    }
    if (!CANONICAL_CHARACTER_STATUSES.has(profile.status)) {
      issues.push(issue("error", "character", characterKey, `Unknown character status ${profile.status}.`));
    }
    if (!CANONICAL_RELEASE_STATES.has(profile.releaseState)) {
      issues.push(issue("error", "character", characterKey, `Unknown character releaseState ${profile.releaseState}.`));
    }
    if (profile.weaponType && !VALID_CHARACTER_WEAPON_TYPES.has(profile.weaponType)) {
      issues.push(issue("error", "character", characterKey, `Unknown weaponType ${profile.weaponType}.`));
    }
    if (profile.element && !VALID_CHARACTER_ELEMENTS.has(profile.element)) {
      issues.push(issue("error", "character", characterKey, `Unknown element ${profile.element}.`));
    }
    if (profile.status === "verified") {
      for (const [field, value] of Object.entries({
        elementGemFamilyKey: profile.elementGemFamilyKey,
        localSpecialtyKey: profile.localSpecialtyKey,
        commonEnemyDropFamilyKey: profile.commonEnemyDropFamilyKey,
        talentBookFamilyKey: profile.talentBookFamilyKey,
        normalBossMaterialKey: profile.normalBossMaterialKey,
        weeklyBossMaterialKey: profile.weeklyBossMaterialKey,
      })) {
        if (isBlank(String(value ?? ""))) {
          issues.push(issue("error", "character", characterKey, `Verified character is missing ${field}.`));
        }
      }
      if (!profile.weaponType) {
        issues.push(issue("warning", "character", characterKey, "Verified character is missing weaponType metadata."));
      }
      if (!profile.rarity) {
        issues.push(issue("warning", "character", characterKey, "Verified character is missing rarity metadata."));
      }
    }
    if ((profile.releaseState === "beta" || profile.releaseState === "unreleased") && profile.plannerEligible) {
      issues.push(issue("error", "character", characterKey, "Beta or unreleased character should not be plannerEligible by default."));
    }
    if ((profile.status === "ignored" || characterKey === "Manekin" || characterKey === "Manekina") && profile.plannerEligible) {
      issues.push(issue("error", "character", characterKey, "Ignored character should not be plannerEligible."));
    }
    const expectedFix = REQUIRED_CHARACTER_FIXES[characterKey];
    if (expectedFix?.normalBossMaterialKey && profile.normalBossMaterialKey !== expectedFix.normalBossMaterialKey) {
      issues.push(issue("error", "character", characterKey, `Expected normalBossMaterialKey ${expectedFix.normalBossMaterialKey}, found ${profile.normalBossMaterialKey}.`));
    }
    if (expectedFix?.weeklyBossMaterialKey && profile.weeklyBossMaterialKey !== expectedFix.weeklyBossMaterialKey) {
      issues.push(issue("error", "character", characterKey, `Expected weeklyBossMaterialKey ${expectedFix.weeklyBossMaterialKey}, found ${profile.weeklyBossMaterialKey}.`));
    }
  }

  const traveler = database.characters.travelerProfile;
  if (traveler.status !== "special_case" || traveler.releaseState !== "special_case") {
    issues.push(issue("error", "traveler", "Traveler", "Traveler must remain a special_case profile."));
  }
  for (const [variantKey, profile] of Object.entries(traveler.elementVariants)) {
    if (!VALID_CHARACTER_ELEMENTS.has(profile.element)) {
      issues.push(issue("error", "traveler", variantKey, `Traveler variant has unknown element ${profile.element}.`));
    }
    if (isBlank(profile.talentBookFamilyKey) || isBlank(profile.commonEnemyDropFamilyKey)) {
      issues.push(issue("error", "traveler", variantKey, "Traveler variant is missing talent or common enemy family keys."));
    }
  }
}

function validateWeapons(database: CanonicalDatabase, issues: DatabaseValidationIssue[]): void {
  const duplicateNames = collectDuplicateDisplayNames(database.weapons.weaponProfiles);
  for (const [displayName, keys] of duplicateNames) {
    issues.push(issue("warning", "weapon", displayName, `Duplicate weapon display name used by ${keys.join(", ")}.`));
  }

  for (const [weaponKey, profile] of Object.entries(database.weapons.weaponProfiles)) {
    if (profile.weaponKey !== weaponKey) {
      issues.push(issue("error", "weapon", weaponKey, "Weapon object key does not match weaponKey."));
    }
    if (!VALID_WEAPON_RARITIES.has(profile.rarity)) {
      issues.push(issue("error", "weapon", weaponKey, `Weapon rarity ${profile.rarity} is not goal-trackable.`));
    }
    if (profile.weaponType && !VALID_CHARACTER_WEAPON_TYPES.has(profile.weaponType)) {
      issues.push(issue("error", "weapon", weaponKey, `Unknown weaponType ${profile.weaponType}.`));
    }
    if (profile.acquisitionType && !VALID_WEAPON_ACQUISITION_TYPES.has(profile.acquisitionType)) {
      issues.push(issue("error", "weapon", weaponKey, `Unknown acquisitionType ${profile.acquisitionType}.`));
    }
    if (profile.refinementPolicy && !VALID_WEAPON_REFINEMENT_POLICIES.has(profile.refinementPolicy)) {
      issues.push(issue("error", "weapon", weaponKey, `Unknown refinementPolicy ${profile.refinementPolicy}.`));
    }
    if (profile.status === "verified") {
      for (const [field, value] of Object.entries({
        weaponAscensionMaterialFamilyKey: profile.weaponAscensionMaterialFamilyKey,
        eliteEnemyDropFamilyKey: profile.eliteEnemyDropFamilyKey,
        commonEnemyDropFamilyKey: profile.commonEnemyDropFamilyKey,
      })) {
        if (isBlank(value)) {
          issues.push(issue("error", "weapon", weaponKey, `Verified weapon is missing ${field}.`));
        }
      }
    }
    if (profile.plannerEligible && profile.rarity !== 3 && profile.rarity !== 4 && profile.rarity !== 5) {
      issues.push(issue("error", "weapon", weaponKey, "1-star/2-star weapons cannot be plannerEligible."));
    }
    if (profile.refinementTrackable === true && profile.rarity !== 3 && profile.rarity !== 4 && profile.rarity !== 5) {
      issues.push(issue("error", "weapon", weaponKey, "1-star/2-star weapons cannot be refinementTrackable."));
    }
    if (profile.rarity === 5 && !profile.refinementPolicy && profile.refinementTrackable !== false) {
      issues.push(issue("warning", "weapon", weaponKey, "5-star weapons should default to manual review when no explicit refinementPolicy is present."));
    }
  }
}

function validateMaterials(database: CanonicalDatabase, issues: DatabaseValidationIssue[]): void {
  const sourceKeys = new Set<string>();
  for (const rows of Object.values(database.sources.materialSources)) {
    for (const row of rows) {
      sourceKeys.add(row.sourceKey);
    }
  }

  for (const materialKey of REQUIRED_CANONICAL_MATERIAL_KEYS) {
    if (!database.materials.materials[materialKey]) {
      issues.push(issue("error", "material", materialKey, "Required canonical material is missing."));
    }
  }

  for (const [materialKey, material] of Object.entries(database.materials.materials)) {
    if (material.materialKey !== materialKey) {
      issues.push(issue("error", "material", materialKey, "Material object key does not match materialKey."));
    }
    for (const sourceKey of material.sourceKeys) {
      if (!sourceKeys.has(sourceKey)) {
        issues.push(issue("error", "source", materialKey, `Material references missing source key ${sourceKey}.`));
      }
    }
  }

  for (const [familyKey, family] of Object.entries(database.materials.elementalGemFamilies)) {
    for (const materialKey of [family.sliver, family.fragment, family.chunk, family.gemstone]) {
      if (!database.materials.materials[materialKey]) {
        issues.push(issue("error", "family", familyKey, `Elemental gem family references missing material ${materialKey}.`));
      }
    }
  }

  for (const [familyKey, family] of Object.entries(database.materials.talentBookFamilies)) {
    for (const materialKey of [family.teachings, family.guide, family.philosophies]) {
      if (!database.materials.materials[materialKey]) {
        issues.push(issue("error", "family", familyKey, `Talent family references missing material ${materialKey}.`));
      }
    }
  }

  for (const [familyKey, family] of Object.entries(database.materials.weaponAscensionMaterialFamilies)) {
    for (const materialKey of Object.values(family.tiers)) {
      if (!database.materials.materials[materialKey]) {
        issues.push(issue("error", "family", familyKey, `Weapon ascension family references missing material ${materialKey}.`));
      }
    }
  }
}

function validateReferences(database: CanonicalDatabase, issues: DatabaseValidationIssue[]): void {
  for (const [characterKey, profile] of Object.entries(database.characters.characterProfiles)) {
    const refs: Array<[string, string, Record<string, unknown>]> = [
      ["element gem family", profile.elementGemFamilyKey, database.materials.elementalGemFamilies],
      ["local specialty", profile.localSpecialtyKey, database.materials.localSpecialties],
      ["common enemy family", profile.commonEnemyDropFamilyKey, database.materials.commonEnemyDropFamilies],
      ["talent family", profile.talentBookFamilyKey, database.materials.talentBookFamilies],
      ["normal boss material", profile.normalBossMaterialKey, database.materials.normalBossMaterials],
      ["weekly boss material", profile.weeklyBossMaterialKey, database.materials.weeklyBossMaterials],
    ];
    for (const [label, key, record] of refs) {
      if (profile.status !== "ignored" && profile.status !== "beta" && !isBlank(key) && !record[key]) {
        issues.push(issue("error", "character", characterKey, `Character references missing ${label} key ${key}.`));
      }
    }
  }

  for (const [weaponKey, profile] of Object.entries(database.weapons.weaponProfiles)) {
    const refs: Array<[string, string, Record<string, unknown>]> = [
      ["weapon ascension family", profile.weaponAscensionMaterialFamilyKey, database.materials.weaponAscensionMaterialFamilies],
      ["elite enemy family", profile.eliteEnemyDropFamilyKey, database.materials.eliteEnemyDropFamilies],
      ["common enemy family", profile.commonEnemyDropFamilyKey, database.materials.commonEnemyDropFamilies],
    ];
    for (const [label, key, record] of refs) {
      if (profile.status === "verified" && !record[key]) {
        issues.push(issue("error", "weapon", weaponKey, `Weapon references missing ${label} key ${key}.`));
      }
    }
  }
}

function validateSources(database: CanonicalDatabase, issues: DatabaseValidationIssue[]): void {
  const hasActivityCosts =
    database.sources.resinActivityCosts.domain.resin > 0 &&
    database.sources.resinActivityCosts.leyLineOutcrop.resin > 0 &&
    database.sources.resinActivityCosts.normalBoss.resin > 0 &&
    database.sources.resinActivityCosts.weeklyBoss.firstThreePerWeekResin > 0;

  if (!hasActivityCosts) {
    issues.push(issue("error", "source", "resinActivityCosts", "Canonical resin activity costs are incomplete."));
  }

  for (const [materialKey, rows] of Object.entries(database.sources.materialSources)) {
    for (const row of rows) {
      if (["enemy_drop", "local_specialty", "world_gathering", "forging"].includes(row.sourceType) && row.resinCost && row.resinCost > 0) {
        issues.push(issue("warning", "source", materialKey, `No-resin source ${row.sourceKey} has resinCost ${row.resinCost}.`));
      }
    }
  }

  const validEnemyFamilyKeys = new Set([
    ...Object.keys(database.materials.commonEnemyDropFamilies),
    ...Object.keys(database.materials.eliteEnemyDropFamilies),
  ]);

  for (const [locationKey, location] of Object.entries(database.sources.leyLineOutcropLocations)) {
    if (location.locationKey !== locationKey) {
      issues.push(issue("error", "source", locationKey, "Ley Line Outcrop object key does not match locationKey."));
    }
    if (!location.region?.trim() || !location.areaName?.trim()) {
      issues.push(issue("error", "source", locationKey, "Ley Line Outcrop is missing region or areaName."));
    }
    if (!Number.isInteger(location.locationNumber) || location.locationNumber <= 0) {
      issues.push(issue("error", "source", locationKey, "Ley Line Outcrop locationNumber must be a positive integer."));
    }

    for (const [index, spawn] of location.spawns.entries()) {
      if (!Number.isFinite(spawn.count) || spawn.count <= 0) {
        issues.push(issue("error", "source", locationKey, `Ley Line spawn ${index} must have a positive count.`));
      }
      if (!spawn.enemyName?.trim()) {
        issues.push(issue("error", "source", locationKey, `Ley Line spawn ${index} is missing enemyName.`));
      }
      if (!spawn.dropFamilyKey) {
        issues.push(issue("warning", "source", locationKey, `Ley Line spawn ${index} for ${spawn.enemyName} has no resolved dropFamilyKey.`));
        continue;
      }
      if (!validEnemyFamilyKeys.has(spawn.dropFamilyKey)) {
        issues.push(issue("error", "source", locationKey, `Ley Line spawn ${index} references unknown drop family ${spawn.dropFamilyKey}.`));
      }
    }
  }
}

function validateProgression(database: CanonicalDatabase, issues: DatabaseValidationIssue[]): void {
  const expItems = database.progression.weaponExpMaterials;
  if (expItems.EnhancementOre?.expValue !== 400) {
    issues.push(issue("error", "progression", "EnhancementOre", "Enhancement Ore EXP value must be 400."));
  }
  if (expItems.FineEnhancementOre?.expValue !== 2000) {
    issues.push(issue("error", "progression", "FineEnhancementOre", "Fine Enhancement Ore EXP value must be 2000."));
  }
  if (expItems.MysticEnhancementOre?.expValue !== 10000) {
    issues.push(issue("error", "progression", "MysticEnhancementOre", "Mystic Enhancement Ore EXP value must be 10000."));
  }
}

export function validateCanonicalDatabase(database: CanonicalDatabase = canonicalDatabase): DatabaseValidationReport {
  const issues: DatabaseValidationIssue[] = [];
  validateCharacters(database, issues);
  validateWeapons(database, issues);
  validateMaterials(database, issues);
  validateReferences(database, issues);
  validateSources(database, issues);
  validateProgression(database, issues);

  return {
    issues,
    errorCount: issues.filter((item) => item.severity === "error").length,
    warningCount: issues.filter((item) => item.severity === "warning").length,
  };
}

export function assertCanonicalDatabaseValid(database: CanonicalDatabase = canonicalDatabase): void {
  const report = validateCanonicalDatabase(database);
  if (report.errorCount === 0) {
    return;
  }
  const sample = report.issues
    .filter((item) => item.severity === "error")
    .slice(0, 10)
    .map((item) => `[${item.category}] ${item.key}: ${item.message}`)
    .join("\n");
  throw new Error(`Canonical database validation failed with ${report.errorCount} error(s).\n${sample}`);
}
