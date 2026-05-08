import type { CraftingRecipe } from "../crafting/types";
import type {
  CharacterCatalogEntry,
  CharacterReferenceMetadata,
  EnemyDropFamily,
  GeneralEnemyDropFamily,
  MaterialDescriptor,
  MaterialFamilyReference,
  MaterialSourceRecord,
  StaticGameData,
  UnresolvedCharacterReference,
  UnresolvedWeaponReference,
  WeaponCatalogEntry,
} from "./types";

export function toIrminsulKey(displayName: string): string {
  return displayName
    .replace(/^"|"$/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/['’"`:.,!?()[\]\-–—]/g, "")
    .replace(/&/g, "And")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function parseCharacterReference(displayName: string): CharacterReferenceMetadata {
  const travelerMatch = displayName.match(/^Traveler(?: \(([^)]+)\))?$/);
  if (travelerMatch) {
    return {
      displayName,
      characterKey: "Traveler",
      travelerElement: travelerMatch[1] ?? undefined,
    };
  }

  return {
    displayName,
    characterKey: toIrminsulKey(displayName),
  };
}

export const GENERAL_ENEMY_DROP_FAMILIES: GeneralEnemyDropFamily[] = [
  {
    familyId: "slime_materials",
    displayName: "Slime Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Slimes",
    materialNames: ["Slime Condensate", "Slime Secretions", "Slime Concentrate"],
    materialKeys: ["SlimeCondensate", "SlimeSecretions", "SlimeConcentrate"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Arataki Itto", "Columbina", "Gaming", "Lisa", "Venti", "Xiangling", "Xiao", "Yaoyao", "Zhongli"],
    usedByWeapons: ["Alley Hunter", "Amos' Bow", "Favonius Lance", "Harbinger of Dawn", "Lost Prayer to the Sacred Winds", "Luxurious Sea-Lord", "Magic Guide", "Mappa Mare", "Missive Windspear", "Old Merc's Pal", "Royal Greatsword", "Sacrificial Bow", "Sharpshooter's Oath", "Skyward Blade", "Skyward Pride", "Snow-Tombed Starsilver", "Staff of Homa", "Talking Stick", "The Black Sword", "The Flute", "Waster Greatsword", "White Iron Greatsword"],
  },
  {
    familyId: "hilichurl_materials",
    displayName: "Hilichurl Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Hilichurls",
    materialNames: ["Damaged Mask", "Stained Mask", "Ominous Mask"],
    materialKeys: ["DamagedMask", "StainedMask", "OminousMask"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Chongyun", "Eula", "Jean", "Kujou Sara", "Noelle", "Razor", "Traveler", "Xingqiu", "Yun Jin"],
    usedByWeapons: ["Apprentice's Notes", "Cinnabar Spindle", "Dark Iron Sword", "Debate Club", "Dodoco Tales", "Eye of Perception", "Memory of Dust", "Otherworldly Story", "Pocket Grimoire", "Prototype Archaic", "Prototype Starglitter", "Ring of Yaxche", "Royal Longsword", "Rust", "Slingshot", "Song of Broken Pines", "Summit Shaper", "The Widsith", "Wolf-Fang"],
  },
  {
    familyId: "samachurl_materials",
    displayName: "Samachurl Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Samachurls",
    materialNames: ["Divining Scroll", "Sealed Scroll", "Forbidden Curse Scroll"],
    materialKeys: ["DiviningScroll", "SealedScroll", "ForbiddenCurseScroll"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Albedo", "Barbara", "Cyno", "Klee", "Layla", "Qiqi", "Traveler (Anemo)", "Traveler (Unaligned)", "Xianyun", "Yoimiya"],
    usedByWeapons: ["Beginner's Protector", "Blackcliff Agate", "Crane's Echoing Call", "Dragon's Bane", "Fading Twilight", "Favonius Codex", "Freedom-Sworn", "Hakushin Ring", "Iron Point", "Rainslasher", "Recurve Bow", "Royal Bow", "Sacrificial Jade", "Sacrificial Sword", "Skyward Spine", "The Alley Flash", "Thrilling Tales of Dragon Slayers", "Traveler's Handy Sword", "Wolf's Gravestone"],
  },
  {
    familyId: "hilichurl_shooter_materials",
    displayName: "Hilichurl Shooter Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Hilichurl Shooters",
    materialNames: ["Firm Arrowhead", "Sharp Arrowhead", "Weathered Arrowhead"],
    materialKeys: ["FirmArrowhead", "SharpArrowhead", "WeatheredArrowhead"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Amber", "Collei", "Dahlia", "Diona", "Fischl", "Traveler (Geo)"],
    usedByWeapons: ["Aquila Favonia", "Black Tassel", "Blackcliff Longsword", "Bloodtainted Greatsword", "Cool Steel", "Dull Blade", "Favonius Sword", "Hamayumi", "King's Squire", "Lithic Blade", "Lithic Spear", "Predator", "Prototype Amber", "Raven Bow", "Sacrificial Greatsword", "Silver Sword", "Skyward Atlas", "Skyward Harp", "Snare Hook", "Song of Stillness", "The Stringless", "The Viridescent Hunt", "Thundering Pulse"],
  },
  {
    familyId: "fatui_skirmisher_materials",
    displayName: "Fatui Skirmisher Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Fatui Skirmishers",
    materialNames: ["Recruit's Insignia", "Sergeant's Insignia", "Lieutenant's Insignia"],
    materialKeys: ["RecruitsInsignia", "SergeantsInsignia", "LieutenantsInsignia"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Arlecchino", "Diluc", "Lyney", "Mika", "Ningguang", "Rosaria", "Tartaglia", "Yelan"],
    usedByWeapons: ["Blackcliff Pole", "Blackcliff Slasher", "Cloudforged", "Compound Bow", "Dragonspine Spear", "Elegy for the End", "Favonius Greatsword", "Festering Desire", "Gest of the Mighty Wolf", "Moonpiercer", "Primordial Jade Winged-Spear", "Prototype Rancour", "Royal Grimoire", "Royal Spear", "Skyrider Sword", "Twin Nephrite", "White Tassel"],
  },
  {
    familyId: "treasure_hoarder_materials",
    displayName: "Treasure Hoarder Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Treasure Hoarders",
    materialNames: ["Treasure Hoarder Insignia", "Silver Raven Insignia", "Golden Raven Insignia"],
    materialKeys: ["TreasureHoarderInsignia", "SilverRavenInsignia", "GoldenRavenInsignia"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Beidou", "Bennett", "Kaedehara Kazuha", "Kaeya", "Shikanoin Heizou", "Thoma", "Xinyan", "Yanfei"],
    usedByWeapons: ["Ballad of the Boundless Blue", "Crescent Pike", "Emerald Orb", "Fillet Blade", "Hunter's Bow", "Kitain Cross Spear", "Lion's Roar", "Makhaira Aquamarine", "Messenger", "Mitternachts Waltz", "Primordial Jade Cutter", "Prototype Crescent", "Sacrificial Fragments", "Seasoned Hunter's Bow", "Skyrider Greatsword", "Sword of Descension", "The Daybreak Chronicles", "The Unforged", "Vortex Vanquisher", "Whiteblind", "Wine and Song"],
  },
  {
    familyId: "whopperflower_materials",
    displayName: "Whopperflower Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Whopperflowers",
    materialNames: ["Whopperflower Nectar", "Shimmering Nectar", "Energy Nectar"],
    materialKeys: ["WhopperflowerNectar", "ShimmeringNectar", "EnergyNectar"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Furina", "Ganyu", "Hu Tao", "Keqing", "Lan Yan", "Mona", "Sayu", "Shenhe", "Sucrose"],
    usedByWeapons: ["Ballad of the Fjords", "Blackcliff Warbow", "Calamity Queller", "Deathmatch", "Favonius Warbow", "Ferrous Shadow", "Frostbearer", "Halberd", "Iron Sting", "Lumidouce Elegy", "Mountain-Bracing Bolt", "Serpent Spine", "Solar Pearl", "The Bell", "Windblume Ode"],
  },
  {
    familyId: "nobushi_materials",
    displayName: "Nobushi Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Nobushi and Kairagi",
    materialNames: ["Old Handguard", "Kageuchi Handguard", "Famed Handguard"],
    materialKeys: ["OldHandguard", "KageuchiHandguard", "FamedHandguard"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Kamisato Ayaka", "Kamisato Ayato", "Raiden Shogun", "Traveler (Electro)", "Wanderer", "Yae Miko", "Yumemizuki Mizuki"],
    usedByWeapons: ["Akuoumaru", "Amenoma Kageuchi", "Engulfing Lightning", "Finale of the Deep", "Haran Geppaku Futsu", "Katsuragikiri Nagamasa", "Mistsplitter Reforged", "Redhorn Stonethresher", "Tamayuratei no Ohanashi", "Toukabou Shigure", "Uraku Misugiri", "Wavebreaker's Fin"],
  },
  {
    familyId: "specter_materials",
    displayName: "Specter Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Specters",
    materialNames: ["Spectral Husk", "Spectral Heart", "Spectral Nucleus"],
    materialKeys: ["SpectralHusk", "SpectralHeart", "SpectralNucleus"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Aloy", "Chiori", "Gorou", "Kirara", "Kuki Shinobu", "Sangonomiya Kokomi"],
    usedByWeapons: ['"The Catch"', "Aqua Simulacra", "Dialogues of the Desert Sages", "Everlasting Moonglow", "Kagotsurube Isshin", "Kagura's Verity", "Mailed Flower", "Mouun's Moon", "Oathsworn Eye", "Polar Star", "Sunny Morning Sleep-In"],
  },
  {
    familyId: "fungus_materials",
    displayName: "Fungus Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Fungi",
    materialNames: ["Fungal Spores", "Luminescent Pollen", "Crystalline Cyst Dust"],
    materialKeys: ["FungalSpores", "LuminescentPollen", "CrystallineCystDust"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Baizhu", "Kaveh", "Nahida", "Nilou", "Tighnari", "Traveler (Dendro)"],
    usedByWeapons: ["A Thousand Floating Dreams", "End of the Line", "Fruit of Fulfillment", "Jadefall's Splendor", "Reliquary of Truth", "Scion of the Blazing Sun", "Staff of the Scarlet Sands", "Tulaytullah's Remembrance", "Wandering Evenstar"],
  },
  {
    familyId: "eremite_materials",
    displayName: "The Eremites Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "The Eremites",
    materialNames: ["Faded Red Satin", "Trimmed Red Silk", "Rich Red Brocade"],
    materialKeys: ["FadedRedSatin", "TrimmedRedSilk", "RichRedBrocade"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Alhaitham", "Candace", "Dehya", "Dori", "Faruzan", "Sethos"],
    usedByWeapons: ["Beacon of the Reed Sea", "Forest Regalia", "Hunter's Path", "Ibis Piercer", "Key of Khaj-Nisut", "Light of Foliar Incision", "Sapwood Blade", "Xiphos' Moonlight"],
  },
  {
    familyId: "fontemer_aberrant_materials",
    displayName: "Fontemer Aberrant Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Fontemer Aberrants",
    materialNames: ["Transoceanic Pearl", "Transoceanic Chunk", "Xenochromatic Crystal"],
    materialKeys: ["TransoceanicPearl", "TransoceanicChunk", "XenochromaticCrystal"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Clorinde", "Freminet", "Navia", "Neuvillette", "Sigewinne", "Traveler (Hydro)"],
    usedByWeapons: ["Cashflow Supervision", "Flame-Forged Insight", "Fleuve Cendre Ferryman", "Flowing Purity", "Range Gauge", "Silvershower Heartstrings", "Splendor of Tranquil Waters", "Sword of Narzissenkreuz", "Symphonist of Scents", "The Dockhand's Assistant", "The First Great Magic"],
  },
  {
    familyId: "clockwork_meka_materials",
    displayName: "Clockwork Meka Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Clockwork Meka",
    materialNames: ["Meshing Gear", "Mechanical Spur Gear", "Artificed Dynamic Gear"],
    materialKeys: ["MeshingGear", "MechanicalSpurGear", "ArtificedDynamicGear"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Charlotte", "Chevreuse", "Emilie", "Escoffier", "Lynette", "Skirk", "Wriothesley"],
    usedByWeapons: ['"Ultimate Overlord\'s Mega Magic Sword"', "Absolution", "Crimson Moon's Semblance", "Portable Power Saw", "Prospector's Drill", "Rightful Reward", "Sequence of Solitude", "Tidal Shadow", "Tome of the Eternal Flow", "Verdict"],
  },
  {
    familyId: "natlan_saurian_materials",
    displayName: "Natlan Saurian Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Natlan Saurians",
    materialNames: ["Juvenile Fang", "Seasoned Fang", "Tyrant's Fang"],
    materialKeys: ["JuvenileFang", "SeasonedFang", "TyrantsFang"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Chasca", "Citlali", "Ifa", "Kinich", "Ororon", "Varesa"],
    usedByWeapons: ["A Thousand Blazing Suns", "Ash-Graven Drinking Horn", "Chain Breaker", "Flute of Ezpitzal", "Fractured Halo", "Fruitful Hook", "Peak Patrol Song", "Surf's Up", "Vivid Notions", "Waveriding Whirl"],
  },
  {
    familyId: "sauroform_tribal_warrior_materials",
    displayName: "Sauroform Tribal Warrior Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Sauroform Tribal Warriors",
    materialNames: ["Sentry's Wooden Whistle", "Warrior's Metal Whistle", "Saurian-Crowned Warrior's Golden Whistle"],
    materialKeys: ["SentrysWoodenWhistle", "WarriorsMetalWhistle", "SaurianCrownedWarriorsGoldenWhistle"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Iansan", "Ineffa", "Kachina", "Mavuika", "Mualani", "Traveler (Pyro)", "Xilonen"],
    usedByWeapons: ["Astral Vulture's Crimson Plumage", "Azurelight", "Calamity of Eshu", "Earth Shaker", "Fang of the Mountain King", "Flower-Wreathed Feathers", "Footprint of the Rainbow", "Starcaller's Watch", "Sturdy Bone"],
  },
  {
    familyId: "landcruiser_materials",
    displayName: "Landcruiser Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Landcruisers",
    materialNames: ["Broken Drive Shaft", "Reinforced Drive Shaft", "Precision Drive Shaft"],
    materialKeys: ["BrokenDriveShaft", "ReinforcedDriveShaft", "PrecisionDriveShaft"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Aino", "Flins", "Illuga", "Jahoda", "Varka"],
    usedByWeapons: ["Athame Artis", "Lightbearing Moonshard", "Master Key", "Moonweaver's Dawn", "Nightweaver's Looking Glass", "Prospector's Shovel", "Sacrificer's Staff"],
  },
  {
    familyId: "fatui_oprichniki_materials",
    displayName: "Fatui Oprichniki Materials",
    category: "general_enemy_drop",
    sourceType: "Common Enemies and some Elite Enemies",
    sourceEnemyFamily: "Fatui Oprichniki",
    materialNames: ["Tattered Warrant", "Immaculate Warrant", "Frost-Etched Warrant"],
    materialKeys: ["TatteredWarrant", "ImmaculateWarrant", "FrostEtchedWarrant"],
    rarity: [1, 2, 3],
    usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
    usedByCharacters: ["Durin", "Lauma", "Linnea", "Nefer", "Zibai"],
    usedByWeapons: ["Blackmarrow Lantern", "Bloodsoaked Ruins", "Dawning Frost", "Etherlight Spindlelute", "Golden Frostbound Oath", "Nocturne's Curtain Call", "Rainbow Serpent's Rain Bow", "Serenity's Call"],
  },
];

function normalizeLookupValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveCanonicalCharacterKey(reference: CharacterReferenceMetadata, characters: Record<string, CharacterCatalogEntry>): string | null {
  const byNormalizedDisplay = new Map(
    Object.values(characters).map((character) => [normalizeLookupValue(character.displayName), character.key]),
  );
  if (characters[reference.characterKey]) {
    return reference.characterKey;
  }
  return byNormalizedDisplay.get(normalizeLookupValue(reference.displayName)) ?? null;
}

function resolveCanonicalWeaponKey(displayName: string, weapons: Record<string, WeaponCatalogEntry>): string | null {
  const byNormalizedDisplay = new Map(
    Object.values(weapons).map((weapon) => [normalizeLookupValue(weapon.displayName), weapon.key]),
  );
  const cleanDisplayName = displayName.replace(/^"|"$/g, "");
  const generatedKey = toIrminsulKey(displayName);
  if (weapons[generatedKey]) {
    return generatedKey;
  }
  return byNormalizedDisplay.get(normalizeLookupValue(cleanDisplayName)) ?? null;
}

function buildRegistryFromFamilies(
  familiesList: GeneralEnemyDropFamily[],
  characters: Record<string, CharacterCatalogEntry>,
  weapons: Record<string, WeaponCatalogEntry>,
) {
  const families: Record<string, GeneralEnemyDropFamily> = {};
  const compatibilityFamilies: Record<string, EnemyDropFamily> = {};
  const materials: Record<string, MaterialDescriptor> = {};
  const materialSources: Record<string, MaterialSourceRecord[]> = {};
  const recipes: Record<string, CraftingRecipe> = {};
  const materialFamilyByKey: Record<string, MaterialFamilyReference> = {};
  const characterGeneralEnemyDropFamilyByKey: Record<string, string> = {};
  const weaponGeneralEnemyDropFamilyByKey: Record<string, string> = {};
  const generalEnemyDropCharacterReferences: CharacterReferenceMetadata[] = [];
  const unresolvedCharacterReferences: UnresolvedCharacterReference[] = [];
  const unresolvedWeaponReferences: UnresolvedWeaponReference[] = [];

  for (const family of familiesList) {
    const usedByCharacterReferences = family.usedByCharacters.map((displayName) => parseCharacterReference(displayName));
    const usedByCharacterKeys = usedByCharacterReferences.map((reference) => reference.characterKey);
    const usedByWeaponKeys = family.usedByWeapons.map((weaponName) => toIrminsulKey(weaponName));

    for (const reference of usedByCharacterReferences) {
      const resolvedKey = resolveCanonicalCharacterKey(reference, characters);
      if (resolvedKey) {
        characterGeneralEnemyDropFamilyByKey[resolvedKey] = family.familyId;
        generalEnemyDropCharacterReferences.push({
          ...reference,
          characterKey: resolvedKey,
        });
      } else {
        unresolvedCharacterReferences.push({
          familyId: family.familyId,
          displayName: reference.displayName,
          generatedKey: reference.characterKey,
          travelerElement: reference.travelerElement,
        });
      }
    }

    for (const weaponName of family.usedByWeapons) {
      const generatedKey = toIrminsulKey(weaponName);
      const resolvedKey = resolveCanonicalWeaponKey(weaponName, weapons);
      if (resolvedKey) {
        weaponGeneralEnemyDropFamilyByKey[resolvedKey] = family.familyId;
      } else {
        unresolvedWeaponReferences.push({
          familyId: family.familyId,
          weaponName,
          generatedKey,
        });
      }
    }

    families[family.familyId] = {
      ...family,
      usedByCharacterKeys,
      usedByCharacterReferences,
      usedByWeaponKeys,
    };

    compatibilityFamilies[family.familyId] = {
      key: family.familyId,
      low: family.materialKeys[0],
      mid: family.materialKeys[1],
      high: family.materialKeys[2],
      notes: `${family.displayName} · ${family.sourceEnemyFamily}`,
    };

    family.materialKeys.forEach((materialKey, index) => {
      materials[materialKey] = {
        key: materialKey,
        displayName: family.materialNames[index],
        category: "general_enemy_drop",
      };
      materialSources[materialKey] = [
        {
          materialKey,
          sourceType: "enemy_drop",
          sourceKey: family.familyId,
          sourceName: family.sourceEnemyFamily,
          availability: "ALWAYS",
          notes: family.displayName,
        },
      ];
      materialFamilyByKey[materialKey] = {
        familyId: family.familyId,
        displayName: family.displayName,
        category: "general_enemy_drop",
        sourceType: "Common Enemies and some Elite Enemies",
        sourceEnemyFamily: family.sourceEnemyFamily,
      };
    });

    recipes[family.materialKeys[1]] = {
      outputMaterialKey: family.materialKeys[1],
      outputQuantity: 1,
      ingredients: {
        [family.materialKeys[0]]: 3,
      },
    };
    recipes[family.materialKeys[2]] = {
      outputMaterialKey: family.materialKeys[2],
      outputQuantity: 1,
      ingredients: {
        [family.materialKeys[1]]: 3,
      },
    };
  }

  return {
    families,
    compatibilityFamilies,
    materials,
    materialSources,
    recipes,
    materialFamilyByKey,
    characterGeneralEnemyDropFamilyByKey,
    weaponGeneralEnemyDropFamilyByKey,
    generalEnemyDropCharacterReferences,
    unresolvedCharacterReferences,
    unresolvedWeaponReferences,
  };
}

export function buildGeneralEnemyDropRegistry(
  characters: Record<string, CharacterCatalogEntry>,
  weapons: Record<string, WeaponCatalogEntry>,
) {
  return buildRegistryFromFamilies(GENERAL_ENEMY_DROP_FAMILIES, characters, weapons);
}

export function buildGeneralEnemyDerivedDataFromFamilies(
  families: Record<string, GeneralEnemyDropFamily>,
  characters: Record<string, CharacterCatalogEntry>,
  weapons: Record<string, WeaponCatalogEntry>,
) {
  return buildRegistryFromFamilies(Object.values(families), characters, weapons);
}

export function buildGeneralEnemyMaterialFamilyIndex(
  families: Record<string, GeneralEnemyDropFamily>,
): Record<string, MaterialFamilyReference> {
  return Object.values(families).reduce<Record<string, MaterialFamilyReference>>((accumulator, family) => {
    family.materialKeys.forEach((materialKey) => {
      accumulator[materialKey] = {
        familyId: family.familyId,
        displayName: family.displayName,
        category: "general_enemy_drop",
        sourceType: "Common Enemies and some Elite Enemies",
        sourceEnemyFamily: family.sourceEnemyFamily,
      };
    });
    return accumulator;
  }, {});
}

export function findGeneralEnemyDropFamilyForMaterial(
  materialKey: string,
  staticData: StaticGameData,
): GeneralEnemyDropFamily | undefined {
  const familyReference = staticData.materialFamilyByKey[materialKey];
  if (!familyReference || familyReference.category !== "general_enemy_drop") {
    return undefined;
  }
  return staticData.generalEnemyDropFamilies[familyReference.familyId];
}
