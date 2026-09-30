import type {
  LocalSpecialtyMaterial,
  LocalSpecialtyRegion,
  MaterialDescriptor,
  MaterialSourceRecord,
} from "./types";

export function toIrminsulKey(displayName: string): string {
  return displayName
    .replace(/^"|"$/g, "")
    .replace(/['’"`:.,!?()[\]\-–—]/g, "")
    .replace(/&/g, "And")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const LOCAL_SPECIALTIES: LocalSpecialtyMaterial[] = [
  { key: "CallaLily", displayName: "Calla Lily", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Flora"], searchHint: "Found near lakes in Mondstadt, especially Springvale", craftable: false },
  { key: "Cecilia", displayName: "Cecilia", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Flora"], searchHint: "Found in the wild on Starsnatch Cliff", craftable: false },
  { key: "DandelionSeed", displayName: "Dandelion Seed", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Babak", "Karpillia"], searchHint: "Found in the wild in Mondstadt", craftable: false },
  { key: "EtherwingMoth", displayName: "Etherwing Moth", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in Mondstadt", craftable: false },
  { key: "PhilanemoMushroom", displayName: "Philanemo Mushroom", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Babak", "Chloris"], searchHint: "Found under the eaves of houses in the City of Mondstadt, Springvale, Dawn Winery, and Millhaven", craftable: false },
  { key: "SmallLampGrass", displayName: "Small Lamp Grass", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Flora"], searchHint: "Found in the wild in Mondstadt, especially Whispering Woods", craftable: false },
  { key: "Valberry", displayName: "Valberry", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Chloris", "Eugenie"], searchHint: "Found in the wild around Stormbearer Mountains and Stormbearer Point", craftable: false },
  { key: "WindwheelAster", displayName: "Windwheel Aster", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Flora"], searchHint: "Found near the Statue of The Seven at Windrise and Dawn Winery, and all around Stormterror's Lair", craftable: false },
  { key: "Wolfhook", displayName: "Wolfhook", category: "local_specialty", region: "Mondstadt", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Chloris"], searchHint: "Found in the wild in Wolvendom", craftable: false },
  { key: "ClearwaterJade", displayName: "Clearwater Jade", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Fengtai"], searchHint: "Found in Chenyu Vale", craftable: false },
  { key: "CorLapis", displayName: "Cor Lapis", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Changshun", "Fengtai", "Qiuwei"], searchHint: "Found under cliffs in Liyue, especially Mt. Hulao", craftable: false },
  { key: "GlazeLily", displayName: "Glaze Lily", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Ms. Bai"], searchHint: "Found in Liyue Harbor and Qingce Village", craftable: false },
  { key: "JueyunChili", displayName: "Jueyun Chili", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Chef Mao", "Fengtai"], searchHint: "Found in the wild in Minlin, Qingce Village and Stone Gate", craftable: false },
  { key: "NoctilucousJade", displayName: "Noctilucous Jade", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Fengtai", "Qiuwei", "Shitou"], searchHint: "Found in caves in Liyue, especially Mingyun Village", craftable: false },
  { key: "Qingxin", displayName: "Qingxin", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Babak", "Herbalist Gui"], searchHint: "Found in the heights of Liyue, especially Minlin and Wuwang Hill", craftable: false },
  { key: "SilkFlower", displayName: "Silk Flower", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Fengtai", "Ms. Bai", "Qiuwei", "Verr Goldet"], searchHint: "Found in Liyue Harbor and Wangshu Inn", craftable: false },
  { key: "Starconch", displayName: "Starconch", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Bolai"], searchHint: "Found on the beaches of Liyue and Dragonspine", craftable: false },
  { key: "Violetgrass", displayName: "Violetgrass", category: "local_specialty", region: "Liyue", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Babak", "Fengtai", "Herbalist Gui", "Verr Goldet"], searchHint: "Found near cliffs in Liyue", craftable: false },
  { key: "AmakumoFruit", displayName: "Amakumo Fruit", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the wild on Seirai Island", craftable: false },
  { key: "CrystalMarrow", displayName: "Crystal Marrow", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found on Orobashi's bones on Yashiori Island and Tatarasuna", craftable: false },
  { key: "Dendrobium", displayName: "Dendrobium", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the wild on Kannazuka and Yashiori Island", craftable: false },
  { key: "FluorescentFungus", displayName: "Fluorescent Fungus", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the wild on Tsurumi Island", craftable: false },
  { key: "NakuWeed", displayName: "Naku Weed", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Aoi", "Babak"], searchHint: "Found in areas of high Electro concentration in Inazuma, especially Seirai Island", craftable: false },
  { key: "Onikabuto", displayName: "Onikabuto", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in areas of high Electro concentration in Inazuma, especially Mikage Furnace and Mt. Yougou", craftable: false },
  { key: "SakuraBloom", displayName: "Sakura Bloom", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the wild on Narukami Island", craftable: false },
  { key: "SangoPearl", displayName: "Sango Pearl", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Babak", "Yamashiro Kenta"], searchHint: "Found in the wild on Watatsumi Island and in Enkanomiya", craftable: false },
  { key: "SeaGanoderma", displayName: "Sea Ganoderma", category: "local_specialty", region: "Inazuma", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Obata"], searchHint: "Found on beaches and tidal flats of Inazuma", craftable: false },
  { key: "HennaBerry", displayName: "Henna Berry", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the deserts of Sumeru", craftable: false },
  { key: "KalpalataLotus", displayName: "Kalpalata Lotus", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Aramani"], searchHint: "Found in the mountains of Sumeru", craftable: false },
  { key: "MourningFlower", displayName: "Mourning Flower", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the deserts of Sumeru", craftable: false },
  { key: "NilotpalaLotus", displayName: "Nilotpala Lotus", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found near lakes and river banks in Sumeru", craftable: false },
  { key: "Padisarah", displayName: "Padisarah", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Jut"], searchHint: "Found in Sumeru City", craftable: false },
  { key: "RukkhashavaMushrooms", displayName: "Rukkhashava Mushrooms", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Aramani", "Ashpazi"], searchHint: "Found in the wild in the Ashavan Realm and Lokapala Jungle", craftable: false },
  { key: "SandGreasePupa", displayName: "Sand Grease Pupa", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the deserts of Sumeru", craftable: false },
  { key: "Scarab", displayName: "Scarab", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the desert ruins of Sumeru", craftable: false },
  { key: "Trishiraite", displayName: "Trishiraite", category: "local_specialty", region: "Sumeru", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the deserts of Sumeru", craftable: false },
  { key: "BerylConch", displayName: "Beryl Conch", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Hinterman", "Xana"], searchHint: "Found underwater in the Source of All Waters: The Great Fontaine Lake", craftable: false },
  { key: "LakelightLily", displayName: "Lakelight Lily", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Pahsiv"], searchHint: "Found near bodies of water in Erinnyes Forest", craftable: false },
  { key: "LumidouceBell", displayName: "Lumidouce Bell", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in the north of the Court of Fontaine", craftable: false },
  { key: "Lumitoile", displayName: "Lumitoile", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found on beaches and underwater in Liffey Region", craftable: false },
  { key: "RainbowRose", displayName: "Rainbow Rose", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Eugenie"], searchHint: "Found in the wilds of Beryl Region and surrounding the Fountain of Lucine", craftable: false },
  { key: "RomaritimeFlower", displayName: "Romaritime Flower", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Hinterman", "Xana"], searchHint: "Found mainly in or around bodies of water in Fontaine", craftable: false },
  { key: "SpringOfTheFirstDewdrop", displayName: "Spring of the First Dewdrop", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Pahsiv"], searchHint: "Found underwater surrounding the Tower of Ipsissimus in Morte Region", craftable: false },
  { key: "SubdetectionUnit", displayName: "Subdetection Unit", category: "local_specialty", region: "Fontaine", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in Fontaine Research Institute of Kinetic Energy Engineering Region, Liffey Region", craftable: false },
  { key: "BrilliantChrysanthemum", displayName: "Brilliant Chrysanthemum", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Kuzmich", "Motolinia"], searchHint: "Found in Natlan", craftable: false },
  { key: "Dracolite", displayName: "Dracolite", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Kofitse"], searchHint: "Found in Atocpan", craftable: false },
  { key: "GlowingHornshroom", displayName: "Glowing Hornshroom", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Kofitse"], searchHint: "Found in Tezcatepetonco Range near the Masters of the Night-Wind", craftable: false },
  { key: "QuenepaBerry", displayName: "Quenepa Berry", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Cintli", "Kuzmich"], searchHint: "Found in Natlan", craftable: false },
  { key: "SaurianClawSucculent", displayName: "Saurian Claw Succulent", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Cintli", "Kuzmich", "Motolinia"], searchHint: "Found in Natlan", craftable: false },
  { key: "SkysplitGembloom", displayName: "Skysplit Gembloom", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Motolinia"], searchHint: "Found in Natlan", craftable: false },
  { key: "SprayfeatherGill", displayName: "Sprayfeather Gill", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Motolinia"], searchHint: "Found in Natlan", craftable: false },
  { key: "WitheringPurpurbloom", displayName: "Withering Purpurbloom", category: "local_specialty", region: "Natlan", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in Natlan", craftable: false },
  { key: "FrostlampFlower", displayName: "Frostlamp Flower", category: "local_specialty", region: "Nod-Krai", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Kuzmich", "Richeza"], searchHint: "Found in Nod-Krai", craftable: false },
  { key: "MoonfallSilver", displayName: "Moonfall Silver", category: "local_specialty", region: "Nod-Krai", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in Hiisi Island", craftable: false },
  { key: "PineAmber", displayName: "Pine Amber", category: "local_specialty", region: "Nod-Krai", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Kuzmich"], searchHint: "Found in Dreadshade Mire", craftable: false },
  { key: "PortableBearing", displayName: "Portable Bearing", category: "local_specialty", region: "Nod-Krai", usedFor: ["character_ascension"], isPurchasable: false, purchaseVendors: [], searchHint: "Found in Lempo Isle", craftable: false },
  { key: "WinterIcelea", displayName: "Winter Icelea", category: "local_specialty", region: "Nod-Krai", usedFor: ["character_ascension"], isPurchasable: true, purchaseVendors: ["Kuzmich"], searchHint: "Found at the Pillar of Embla", craftable: false },
];

export const LOCAL_SPECIALTY_BY_KEY = Object.fromEntries(
  LOCAL_SPECIALTIES.map((item) => [item.key, item]),
) as Record<string, LocalSpecialtyMaterial>;

export const LOCAL_SPECIALTIES_BY_REGION = LOCAL_SPECIALTIES.reduce(
  (accumulator, item) => {
    accumulator[item.region].push(item);
    return accumulator;
  },
  {
    Mondstadt: [],
    Liyue: [],
    Inazuma: [],
    Sumeru: [],
    Fontaine: [],
    Natlan: [],
    "Nod-Krai": [],
    Snezhnaya: [],
  } as Record<LocalSpecialtyRegion, LocalSpecialtyMaterial[]>,
);

export const LOCAL_SPECIALTY_KEY_BY_DISPLAY_NAME = Object.fromEntries(
  LOCAL_SPECIALTIES.map((item) => [item.displayName, item.key]),
) as Record<string, string>;

export function buildLocalSpecialtyRegistry() {
  const materials: Record<string, MaterialDescriptor> = {};
  const localSpecialties: Record<string, LocalSpecialtyMaterial> = {};
  const materialSources: Record<string, MaterialSourceRecord[]> = {};

  for (const item of LOCAL_SPECIALTIES) {
    materials[item.key] = {
      key: item.key,
      displayName: item.displayName,
      category: "local_specialty",
    };
    localSpecialties[item.key] = item;
    materialSources[item.key] = [
      {
        materialKey: item.key,
        sourceType: "local_specialty",
        sourceKey: item.key,
        sourceName: item.displayName,
        availability: "ALWAYS",
        region: item.region,
        notes: item.searchHint,
      },
    ];
  }

  return {
    materials,
    localSpecialties,
    localSpecialtiesByRegion: LOCAL_SPECIALTIES_BY_REGION,
    materialSources,
    keyByDisplayName: LOCAL_SPECIALTY_KEY_BY_DISPLAY_NAME,
  };
}
