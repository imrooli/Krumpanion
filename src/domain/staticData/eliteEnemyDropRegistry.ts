import type { CraftingRecipe } from "../crafting/types";
import type {
  EliteEnemyDropFamily,
  EnemyDropFamily,
  MaterialDescriptor,
  MaterialFamilyReference,
  MaterialSourceRecord,
  StaticGameData,
  UnresolvedWeaponReference,
  WeaponCatalogEntry,
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

export const ELITE_ENEMY_DROP_FAMILIES: EliteEnemyDropFamily[] = [
  {
    familyId: "mitachurl_materials",
    displayName: "Mitachurl Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Mitachurls",
    materialNames: ["Heavy Horn", "Black Bronze Horn", "Black Crystal Horn"],
    materialKeys: ["HeavyHorn", "BlackBronzeHorn", "BlackCrystalHorn"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Apprentice's Notes", "Aquila Favonia", "Cool Steel", "Dull Blade", "Elegy for the End", "Favonius Codex", "Favonius Sword", "Ferrous Shadow", "Festering Desire", "Magic Guide", "Mitternachts Waltz", "Pocket Grimoire", "Raven Bow", "Royal Grimoire", "Royal Longsword", "Silver Sword", "Snow-Tombed Starsilver", "Song of Broken Pines", "The Alley Flash", "The Bell", "The Daybreak Chronicles", "The Stringless", "The Viridescent Hunt"],
  },
  {
    familyId: "abyss_mage_materials",
    displayName: "Abyss Mage Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Abyss Mages",
    materialNames: ["Dead Ley Line Branch", "Dead Ley Line Leaves", "Ley Line Sprout"],
    materialKeys: ["DeadLeyLineBranch", "DeadLeyLineLeaves", "LeyLineSprout"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Bloodtainted Greatsword", "Deathmatch", "Dodoco Tales", "Harbinger of Dawn", "Hunter's Bow", "Old Merc's Pal", "Sacrificial Bow", "Sacrificial Greatsword", "Seasoned Hunter's Bow", "Sharpshooter's Oath", "Skyward Atlas", "Skyward Blade", "Skyward Harp", "Skyward Pride", "Staff of Homa", "Sword of Descension", "The Black Sword", "The Flute", "The Widsith", "Thrilling Tales of Dragon Slayers", "Waster Greatsword", "Windblume Ode", "Wine and Song"],
  },
  {
    familyId: "humanoid_ruin_machine_materials",
    displayName: "Humanoid Ruin Machine Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Humanoid Ruin Machines",
    materialNames: ["Chaos Device", "Chaos Circuit", "Chaos Core"],
    materialKeys: ["ChaosDevice", "ChaosCircuit", "ChaosCore"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Alley Hunter", "Amos' Bow", "Beginner's Protector", "Cinnabar Spindle", "Favonius Greatsword", "Favonius Lance", "Favonius Warbow", "Freedom-Sworn", "Frostbearer", "Iron Point", "Lost Prayer to the Sacred Winds", "Otherworldly Story", "Recurve Bow", "Royal Bow", "Royal Greatsword", "Sacrificial Fragments", "Sacrificial Sword", "Skyward Spine", "Traveler's Handy Sword", "White Iron Greatsword", "Wolf's Gravestone", "Wolf-Fang"],
  },
  {
    familyId: "fatui_cicin_mage_materials",
    displayName: "Fatui Cicin Mage Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Fatui Cicin Mages",
    materialNames: ["Mist Grass Pollen", "Mist Grass", "Mist Grass Wick"],
    materialKeys: ["MistGrassPollen", "MistGrass", "MistGrassWick"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Blackcliff Pole", "Blackcliff Slasher", "Calamity Queller", "Debate Club", "Dragon's Bane", "Dragonspine Spear", "Eye of Perception", "Fillet Blade", "Halberd", "Messenger", "Primordial Jade Cutter", "Prototype Amber", "Prototype Crescent", "Prototype Rancour", "Rainslasher", "Royal Spear", "Sacrificial Jade", "The Unforged", "Twin Nephrite"],
  },
  {
    familyId: "fatui_pyro_agent_materials",
    displayName: "Fatui Pyro Agent Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Fatui Pyro Agents",
    materialNames: ["Hunter's Sacrificial Knife", "Agent's Sacrificial Knife", "Inspector's Sacrificial Knife"],
    materialKeys: ["HuntersSacrificialKnife", "AgentsSacrificialKnife", "InspectorsSacrificialKnife"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Blackcliff Agate", "Blackcliff Longsword", "Blackcliff Warbow", "Crescent Pike", "Dark Iron Sword", "Emerald Orb", "Fading Twilight", "Lion's Roar", "Lithic Blade", "Primordial Jade Winged-Spear", "Rust", "Slingshot", "Solar Pearl", "Summit Shaper", "White Tassel", "Whiteblind"],
  },
  {
    familyId: "vishap_materials",
    displayName: "Vishap Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Vishaps",
    materialNames: ["Fragile Bone Shard", "Sturdy Bone Shard", "Fossilized Bone Shard"],
    materialKeys: ["FragileBoneShard", "SturdyBoneShard", "FossilizedBoneShard"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Ballad of the Boundless Blue", "Black Tassel", "Compound Bow", "Iron Sting", "Lithic Spear", "Luxurious Sea-Lord", "Mappa Mare", "Memory of Dust", "Prototype Archaic", "Prototype Starglitter", "Serpent Spine", "Skyrider Greatsword", "Skyrider Sword", "Vortex Vanquisher"],
  },
  {
    familyId: "ruin_sentinel_materials",
    displayName: "Ruin Sentinel Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Ruin Sentinels",
    materialNames: ["Chaos Gear", "Chaos Axis", "Chaos Oculus"],
    materialKeys: ["ChaosGear", "ChaosAxis", "ChaosOculus"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ['"The Catch"', "Amenoma Kageuchi", "Engulfing Lightning", "Katsuragikiri Nagamasa", "Kitain Cross Spear", "Mistsplitter Reforged", "Uraku Misugiri"],
  },
  {
    familyId: "mirror_maiden_materials",
    displayName: "Mirror Maiden Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Mirror Maidens",
    materialNames: ["Dismal Prism", "Crystal Prism", "Polarizing Prism"],
    materialKeys: ["DismalPrism", "CrystalPrism", "PolarizingPrism"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Everlasting Moonglow", "Hakushin Ring", "Hamayumi", "Mouun's Moon", "Predator", "Thundering Pulse"],
  },
  {
    familyId: "riftwolf_materials",
    displayName: "Riftwolf Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Riftwolves",
    materialNames: ["Concealed Claw", "Concealed Unguis", "Concealed Talon"],
    materialKeys: ["ConcealedClaw", "ConcealedUnguis", "ConcealedTalon"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Akuoumaru", "Kagura's Verity", "Oathsworn Eye", "Polar Star", "Redhorn Stonethresher", "Wavebreaker's Fin"],
  },
  {
    familyId: "black_serpent_materials",
    displayName: "The Black Serpents Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "The Black Serpents",
    materialNames: ["Gloomy Statuette", "Dark Statuette", "Deathly Statuette"],
    materialKeys: ["GloomyStatuette", "DarkStatuette", "DeathlyStatuette"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Aqua Simulacra", "Fruit of Fulfillment", "Haran Geppaku Futsu", "Kagotsurube Isshin", "Missive Windspear"],
  },
  {
    familyId: "state_shifted_fungus_materials",
    displayName: "State-Shifted Fungus Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "State-Shifted Fungi",
    materialNames: ["Inactivated Fungal Nucleus", "Dormant Fungal Nucleus", "Robust Fungal Nucleus"],
    materialKeys: ["InactivatedFungalNucleus", "DormantFungalNucleus", "RobustFungalNucleus"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["End of the Line", "Hunter's Path", "King's Squire", "Tulaytullah's Remembrance", "Wandering Evenstar"],
  },
  {
    familyId: "ruin_drake_materials",
    displayName: "Ruin Drake Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Ruin Drakes",
    materialNames: ["Chaos Storage", "Chaos Module", "Chaos Bolt"],
    materialKeys: ["ChaosStorage", "ChaosModule", "ChaosBolt"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Forest Regalia", "Makhaira Aquamarine", "Moonpiercer", "Sapwood Blade", "Staff of the Scarlet Sands"],
  },
  {
    familyId: "primal_construct_materials",
    displayName: "Primal Construct Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Primal Constructs",
    materialNames: ["Damaged Prism", "Turbid Prism", "Radiant Prism"],
    materialKeys: ["DamagedPrism", "TurbidPrism", "RadiantPrism"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["A Thousand Floating Dreams", "Key of Khaj-Nisut", "Toukabou Shigure", "Xiphos' Moonlight"],
  },
  {
    familyId: "consecrated_beast_materials",
    displayName: "Consecrated Beast Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Consecrated Beasts",
    materialNames: ["Desiccated Shell", "Sturdy Shell", "Marked Shell"],
    materialKeys: ["DesiccatedShell", "SturdyShell", "MarkedShell"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Beacon of the Reed Sea", "Light of Foliar Incision", "Mailed Flower", "Talking Stick"],
  },
  {
    familyId: "hilichurl_rogue_materials",
    displayName: "Hilichurl Rogue Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Hilichurl Rogues",
    materialNames: ["A Flower Yet to Bloom", "Treasured Flower", "Wanderer's Blooming Flower"],
    materialKeys: ["AFlowerYetToBloom", "TreasuredFlower", "WanderersBloomingFlower"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Ballad of the Fjords", "Ibis Piercer", "Jadefall's Splendor", "Scion of the Blazing Sun"],
  },
  {
    familyId: "tainted_hydro_phantasm_materials",
    displayName: "Tainted Hydro Phantasm Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Tainted Hydro Phantasms",
    materialNames: ["Drop of Tainted Water", "Scoop of Tainted Water", "Newborn Tainted Hydro Phantasm"],
    materialKeys: ["DropOfTaintedWater", "ScoopOfTaintedWater", "NewbornTaintedHydroPhantasm"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Finale of the Deep", "Fleuve Cendre Ferryman", "Range Gauge", "Song of Stillness", "Splendor of Tranquil Waters", "Symphonist of Scents", "The First Great Magic"],
  },
  {
    familyId: "breacher_primus_materials",
    displayName: "Breacher Primus Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Breacher Primuses",
    materialNames: ["Rift Core", "Foreign Synapse", "Alien Life Core"],
    materialKeys: ["RiftCore", "ForeignSynapse", "AlienLifeCore"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Flowing Purity", "Portable Power Saw", "Rightful Reward", "Tidal Shadow", "Tome of the Eternal Flow", "Verdict"],
  },
  {
    familyId: "fatui_operative_materials",
    displayName: "Fatui Operative Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Fatui Operatives",
    materialNames: ["Old Operative's Pocket Watch", "Operative's Standard Pocket Watch", "Operative's Constancy"],
    materialKeys: ["OldOperativesPocketWatch", "OperativesStandardPocketWatch", "OperativesConstancy"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ['"Ultimate Overlord\'s Mega Magic Sword"', "Absolution", "Cashflow Supervision", "Prospector's Drill", "Sword of Narzissenkreuz", "The Dockhand's Assistant"],
  },
  {
    familyId: "xuanwen_beast_materials",
    displayName: "Xuanwen Beast Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Xuanwen Beasts",
    materialNames: ["Feathery Fin", "Lunar Fin", "Chasmlight Fin"],
    materialKeys: ["FeatheryFin", "LunarFin", "ChasmlightFin"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Chain Breaker", "Crane's Echoing Call", "Dialogues of the Desert Sages", "Silvershower Heartstrings"],
  },
  {
    familyId: "praetorian_golem_materials",
    displayName: "Praetorian Golem Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Praetorian Golems",
    materialNames: ["Ruined Hilt", "Splintered Hilt", "Still-Smoldering Hilt"],
    materialKeys: ["RuinedHilt", "SplinteredHilt", "StillSmolderingHilt"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Cloudforged", "Crimson Moon's Semblance", "Flute of Ezpitzal", "Lumidouce Elegy"],
  },
  {
    familyId: "avatar_of_lava_materials",
    displayName: "Avatar of Lava Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Avatars of Lava",
    materialNames: ["Ignited Stone", "Ignited Seed of Life", "Ignited Seeing Eye"],
    materialKeys: ["IgnitedStone", "IgnitedSeedOfLife", "IgnitedSeeingEye"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Earth Shaker", "Fang of the Mountain King", "Flower-Wreathed Feathers", "Mountain-Bracing Bolt", "Sunny Morning Sleep-In"],
  },
  {
    familyId: "wayob_manifestation_materials",
    displayName: "Wayob Manifestation Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Wayob Manifestations",
    materialNames: ["Shard of a Shattered Will", "Locus of a Clear Will", "Sigil of a Striding Will"],
    materialKeys: ["ShardOfAShatteredWill", "LocusOfAClearWill", "SigilOfAStridingWill"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Ring of Yaxche", "Starcaller's Watch", "Sturdy Bone", "Surf's Up", "Waveriding Whirl"],
  },
  {
    familyId: "secret_source_automaton_hunter_seeker_materials",
    displayName: "Secret Source Automaton: Hunter-Seeker Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Secret Source Automaton: Hunter-Seeker",
    materialNames: ["Axis of the Secret Source", "Sheath of the Secret Source", "Heart of the Secret Source"],
    materialKeys: ["AxisOfTheSecretSource", "SheathOfTheSecretSource", "HeartOfTheSecretSource"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["A Thousand Blazing Suns", "Ash-Graven Drinking Horn", "Footprint of the Rainbow", "Fruitful Hook", "Peak Patrol Song"],
  },
  {
    familyId: "tenebrous_mimesis_materials",
    displayName: "Tenebrous Mimesis Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Tenebrous Mimeses",
    materialNames: ["Refractive Bud", "Bewildering Broadleaf", "Illusory Leafcoil"],
    materialKeys: ["RefractiveBud", "BewilderingBroadleaf", "IllusoryLeafcoil"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Astral Vulture's Crimson Plumage", "Azurelight", "Calamity of Eshu", "Rainbow Serpent's Rain Bow", "Tamayuratei no Ohanashi"],
  },
  {
    familyId: "furnace_shell_mountain_weasel_materials",
    displayName: "Furnace Shell Mountain Weasel Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Furnace Shell Mountain Weasels",
    materialNames: ["Cold-Cracked Shellshard", "Warm Back-Shell", "Blazing Prismshell"],
    materialKeys: ["ColdCrackedShellshard", "WarmBackShell", "BlazingPrismshell"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Flame-Forged Insight", "Fractured Halo", "Sequence of Solitude", "Vivid Notions"],
  },
  {
    familyId: "frostnight_scion_materials",
    displayName: "Frostnight Scion Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Frostnight Scions",
    materialNames: ["Frostnight's Glimmer", "Frostnight's Glow", "Frostnight's Glory"],
    materialKeys: ["FrostnightsGlimmer", "FrostnightsGlow", "FrostnightsGlory"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Athame Artis", "Blackmarrow Lantern", "Dawning Frost", "Nightweaver's Looking Glass", "Serenity's Call"],
  },
  {
    familyId: "radiant_beast_materials",
    displayName: "Radiant Beast Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Radiant Beasts",
    materialNames: ["Lightless Bone", "Glowing Remains", "Radiant Exoskeleton"],
    materialKeys: ["LightlessBone", "GlowingRemains", "RadiantExoskeleton"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Etherlight Spindlelute", "Master Key", "Moonweaver's Dawn", "Reliquary of Truth"],
  },
  {
    familyId: "wasteland_wild_hunt_materials",
    displayName: "Wasteland Wild Hunt Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Wasteland Wild Hunt",
    materialNames: ["Mistshroud Manifestation", "Mistshroud Plate", "Mistshroud Helmet"],
    materialKeys: ["MistshroudManifestation", "MistshroudPlate", "MistshroudHelmet"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Bloodsoaked Ruins", "Lightbearing Moonshard", "Prospector's Shovel", "Sacrificer's Staff", "Snare Hook"],
  },
  {
    familyId: "fisher_of_hidden_depths_materials",
    displayName: "Fisher of Hidden Depths Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Fisher of Hidden Depths",
    materialNames: ["Fractured Eye of the Deep Shadow", "Aberrant Core of the Deep Shadow", "Hooked Beak of the Deep Shadow"],
    materialKeys: ["FracturedEyeOfTheDeepShadow", "AberrantCoreOfTheDeepShadow", "HookedBeakOfTheDeepShadow"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Gest of the Mighty Wolf", "Nocturne's Curtain Call"],
  },
  {
    familyId: "domain_keeper_materials",
    displayName: "Domain Keeper Materials",
    category: "elite_enemy_drop",
    sourceType: "Elite Enemies",
    sourceEnemyFamily: "Domain Keepers",
    materialNames: ["Faded Flaming Hilt", "Fractured Flaming Hilt", "Jeweled Flaming Hilt"],
    materialKeys: ["FadedFlamingHilt", "FracturedFlamingHilt", "JeweledFlamingHilt"],
    rarity: [2, 3, 4],
    usedFor: ["weapon_ascension"],
    usedByWeapons: ["Golden Frostbound Oath"],
  },
];

function normalizeLookupValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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
  familiesList: EliteEnemyDropFamily[],
  weapons: Record<string, WeaponCatalogEntry>,
) {
  const families: Record<string, EliteEnemyDropFamily> = {};
  const compatibilityFamilies: Record<string, EnemyDropFamily> = {};
  const materials: Record<string, MaterialDescriptor> = {};
  const materialSources: Record<string, MaterialSourceRecord[]> = {};
  const recipes: Record<string, CraftingRecipe> = {};
  const materialFamilyByKey: Record<string, MaterialFamilyReference> = {};
  const weaponEliteEnemyDropFamilyByKey: Record<string, string> = {};
  const unresolvedWeaponReferences: UnresolvedWeaponReference[] = [];

  for (const family of familiesList) {
    const usedByWeaponKeys = family.usedByWeapons.map((weaponName) => toIrminsulKey(weaponName));

    for (const weaponName of family.usedByWeapons) {
      const generatedKey = toIrminsulKey(weaponName);
      const resolvedKey = resolveCanonicalWeaponKey(weaponName, weapons);
      if (resolvedKey) {
        weaponEliteEnemyDropFamilyByKey[resolvedKey] = family.familyId;
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
        category: "elite_enemy_drop",
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
        category: "elite_enemy_drop",
        sourceType: "Elite Enemies",
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
    weaponEliteEnemyDropFamilyByKey,
    unresolvedWeaponReferences,
  };
}

export function buildEliteEnemyDropRegistry(weapons: Record<string, WeaponCatalogEntry>) {
  return buildRegistryFromFamilies(ELITE_ENEMY_DROP_FAMILIES, weapons);
}

export function buildEliteEnemyDerivedDataFromFamilies(
  families: Record<string, EliteEnemyDropFamily>,
  weapons: Record<string, WeaponCatalogEntry>,
) {
  return buildRegistryFromFamilies(Object.values(families), weapons);
}

export function buildEliteEnemyMaterialFamilyIndex(
  families: Record<string, EliteEnemyDropFamily>,
): Record<string, MaterialFamilyReference> {
  return Object.values(families).reduce<Record<string, MaterialFamilyReference>>((accumulator, family) => {
    family.materialKeys.forEach((materialKey) => {
      accumulator[materialKey] = {
        familyId: family.familyId,
        displayName: family.displayName,
        category: "elite_enemy_drop",
        sourceType: "Elite Enemies",
        sourceEnemyFamily: family.sourceEnemyFamily,
      };
    });
    return accumulator;
  }, {});
}

export function buildWeaponEliteEnemyFamilyMap(
  families: Record<string, EliteEnemyDropFamily>,
  weapons: Record<string, WeaponCatalogEntry>,
): { weaponEliteEnemyDropFamilyByKey: Record<string, string>; unresolvedWeaponReferences: UnresolvedWeaponReference[] } {
  const weaponEliteEnemyDropFamilyByKey: Record<string, string> = {};
  const unresolvedWeaponReferences: UnresolvedWeaponReference[] = [];

  for (const family of Object.values(families)) {
    for (const weaponName of family.usedByWeapons) {
      const generatedKey = toIrminsulKey(weaponName);
      const resolvedKey = resolveCanonicalWeaponKey(weaponName, weapons);
      if (resolvedKey) {
        weaponEliteEnemyDropFamilyByKey[resolvedKey] = family.familyId;
      } else {
        unresolvedWeaponReferences.push({
          familyId: family.familyId,
          weaponName,
          generatedKey,
        });
      }
    }
  }

  return { weaponEliteEnemyDropFamilyByKey, unresolvedWeaponReferences };
}

export function findEliteEnemyDropFamilyForMaterial(
  materialKey: string,
  staticData: StaticGameData,
): EliteEnemyDropFamily | undefined {
  const familyReference = staticData.materialFamilyByKey[materialKey];
  if (!familyReference || familyReference.category !== "elite_enemy_drop") {
    return undefined;
  }
  return staticData.eliteEnemyDropFamilies[familyReference.familyId];
}
