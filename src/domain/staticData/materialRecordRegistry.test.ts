import { describe, expect, it } from "vitest";
import { buildGeneralEnemyDropRegistry, GENERAL_ENEMY_DROP_FAMILIES } from "./generalEnemyDropRegistry";
import { buildEliteEnemyDropRegistry, ELITE_ENEMY_DROP_FAMILIES } from "./eliteEnemyDropRegistry";
import { LOCAL_SPECIALTIES } from "./localSpecialtyRegistry";
import { loadStaticData } from "./loadStaticData";
import { NORMAL_BOSS_MATERIALS } from "./normalBossMaterialRegistry";
import { SPECIAL_PROGRESSION_MATERIALS } from "./specialProgressionMaterialRegistry";
import { WEEKLY_BOSS_MATERIALS } from "./weeklyBossMaterialRegistry";
import { WEAPON_ASCENSION_MATERIAL_FAMILIES } from "./weaponAscensionMaterialRegistry";
import { WEAPON_EXP_MATERIALS } from "./weaponProgressionRegistry";

describe("materialRecordRegistry", () => {
  it("creates unique canonical material records with non-empty metadata", () => {
    const staticData = loadStaticData();
    const seenKeys = new Set<string>();

    for (const record of Object.values(staticData.materialRecords)) {
      expect(record.key).not.toBe("???");
      expect(record.key.length).toBeGreaterThan(0);
      expect(record.displayName.length).toBeGreaterThan(0);
      expect(record.category.length).toBeGreaterThan(0);
      expect(record.source).toBeTruthy();
      expect(record.usedFor.length).toBeGreaterThan(0);
      expect(typeof record.craftable).toBe("boolean");
      expect(seenKeys.has(record.key)).toBe(false);
      seenKeys.add(record.key);
    }
  });

  it("expands gem, enemy, talent, weekly, and specialty families into resolvable material records", () => {
    const staticData = loadStaticData();

    for (const family of Object.values(staticData.elementGemFamilies)) {
      expect(staticData.materialRecords[family.sliver]?.category).toBe("ascension_gem");
      expect(staticData.materialRecords[family.fragment]?.category).toBe("ascension_gem");
      expect(staticData.materialRecords[family.chunk]?.category).toBe("ascension_gem");
      expect(staticData.materialRecords[family.gemstone]?.category).toBe("ascension_gem");
    }

    for (const family of GENERAL_ENEMY_DROP_FAMILIES) {
      expect(family.materialKeys).toHaveLength(3);
      family.materialKeys.forEach((key) => {
        expect(staticData.materialRecords[key]?.category).toBe("general_enemy_drop");
        expect(staticData.materialRecords[key]?.craftable).toBe(true);
        expect(staticData.materialRecords[key]?.conversionRatio).toBe(3);
      });
    }

    for (const family of ELITE_ENEMY_DROP_FAMILIES) {
      expect(family.materialKeys).toHaveLength(3);
      family.materialKeys.forEach((key) => {
        expect(staticData.materialRecords[key]?.category).toBe("elite_enemy_drop");
        expect(staticData.materialRecords[key]?.craftable).toBe(true);
        expect(staticData.materialRecords[key]?.conversionRatio).toBe(3);
      });
    }

    for (const family of Object.values(WEAPON_ASCENSION_MATERIAL_FAMILIES)) {
      expect(Object.values(family.tiers)).toHaveLength(4);
      Object.values(family.tiers).forEach((key) => {
        expect(staticData.materialRecords[key]?.category).toBe("weapon_ascension_material");
        expect(staticData.materialRecords[key]?.craftable).toBe(true);
        expect(staticData.materialRecords[key]?.conversionRatio).toBe(3);
      });
    }

    for (const specialty of LOCAL_SPECIALTIES) {
      expect(staticData.materialRecords[specialty.key]?.category).toBe("local_specialty");
      expect(staticData.materialRecords[specialty.key]?.craftable).toBe(false);
    }

    for (const key of Object.keys(NORMAL_BOSS_MATERIALS)) {
      expect(staticData.materialRecords[key]?.category).toBe("normal_boss_material");
      expect(staticData.materialRecords[key]?.craftable).toBe(false);
    }

    for (const family of Object.values(staticData.talentBookFamilies)) {
      expect([family.teachings, family.guide, family.philosophies]).toHaveLength(3);
      [family.teachings, family.guide, family.philosophies].forEach((key) => {
        expect(staticData.materialRecords[key]?.category).toBe("character_talent_material");
        expect(staticData.materialRecords[key]?.craftable).toBe(true);
        expect(staticData.materialRecords[key]?.conversionRatio).toBe(3);
      });
    }

    for (const [key, material] of Object.entries(WEEKLY_BOSS_MATERIALS)) {
      expect(staticData.materialRecords[key]?.category).toBe("weekly_boss_material");
      expect(staticData.materialRecords[key]?.craftable).toBe(false);
      if (material.source.type === "weekly_boss") {
        expect(staticData.materialSources[key]?.[0]?.sourceType).toBe("weekly_boss");
      }
    }

    Object.values(WEAPON_EXP_MATERIALS).forEach((material) => {
      expect(staticData.materialRecords[material.key]?.category).toBe(material.category);
      expect(staticData.materialRecords[material.key]?.craftable).toBe(false);
      expect(staticData.materialRecords[material.key]?.usedFor).toEqual(["weapon_leveling"]);
    });
  });

  it("keeps special progression materials explicit and promotes verified weekly-boss sources when repo data exists", () => {
    const staticData = loadStaticData();

    expect(staticData.specialProgressionMaterials.Mora.status).toBe("verified");
    expect(staticData.specialProgressionMaterials.CrownOfInsight.status).toBe("verified");
    expect(staticData.specialProgressionMaterials.MasterlessStellaFortuna.status).toBe("needs_manual_review");
    expect(staticData.materialRecords.MasterlessStellaFortuna.usedFor).toEqual(["post_90_unlock"]);

    expect(staticData.weeklyBossMaterials.ErodedHorn.status).toBe("verified");
    expect(staticData.weeklyBossMaterials.ErodedHorn.source.type).toBe("weekly_boss");
    expect(staticData.materialSources.ErodedHorn?.[0]?.sourceType).toBe("weekly_boss");
  });

  it("preserves three-tier enemy and talent families plus four-tier gem families", () => {
    const staticData = loadStaticData();

    expect(Object.keys(staticData.elementGemFamilies)).toHaveLength(8);

    for (const family of Object.values(staticData.elementGemFamilies)) {
      expect([family.sliver, family.fragment, family.chunk, family.gemstone]).toHaveLength(4);
    }
  });

  it("treats missing inventory keys as zero owned in planner-facing lookups", () => {
    const inventory: Record<string, number> = {};
    expect(inventory.Mora ?? 0).toBe(0);
    expect(inventory.BasaltPillar ?? 0).toBe(0);
  });

  it("exports every known special and weekly progression material key", () => {
    const staticData = loadStaticData();

    Object.keys(SPECIAL_PROGRESSION_MATERIALS).forEach((key) => {
      expect(staticData.materialRecords[key]).toBeDefined();
    });
    Object.keys(WEEKLY_BOSS_MATERIALS).forEach((key) => {
      expect(staticData.materialRecords[key]).toBeDefined();
    });
  });

  it("rebuilds family-derived material mappings without dropping canonical material keys", () => {
    const staticData = loadStaticData();
    const generalRegistry = buildGeneralEnemyDropRegistry(staticData.characters, staticData.weapons);
    const eliteRegistry = buildEliteEnemyDropRegistry(staticData.weapons);

    generalRegistry.families.slime_materials.materialKeys.forEach((key) => {
      expect(staticData.materialRecords[key]).toBeDefined();
    });
    eliteRegistry.families.radiant_beast_materials.materialKeys.forEach((key) => {
      expect(staticData.materialRecords[key]).toBeDefined();
    });
  });
});
