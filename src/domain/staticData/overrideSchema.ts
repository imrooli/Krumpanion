import { gameIdentitySchema, exactCharacterSchema, exactWeaponSchema, artifactSetIdentitySchema, farmingOriginSchema, provenanceSchema } from "./upstreamSchema";
import { z } from "zod";
import type { OverrideDataPack } from "./types";

const materialTotalsSchema = z.record(z.number());
const materialSourceRecordSchema = z.object({
  materialKey: z.string(),
  sourceType: z.string(),
  sourceKey: z.string(),
  sourceName: z.string(),
  availability: z.string().optional(),
  resinCost: z.number().optional(),
  notes: z.string().optional(),
}).passthrough();

const catalogEntrySchema = gameIdentitySchema.extend({
  key: z.string(),
  displayName: z.string(),
}).passthrough();

const materialDescriptorSchema = gameIdentitySchema.extend({
  key: z.string(),
  displayName: z.string(),
  category: z.string(),
}).passthrough();

const characterProgressionSchema = z.object({
  key: z.string(),
  levelTotals: z.record(materialTotalsSchema),
  ascensionTotals: z.record(materialTotalsSchema),
  talentTotals: z.record(materialTotalsSchema),
}).passthrough();

const weaponProgressionSchema = z.object({
  key: z.string(),
  levelTotals: z.record(materialTotalsSchema),
  ascensionTotals: z.record(materialTotalsSchema),
}).passthrough();

const elementGemFamilySchema = z.object({
  key: z.string(),
  sliver: z.string(),
  fragment: z.string(),
  chunk: z.string(),
  gemstone: z.string(),
}).passthrough();

const talentBookFamilySchema = z.object({
  key: z.string(),
  teachings: z.string(),
  guide: z.string(),
  philosophies: z.string(),
}).passthrough();

const enemyDropFamilySchema = z.object({
  key: z.string(),
  low: z.string(),
  mid: z.string(),
  high: z.string(),
  top: z.string().optional(),
}).passthrough();

const generalEnemyDropFamilySchema = z.object({
  familyId: z.string(),
  displayName: z.string(),
  category: z.literal("general_enemy_drop"),
  sourceType: z.string(),
  sourceEnemyFamily: z.string(),
  materialNames: z.tuple([z.string(), z.string(), z.string()]),
  materialKeys: z.tuple([z.string(), z.string(), z.string()]),
}).passthrough();

const eliteEnemyDropFamilySchema = z.object({
  familyId: z.string(),
  displayName: z.string(),
  category: z.literal("elite_enemy_drop"),
  sourceType: z.string(),
  sourceEnemyFamily: z.string(),
  materialNames: z.tuple([z.string(), z.string(), z.string()]),
  materialKeys: z.tuple([z.string(), z.string(), z.string()]),
}).passthrough();

const weaponAscensionFamilySchema = z.object({
  key: z.string(),
  tier1: z.string(),
  tier2: z.string(),
  tier3: z.string(),
  tier4: z.string(),
}).passthrough();

const weaponAscensionMaterialFamilySchema = z.object({
  key: z.string(),
  displayName: z.string(),
  category: z.literal("weapon_ascension_material_family"),
  tiers: z.object({
    twoStar: z.string(),
    threeStar: z.string(),
    fourStar: z.string(),
    fiveStar: z.string(),
  }),
  tierDisplayNames: z.object({
    twoStar: z.string(),
    threeStar: z.string(),
    fourStar: z.string(),
    fiveStar: z.string(),
  }),
  usedByWeapons: z.array(z.string()),
  craftable: z.literal(true),
  conversionRatio: z.literal(3),
  status: z.string(),
}).passthrough();

const weaponExpMaterialSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  category: z.enum(["weapon_exp_material", "weapon_fodder_exp"]),
  rarity: z.string(),
  expValue: z.number(),
  usedFor: z.tuple([z.literal("weapon_leveling")]),
  craftable: z.literal(false),
  status: z.string(),
}).passthrough();

