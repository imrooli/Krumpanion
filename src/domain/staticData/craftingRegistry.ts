import type {
  CraftingBonusType,
  CraftingPlannerDefaults,
  CraftingRecipe,
  CraftingRecipeCategory,
  CraftingUtilityPassive,
  GemConversionDefaults,
} from "../crafting/types";
import type {
  ElementGemFamily,
  GeneralEnemyDropFamily,
  StaticGameData,
  TalentBookFamily,
  TieredMaterialFamilyIndexEntry,
  WeaponAscensionMaterialFamilyRecord,
} from "./types";

const TALENT_BOOK_MORA_BY_TIER: Record<number, number> = {
  1: 175,
  2: 550,
};

const WEAPON_ASCENSION_MORA_BY_TIER: Record<number, number> = {
  1: 125,
  2: 350,
  3: 1075,
};

const ENHANCEMENT_MORA_BY_TIER: Record<number, number> = {
  1: 25,
  2: 50,
  3: 125,
};

const GEM_MORA_BY_TIER: Record<number, number> = {
  1: 300,
  2: 900,
  3: 2700,
};

const GEM_DUST_COST_BY_TIER: Partial<Record<number, number>> = {
  1: 3,
  2: 9,
  3: 27,
};

const GEM_FAMILY_KEYS_WITH_AZOTH = [
  "AgnidusAgate",
  "VarunadaLazurite",
  "VajradaAmethyst",
  "VayudaTurquoise",
  "ShivadaJade",
  "PrithivaTopaz",
  "NagadusEmerald",
] as const;

export const CRAFTING_PLANNER_DEFAULTS: CraftingPlannerDefaults = {
  craftingModeForRequirementSatisfaction: "guaranteed",
  craftingModeForResinEstimate: "expected_value",
  allowCraftingTalentExpectedValue: true,
  showCraftingVarianceWarning: true,
};

export const GEM_CONVERSION_DEFAULTS: GemConversionDefaults = {
  allowDustOfAzothConversion: false,
  preserveOffElementGemsByDefault: true,
  showDustOfAzothOption: true,
};

