import { describe, expect, it } from "vitest";
import { loadStaticData } from "./loadStaticData";
import { isGoalTrackableWeaponRecord } from "./targetability";
import { validateStaticData } from "./validateStaticData";

function cloneStaticData() {
  return structuredClone(loadStaticData());
}

function findGoalTrackableWeaponKey(data: ReturnType<typeof loadStaticData>): string {
  const entry = Object.keys(data.weapons).find((weaponKey) => isGoalTrackableWeaponRecord(data, weaponKey));
  if (!entry) {
    throw new Error("Expected at least one goal-trackable weapon in static data.");
  }
  return entry;
}

function findCharacterKey(data: ReturnType<typeof loadStaticData>): string {
  const entry = Object.keys(data.characterMaterialProfiles)[0];
  if (!entry) {
    throw new Error("Expected at least one character profile in static data.");
  }
  return entry;
}

describe("validateStaticData", () => {
  it("loadStaticData produces a health report without throwing", () => {
    const report = validateStaticData(loadStaticData());

    expect(report.generatedAt).toBeTruthy();
    expect(report.summary.totalIssues).toBe(report.issues.length);
  });

  it("issue ids are stable and non-empty", () => {
    const report = validateStaticData(loadStaticData());

    expect(report.issues.every((issue) => issue.id.length > 0)).toBe(true);
    expect(new Set(report.issues.map((issue) => issue.id)).size).toBe(report.issues.length);
  });

  it("missing character profile is detected", () => {
    const data = cloneStaticData();
    const characterKey = findCharacterKey(data);
    delete data.characterMaterialProfiles[characterKey];

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === `character_profile:missing_profile:${characterKey}`)).toBe(true);
  });

  it("missing weapon profile is detected for goal-trackable weapons", () => {
    const data = cloneStaticData();
    const weaponKey = findGoalTrackableWeaponKey(data);
    delete data.weaponMaterialProfiles[weaponKey];

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === `weapon_profile:missing_profile:${weaponKey}`)).toBe(true);
  });

  it("invalid material source is detected", () => {
    const data = cloneStaticData();
    data.materialSources.Mora = [
      {
        materialKey: "UnknownMaterial",
        sourceType: "fake_source" as never,
        sourceKey: "",
        sourceName: "",
        availability: "ALWAYS",
      },
    ];

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === "material_source:source_material_missing:Mora")).toBe(true);
    expect(report.issues.some((issue) => issue.id === "material_source:invalid_source_type:Mora")).toBe(true);
  });

  it("invalid crafting recipe input is detected", () => {
    const data = cloneStaticData();
    data.craftingRecipes.InvalidRecipe = {
      outputMaterialKey: "GuideToFreedom",
      outputKey: "GuideToFreedom",
      outputQuantity: 1,
      ingredients: {
        NotARealMaterial: 3,
      },
      moraCost: 10,
      category: "talent_level_up_material",
    };

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === "crafting_recipe:unknown_ingredient:InvalidRecipe")).toBe(true);
  });

  it("invalid ley line outcrop metadata is detected", () => {
    const data = cloneStaticData();
    data.leyLineOutcropLocations["bad-location"] = {
      locationKey: "different-key",
      region: "",
      areaName: "",
      locationNumber: 0,
      waves: [1],
      spawns: [
        {
          enemyName: "Broken Spawn",
          count: 0,
          dropFamilyKey: "missing_family",
        },
      ],
      derivedDropFamilies: [
        {
          familyKey: "missing_family",
          familyDisplayName: "Missing Family",
          materialKeys: ["UnknownMaterial"],
          materialNames: ["Unknown Material"],
          guaranteedEnemySpawns: [{ enemyName: "Broken Spawn", count: 0 }],
          optionalNearbyEnemySpawns: [],
          totalGuaranteedEnemyCount: 0,
        },
      ],
    };

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === "ley_line_outcrop:mismatched_location_key:bad-location")).toBe(true);
    expect(report.issues.some((issue) => issue.id === "ley_line_outcrop:invalid_family_reference:bad-location")).toBe(true);
    expect(report.issues.some((issue) => issue.id === "ley_line_outcrop:invalid_material_reference:bad-location")).toBe(true);
  });

  it("duplicate or conflicting material-family membership is detected", () => {
    const data = cloneStaticData();
    const familyKeys = Object.keys(data.generalEnemyDropFamilies);
    const leftKey = familyKeys[0];
    const rightKey = familyKeys[1];
    const duplicateMaterialKey = data.generalEnemyDropFamilies[leftKey].materialKeys[0];
    data.generalEnemyDropFamilies[rightKey] = {
      ...data.generalEnemyDropFamilies[rightKey],
      materialKeys: [duplicateMaterialKey, ...data.generalEnemyDropFamilies[rightKey].materialKeys.slice(1)] as [string, string, string],
    };

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === `family:conflicting_family_membership:${duplicateMaterialKey}`)).toBe(true);
  });

  it("canonical unresolved character material references are fully resolved in the current bundle", () => {
    const report = validateStaticData(loadStaticData());

    expect(report.summary.unresolvedCharacterMaterialReferenceCount).toBe(0);
    expect(report.issues.some((issue) => issue.category === "character_profile" && issue.id.includes("unresolved_character_material_reference"))).toBe(false);
  });

  it("manual-review profiles are reported but do not crash validation", () => {
    const data = cloneStaticData();
    const weaponKey = findGoalTrackableWeaponKey(data);
    data.weaponMaterialProfiles[weaponKey] = {
      ...data.weaponMaterialProfiles[weaponKey],
      status: "needs_manual_review",
    };

    const report = validateStaticData(data);

    expect(
      report.issues.some(
        (issue) =>
          issue.category === "weapon_profile" &&
          issue.entityKey === weaponKey &&
          issue.id === `weapon_profile:manual_review_goal_trackable:${weaponKey}` &&
          issue.severity === "warning",
      ),
    ).toBe(true);
  });

  it("reports Manekin and Manekina as ignored info instead of missing-profile errors", () => {
    const report = validateStaticData(loadStaticData());

    expect(report.issues.some((issue) => issue.id === "character_profile:ignored_non_playable_character:Manekin" && issue.severity === "info")).toBe(true);
    expect(report.issues.some((issue) => issue.id === "character_profile:ignored_non_playable_character:Manekina" && issue.severity === "info")).toBe(true);
    expect(report.issues.some((issue) => issue.id === "character_profile:missing_profile:Manekin")).toBe(false);
    expect(report.issues.some((issue) => issue.id === "character_profile:missing_profile:Manekina")).toBe(false);
  });

  it("flags low-rarity weapons that are incorrectly marked goal-trackable", () => {
    const data = cloneStaticData();
    data.weapons.TestOneStarWeapon = {
      key: "TestOneStarWeapon",
      displayName: "Test One Star Weapon",
      rarity: 1,
      weaponType: "Sword",
    };
    data.weaponMaterialProfiles.TestOneStarWeapon = {
      weaponKey: "TestOneStarWeapon",
      rarity: 1,
      weaponType: "Sword",
      goalTrackable: true,
    };

    const report = validateStaticData(data);

    expect(report.issues.some((issue) => issue.id === "weapon_profile:invalid_goal_trackable_low_rarity_weapon:TestOneStarWeapon")).toBe(true);
  });

  it("validates Traveler as a special shared-plus-element model", () => {
    const report = validateStaticData(loadStaticData());

    expect(report.issues.some((issue) => issue.id === "character_profile:traveler_base_missing:Traveler")).toBe(false);
    expect(report.issues.some((issue) => issue.id === "character_profile:traveler_element_profile_missing:traveler_anemo")).toBe(false);
    expect(report.issues.some((issue) => issue.id.includes("traveler_cryo_present_without_verification"))).toBe(false);
  });

  it("validates weapon EXP ore source metadata", () => {
    const report = validateStaticData(loadStaticData());

    expect(report.issues.some((issue) => issue.id.includes("missing_mystic_forging_recipe"))).toBe(false);
    expect(report.issues.some((issue) => issue.id.includes("missing_ore_respawn_metadata"))).toBe(false);
  });

  it("report summary counts match the issue list", () => {
    const report = validateStaticData(loadStaticData());
    const errorCount = report.issues.filter((issue) => issue.severity === "error").length;
    const warningCount = report.issues.filter((issue) => issue.severity === "warning").length;
    const infoCount = report.issues.filter((issue) => issue.severity === "info").length;

    expect(report.summary.totalIssues).toBe(report.issues.length);
    expect(report.summary.errorCount).toBe(errorCount);
    expect(report.summary.warningCount).toBe(warningCount);
    expect(report.summary.infoCount).toBe(infoCount);
  });
});