const localSpecialtySchema = z.object({
  key: z.string(),
  displayName: z.string(),
  category: z.literal("local_specialty"),
  region: z.string(),
  usedFor: z.array(z.string()),
  isPurchasable: z.boolean(),
  purchaseVendors: z.array(z.string()),
  searchHint: z.string(),
  craftable: z.boolean(),
}).passthrough();

const normalBossMaterialSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  bossKey: z.string(),
  bossDisplayName: z.string(),
  category: z.literal("normal_boss_material"),
  usedFor: z.tuple([z.literal("character_ascension")]),
  craftable: z.literal(false),
}).passthrough();

const weeklyBossMaterialSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  category: z.literal("weekly_boss_material"),
  usedFor: z.tuple([z.literal("talent_leveling")]),
  craftable: z.literal(false),
  status: z.string(),
}).passthrough();

const specialProgressionMaterialSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  category: z.literal("special_progression_material"),
  usedFor: z.array(z.string()),
  craftable: z.literal(false),
  status: z.string(),
}).passthrough();

const materialRecordSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  category: z.string(),
  rarity: z.string().optional(),
  expValue: z.number().optional(),
  familyKey: z.string().optional(),
  source: z.object({ type: z.string() }).passthrough(),
  usedFor: z.array(z.string()),
  craftable: z.boolean(),
  conversionRatio: z.number().optional(),
  status: z.string(),
  notes: z.array(z.string()).optional(),
}).passthrough();

