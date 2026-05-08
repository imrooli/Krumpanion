import type { CraftingRecipe } from "../crafting/types";
import type { AvailabilityGroupKey } from "../planner/types";
import {
  DOMAINS_OF_FORGERY,
  WEAPON_ASCENSION_FAMILY_TO_DOMAIN_KEY,
} from "./plannerResinRegistry";
import type {
  CharacterWeaponType,
  MaterialSourceRecord,
  UnresolvedWeaponReference,
  WeaponAscensionFamily,
  WeaponAscensionMaterialFamilyRecord,
  WeaponCatalogEntry,
  WeaponMaterialProfile,
} from "./types";

function normalizeLookupValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toMaterialKey(displayName: string): string {
  return displayName
    .replace(/^"|"$/g, "")
    .replace(/\?/g, "")
    .replace(/['’"`:.,!?()[\]\-–—]/g, " ")
    .replace(/&/g, " And ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function resolveCanonicalWeaponKey(displayName: string, weapons: Record<string, WeaponCatalogEntry>): string | null {
  const byNormalizedDisplay = new Map(
    Object.values(weapons).map((weapon) => [normalizeLookupValue(weapon.displayName), weapon.key]),
  );
  const cleanDisplayName = displayName.replace(/^"|"$/g, "");
  const generatedKey = toMaterialKey(displayName);

  if (weapons[generatedKey]) {
    return generatedKey;
  }

  return byNormalizedDisplay.get(normalizeLookupValue(cleanDisplayName)) ?? null;
}

type FamilySeed = Omit<WeaponAscensionMaterialFamilyRecord, "category" | "source" | "craftable" | "conversionRatio" | "status">;

const DEFAULT_SOURCE = {
  type: "domain_of_forgery" as const,
  region: null,
  domainName: null,
  availableDays: [] as string[],
  sourceHint: "Requires domain/day metadata patch.",
};

const AVAILABLE_DAYS_BY_FAMILY_INDEX: AvailabilityGroupKey[] = ["MON_THU_SUN", "TUE_FRI_SUN", "WED_SAT_SUN"];
const AVAILABLE_DAY_LABELS_BY_GROUP: Record<AvailabilityGroupKey, string[]> = {
  MON_THU_SUN: ["Monday", "Thursday", "Sunday"],
  TUE_FRI_SUN: ["Tuesday", "Friday", "Sunday"],
  WED_SAT_SUN: ["Wednesday", "Saturday", "Sunday"],
  ALWAYS: ["Always"],
  WEEKLY: ["Weekly"],
  UNKNOWN: ["Unknown"],
};

function resolveFamilySourceMetadata(familyKey: string) {
  const domainKey = WEAPON_ASCENSION_FAMILY_TO_DOMAIN_KEY[familyKey];
  const domain = domainKey ? DOMAINS_OF_FORGERY[domainKey] : undefined;
  const familyIndex = domain?.weaponAscensionFamilies.indexOf(familyKey) ?? -1;
  const availability = familyIndex >= 0 ? AVAILABLE_DAYS_BY_FAMILY_INDEX[familyIndex] : undefined;

  return {
    domainKey,
    domain,
    availability,
    availableDays: availability ? AVAILABLE_DAY_LABELS_BY_GROUP[availability] : [],
  };
}

export const WEAPON_ASCENSION_MATERIAL_FAMILIES: Record<string, FamilySeed> = {
  Decarabian: {
    key: "Decarabian",
    displayName: "Decarabian",
    tiers: {
      twoStar: "TileOfDecarabiansTower",
      threeStar: "DebrisOfDecarabiansCity",
      fourStar: "FragmentOfDecarabiansEpic",
      fiveStar: "ScatteredPieceOfDecarabiansDream",
    },
    tierDisplayNames: {
      twoStar: "Tile of Decarabian's Tower",
      threeStar: "Debris of Decarabian's City",
      fourStar: "Fragment of Decarabian's Epic",
      fiveStar: "Scattered Piece of Decarabian's Dream",
    },
    usedByWeapons: ["Dull Blade", "Silver Sword", "Cool Steel", "Favonius Sword", "Royal Longsword", "The Alley Flash", "Cinnabar Spindle", "Wolf-Fang", "Aquila Favonia", "Ferrous Shadow", "The Bell", "Snow-Tombed Starsilver", "Song of Broken Pines", "Apprentice's Notes", "Pocket Grimoire", "Magic Guide", "Favonius Codex", "Royal Grimoire", "Raven Bow", "The Stringless", "The Viridescent Hunt", "Mitternachts Waltz", "Athame Artis", "Disaster and Remorse"],
  },
  BorealWolf: {
    key: "BorealWolf",
    displayName: "Boreal Wolf",
    tiers: {
      twoStar: "BorealWolfsMilkTooth",
      threeStar: "BorealWolfsCrackedTooth",
      fourStar: "BorealWolfsBrokenFang",
      fiveStar: "BorealWolfsNostalgia",
    },
    tierDisplayNames: {
      twoStar: "Boreal Wolf's Milk Tooth",
      threeStar: "Boreal Wolf's Cracked Tooth",
      fourStar: "Boreal Wolf's Broken Fang",
      fiveStar: "Boreal Wolf's Nostalgia",
    },
    usedByWeapons: ["Harbinger of Dawn", "The Flute", "The Black Sword", "Sword of Descension", "Skyward Blade", "Waster Greatsword", "Old Merc's Pal", "Bloodtainted Greatsword", "Sacrificial Greatsword", "Skyward Pride", "Deathmatch", "Dragonspine Spear", "Missive Windspear", "Thrilling Tales of Dragon Slayers", "The Widsith", "Wine and Song", "Dodoco Tales", "Skyward Atlas", "Hunter's Bow", "Seasoned Hunter's Bow", "Sharpshooter's Oath", "Sacrificial Bow", "Skyward Harp", "Elegy for the End", "Ballad of the Boundless Blue", "Gest of the Mighty Wolf"],
  },
  DandelionGladiator: {
    key: "DandelionGladiator",
    displayName: "Dandelion Gladiator",
    tiers: {
      twoStar: "FettersOfTheDandelionGladiator",
      threeStar: "ChainsOfTheDandelionGladiator",
      fourStar: "ShacklesOfTheDandelionGladiator",
      fiveStar: "DreamOfTheDandelionGladiator",
    },
    tierDisplayNames: {
      twoStar: "Fetters of the Dandelion Gladiator",
      threeStar: "Chains of the Dandelion Gladiator",
      fourStar: "Shackles of the Dandelion Gladiator",
      fiveStar: "Dream of the Dandelion Gladiator",
    },
    usedByWeapons: ["Traveler's Handy Sword", "Sacrificial Sword", "Festering Desire", "Freedom-Sworn", "White Iron Greatsword", "Favonius Greatsword", "Royal Greatsword", "Mailed Flower", "Wolf's Gravestone", "Beginner's Protector", "Iron Point", "Favonius Lance", "Skyward Spine", "Otherworldly Story", "Sacrificial Fragments", "Frostbearer", "Lost Prayer to the Sacred Winds", "Recurve Bow", "Favonius Warbow", "Royal Bow", "Alley Hunter", "Windblume Ode", "Amos' Bow", "The Daybreak Chronicles"],
  },
  Guyun: {
    key: "Guyun",
    displayName: "Guyun",
    tiers: {
      twoStar: "LuminousSandsFromGuyun",
      threeStar: "LustrousStoneFromGuyun",
      fourStar: "RelicFromGuyun",
      fiveStar: "DivineBodyFromGuyun",
    },
    tierDisplayNames: {
      twoStar: "Luminous Sands from Guyun",
      threeStar: "Lustrous Stone from Guyun",
      fourStar: "Relic from Guyun",
      fiveStar: "Divine Body from Guyun",
    },
    usedByWeapons: ["Dark Iron Sword", "Lion's Roar", "Blackcliff Longsword", "Summit Shaper", "Whiteblind", "Lithic Blade", "White Tassel", "Crescent Pike", "Primordial Jade Winged-Spear", "Emerald Orb", "Solar Pearl", "Blackcliff Agate", "Sacrificial Jade", "Jadefall's Splendor", "Slingshot", "Rust", "Blackcliff Warbow", "Aqua Simulacra"],
  },
  MistVeiledElixir: {
    key: "MistVeiledElixir",
    displayName: "Mist Veiled Elixir",
    tiers: {
      twoStar: "MistVeiledLeadElixir",
      threeStar: "MistVeiledMercuryElixir",
      fourStar: "MistVeiledGoldElixir",
      fiveStar: "MistVeiledPrimoElixir",
    },
    tierDisplayNames: {
      twoStar: "Mist Veiled Lead Elixir",
      threeStar: "Mist Veiled Mercury Elixir",
      fourStar: "Mist Veiled Gold Elixir",
      fiveStar: "Mist Veiled Primo Elixir",
    },
    usedByWeapons: ["Fillet Blade", "Prototype Rancour", "Primordial Jade Cutter", "Debate Club", "Rainslasher", "Blackcliff Slasher", "The Unforged", "Halberd", "Dragon's Bane", "Blackcliff Pole", "Royal Spear", "Calamity Queller", "Twin Nephrite", "Prototype Amber", "Eye of Perception", "Messenger", "Prototype Crescent", "Crane's Echoing Call"],
  },
  Aerosiderite: {
    key: "Aerosiderite",
    displayName: "Aerosiderite",
    tiers: {
      twoStar: "GrainOfAerosiderite",
      threeStar: "PieceOfAerosiderite",
      fourStar: "BitOfAerosiderite",
      fiveStar: "ChunkOfAerosiderite",
    },
    tierDisplayNames: {
      twoStar: "Grain of Aerosiderite",
      threeStar: "Piece of Aerosiderite",
      fourStar: "Bit of Aerosiderite",
      fiveStar: "Chunk of Aerosiderite",
    },
    usedByWeapons: ["Skyrider Sword", "Iron Sting", "Skyrider Greatsword", "Prototype Archaic", "Serpent Spine", "Luxurious Sea-Lord", "Black Tassel", "Prototype Starglitter", "Lithic Spear", "Staff of Homa", "Vortex Vanquisher", "Mappa Mare", "Memory of Dust", "Compound Bow", "Fading Twilight", "Cloudforged", "Lightbearing Moonshard"],
  },
  DistantSea: {
    key: "DistantSea",
    displayName: "Distant Sea",
    tiers: {
      twoStar: "CoralBranchOfADistantSea",
      threeStar: "JeweledBranchOfADistantSea",
      fourStar: "JadeBranchOfADistantSea",
      fiveStar: "GoldenBranchOfADistantSea",
    },
    tierDisplayNames: {
      twoStar: "Coral Branch of a Distant Sea",
      threeStar: "Jeweled Branch of a Distant Sea",
      fourStar: "Jade Branch of a Distant Sea",
      fiveStar: "Golden Branch of a Distant Sea",
    },
    usedByWeapons: ["Amenoma Kageuchi", "Mistsplitter Reforged", "Akuoumaru", "Hakushin Ring", "Oathsworn Eye", "Everlasting Moonglow", "Uraku Misugiri"],
  },
  Narukami: {
    key: "Narukami",
    displayName: "Narukami",
    tiers: {
      twoStar: "NarukamisWisdom",
      threeStar: "NarukamisJoy",
      fourStar: "NarukamisAffection",
      fiveStar: "NarukamisValor",
    },
    tierDisplayNames: {
      twoStar: "Narukami's Wisdom",
      threeStar: "Narukami's Joy",
      fourStar: "Narukami's Affection",
      fiveStar: "Narukami's Valor",
    },
    usedByWeapons: ["Toukabou Shigure", "Haran Geppaku Futsu", "Katsuragikiri Nagamasa", "Redhorn Stonethresher", "Hamayumi", "Predator", "Mouun's Moon", "Thundering Pulse", "Sunny Morning Sleep-In"],
  },
  Mask: {
    key: "Mask",
    displayName: "Mask",
    tiers: {
      twoStar: "MaskOfTheWickedLieutenant",
      threeStar: "MaskOfTheTigersBite",
      fourStar: "MaskOfTheOneHorned",
      fiveStar: "MaskOfTheKijin",
    },
    tierDisplayNames: {
      twoStar: "Mask of the Wicked Lieutenant",
      threeStar: "Mask of the Tiger's Bite",
      fourStar: "Mask of the One-Horned",
      fiveStar: "Mask of the Kijin",
    },
    usedByWeapons: ["Kagotsurube Isshin", "Kitain Cross Spear", "The Catch", "Wavebreaker's Fin", "Engulfing Lightning", "Kagura's Verity", "Polar Star", "Tamayuratei no Ohanashi"],
  },
  ForestDew: {
    key: "ForestDew",
    displayName: "Forest Dew",
    tiers: {
      twoStar: "CopperTalismanOfTheForestDew",
      threeStar: "IronTalismanOfTheForestDew",
      fourStar: "SilverTalismanOfTheForestDew",
      fiveStar: "GoldenTalismanOfTheForestDew",
    },
    tierDisplayNames: {
      twoStar: "Copper Talisman of the Forest Dew",
      threeStar: "Iron Talisman of the Forest Dew",
      fourStar: "Silver Talisman of the Forest Dew",
      fiveStar: "Golden Talisman of the Forest Dew",
    },
    usedByWeapons: ["Sapwood Blade", "Xiphos' Moonlight", "Key of Khaj-Nisut", "Light of Foliar Incision", "Forest Regalia", "Ibis Piercer", "Dialogues of the Desert Sages"],
  },
  OasisGarden: {
    key: "OasisGarden",
    displayName: "Oasis Garden",
    tiers: {
      twoStar: "OasisGardensReminiscence",
      threeStar: "OasisGardensKindness",
      fourStar: "OasisGardensMourning",
      fiveStar: "OasisGardensTruth",
    },
    tierDisplayNames: {
      twoStar: "Oasis Garden's Reminiscence",
      threeStar: "Oasis Garden's Kindness",
      fourStar: "Oasis Garden's Mourning",
      fiveStar: "Oasis Garden's Truth",
    },
    usedByWeapons: ["Talking Stick", "Moonpiercer", "Staff of the Scarlet Sands", "Wandering Evenstar", "Fruit of Fulfillment", "A Thousand Floating Dreams", "Reliquary of Truth"],
  },
  ScorchingMight: {
    key: "ScorchingMight",
    displayName: "Scorching Might",
    tiers: {
      twoStar: "EchoOfScorchingMight",
      threeStar: "RemnantGlowOfScorchingMight",
      fourStar: "DreamOfScorchingMight",
      fiveStar: "OldenDaysOfScorchingMight",
    },
    tierDisplayNames: {
      twoStar: "Echo of Scorching Might",
      threeStar: "Remnant Glow of Scorching Might",
      fourStar: "Dream of Scorching Might",
      fiveStar: "Olden Days of Scorching Might",
    },
    usedByWeapons: ["Makhaira Aquamarine", "Beacon of the Reed Sea", "Tulaytullah's Remembrance", "King's Squire", "End of the Line", "Scion of the Blazing Sun", "Hunter's Path"],
  },
  AncientChord: {
    key: "AncientChord",
    displayName: "Ancient Chord",
    tiers: {
      twoStar: "FragmentOfAnAncientChord",
      threeStar: "ChapterOfAnAncientChord",
      fourStar: "MovementOfAnAncientChord",
      fiveStar: "EchoOfAnAncientChord",
    },
    tierDisplayNames: {
      twoStar: "Fragment of an Ancient Chord",
      threeStar: "Chapter of an Ancient Chord",
      fourStar: "Movement of an Ancient Chord",
      fiveStar: "Echo of an Ancient Chord",
    },
    usedByWeapons: ["Fleuve Cendre Ferryman", "Song of Stillness", "The First Great Magic", "Prospector's Drill", "Range Gauge", "Sword of Narzissenkreuz", "Verdict", "Absolution", "Sequence of Solitude"],
  },
  PureSacredDewdrop: {
    key: "PureSacredDewdrop",
    displayName: "Pure Sacred Dewdrop",
    tiers: {
      twoStar: "DrossOfPureSacredDewdrop",
      threeStar: "SublimationOfPureSacredDewdrop",
      fourStar: "SpringOfPureSacredDewdrop",
      fiveStar: "EssenceOfPureSacredDewdrop",
    },
    tierDisplayNames: {
      twoStar: "Dross of Pure Sacred Dewdrop",
      threeStar: "Sublimation of Pure Sacred Dewdrop",
      fourStar: "Spring of Pure Sacred Dewdrop",
      fiveStar: "Essence of Pure Sacred Dewdrop",
    },
    usedByWeapons: ["Finale of the Deep", "Flowing Purity", "The Dockhand's Assistant", "Tome of the Eternal Flow", "Splendor of Tranquil Waters", "Silvershower Heartstrings", "Symphonist of Scents"],
  },
  PristineSea: {
    key: "PristineSea",
    displayName: "Pristine Sea",
    tiers: {
      twoStar: "BrokenGobletOfThePristineSea",
      threeStar: "WineGobletOfThePristineSea",
      fourStar: "SilverGobletOfThePristineSea",
      fiveStar: "GoldenGobletOfThePristineSea",
    },
    tierDisplayNames: {
      twoStar: "Broken Goblet of the Pristine Sea",
      threeStar: "Wine Goblet of the Pristine Sea",
      fourStar: "Silver Goblet of the Pristine Sea",
      fiveStar: "Golden Goblet of the Pristine Sea",
    },
    usedByWeapons: ["Tidal Shadow", "Ballad of the Fjords", "Rightful Reward", "Portable Power Saw", "Cashflow Supervision", "Ultimate Overlord's Mega Magic Sword", "Crimson Moon's Semblance", "Lumidouce Elegy"],
  },
  BlazingSacrificialHeart: {
    key: "BlazingSacrificialHeart",
    displayName: "Blazing Sacrificial Heart",
    tiers: {
      twoStar: "BlazingSacrificialHeartsTerror",
      threeStar: "BlazingSacrificialHeartsHesitance",
      fourStar: "BlazingSacrificialHeartsResolve",
      fiveStar: "BlazingSacrificialHeartsSplendor",
    },
    tierDisplayNames: {
      twoStar: "Blazing Sacrificial Heart's Terror",
      threeStar: "Blazing Sacrificial Heart's Hesitance",
      fourStar: "Blazing Sacrificial Heart's Resolve",
      fiveStar: "Blazing Sacrificial Heart's Splendor",
    },
    usedByWeapons: ["Flute of Ezpitzal", "Earth Shaker", "Surf's Up", "Sturdy Bone", "Waveriding Whirl", "A Thousand Blazing Suns", "Fractured Halo"],
  },
  SacredLord: {
    key: "SacredLord",
    displayName: "Sacred Lord",
    tiers: {
      twoStar: "DeliriousDecadenceOfTheSacredLord",
      threeStar: "DeliriousDesolationOfTheSacredLord",
      fourStar: "DeliriousDemeanorOfTheSacredLord",
      fiveStar: "DeliriousDivinityOfTheSacredLord",
    },
    tierDisplayNames: {
      twoStar: "Delirious Decadence of the Sacred Lord",
      threeStar: "Delirious Desolation of the Sacred Lord",
      fourStar: "Delirious Demeanor of the Sacred Lord",
      fiveStar: "Delirious Divinity of the Sacred Lord",
    },
    usedByWeapons: ["Fang of the Mountain King", "Footprint of the Rainbow", "Ring of Yaxche", "Mountain-Bracing Bolt", "Calamity of Eshu", "Starcaller's Watch", "Vivid Notions", "Flame-Forged Insight"],
  },
  NightWind: {
    key: "NightWind",
    displayName: "Night-Wind",
    tiers: {
      twoStar: "NightWindsMysticConsideration",
      threeStar: "NightWindsMysticPremonition",
      fourStar: "NightWindsMysticAugury",
      fiveStar: "NightWindsMysticRevelation",
    },
    tierDisplayNames: {
      twoStar: "Night-Wind's Mystic Consideration",
      threeStar: "Night-Wind's Mystic Premonition",
      fourStar: "Night-Wind's Mystic Augury",
      fiveStar: "Night-Wind's Mystic Revelation",
    },
    usedByWeapons: ["Ash-Graven Drinking Horn", "Chain Breaker", "Fruitful Hook", "Peak Patrol Song", "Flower-Wreathed Feathers", "Astral Vulture's Crimson Plumage", "Azurelight", "Rainbow Serpent's Rain Bow"],
  },
  ArtfulDevice: {
    key: "ArtfulDevice",
    displayName: "Artful Device",
    tiers: {
      twoStar: "ArtfulDeviceFragment",
      threeStar: "ArtfulDeviceReplica",
      fourStar: "ArtfulDeviceInheritance",
      fiveStar: "ArtfulDeviceWish",
    },
    tierDisplayNames: {
      twoStar: "Artful Device Fragment",
      threeStar: "Artful Device Replica",
      fourStar: "Artful Device Inheritance",
      fiveStar: "Artful Device Wish",
    },
    usedByWeapons: ["Serenity's Call", "Blackmarrow Lantern", "Nightweaver's Looking Glass", "Dawning Frost", "Seven Edicts of Dust and Light"],
  },
  LongNightFlint: {
    key: "LongNightFlint",
    displayName: "Long Night Flint",
    tiers: {
      twoStar: "EmberOfLongNightFlint",
      threeStar: "AfterglowOfLongNightFlint",
      fourStar: "FlareOfLongNightFlint",
      fiveStar: "BlazeOfLongNightFlint",
    },
    tierDisplayNames: {
      twoStar: "Ember of Long Night Flint",
      threeStar: "Afterglow of Long Night Flint",
      fourStar: "Flare of Long Night Flint",
      fiveStar: "Blaze of Long Night Flint",
    },
    usedByWeapons: ["Prospector's Shovel", "Bloodsoaked Ruins", "Snare Hook", "Sacrificer's Staff", "Golden Frostbound Oath"],
  },
  FarNorthScions: {
    key: "FarNorthScions",
    displayName: "Far-North Scions",
    tiers: {
      twoStar: "SunderedGloryOfTheFarNorthScions",
      threeStar: "UnyieldingDelusionOfTheFarNorthScions",
      fourStar: "OblationOfTheFarNorthScions",
      fiveStar: "AureateRadianceOfTheFarNorthScions",
    },
    tierDisplayNames: {
      twoStar: "Sundered Glory of the Far-North Scions",
      threeStar: "Unyielding Delusion of the Far-North Scions",
      fourStar: "Oblation of the Far-North Scions",
      fiveStar: "Aureate Radiance of the Far-North Scions",
    },
    usedByWeapons: ["Moonweaver's Dawn", "Master Key", "Etherlight Spindlelute", "Nocturne's Curtain Call"],
  },
};

export function buildWeaponAscensionMaterialRegistry(weapons: Record<string, WeaponCatalogEntry>): {
  families: Record<string, WeaponAscensionMaterialFamilyRecord>;
  compatibilityFamilies: Record<string, WeaponAscensionFamily>;
  weaponMaterialProfiles: Record<string, WeaponMaterialProfile>;
  catalogUpdates: Record<string, WeaponCatalogEntry>;
  recipes: Record<string, CraftingRecipe>;
  materialSources: Record<string, MaterialSourceRecord[]>;
  unresolvedWeaponReferences: UnresolvedWeaponReference[];
} {
  const families: Record<string, WeaponAscensionMaterialFamilyRecord> = {};
  const compatibilityFamilies: Record<string, WeaponAscensionFamily> = {};
  const weaponMaterialProfiles: Record<string, WeaponMaterialProfile> = {};
  const catalogUpdates: Record<string, WeaponCatalogEntry> = {};
  const recipes: Record<string, CraftingRecipe> = {};
  const materialSources: Record<string, MaterialSourceRecord[]> = {};
  const unresolvedWeaponReferences: UnresolvedWeaponReference[] = [];

  for (const seed of Object.values(WEAPON_ASCENSION_MATERIAL_FAMILIES)) {
    const sourceMetadata = resolveFamilySourceMetadata(seed.key);
    const usedByWeaponKeys: string[] = [];
    for (const weaponName of seed.usedByWeapons) {
      const generatedKey = toMaterialKey(weaponName);
      const resolvedKey = resolveCanonicalWeaponKey(weaponName, weapons);
      if (!resolvedKey) {
        unresolvedWeaponReferences.push({
          familyId: seed.key,
          weaponName,
          generatedKey,
        });
        continue;
      }

      usedByWeaponKeys.push(resolvedKey);
      const existingWeapon = weapons[resolvedKey];
      catalogUpdates[resolvedKey] = {
        key: resolvedKey,
        displayName: weaponName.replace(/^"|"$/g, ""),
        weaponType: existingWeapon?.weaponType as CharacterWeaponType | undefined,
        rarity: existingWeapon?.rarity,
      };
      weaponMaterialProfiles[resolvedKey] = {
        ...(weaponMaterialProfiles[resolvedKey] ?? {
          weaponKey: resolvedKey,
          weaponType: existingWeapon?.weaponType as CharacterWeaponType | undefined,
        }),
        weaponKey: resolvedKey,
        rarity: (weaponMaterialProfiles[resolvedKey]?.rarity ?? existingWeapon?.rarity) as 1 | 2 | 3 | 4 | 5 | undefined,
        weaponType: (weaponMaterialProfiles[resolvedKey]?.weaponType ?? existingWeapon?.weaponType) as CharacterWeaponType | undefined,
        weaponAscensionFamilyKey: seed.key,
        weaponAscensionMaterialFamily: [
          seed.tiers.twoStar,
          seed.tiers.threeStar,
          seed.tiers.fourStar,
          seed.tiers.fiveStar,
        ],
      };
    }

    families[seed.key] = {
      ...seed,
      category: "weapon_ascension_material_family",
      source: sourceMetadata.domain
        ? {
            type: "domain_of_forgery",
            region: sourceMetadata.domain.region,
            domainName: sourceMetadata.domain.name,
            availableDays: sourceMetadata.availableDays,
            sourceHint: undefined,
          }
        : DEFAULT_SOURCE,
      usedByWeaponKeys,
      craftable: true,
      conversionRatio: 3,
      status: sourceMetadata.domain ? "verified" : "needs_manual_review",
    };

    compatibilityFamilies[seed.key] = {
      key: seed.key,
      tier1: seed.tiers.twoStar,
      tier2: seed.tiers.threeStar,
      tier3: seed.tiers.fourStar,
      tier4: seed.tiers.fiveStar,
      domainKey: sourceMetadata.domainKey,
      domainName: sourceMetadata.domain?.name,
      region: sourceMetadata.domain?.region,
      availability: sourceMetadata.availability ?? "UNKNOWN",
    };

    const tierRows = [
      seed.tiers.twoStar,
      seed.tiers.threeStar,
      seed.tiers.fourStar,
      seed.tiers.fiveStar,
    ] as const;
    for (const materialKey of tierRows) {
      materialSources[materialKey] = [
        {
          materialKey,
          sourceType: "domain_of_forgery",
          sourceKey: sourceMetadata.domainKey ?? seed.key,
          sourceName: sourceMetadata.domain?.name ?? seed.displayName,
          availability: sourceMetadata.availability ?? "UNKNOWN",
          region: sourceMetadata.domain?.region,
          notes: sourceMetadata.domain
            ? `${seed.displayName} drops in ${sourceMetadata.domain.name}.`
            : DEFAULT_SOURCE.sourceHint,
        },
      ];
    }

    recipes[seed.tiers.threeStar] = {
      outputMaterialKey: seed.tiers.threeStar,
      outputQuantity: 1,
      ingredients: {
        [seed.tiers.twoStar]: 3,
      },
    };
    recipes[seed.tiers.fourStar] = {
      outputMaterialKey: seed.tiers.fourStar,
      outputQuantity: 1,
      ingredients: {
        [seed.tiers.threeStar]: 3,
      },
    };
    recipes[seed.tiers.fiveStar] = {
      outputMaterialKey: seed.tiers.fiveStar,
      outputQuantity: 1,
      ingredients: {
        [seed.tiers.fourStar]: 3,
      },
    };
  }

  return {
    families,
    compatibilityFamilies,
    weaponMaterialProfiles,
    catalogUpdates,
    recipes,
    materialSources,
    unresolvedWeaponReferences,
  };
}
