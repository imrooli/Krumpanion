import { describe, expect, it } from "vitest";
import { loadStaticData } from "./loadStaticData";
import { WEAPON_ASCENSION_MATERIAL_FAMILIES } from "./weaponAscensionMaterialRegistry";
import {
  WEAPON_ASCENSION_COSTS,
  WEAPON_ASCENSION_TOTALS_20_TO_90,
  WEAPON_EXP_REQUIREMENTS,
  WEAPON_EXP_TOTALS_1_TO_90,
} from "./weaponProgressionRegistry";

describe("weapon progression registry", () => {
  it("seeds every weapon ascension family with exactly four tiers", () => {
    const staticData = loadStaticData();

    for (const family of Object.values(WEAPON_ASCENSION_MATERIAL_FAMILIES)) {
      expect(Object.keys(family.tiers)).toEqual(["twoStar", "threeStar", "fourStar", "fiveStar"]);
      expect(staticData.weaponAscensionMaterialFamilies[family.key]).toBeDefined();
      expect(staticData.weaponAscensionFamilies[family.key]).toBeDefined();
    }
  });

  it("creates material records for every weapon ascension tier and weapon exp item", () => {
    const staticData = loadStaticData();

    for (const family of Object.values(WEAPON_ASCENSION_MATERIAL_FAMILIES)) {
      for (const key of Object.values(family.tiers)) {
        expect(staticData.materialRecords[key]).toBeDefined();
        expect(staticData.materialRecords[key]?.category).toBe("weapon_ascension_material");
      }
    }

    for (const key of ["EnhancementOre", "FineEnhancementOre", "MysticEnhancementOre", "OneStarWeaponFodder", "TwoStarWeaponFodder", "ThreeStarWeaponFodder"]) {
      expect(staticData.materialRecords[key]).toBeDefined();
    }
  });

  it("defines exact EXP milestone tables for each goal-trackable rarity", () => {
    for (const rarity of ["3-Star", "4-Star", "5-Star"] as const) {
      expect(WEAPON_EXP_REQUIREMENTS[rarity].map((row) => row.range)).toEqual([
        "1-20",
        "20-40",
        "40-50",
        "50-60",
        "60-70",
        "70-80",
        "80-90",
      ]);
    }
  });

  it("sums EXP range rows into the published 1-to-90 totals", () => {
    for (const rarity of ["3-Star", "4-Star", "5-Star"] as const) {
      const sum = WEAPON_EXP_REQUIREMENTS[rarity].reduce(
        (accumulator, row) => ({
          mysticOre: accumulator.mysticOre + row.mysticOre,
          fineOre: accumulator.fineOre + row.fineOre,
          threeStarWeapons: accumulator.threeStarWeapons + row.threeStarWeapons,
          twoStarWeapons: accumulator.twoStarWeapons + row.twoStarWeapons,
          oneStarWeapons: accumulator.oneStarWeapons + row.oneStarWeapons,
          enhancementOre: accumulator.enhancementOre + row.enhancementOre,
          expNeeded: accumulator.expNeeded + row.expNeeded,
          wastedExp: accumulator.wastedExp + row.wastedExp,
          mora: accumulator.mora + row.mora,
        }),
        {
          mysticOre: 0,
          fineOre: 0,
          threeStarWeapons: 0,
          twoStarWeapons: 0,
          oneStarWeapons: 0,
          enhancementOre: 0,
          expNeeded: 0,
          wastedExp: 0,
          mora: 0,
        },
      );

      expect(sum).toEqual(WEAPON_EXP_TOTALS_1_TO_90[rarity]);
    }
  });

  it("sums ascension phase rows into the published 20-to-90 totals", () => {
    for (const rarity of ["3-Star", "4-Star", "5-Star"] as const) {
      const sum = Object.values(WEAPON_ASCENSION_COSTS[rarity]).reduce(
        (accumulator, step) => ({
          Mora: accumulator.Mora + step.mora,
          WeaponAscension2Star: accumulator.WeaponAscension2Star + (step.weaponAscensionMaterial.tier === "2-Star" ? step.weaponAscensionMaterial.amount : 0),
          WeaponAscension3Star: accumulator.WeaponAscension3Star + (step.weaponAscensionMaterial.tier === "3-Star" ? step.weaponAscensionMaterial.amount : 0),
          WeaponAscension4Star: accumulator.WeaponAscension4Star + (step.weaponAscensionMaterial.tier === "4-Star" ? step.weaponAscensionMaterial.amount : 0),
          WeaponAscension5Star: accumulator.WeaponAscension5Star + (step.weaponAscensionMaterial.tier === "5-Star" ? step.weaponAscensionMaterial.amount : 0),
          EliteEnemy2Star: accumulator.EliteEnemy2Star + (step.eliteEnemyMaterial.tier === "2-Star" ? step.eliteEnemyMaterial.amount : 0),
          EliteEnemy3Star: accumulator.EliteEnemy3Star + (step.eliteEnemyMaterial.tier === "3-Star" ? step.eliteEnemyMaterial.amount : 0),
          EliteEnemy4Star: accumulator.EliteEnemy4Star + (step.eliteEnemyMaterial.tier === "4-Star" ? step.eliteEnemyMaterial.amount : 0),
          CommonEnemy1Star: accumulator.CommonEnemy1Star + (step.commonEnemyMaterial.tier === "1-Star" ? step.commonEnemyMaterial.amount : 0),
          CommonEnemy2Star: accumulator.CommonEnemy2Star + (step.commonEnemyMaterial.tier === "2-Star" ? step.commonEnemyMaterial.amount : 0),
          CommonEnemy3Star: accumulator.CommonEnemy3Star + (step.commonEnemyMaterial.tier === "3-Star" ? step.commonEnemyMaterial.amount : 0),
        }),
        {
          Mora: 0,
          WeaponAscension2Star: 0,
          WeaponAscension3Star: 0,
          WeaponAscension4Star: 0,
          WeaponAscension5Star: 0,
          EliteEnemy2Star: 0,
          EliteEnemy3Star: 0,
          EliteEnemy4Star: 0,
          CommonEnemy1Star: 0,
          CommonEnemy2Star: 0,
          CommonEnemy3Star: 0,
        },
      );

      expect(sum).toEqual(WEAPON_ASCENSION_TOTALS_20_TO_90[rarity]);
    }
  });
});