export const CRAFTING_UTILITY_PASSIVES: Record<string, CraftingUtilityPassive> = {
  Eula: {
    key: "Eula",
    characterName: "Eula",
    talentName: "Aristocratic Introspection",
    appliesTo: ["character_talent_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Eula crafts Character Talent Materials, she has a 10% chance to receive double the product.",
  },
  Sucrose: {
    key: "Sucrose",
    characterName: "Sucrose",
    talentName: "Astable Invention",
    appliesTo: ["character_weapon_enhancement_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Sucrose crafts Character and Weapon Enhancement Materials, she has a 10% chance to obtain double the product.",
  },
  Albedo: {
    key: "Albedo",
    characterName: "Albedo",
    talentName: "Flash of Genius",
    appliesTo: ["weapon_ascension_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Albedo crafts Weapon Ascension Materials, he has a 10% chance to receive double the product.",
  },
  Xingqiu: {
    key: "Xingqiu",
    characterName: "Xingqiu",
    talentName: "Flash of Genius",
    appliesTo: ["character_talent_material"],
    effectType: "refund_one_input",
    chance: 0.25,
    description: "When Xingqiu crafts Character Talent Materials, he has a 25% chance to refund a portion of the crafting materials used.",
  },
  KamisatoAyaka: {
    key: "KamisatoAyaka",
    characterName: "Kamisato Ayaka",
    talentName: "Fruits of Shinsa",
    appliesTo: ["weapon_ascension_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Ayaka crafts Weapon Ascension Materials, she has a 10% chance to receive double the product.",
  },
  Lisa: {
    key: "Lisa",
    characterName: "Lisa",
    talentName: "General Pharmaceutics",
    appliesTo: ["potion"],
    effectType: "refund_one_input",
    chance: 0.2,
    description: "When Lisa crafts a potion, she has a 20% chance to refund a portion of the crafting materials used.",
  },
  Alhaitham: {
    key: "Alhaitham",
    characterName: "Alhaitham",
    talentName: "Law of Reductive Overdetermination",
    appliesTo: ["weapon_ascension_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Alhaitham crafts Weapon Ascension Materials, he has a 10% chance to receive double the product.",
  },
  YaeMiko: {
    key: "YaeMiko",
    characterName: "Yae Miko",
    talentName: "Meditations of a Yako",
    appliesTo: ["character_talent_material"],
    effectType: "regional_extra_same_rarity_talent_material",
    chance: 0.25,
    description: "Has a 25% chance to get 1 regional Character Talent Material, base material excluded, when crafting. The rarity is that of the base material.",
  },
  Mona: {
    key: "Mona",
    characterName: "Mona",
    talentName: "Principium of Astrology",
    appliesTo: ["weapon_ascension_material"],
    effectType: "refund_one_input",
    chance: 0.25,
    description: "When Mona crafts Weapon Ascension Materials, she has a 25% chance to refund a portion of the crafting materials used.",
  },
  Layla: {
    key: "Layla",
    characterName: "Layla",
    talentName: "Shadowy Dream-Signs",
    appliesTo: ["character_talent_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Layla crafts Character Talent Materials, she has a 10% chance to receive double the product.",
  },
  Wriothesley: {
    key: "Wriothesley",
    characterName: "Wriothesley",
    talentName: "The Duke's Grace",
    appliesTo: ["weapon_ascension_material"],
    effectType: "double_product",
    chance: 0.1,
    description: "When Wriothesley crafts Weapon Ascension Materials, he has a 10% chance to receive double the product.",
  },
  Dori: {
    key: "Dori",
    characterName: "Dori",
    talentName: "Unexpected Order",
    appliesTo: ["character_weapon_enhancement_material"],
    effectType: "refund_one_input",
    chance: 0.25,
    description: "Has a 25% chance to recover some of the materials used when crafting Character and Weapon Materials.",
  },
};

function makeRecipe(args: {
  key: string;
  outputKey: string;
  outputName: string;
  category: CraftingRecipeCategory;
  inputKey: string;
  inputName: string;
  inputQuantity?: number;
  moraCost: number;
  bonusTypes: CraftingBonusType[];
  familyKey: string;
  tierIndex: number;
  isElementConversion?: boolean;
}): CraftingRecipe {
  const inputQuantity = args.inputQuantity ?? 3;
  return {
    outputKey: args.outputKey,
    outputMaterialKey: args.outputKey,
    outputName: args.outputName,
    outputQuantity: 1,
    category: args.category,
    inputMaterials: [
      {
        materialKey: args.inputKey,
        materialName: args.inputName,
        quantity: inputQuantity,
      },
    ],
    ingredients: {
      [args.inputKey]: inputQuantity,
    },
    moraCost: args.moraCost,
    craftingMethod: "alchemy",
    isTierUpgrade: !args.isElementConversion,
    isElementConversion: args.isElementConversion,
    eligibleCraftingBonusTypes: args.bonusTypes,
    familyKey: args.familyKey,
    tierIndex: args.tierIndex,
  };
}

function addTieredFamilyIndex(
  index: Record<string, TieredMaterialFamilyIndexEntry>,
  familyType: TieredMaterialFamilyIndexEntry["familyType"],
  familyKey: string,
  tierKeys: string[],
): void {
  const maxTierIndex = tierKeys.length - 1;
  tierKeys.forEach((materialKey, tierIndex) => {
    index[materialKey] = {
      materialKey,
      familyKey,
      familyType,
      tierIndex,
      maxTierIndex,
      tierKeys,
    };
  });
}

function addTalentBookRecipes(
  recipes: Record<string, CraftingRecipe>,
  tieredIndex: Record<string, TieredMaterialFamilyIndexEntry>,
  families: Record<string, TalentBookFamily>,
  materials: StaticGameData["materials"],
): void {
  for (const family of Object.values(families)) {
    const tierKeys = [family.teachings, family.guide, family.philosophies];
    addTieredFamilyIndex(tieredIndex, "talent_book_family", family.key, tierKeys);
    recipes[family.guide] = makeRecipe({
      key: family.guide,
      outputKey: family.guide,
      outputName: materials[family.guide]?.displayName ?? family.guide,
      category: "talent_level_up_material",
      inputKey: family.teachings,
      inputName: materials[family.teachings]?.displayName ?? family.teachings,
      moraCost: TALENT_BOOK_MORA_BY_TIER[1],
      bonusTypes: [
        "double_product_character_talent_material",
        "refund_character_talent_material",
        "regional_extra_character_talent_material",
      ],
      familyKey: family.key,
      tierIndex: 1,
    });
    recipes[family.philosophies] = makeRecipe({
      key: family.philosophies,
      outputKey: family.philosophies,
      outputName: materials[family.philosophies]?.displayName ?? family.philosophies,
      category: "talent_level_up_material",
      inputKey: family.guide,
      inputName: materials[family.guide]?.displayName ?? family.guide,
      moraCost: TALENT_BOOK_MORA_BY_TIER[2],
      bonusTypes: [
        "double_product_character_talent_material",
        "refund_character_talent_material",
        "regional_extra_character_talent_material",
      ],
      familyKey: family.key,
      tierIndex: 2,
    });
  }
}

function addWeaponAscensionRecipes(
  recipes: Record<string, CraftingRecipe>,
  tieredIndex: Record<string, TieredMaterialFamilyIndexEntry>,
  families: Record<string, WeaponAscensionMaterialFamilyRecord>,
): void {
  for (const family of Object.values(families)) {
    const tierKeys = [family.tiers.twoStar, family.tiers.threeStar, family.tiers.fourStar, family.tiers.fiveStar];
    addTieredFamilyIndex(tieredIndex, "weapon_ascension_material_family", family.key, tierKeys);
    recipes[family.tiers.threeStar] = makeRecipe({
      key: family.tiers.threeStar,
      outputKey: family.tiers.threeStar,
      outputName: family.tierDisplayNames.threeStar,
      category: "weapon_ascension_material",
      inputKey: family.tiers.twoStar,
      inputName: family.tierDisplayNames.twoStar,
      moraCost: WEAPON_ASCENSION_MORA_BY_TIER[1],
      bonusTypes: ["double_product_weapon_ascension_material", "refund_weapon_ascension_material"],
      familyKey: family.key,
      tierIndex: 1,
    });
    recipes[family.tiers.fourStar] = makeRecipe({
      key: family.tiers.fourStar,
      outputKey: family.tiers.fourStar,
      outputName: family.tierDisplayNames.fourStar,
      category: "weapon_ascension_material",
      inputKey: family.tiers.threeStar,
      inputName: family.tierDisplayNames.threeStar,
      moraCost: WEAPON_ASCENSION_MORA_BY_TIER[2],
      bonusTypes: ["double_product_weapon_ascension_material", "refund_weapon_ascension_material"],
      familyKey: family.key,
      tierIndex: 2,
    });
    recipes[family.tiers.fiveStar] = makeRecipe({
      key: family.tiers.fiveStar,
      outputKey: family.tiers.fiveStar,
      outputName: family.tierDisplayNames.fiveStar,
      category: "weapon_ascension_material",
      inputKey: family.tiers.fourStar,
      inputName: family.tierDisplayNames.fourStar,
      moraCost: WEAPON_ASCENSION_MORA_BY_TIER[3],
      bonusTypes: ["double_product_weapon_ascension_material", "refund_weapon_ascension_material"],
      familyKey: family.key,
      tierIndex: 3,
    });
  }
}

function addGeneralEnemyRecipes(
  recipes: Record<string, CraftingRecipe>,
  tieredIndex: Record<string, TieredMaterialFamilyIndexEntry>,
  families: Record<string, GeneralEnemyDropFamily>,
): void {
  for (const family of Object.values(families)) {
    addTieredFamilyIndex(tieredIndex, "general_enemy_drop_family", family.familyId, family.materialKeys);
    recipes[family.materialKeys[1]] = makeRecipe({
      key: family.materialKeys[1],
      outputKey: family.materialKeys[1],
      outputName: family.materialNames[1],
      category: "character_weapon_enhancement_material",
      inputKey: family.materialKeys[0],
      inputName: family.materialNames[0],
      moraCost: ENHANCEMENT_MORA_BY_TIER[1],
      bonusTypes: [
        "double_product_character_weapon_enhancement_material",
        "refund_character_weapon_material",
      ],
      familyKey: family.familyId,
      tierIndex: 1,
    });
    recipes[family.materialKeys[2]] = makeRecipe({
      key: family.materialKeys[2],
      outputKey: family.materialKeys[2],
      outputName: family.materialNames[2],
      category: "character_weapon_enhancement_material",
      inputKey: family.materialKeys[1],
      inputName: family.materialNames[1],
      moraCost: ENHANCEMENT_MORA_BY_TIER[2],
      bonusTypes: [
        "double_product_character_weapon_enhancement_material",
        "refund_character_weapon_material",
      ],
      familyKey: family.familyId,
      tierIndex: 2,
    });
  }
}

function addEliteEnemyRecipes(
  recipes: Record<string, CraftingRecipe>,
  tieredIndex: Record<string, TieredMaterialFamilyIndexEntry>,
  families: Record<string, StaticGameData["eliteEnemyDropFamilies"][string]>,
): void {
  for (const family of Object.values(families)) {
    addTieredFamilyIndex(tieredIndex, "elite_enemy_drop_family", family.familyId, family.materialKeys);
    recipes[family.materialKeys[1]] = makeRecipe({
      key: family.materialKeys[1],
      outputKey: family.materialKeys[1],
      outputName: family.materialNames[1],
      category: "character_weapon_enhancement_material",
      inputKey: family.materialKeys[0],
      inputName: family.materialNames[0],
      moraCost: ENHANCEMENT_MORA_BY_TIER[2],
      bonusTypes: [
        "double_product_character_weapon_enhancement_material",
        "refund_character_weapon_material",
      ],
      familyKey: family.familyId,
      tierIndex: 1,
    });
    recipes[family.materialKeys[2]] = makeRecipe({
      key: family.materialKeys[2],
      outputKey: family.materialKeys[2],
      outputName: family.materialNames[2],
      category: "character_weapon_enhancement_material",
      inputKey: family.materialKeys[1],
      inputName: family.materialNames[1],
      moraCost: ENHANCEMENT_MORA_BY_TIER[3],
      bonusTypes: [
        "double_product_character_weapon_enhancement_material",
        "refund_character_weapon_material",
      ],
      familyKey: family.familyId,
      tierIndex: 2,
    });
  }
}

function addGemRecipes(
  craftingRecipes: Record<string, CraftingRecipe>,
  tieredIndex: Record<string, TieredMaterialFamilyIndexEntry>,
  families: Record<string, ElementGemFamily>,
  materials: StaticGameData["materials"],
): void {
  for (const family of Object.values(families)) {
    const tierKeys = [family.sliver, family.fragment, family.chunk, family.gemstone];
    addTieredFamilyIndex(tieredIndex, "element_gem_family", family.key, tierKeys);
    craftingRecipes[family.fragment] = makeRecipe({
      key: family.fragment,
      outputKey: family.fragment,
      outputName: materials[family.fragment]?.displayName ?? family.fragment,
      category: "character_ascension_gem",
      inputKey: family.sliver,
      inputName: materials[family.sliver]?.displayName ?? family.sliver,
      moraCost: GEM_MORA_BY_TIER[1],
      bonusTypes: ["none"],
      familyKey: family.key,
      tierIndex: 1,
    });
    craftingRecipes[family.chunk] = makeRecipe({
      key: family.chunk,
      outputKey: family.chunk,
      outputName: materials[family.chunk]?.displayName ?? family.chunk,
      category: "character_ascension_gem",
      inputKey: family.fragment,
      inputName: materials[family.fragment]?.displayName ?? family.fragment,
      moraCost: GEM_MORA_BY_TIER[2],
      bonusTypes: ["none"],
      familyKey: family.key,
      tierIndex: 2,
    });
    craftingRecipes[family.gemstone] = makeRecipe({
      key: family.gemstone,
      outputKey: family.gemstone,
      outputName: materials[family.gemstone]?.displayName ?? family.gemstone,
      category: "character_ascension_gem",
      inputKey: family.chunk,
      inputName: materials[family.chunk]?.displayName ?? family.chunk,
      moraCost: GEM_MORA_BY_TIER[3],
      bonusTypes: ["none"],
      familyKey: family.key,
      tierIndex: 3,
    });
  }

  for (const targetFamilyKey of GEM_FAMILY_KEYS_WITH_AZOTH) {
    const targetFamily = families[targetFamilyKey];
    if (!targetFamily) {
      continue;
    }

    for (const sourceFamilyKey of GEM_FAMILY_KEYS_WITH_AZOTH) {
      if (sourceFamilyKey === targetFamilyKey) {
        continue;
      }
      const sourceFamily = families[sourceFamilyKey];
      if (!sourceFamily) {
        continue;
      }

      const tiers: Array<[number, string, string]> = [
        [1, targetFamily.fragment, sourceFamily.fragment],
        [2, targetFamily.chunk, sourceFamily.chunk],
        [3, targetFamily.gemstone, sourceFamily.gemstone],
      ];

      for (const [tierIndex, targetKey, sourceKey] of tiers) {
        const dustCost = GEM_DUST_COST_BY_TIER[tierIndex];
        if (!dustCost) {
          continue;
        }
        const recipeKey = `DustOfAzoth:${sourceKey}->${targetKey}`;
        craftingRecipes[recipeKey] = {
          outputKey: targetKey,
          outputMaterialKey: targetKey,
          outputName: materials[targetKey]?.displayName ?? targetKey,
          outputQuantity: 1,
          category: "character_ascension_gem",
          inputMaterials: [
            {
              materialKey: sourceKey,
              materialName: materials[sourceKey]?.displayName ?? sourceKey,
              quantity: 1,
            },
            {
              materialKey: "DustOfAzoth",
              materialName: materials.DustOfAzoth?.displayName ?? "Dust of Azoth",
              quantity: dustCost,
            },
          ],
          ingredients: {
            [sourceKey]: 1,
            DustOfAzoth: dustCost,
          },
          moraCost: 0,
          craftingMethod: "alchemy",
          isTierUpgrade: false,
          isElementConversion: true,
          eligibleCraftingBonusTypes: ["none"],
          familyKey: targetFamily.key,
          tierIndex,
        };
      }
    }
  }
}

function buildLegacyRecipeMap(craftingRecipes: Record<string, CraftingRecipe>): Record<string, CraftingRecipe> {
  return Object.fromEntries(
    Object.entries(craftingRecipes).filter(([, recipe]) => !recipe.isElementConversion),
  );
}

export function buildCraftingRegistry(data: Pick<
  StaticGameData,
  | "materials"
  | "talentBookFamilies"
  | "weaponAscensionMaterialFamilies"
  | "generalEnemyDropFamilies"
  | "eliteEnemyDropFamilies"
  | "elementGemFamilies"
>): {
  recipes: Record<string, CraftingRecipe>;
  craftingRecipes: Record<string, CraftingRecipe>;
  craftingUtilityPassives: Record<string, CraftingUtilityPassive>;
  craftingPlannerDefaults: CraftingPlannerDefaults;
  gemConversionDefaults: GemConversionDefaults;
  tieredMaterialIndex: Record<string, TieredMaterialFamilyIndexEntry>;
} {
  const craftingRecipes: Record<string, CraftingRecipe> = {};
  const tieredMaterialIndex: Record<string, TieredMaterialFamilyIndexEntry> = {};

  addTalentBookRecipes(craftingRecipes, tieredMaterialIndex, data.talentBookFamilies, data.materials);
  addWeaponAscensionRecipes(craftingRecipes, tieredMaterialIndex, data.weaponAscensionMaterialFamilies);
  addGeneralEnemyRecipes(craftingRecipes, tieredMaterialIndex, data.generalEnemyDropFamilies);
  addEliteEnemyRecipes(craftingRecipes, tieredMaterialIndex, data.eliteEnemyDropFamilies);
  addGemRecipes(craftingRecipes, tieredMaterialIndex, data.elementGemFamilies, data.materials);

  return {
    recipes: buildLegacyRecipeMap(craftingRecipes),
    craftingRecipes,
    craftingUtilityPassives: CRAFTING_UTILITY_PASSIVES,
    craftingPlannerDefaults: CRAFTING_PLANNER_DEFAULTS,
    gemConversionDefaults: GEM_CONVERSION_DEFAULTS,
    tieredMaterialIndex,
  };
}
