import { describe, expect, it } from "vitest";
import { buildEliteEnemyDropRegistry, ELITE_ENEMY_DROP_FAMILIES } from "./eliteEnemyDropRegistry";
import { loadStaticData } from "./loadStaticData";

describe("eliteEnemyDropRegistry", () => {
  it("validates the elite enemy drop family dataset shape", () => {
    const allMaterialKeys = new Set<string>();

    for (const family of ELITE_ENEMY_DROP_FAMILIES) {
      expect(family.materialNames).toHaveLength(3);
      expect(family.materialKeys).toHaveLength(3);
      expect(family.rarity).toEqual([2, 3, 4]);
      expect(family.category).toBe("elite_enemy_drop");
      expect(family.usedFor).toEqual(["weapon_ascension"]);

      for (const materialKey of family.materialKeys) {
        expect(allMaterialKeys.has(materialKey)).toBe(false);
        allMaterialKeys.add(materialKey);
      }
    }
  });

  it("builds weapon keys and records unresolved references without creating duplicate weapons", () => {
    const staticData = loadStaticData();
    const registry = buildEliteEnemyDropRegistry(staticData.weapons);

    for (const family of Object.values(registry.families)) {
      expect(family.usedByWeaponKeys).toHaveLength(family.usedByWeapons.length);
    }

    expect(registry.weaponEliteEnemyDropFamilyByKey.FavoniusSword).toBe("mitachurl_materials");
    expect(registry.weaponEliteEnemyDropFamilyByKey.EtherlightSpindlelute).toBe("radiant_beast_materials");

    const resolvedKeys = Object.keys(registry.weaponEliteEnemyDropFamilyByKey);
    expect(new Set(resolvedKeys).size).toBe(resolvedKeys.length);
  });

  it("maps every elite enemy material key back to exactly one family", () => {
    const staticData = loadStaticData();

    const expectedFamilyByMaterialKey: Record<string, string> = {
      HeavyHorn: "mitachurl_materials",
      LeyLineSprout: "abyss_mage_materials",
      ChaosCore: "humanoid_ruin_machine_materials",
      MistGrassWick: "fatui_cicin_mage_materials",
      InspectorsSacrificialKnife: "fatui_pyro_agent_materials",
      FossilizedBoneShard: "vishap_materials",
      ChaosOculus: "ruin_sentinel_materials",
      PolarizingPrism: "mirror_maiden_materials",
      ConcealedTalon: "riftwolf_materials",
      DeathlyStatuette: "black_serpent_materials",
      RobustFungalNucleus: "state_shifted_fungus_materials",
      ChaosBolt: "ruin_drake_materials",
      RadiantPrism: "primal_construct_materials",
      MarkedShell: "consecrated_beast_materials",
      WanderersBloomingFlower: "hilichurl_rogue_materials",
      NewbornTaintedHydroPhantasm: "tainted_hydro_phantasm_materials",
      AlienLifeCore: "breacher_primus_materials",
      OperativesConstancy: "fatui_operative_materials",
      ChasmlightFin: "xuanwen_beast_materials",
      StillSmolderingHilt: "praetorian_golem_materials",
      IgnitedSeeingEye: "avatar_of_lava_materials",
      SigilOfAStridingWill: "wayob_manifestation_materials",
      HeartOfTheSecretSource: "secret_source_automaton_hunter_seeker_materials",
      IllusoryLeafcoil: "tenebrous_mimesis_materials",
      BlazingPrismshell: "furnace_shell_mountain_weasel_materials",
      FrostnightsGlory: "frostnight_scion_materials",
      RadiantExoskeleton: "radiant_beast_materials",
      MistshroudHelmet: "wasteland_wild_hunt_materials",
      HookedBeakOfTheDeepShadow: "fisher_of_hidden_depths_materials",
      JeweledFlamingHilt: "domain_keeper_materials",
    };

    for (const [materialKey, familyId] of Object.entries(expectedFamilyByMaterialKey)) {
      expect(staticData.materialFamilyByKey[materialKey]?.familyId).toBe(familyId);
    }
  });
});
