import { describe, expect, it } from "vitest";
import {
  buildLocalSpecialtyRegistry,
  LOCAL_SPECIALTIES,
  LOCAL_SPECIALTY_BY_KEY,
  LOCAL_SPECIALTY_KEY_BY_DISPLAY_NAME,
} from "./localSpecialtyRegistry";
import { loadStaticData } from "./loadStaticData";

describe("localSpecialtyRegistry", () => {
  it("validates the local specialty dataset shape", () => {
    const keys = new Set<string>();
    const displayNames = new Set<string>();

    for (const item of LOCAL_SPECIALTIES) {
      expect(item.category).toBe("local_specialty");
      expect(item.usedFor).toEqual(["character_ascension"]);
      expect(item.craftable).toBe(false);
      expect(item.key.length).toBeGreaterThan(0);
      expect(item.displayName.length).toBeGreaterThan(0);
      expect(item.region.length).toBeGreaterThan(0);
      expect(item.searchHint.length).toBeGreaterThan(0);
      expect(item.isPurchasable ? item.purchaseVendors.length > 0 : item.purchaseVendors.length === 0).toBe(true);
      expect(keys.has(item.key)).toBe(false);
      expect(displayNames.has(item.displayName)).toBe(false);
      keys.add(item.key);
      displayNames.add(item.displayName);
    }
  });

  it("builds region indexes with the expected counts", () => {
    const registry = buildLocalSpecialtyRegistry();

    expect(registry.localSpecialtiesByRegion.Mondstadt).toHaveLength(9);
    expect(registry.localSpecialtiesByRegion.Liyue).toHaveLength(9);
    expect(registry.localSpecialtiesByRegion.Inazuma).toHaveLength(9);
    expect(registry.localSpecialtiesByRegion.Sumeru).toHaveLength(9);
    expect(registry.localSpecialtiesByRegion.Fontaine).toHaveLength(8);
    expect(registry.localSpecialtiesByRegion.Natlan).toHaveLength(8);
    expect(registry.localSpecialtiesByRegion["Nod-Krai"]).toHaveLength(5);
  });

  it("maps required lookup keys to their regions", () => {
    const expectedRegions: Record<string, string> = {
      CallaLily: "Mondstadt",
      Cecilia: "Mondstadt",
      DandelionSeed: "Mondstadt",
      EtherwingMoth: "Mondstadt",
      PhilanemoMushroom: "Mondstadt",
      SmallLampGrass: "Mondstadt",
      Valberry: "Mondstadt",
      WindwheelAster: "Mondstadt",
      Wolfhook: "Mondstadt",
      ClearwaterJade: "Liyue",
      CorLapis: "Liyue",
      GlazeLily: "Liyue",
      JueyunChili: "Liyue",
      NoctilucousJade: "Liyue",
      Qingxin: "Liyue",
      SilkFlower: "Liyue",
      Starconch: "Liyue",
      Violetgrass: "Liyue",
      AmakumoFruit: "Inazuma",
      CrystalMarrow: "Inazuma",
      Dendrobium: "Inazuma",
      FluorescentFungus: "Inazuma",
      NakuWeed: "Inazuma",
      Onikabuto: "Inazuma",
      SakuraBloom: "Inazuma",
      SangoPearl: "Inazuma",
      SeaGanoderma: "Inazuma",
      HennaBerry: "Sumeru",
      KalpalataLotus: "Sumeru",
      MourningFlower: "Sumeru",
      NilotpalaLotus: "Sumeru",
      Padisarah: "Sumeru",
      RukkhashavaMushrooms: "Sumeru",
      SandGreasePupa: "Sumeru",
      Scarab: "Sumeru",
      Trishiraite: "Sumeru",
      BerylConch: "Fontaine",
      LakelightLily: "Fontaine",
      LumidouceBell: "Fontaine",
      Lumitoile: "Fontaine",
      RainbowRose: "Fontaine",
      RomaritimeFlower: "Fontaine",
      SpringOfTheFirstDewdrop: "Fontaine",
      SubdetectionUnit: "Fontaine",
      BrilliantChrysanthemum: "Natlan",
      Dracolite: "Natlan",
      GlowingHornshroom: "Natlan",
      QuenepaBerry: "Natlan",
      SaurianClawSucculent: "Natlan",
      SkysplitGembloom: "Natlan",
      SprayfeatherGill: "Natlan",
      WitheringPurpurbloom: "Natlan",
      FrostlampFlower: "Nod-Krai",
      MoonfallSilver: "Nod-Krai",
      PineAmber: "Nod-Krai",
      PortableBearing: "Nod-Krai",
      WinterIcelea: "Nod-Krai",
    };

    for (const [key, region] of Object.entries(expectedRegions)) {
      expect(LOCAL_SPECIALTY_BY_KEY[key]?.region).toBe(region);
    }

    expect(LOCAL_SPECIALTY_KEY_BY_DISPLAY_NAME["Calla Lily"]).toBe("CallaLily");
    expect(LOCAL_SPECIALTY_KEY_BY_DISPLAY_NAME["Rukkhashava Mushrooms"]).toBe("RukkhashavaMushrooms");
  });

  it("treats missing local specialty inventory keys as zero owned", () => {
    const staticData = loadStaticData();
    expect(staticData.materials.CallaLily.category).toBe("local_specialty");
    expect(staticData.localSpecialties.CallaLily.isPurchasable).toBe(true);
  });
});
