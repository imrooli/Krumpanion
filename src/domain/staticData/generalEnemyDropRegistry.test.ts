import { describe, expect, it } from "vitest";
import { GENERAL_ENEMY_DROP_FAMILIES, buildGeneralEnemyDropRegistry } from "./generalEnemyDropRegistry";
import { loadStaticData } from "./loadStaticData";

describe("generalEnemyDropRegistry", () => {
  it("validates the general enemy drop family dataset shape", () => {
    const allMaterialKeys = new Set<string>();

    for (const family of GENERAL_ENEMY_DROP_FAMILIES) {
      expect(family.materialNames).toHaveLength(3);
      expect(family.materialKeys).toHaveLength(3);
      expect(family.rarity).toEqual([1, 2, 3]);
      expect(family.category).toBe("general_enemy_drop");
      expect(family.usedFor).toEqual(["character_ascension", "weapon_ascension", "talent_leveling"]);

      for (const materialKey of family.materialKeys) {
        expect(allMaterialKeys.has(materialKey)).toBe(false);
        allMaterialKeys.add(materialKey);
      }
    }
  });

  it("builds character and weapon links while preserving Traveler metadata", () => {
    const staticData = loadStaticData();
    const registry = buildGeneralEnemyDropRegistry(staticData.characters, staticData.weapons);

    expect(registry.characterGeneralEnemyDropFamilyByKey.Traveler).toBe("sauroform_tribal_warrior_materials");
    expect(registry.weaponGeneralEnemyDropFamilyByKey.FavoniusLance).toBe("slime_materials");
    expect(registry.families.samachurl_materials.usedByCharacterReferences?.some((reference) => reference.displayName === "Traveler (Anemo)" && reference.travelerElement === "Anemo")).toBe(true);
    expect(registry.families.fungus_materials.displayName).not.toBe(registry.families.state_shifted_fungus_materials?.displayName);
  });

  it("maps every general enemy material key back to exactly one family", () => {
    const staticData = loadStaticData();

    const expectedFamilyByMaterialKey: Record<string, string> = {
      SlimeCondensate: "slime_materials",
      SlimeSecretions: "slime_materials",
      SlimeConcentrate: "slime_materials",
      DamagedMask: "hilichurl_materials",
      StainedMask: "hilichurl_materials",
      OminousMask: "hilichurl_materials",
      DiviningScroll: "samachurl_materials",
      SealedScroll: "samachurl_materials",
      ForbiddenCurseScroll: "samachurl_materials",
      FirmArrowhead: "hilichurl_shooter_materials",
      SharpArrowhead: "hilichurl_shooter_materials",
      WeatheredArrowhead: "hilichurl_shooter_materials",
      RecruitsInsignia: "fatui_skirmisher_materials",
      SergeantsInsignia: "fatui_skirmisher_materials",
      LieutenantsInsignia: "fatui_skirmisher_materials",
      TreasureHoarderInsignia: "treasure_hoarder_materials",
      SilverRavenInsignia: "treasure_hoarder_materials",
      GoldenRavenInsignia: "treasure_hoarder_materials",
      WhopperflowerNectar: "whopperflower_materials",
      ShimmeringNectar: "whopperflower_materials",
      EnergyNectar: "whopperflower_materials",
      OldHandguard: "nobushi_materials",
      KageuchiHandguard: "nobushi_materials",
      FamedHandguard: "nobushi_materials",
      SpectralHusk: "specter_materials",
      SpectralHeart: "specter_materials",
      SpectralNucleus: "specter_materials",
      FungalSpores: "fungus_materials",
      LuminescentPollen: "fungus_materials",
      CrystallineCystDust: "fungus_materials",
      FadedRedSatin: "eremite_materials",
      TrimmedRedSilk: "eremite_materials",
      RichRedBrocade: "eremite_materials",
      TransoceanicPearl: "fontemer_aberrant_materials",
      TransoceanicChunk: "fontemer_aberrant_materials",
      XenochromaticCrystal: "fontemer_aberrant_materials",
      MeshingGear: "clockwork_meka_materials",
      MechanicalSpurGear: "clockwork_meka_materials",
      ArtificedDynamicGear: "clockwork_meka_materials",
      JuvenileFang: "natlan_saurian_materials",
      SeasonedFang: "natlan_saurian_materials",
      TyrantsFang: "natlan_saurian_materials",
      SentrysWoodenWhistle: "sauroform_tribal_warrior_materials",
      WarriorsMetalWhistle: "sauroform_tribal_warrior_materials",
      SaurianCrownedWarriorsGoldenWhistle: "sauroform_tribal_warrior_materials",
      BrokenDriveShaft: "landcruiser_materials",
      ReinforcedDriveShaft: "landcruiser_materials",
      PrecisionDriveShaft: "landcruiser_materials",
      TatteredWarrant: "fatui_oprichniki_materials",
      ImmaculateWarrant: "fatui_oprichniki_materials",
      FrostEtchedWarrant: "fatui_oprichniki_materials",
    };

    for (const [materialKey, familyId] of Object.entries(expectedFamilyByMaterialKey)) {
      expect(staticData.materialFamilyByKey[materialKey]?.familyId).toBe(familyId);
    }
  });
});
