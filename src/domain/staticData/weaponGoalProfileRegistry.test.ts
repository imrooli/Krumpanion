import { describe, expect, it } from "vitest";
import { loadStaticData } from "./loadStaticData";
import {
  buildWeaponGoalProfileMaterialProfiles,
  COMMON_ENEMY_FAMILY_KEY_TO_ID,
  ELITE_ENEMY_FAMILY_KEY_TO_ID,
  listWeaponGoalProfileValidationIssues,
  MANUAL_REVIEW_WEAPON_GOAL_PROFILES,
  WEAPON_GOAL_PROFILES,
} from "./weaponGoalProfileRegistry";

describe("weaponGoalProfileRegistry", () => {
  it("keeps the verified goal-profile database in the minimal planner-only shape", () => {
    expect(Object.keys(WEAPON_GOAL_PROFILES)).toHaveLength(223);

    for (const profile of Object.values(WEAPON_GOAL_PROFILES)) {
      expect(Object.keys(profile).sort()).toEqual(
        ["commonEnemyFamilyKey", "eliteEnemyFamilyKey", "goalTrackable", "key", "rarity", "status", "weaponAscensionFamilyKey", "weaponName", "weaponType"].sort(),
      );
      expect(profile).not.toHaveProperty("baseAtk");
      expect(profile).not.toHaveProperty("subStatRaw");
      expect(profile).not.toHaveProperty("subStatKey");
      expect(profile).not.toHaveProperty("subStatValue");
      expect(profile).not.toHaveProperty("affixText");
      expect(profile).not.toHaveProperty("itemHref");
      expect(profile).not.toHaveProperty("icon");
      expect(profile).not.toHaveProperty("itemId");
      expect(["3-Star", "4-Star", "5-Star"]).toContain(profile.rarity);
      expect(profile.goalTrackable).toBe(true);
      expect(profile.status).toBe("verified");
      expect(["Sword", "Claymore", "Polearm", "Bow", "Catalyst"]).toContain(profile.weaponType);
    }
  });

  it("tracks manual-review rows separately and excludes them from normal material-profile generation", () => {
    expect(Object.keys(MANUAL_REVIEW_WEAPON_GOAL_PROFILES)).toHaveLength(7);
    expect(MANUAL_REVIEW_WEAPON_GOAL_PROFILES.Quartz.goalTrackable).toBe(false);
    expect(MANUAL_REVIEW_WEAPON_GOAL_PROFILES.Quartz.status).toBe("needs_manual_review");
    expect(MANUAL_REVIEW_WEAPON_GOAL_PROFILES.EbonyBow.notes?.[0]).toContain("Do not use for cost calculation");

    const materialProfiles = buildWeaponGoalProfileMaterialProfiles();
    expect(materialProfiles.Quartz).toBeUndefined();
    expect(materialProfiles.SwordOfNarzissenkreuz_i_n11429).toBeUndefined();
  });

  it("maps the cleaned family keys into the existing canonical family ids without unresolved values", () => {
    expect(listWeaponGoalProfileValidationIssues()).toEqual([]);

    for (const profile of Object.values(WEAPON_GOAL_PROFILES)) {
      expect(ELITE_ENEMY_FAMILY_KEY_TO_ID[profile.eliteEnemyFamilyKey as keyof typeof ELITE_ENEMY_FAMILY_KEY_TO_ID]).toBeTruthy();
      expect(COMMON_ENEMY_FAMILY_KEY_TO_ID[profile.commonEnemyFamilyKey as keyof typeof COMMON_ENEMY_FAMILY_KEY_TO_ID]).toBeTruthy();
    }
  });

  it("feeds verified goal profiles into loadStaticData without storing exact tier names on each weapon", () => {
    const staticData = loadStaticData();

    expect(staticData.weapons.CoolSteel.weaponType).toBe("Sword");
    expect(staticData.weapons.CoolSteel.rarity).toBe(3);
    expect(staticData.weaponMaterialProfiles.CoolSteel.weaponAscensionFamilyKey).toBe("Decarabian");
    expect(staticData.weaponMaterialProfiles.CoolSteel.eliteEnemyDropFamilyId).toBe("mitachurl_materials");
    expect(staticData.weaponMaterialProfiles.CoolSteel.commonEnemyFamilyKey).toBe("hilichurl_shooter_materials");
    expect(staticData.weaponMaterialProfiles.CoolSteel.weaponAscensionMaterialFamily).toBeUndefined();
    expect(staticData.weaponMaterialProfiles.CoolSteel.eliteEnemyFamily).toBeUndefined();
    expect(staticData.weaponMaterialProfiles.CoolSteel.commonEnemyFamily).toBeUndefined();
    expect(staticData.weaponAscensionMaterialFamilies[staticData.weaponMaterialProfiles.CoolSteel.weaponAscensionFamilyKey ?? ""]).toBeTruthy();
    expect(staticData.eliteEnemyDropFamilies[staticData.weaponMaterialProfiles.CoolSteel.eliteEnemyDropFamilyId ?? ""]).toBeTruthy();
    expect(staticData.generalEnemyDropFamilies[staticData.weaponMaterialProfiles.CoolSteel.commonEnemyFamilyKey ?? ""]).toBeTruthy();
  });
});