const localSpecialtySourceSchema = z.object({
  key: z.string(),
  materialKey: z.string(),
  region: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

const characterMaterialProfileSchema = z.object({
  characterKey: z.string(),
  normalBossMaterial: z.string(),
  weeklyBossMaterial: z.string(),
}).passthrough();

const weaponMaterialProfileSchema = z.object({
  weaponKey: z.string(),
  rarity: z.number().int().min(1).max(5).optional(),
}).passthrough();

const artifactDomainSchema = z.object({
  setKey: z.string(),
  domainKey: z.string(),
  domainName: z.string(),
  availability: z.string(),
  resinCost: z.number(),
}).passthrough();

const recipeSchema = z.object({
  outputKey: z.string().optional(),
  outputMaterialKey: z.string(),
  outputName: z.string().optional(),
  outputQuantity: z.number(),
  category: z.string().optional(),
  inputMaterials: z.array(z.object({
    materialKey: z.string(),
    materialName: z.string(),
    quantity: z.number(),
  })).optional(),
  ingredients: z.record(z.number()),
  moraCost: z.number().optional(),
  craftingMethod: z.literal("alchemy").optional(),
  isTierUpgrade: z.boolean().optional(),
  isElementConversion: z.boolean().optional(),
  eligibleCraftingBonusTypes: z.array(z.string()).optional(),
  familyKey: z.string().optional(),
  tierIndex: z.number().optional(),
}).passthrough();

const tieredMaterialFamilyIndexSchema = z.object({
  materialKey: z.string(),
  familyKey: z.string(),
  familyType: z.string(),
  tierIndex: z.number(),
  maxTierIndex: z.number(),
  tierKeys: z.array(z.string()),
}).passthrough();

const craftingUtilityPassiveSchema = z.object({
  key: z.string(),
  characterName: z.string(),
  talentName: z.string(),
  appliesTo: z.array(z.string()),
  effectType: z.string(),
  chance: z.number(),
  description: z.string(),
}).passthrough();

const leyLineRewardSchema = z.object({
  enemyLevel: z.string(),
  adventureExp: z.number(),
  companionshipExp: z.number(),
  revelation: z.object({
    characterExpMaterials: z.record(z.object({ min: z.number(), max: z.number() })),
    averageCharacterExp: z.number(),
    averageEfficiencyPercent: z.number().nullable(),
  }),
  wealth: z.object({
    mora: z.number(),
    efficiencyPercent: z.number().nullable(),
  }),
}).passthrough();

const domainOfForgerySchema = z.object({
  name: z.string(),
  region: z.string(),
  location: z.string(),
  activityType: z.literal("domain_of_forgery"),
  resinCost: z.number(),
  condensedResinAllowed: z.boolean(),
  adventureRankRequirements: z.array(z.number()),
  partyLevelRecommendations: z.array(z.number()),
  elements: z.array(z.string()),
  weaponAscensionFamilies: z.array(z.string()),
  listedRewards: z.array(z.string()),
}).passthrough();

const domainOfMasterySchema = z.object({
  name: z.string(),
  region: z.string(),
  location: z.string(),
  activityType: z.literal("domain_of_mastery"),
  resinCost: z.number(),
  condensedResinAllowed: z.boolean(),
  adventureRankRequirements: z.array(z.number()),
  partyLevelRecommendations: z.array(z.number()),
  elements: z.array(z.string()),
  talentFamilies: z.array(z.string()),
  listedRewards: z.array(z.string()),
}).passthrough();

const trounceDomainSchema = z.object({
  name: z.string(),
  region: z.string(),
  location: z.string(),
  activityType: z.literal("trounce_domain"),
  resinCostFirstThreeWeekly: z.number(),
  resinCostAfterFirstThreeWeekly: z.number(),
  rewardLimit: z.literal("once_per_boss_per_week"),
  adventureRankRequirements: z.array(z.number()),
  partyLevelRecommendations: z.array(z.number()),
  weeklyTalentMaterials: z.array(z.string()),
}).passthrough();

const weaponAscensionDomainDropModelSchema = z.object({
  domainLevel: z.enum(["I", "II", "III", "IV"]),
  resinCost: z.number(),
  overall: z.object({
    twoStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    threeStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fourStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fiveStar: z.object({ range: z.string(), average: z.number() }).nullable(),
  }),
  twoStarRollMean: z.number(),
  dropPackMean: z.number(),
  dropPackDistribution: z.object({
    twoStar: z.number(),
    threeStar: z.number(),
    fourStar: z.number(),
    fiveStar: z.number(),
  }),
}).passthrough();

const talentBookDomainDropModelSchema = z.object({
  domainLevel: z.enum(["I", "II", "III", "IV"]),
  resinCost: z.number(),
  overall: z.object({
    twoStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    threeStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fourStar: z.object({ range: z.string(), average: z.number() }).nullable(),
  }),
  twoStarRollMean: z.number(),
  dropPackMean: z.number(),
  dropPackDistribution: z.object({
    twoStar: z.number(),
    threeStar: z.number(),
    fourStar: z.number(),
  }),
}).passthrough();

const overrideSchema = z.object({
  version: z.number().int().min(1),
  farmingRelationships: z.record(z.object({ kind: z.enum(["talent", "weapon"]), materialIds: z.array(z.number().int().positive()), recipeIds: z.array(z.number().int().positive()), recipeCoins: z.array(z.number().int().nonnegative()), stageIds: z.array(z.number().int().positive()).optional(), rewardPreviewIds: z.array(z.number().int().positive()).optional(), domain: z.object({ gameId: z.number().int().positive(), name: z.string().min(1), resinCost: z.number().positive().optional() }).optional(), provenance: provenanceSchema })).optional(),
  farmingOrigins: z.record(z.object({ family: farmingOriginSchema.optional(), source: farmingOriginSchema.optional(), availability: farmingOriginSchema.optional(), resinCost: farmingOriginSchema.optional() })).optional(),
  farmingConflicts: z.record(z.object({ id: z.string(), materialKey: z.string(), field: z.enum(["family", "source", "availability", "resinCost"]), proposed: z.object({ materialKey: z.string(), sourceType: z.string(), sourceKey: z.string(), sourceName: z.string(), availability: z.string(), resinCost: z.number().optional(), region: z.string(), familyKey: z.string(), tierKeys: z.array(z.string()) }), provenance: provenanceSchema, domainGameId: z.number().int().positive().optional(), status: z.enum(["pending", "kept_manual", "accepted"]) })).optional(),
  farmingDrafts: z.record(z.object({ materialKey: z.string(), sourceType: z.string(), sourceKey: z.string(), sourceName: z.string(), availability: z.string(), resinCost: z.number().nonnegative().optional(), region: z.string(), familyKey: z.string(), tierKeys: z.array(z.string()) })).optional(),
  artifactSets: z.record(artifactSetIdentitySchema).optional(),
  exactCharacterRequirements: z.record(exactCharacterSchema).optional(),
  exactWeaponRequirements: z.record(exactWeaponSchema).optional(),
  label: z.string().optional(),
  characters: z.record(catalogEntrySchema).optional(),
  materials: z.record(materialDescriptorSchema).optional(),
  characterProgressions: z.record(characterProgressionSchema.partial().extend({ key: z.string().optional() })).optional(),
  universalCharacterProgressionCore: z.object({ schemaVersion: z.number().optional() }).passthrough().optional(),
  universalTalentProgressionCore: z.object({ schemaVersion: z.number().optional() }).passthrough().optional(),
  universalWeaponProgressionCore: z.object({ schemaVersion: z.number().optional() }).passthrough().optional(),
  weaponAscensionPhaseCaps: z.record(z.object({
    phaseName: z.string(),
    maxLevel: z.number(),
    requiredAdventureRank: z.number().nullable(),
  })).optional(),
  weaponExpMaterials: z.record(weaponExpMaterialSchema).optional(),
  weaponExpRequirements: z.record(z.array(z.object({
    range: z.string(),
    startLevel: z.number(),
    endLevel: z.number(),
    mysticOre: z.number(),
    fineOre: z.number(),
    threeStarWeapons: z.number(),
    twoStarWeapons: z.number(),
    oneStarWeapons: z.number(),
    enhancementOre: z.number(),
    expNeeded: z.number(),
    wastedExp: z.number(),
    mora: z.number(),
  }))).optional(),
  weaponExpTotals1To90: z.record(z.object({
    mysticOre: z.number(),
    fineOre: z.number(),
    threeStarWeapons: z.number(),
    twoStarWeapons: z.number(),
    oneStarWeapons: z.number(),
    enhancementOre: z.number(),
    expNeeded: z.number(),
    wastedExp: z.number(),
    mora: z.number(),
  })).optional(),
  weaponAscensionCosts: z.record(z.record(z.object({
    maxLevelAfter: z.number(),
    requiredAdventureRank: z.number(),
    mora: z.number(),
    weaponAscensionMaterial: z.object({ tier: z.string(), amount: z.number() }),
    eliteEnemyMaterial: z.object({ tier: z.string(), amount: z.number() }),
    commonEnemyMaterial: z.object({ tier: z.string(), amount: z.number() }),
  }))).optional(),
  weaponAscensionTotals20To90: z.record(materialTotalsSchema).optional(),
  elementGemFamilies: z.record(elementGemFamilySchema).optional(),
  talentBookFamilies: z.record(talentBookFamilySchema).optional(),
  enemyDropFamilies: z.record(enemyDropFamilySchema).optional(),
  generalEnemyDropFamilies: z.record(generalEnemyDropFamilySchema).optional(),
  eliteEnemyDropFamilies: z.record(eliteEnemyDropFamilySchema).optional(),
  weaponAscensionMaterialFamilies: z.record(weaponAscensionMaterialFamilySchema).optional(),
  weaponAscensionFamilies: z.record(weaponAscensionFamilySchema).optional(),
  localSpecialties: z.record(localSpecialtySchema).optional(),
  normalBossMaterials: z.record(normalBossMaterialSchema).optional(),
  weeklyBossMaterials: z.record(weeklyBossMaterialSchema).optional(),
  specialProgressionMaterials: z.record(specialProgressionMaterialSchema).optional(),
  materialRecords: z.record(materialRecordSchema).optional(),
  tieredMaterialIndex: z.record(tieredMaterialFamilyIndexSchema).optional(),
  localSpecialtySources: z.record(localSpecialtySourceSchema).optional(),
  characterMaterialProfiles: z.record(characterMaterialProfileSchema).optional(),
  weapons: z.record(catalogEntrySchema).optional(),
  weaponProgressions: z.record(weaponProgressionSchema.partial().extend({ key: z.string().optional() })).optional(),
  weaponMaterialProfiles: z.record(weaponMaterialProfileSchema).optional(),
  materialSources: z.record(z.array(materialSourceRecordSchema)).optional(),
  artifactDomains: z.record(artifactDomainSchema).optional(),
  recipes: z.record(recipeSchema).optional(),
  craftingRecipes: z.record(recipeSchema).optional(),
  craftingUtilityPassives: z.record(craftingUtilityPassiveSchema).optional(),
  craftingPlannerDefaults: z.object({
    craftingModeForRequirementSatisfaction: z.enum(["guaranteed", "expected_value"]).optional(),
    craftingModeForResinEstimate: z.enum(["guaranteed", "expected_value"]).optional(),
    allowCraftingTalentExpectedValue: z.boolean().optional(),
    showCraftingVarianceWarning: z.boolean().optional(),
  }).passthrough().optional(),
  gemConversionDefaults: z.object({
    allowDustOfAzothConversion: z.boolean().optional(),
    preserveOffElementGemsByDefault: z.boolean().optional(),
    showDustOfAzothOption: z.boolean().optional(),
  }).passthrough().optional(),
  resinSystem: z.object({ originalResin: z.object({ softCap: z.number().optional() }).passthrough().optional() }).passthrough().optional(),
  resinActivityCosts: z.object({ leyLineOutcrop: z.object({ resin: z.number().optional() }).passthrough().optional() }).passthrough().optional(),
  leyLineRewardsByWorldLevel: z.record(leyLineRewardSchema).optional(),
  domainsOfForgery: z.record(domainOfForgerySchema).optional(),
  domainsOfMastery: z.record(domainOfMasterySchema).optional(),
  trounceDomains: z.record(trounceDomainSchema).optional(),
  weaponAscensionDomainDropModel: z.record(weaponAscensionDomainDropModelSchema).optional(),
  talentBookDomainDropModel: z.record(talentBookDomainDropModelSchema).optional(),
  normalBossAscensionGemDropsByWorldLevel: z.record(z.object({
    enemyLevel: z.union([z.number(), z.string()]),
    twoStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    threeStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fourStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fiveStar: z.object({ range: z.string(), average: z.number() }).nullable(),
  }).passthrough()).optional(),
  weeklyBossAscensionGemDropsByWorldLevel: z.record(z.object({
    enemyLevel: z.union([z.number(), z.string()]),
    twoStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    threeStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fourStar: z.object({ range: z.string(), average: z.number() }).nullable(),
    fiveStar: z.object({ range: z.string(), average: z.number() }).nullable(),
  }).passthrough()).optional(),
  normalBossUniqueMaterialDropMeanByWorldLevel: z.record(z.object({
    bossLevel: z.string(),
    rewardTier: z.number(),
    dropMean: z.number(),
  }).passthrough()).optional(),
  weeklyTalentMaterialDropMeanByWorldLevel: z.record(z.object({
    enemyLevel: z.number(),
    dropMean: z.number(),
  }).passthrough()).optional(),
  bossGemThreeStarRollMean: z.object({
    normalBoss: z.number(),
    weeklyBoss: z.number(),
    appliesFromRewardLevel: z.number(),
  }).optional(),
  bossGemDropPackMeanByRewardLevel: z.array(z.object({
    enemyLevel: z.string(),
    rewardLevel: z.number(),
    normalBoss: z.number(),
    weeklyBoss: z.number(),
  })).optional(),
  bossGemDropPackRarityDistribution: z.array(z.object({
    enemyLevel: z.string(),
    rewardLevel: z.number(),
    twoStar: z.number(),
    threeStar: z.number(),
    fourStar: z.number(),
    fiveStar: z.number(),
  })).optional(),
  plannerDefaults: z.object({
    worldLevel: z.number().optional(),
    domainLevel: z.enum(["I", "II", "III", "IV"]).optional(),
  }).passthrough().optional(),
  legacyExactCharacterProgressions: z.record(characterProgressionSchema.partial().extend({ key: z.string().optional() })).optional(),
  legacyExactWeaponProgressions: z.record(weaponProgressionSchema.partial().extend({ key: z.string().optional() })).optional(),
});

export function parseOverrideDataPack(text: string): OverrideDataPack {
  return overrideSchema.parse(JSON.parse(text)) as OverrideDataPack;
}
