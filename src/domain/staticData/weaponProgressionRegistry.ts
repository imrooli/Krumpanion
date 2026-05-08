import type {
  MaterialTotals,
} from "../../utils/collections";
import type {
  WeaponAscensionPhaseCap,
  WeaponAscensionPhaseCost,
  WeaponCommonEnemyMaterialRarity,
  WeaponEnemyMaterialRarity,
  WeaponExpMaterialRecord,
  WeaponExpRangeRequirement,
  WeaponExpTotalSummary,
  WeaponGoalTrackableRarityLabel,
  WeaponRarityLabel,
} from "./types";

export const WEAPON_ASCENSION_PHASE_CAPS: Record<string, WeaponAscensionPhaseCap> = {
  "0": { phaseName: "None", maxLevel: 20, requiredAdventureRank: null },
  "1": { phaseName: "1st Ascension", maxLevel: 40, requiredAdventureRank: 15 },
  "2": { phaseName: "2nd Ascension", maxLevel: 50, requiredAdventureRank: 25 },
  "3": { phaseName: "3rd Ascension", maxLevel: 60, requiredAdventureRank: 30 },
  "4": { phaseName: "4th Ascension", maxLevel: 70, requiredAdventureRank: 35 },
  "5": { phaseName: "5th Ascension", maxLevel: 80, requiredAdventureRank: 40 },
  "6": { phaseName: "6th Ascension", maxLevel: 90, requiredAdventureRank: 50 },
};

export const WEAPON_EXP_ITEM_VALUES = {
  MysticEnhancementOre: 10000,
  FineEnhancementOre: 2000,
  ThreeStarWeaponFodder: 1800,
  TwoStarWeaponFodder: 1200,
  OneStarWeaponFodder: 600,
  EnhancementOre: 400,
} as const;

export const WEAPON_EXP_MATERIALS: Record<string, WeaponExpMaterialRecord> = {
  EnhancementOre: {
    key: "EnhancementOre",
    displayName: "Enhancement Ore",
    category: "weapon_exp_material",
    rarity: "1-Star",
    expValue: 400,
    usedFor: ["weapon_leveling"],
    craftable: false,
    source: { type: "weapon_exp_material", sourceHint: "Weapon enhancement material. Also may be returned from excess weapon EXP when applicable." },
    status: "verified",
  },
  FineEnhancementOre: {
    key: "FineEnhancementOre",
    displayName: "Fine Enhancement Ore",
    category: "weapon_exp_material",
    rarity: "2-Star",
    expValue: 2000,
    usedFor: ["weapon_leveling"],
    craftable: false,
    source: { type: "weapon_exp_material", sourceHint: "Weapon enhancement material." },
    status: "verified",
  },
  MysticEnhancementOre: {
    key: "MysticEnhancementOre",
    displayName: "Mystic Enhancement Ore",
    category: "weapon_exp_material",
    rarity: "3-Star",
    expValue: 10000,
    usedFor: ["weapon_leveling"],
    craftable: false,
    source: { type: "weapon_exp_material", sourceHint: "Weapon enhancement material." },
    status: "verified",
  },
  OneStarWeaponFodder: {
    key: "OneStarWeaponFodder",
    displayName: "1-Star Weapon Fodder",
    category: "weapon_fodder_exp",
    rarity: "1-Star",
    expValue: 600,
    usedFor: ["weapon_leveling"],
    craftable: false,
    source: { type: "weapon_fodder", sourceHint: "Generic 1-Star weapon consumed as weapon EXP." },
    status: "verified",
  },
  TwoStarWeaponFodder: {
    key: "TwoStarWeaponFodder",
    displayName: "2-Star Weapon Fodder",
    category: "weapon_fodder_exp",
    rarity: "2-Star",
    expValue: 1200,
    usedFor: ["weapon_leveling"],
    craftable: false,
    source: { type: "weapon_fodder", sourceHint: "Generic 2-Star weapon consumed as weapon EXP." },
    status: "verified",
  },
  ThreeStarWeaponFodder: {
    key: "ThreeStarWeaponFodder",
    displayName: "3-Star Weapon Fodder",
    category: "weapon_fodder_exp",
    rarity: "3-Star",
    expValue: 1800,
    usedFor: ["weapon_leveling"],
    craftable: false,
    source: { type: "weapon_fodder", sourceHint: "Generic 3-Star weapon consumed as weapon EXP." },
    status: "verified",
  },
};

export const WEAPON_EXP_REQUIREMENTS: Record<WeaponGoalTrackableRarityLabel, WeaponExpRangeRequirement[]> = {
  "5-Star": [
    { range: "1-20", startLevel: 1, endLevel: 20, mysticOre: 12, fineOre: 0, threeStarWeapons: 0, twoStarWeapons: 1, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 121550, wastedExp: 50, mora: 12160 },
    { range: "20-40", startLevel: 20, endLevel: 40, mysticOre: 62, fineOre: 0, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 1, enhancementOre: 1, expNeeded: 622800, wastedExp: 0, mora: 62280 },
    { range: "40-50", startLevel: 40, endLevel: 50, mysticOre: 62, fineOre: 3, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 628150, wastedExp: 50, mora: 62820 },
    { range: "50-60", startLevel: 50, endLevel: 60, mysticOre: 92, fineOre: 3, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 0, expNeeded: 927675, wastedExp: 125, mora: 92780 },
    { range: "60-70", startLevel: 60, endLevel: 70, mysticOre: 129, fineOre: 4, threeStarWeapons: 0, twoStarWeapons: 1, oneStarWeapons: 0, enhancementOre: 0, expNeeded: 1299125, wastedExp: 75, mora: 129920 },
    { range: "70-80", startLevel: 70, endLevel: 80, mysticOre: 175, fineOre: 0, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 1750375, wastedExp: 25, mora: 175040 },
    { range: "80-90", startLevel: 80, endLevel: 90, mysticOre: 371, fineOre: 2, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 2, expNeeded: 3714775, wastedExp: 25, mora: 371480 },
  ],
  "4-Star": [
    { range: "1-20", startLevel: 1, endLevel: 20, mysticOre: 8, fineOre: 0, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 1, enhancementOre: 1, expNeeded: 81000, wastedExp: 0, mora: 8100 },
    { range: "20-40", startLevel: 20, endLevel: 40, mysticOre: 41, fineOre: 2, threeStarWeapons: 0, twoStarWeapons: 1, oneStarWeapons: 0, enhancementOre: 0, expNeeded: 415125, wastedExp: 75, mora: 41520 },
    { range: "40-50", startLevel: 40, endLevel: 50, mysticOre: 41, fineOre: 3, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 1, enhancementOre: 1, expNeeded: 418725, wastedExp: 75, mora: 41880 },
    { range: "50-60", startLevel: 50, endLevel: 60, mysticOre: 61, fineOre: 4, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 618400, wastedExp: 0, mora: 61840 },
    { range: "60-70", startLevel: 60, endLevel: 70, mysticOre: 86, fineOre: 2, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 866050, wastedExp: 150, mora: 86620 },
    { range: "70-80", startLevel: 70, endLevel: 80, mysticOre: 116, fineOre: 3, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 1, enhancementOre: 1, expNeeded: 1166875, wastedExp: 125, mora: 116700 },
    { range: "80-90", startLevel: 80, endLevel: 90, mysticOre: 247, fineOre: 3, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 1, enhancementOre: 0, expNeeded: 2476475, wastedExp: 125, mora: 247660 },
  ],
  "3-Star": [
    { range: "1-20", startLevel: 1, endLevel: 20, mysticOre: 5, fineOre: 1, threeStarWeapons: 0, twoStarWeapons: 1, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 53475, wastedExp: 125, mora: 5360 },
    { range: "20-40", startLevel: 20, endLevel: 40, mysticOre: 27, fineOre: 2, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 0, expNeeded: 274000, wastedExp: 0, mora: 27400 },
    { range: "40-50", startLevel: 40, endLevel: 50, mysticOre: 27, fineOre: 3, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 276350, wastedExp: 50, mora: 27640 },
    { range: "50-60", startLevel: 50, endLevel: 60, mysticOre: 40, fineOre: 3, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 408150, wastedExp: 50, mora: 40820 },
    { range: "60-70", startLevel: 60, endLevel: 70, mysticOre: 57, fineOre: 0, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 0, expNeeded: 571625, wastedExp: 175, mora: 57180 },
    { range: "70-80", startLevel: 70, endLevel: 80, mysticOre: 76, fineOre: 4, threeStarWeapons: 1, twoStarWeapons: 0, oneStarWeapons: 0, enhancementOre: 1, expNeeded: 770125, wastedExp: 75, mora: 77020 },
    { range: "80-90", startLevel: 80, endLevel: 90, mysticOre: 163, fineOre: 2, threeStarWeapons: 0, twoStarWeapons: 0, oneStarWeapons: 1, enhancementOre: 0, expNeeded: 1634475, wastedExp: 125, mora: 163460 },
  ],
};

export const WEAPON_EXP_TOTALS_1_TO_90: Record<WeaponGoalTrackableRarityLabel, WeaponExpTotalSummary> = {
  "5-Star": { mysticOre: 903, fineOre: 12, threeStarWeapons: 3, twoStarWeapons: 2, oneStarWeapons: 1, enhancementOre: 6, expNeeded: 9064450, wastedExp: 350, mora: 906480 },
  "4-Star": { mysticOre: 600, fineOre: 17, threeStarWeapons: 2, twoStarWeapons: 1, oneStarWeapons: 4, enhancementOre: 5, expNeeded: 6042650, wastedExp: 550, mora: 604320 },
  "3-Star": { mysticOre: 395, fineOre: 15, threeStarWeapons: 3, twoStarWeapons: 1, oneStarWeapons: 1, enhancementOre: 4, expNeeded: 3988200, wastedExp: 600, mora: 398880 },
};

export const WEAPON_ASCENSION_COSTS: Record<WeaponGoalTrackableRarityLabel, Record<string, WeaponAscensionPhaseCost>> = {
  "5-Star": {
    "1": { maxLevelAfter: 40, requiredAdventureRank: 15, mora: 10000, weaponAscensionMaterial: { tier: "2-Star", amount: 5 }, eliteEnemyMaterial: { tier: "2-Star", amount: 5 }, commonEnemyMaterial: { tier: "1-Star", amount: 3 } },
    "2": { maxLevelAfter: 50, requiredAdventureRank: 25, mora: 20000, weaponAscensionMaterial: { tier: "3-Star", amount: 5 }, eliteEnemyMaterial: { tier: "2-Star", amount: 18 }, commonEnemyMaterial: { tier: "1-Star", amount: 12 } },
    "3": { maxLevelAfter: 60, requiredAdventureRank: 30, mora: 30000, weaponAscensionMaterial: { tier: "3-Star", amount: 9 }, eliteEnemyMaterial: { tier: "3-Star", amount: 9 }, commonEnemyMaterial: { tier: "2-Star", amount: 9 } },
    "4": { maxLevelAfter: 70, requiredAdventureRank: 35, mora: 45000, weaponAscensionMaterial: { tier: "4-Star", amount: 5 }, eliteEnemyMaterial: { tier: "3-Star", amount: 18 }, commonEnemyMaterial: { tier: "2-Star", amount: 14 } },
    "5": { maxLevelAfter: 80, requiredAdventureRank: 40, mora: 55000, weaponAscensionMaterial: { tier: "4-Star", amount: 9 }, eliteEnemyMaterial: { tier: "4-Star", amount: 14 }, commonEnemyMaterial: { tier: "3-Star", amount: 9 } },
    "6": { maxLevelAfter: 90, requiredAdventureRank: 50, mora: 65000, weaponAscensionMaterial: { tier: "5-Star", amount: 6 }, eliteEnemyMaterial: { tier: "4-Star", amount: 27 }, commonEnemyMaterial: { tier: "3-Star", amount: 18 } },
  },
  "4-Star": {
    "1": { maxLevelAfter: 40, requiredAdventureRank: 15, mora: 5000, weaponAscensionMaterial: { tier: "2-Star", amount: 3 }, eliteEnemyMaterial: { tier: "2-Star", amount: 3 }, commonEnemyMaterial: { tier: "1-Star", amount: 2 } },
    "2": { maxLevelAfter: 50, requiredAdventureRank: 25, mora: 15000, weaponAscensionMaterial: { tier: "3-Star", amount: 3 }, eliteEnemyMaterial: { tier: "2-Star", amount: 12 }, commonEnemyMaterial: { tier: "1-Star", amount: 8 } },
    "3": { maxLevelAfter: 60, requiredAdventureRank: 30, mora: 20000, weaponAscensionMaterial: { tier: "3-Star", amount: 6 }, eliteEnemyMaterial: { tier: "3-Star", amount: 6 }, commonEnemyMaterial: { tier: "2-Star", amount: 6 } },
    "4": { maxLevelAfter: 70, requiredAdventureRank: 35, mora: 30000, weaponAscensionMaterial: { tier: "4-Star", amount: 3 }, eliteEnemyMaterial: { tier: "3-Star", amount: 12 }, commonEnemyMaterial: { tier: "2-Star", amount: 9 } },
    "5": { maxLevelAfter: 80, requiredAdventureRank: 40, mora: 35000, weaponAscensionMaterial: { tier: "4-Star", amount: 6 }, eliteEnemyMaterial: { tier: "4-Star", amount: 9 }, commonEnemyMaterial: { tier: "3-Star", amount: 6 } },
    "6": { maxLevelAfter: 90, requiredAdventureRank: 50, mora: 45000, weaponAscensionMaterial: { tier: "5-Star", amount: 4 }, eliteEnemyMaterial: { tier: "4-Star", amount: 18 }, commonEnemyMaterial: { tier: "3-Star", amount: 12 } },
  },
  "3-Star": {
    "1": { maxLevelAfter: 40, requiredAdventureRank: 15, mora: 5000, weaponAscensionMaterial: { tier: "2-Star", amount: 2 }, eliteEnemyMaterial: { tier: "2-Star", amount: 2 }, commonEnemyMaterial: { tier: "1-Star", amount: 1 } },
    "2": { maxLevelAfter: 50, requiredAdventureRank: 25, mora: 10000, weaponAscensionMaterial: { tier: "3-Star", amount: 2 }, eliteEnemyMaterial: { tier: "2-Star", amount: 8 }, commonEnemyMaterial: { tier: "1-Star", amount: 5 } },
    "3": { maxLevelAfter: 60, requiredAdventureRank: 30, mora: 15000, weaponAscensionMaterial: { tier: "3-Star", amount: 4 }, eliteEnemyMaterial: { tier: "3-Star", amount: 4 }, commonEnemyMaterial: { tier: "2-Star", amount: 4 } },
    "4": { maxLevelAfter: 70, requiredAdventureRank: 35, mora: 20000, weaponAscensionMaterial: { tier: "4-Star", amount: 2 }, eliteEnemyMaterial: { tier: "3-Star", amount: 8 }, commonEnemyMaterial: { tier: "2-Star", amount: 6 } },
    "5": { maxLevelAfter: 80, requiredAdventureRank: 40, mora: 25000, weaponAscensionMaterial: { tier: "4-Star", amount: 4 }, eliteEnemyMaterial: { tier: "4-Star", amount: 6 }, commonEnemyMaterial: { tier: "3-Star", amount: 4 } },
    "6": { maxLevelAfter: 90, requiredAdventureRank: 50, mora: 30000, weaponAscensionMaterial: { tier: "5-Star", amount: 3 }, eliteEnemyMaterial: { tier: "4-Star", amount: 12 }, commonEnemyMaterial: { tier: "3-Star", amount: 8 } },
  },
};

export const WEAPON_ASCENSION_TOTALS_20_TO_90: Record<WeaponGoalTrackableRarityLabel, MaterialTotals> = {
  "5-Star": { Mora: 225000, WeaponAscension2Star: 5, WeaponAscension3Star: 14, WeaponAscension4Star: 14, WeaponAscension5Star: 6, EliteEnemy2Star: 23, EliteEnemy3Star: 27, EliteEnemy4Star: 41, CommonEnemy1Star: 15, CommonEnemy2Star: 23, CommonEnemy3Star: 27 },
  "4-Star": { Mora: 150000, WeaponAscension2Star: 3, WeaponAscension3Star: 9, WeaponAscension4Star: 9, WeaponAscension5Star: 4, EliteEnemy2Star: 15, EliteEnemy3Star: 18, EliteEnemy4Star: 27, CommonEnemy1Star: 10, CommonEnemy2Star: 15, CommonEnemy3Star: 18 },
  "3-Star": { Mora: 105000, WeaponAscension2Star: 2, WeaponAscension3Star: 6, WeaponAscension4Star: 6, WeaponAscension5Star: 3, EliteEnemy2Star: 10, EliteEnemy3Star: 12, EliteEnemy4Star: 18, CommonEnemy1Star: 6, CommonEnemy2Star: 10, CommonEnemy3Star: 12 },
};

export const WEAPON_LEVEL_BOUNDARIES = [1, 20, 40, 50, 60, 70, 80, 90] as const;

export function rarityNumberToLabel(rarity: number | undefined): WeaponRarityLabel | null {
  switch (rarity) {
    case 1:
      return "1-Star";
    case 2:
      return "2-Star";
    case 3:
      return "3-Star";
    case 4:
      return "4-Star";
    case 5:
      return "5-Star";
    default:
      return null;
  }
}

export function resolveGoalTrackableWeaponRarityLabel(rarity: number | undefined): WeaponGoalTrackableRarityLabel | null {
  switch (rarity) {
    case 3:
      return "3-Star";
    case 4:
      return "4-Star";
    case 5:
      return "5-Star";
    default:
      return null;
  }
}

export function inferRequiredWeaponAscensionPhase(targetLevel: number): number {
  if (targetLevel <= 20) return 0;
  if (targetLevel <= 40) return 1;
  if (targetLevel <= 50) return 2;
  if (targetLevel <= 60) return 3;
  if (targetLevel <= 70) return 4;
  if (targetLevel <= 80) return 5;
  return 6;
}

export function weaponAscensionTierKeyForRarity(tier: WeaponAscensionPhaseCost["weaponAscensionMaterial"]["tier"]): "twoStar" | "threeStar" | "fourStar" | "fiveStar" {
  switch (tier) {
    case "2-Star":
      return "twoStar";
    case "3-Star":
      return "threeStar";
    case "4-Star":
      return "fourStar";
    case "5-Star":
      return "fiveStar";
  }
}

export function eliteEnemyTierIndexForRarity(tier: WeaponEnemyMaterialRarity): 0 | 1 | 2 {
  switch (tier) {
    case "2-Star":
      return 0;
    case "3-Star":
      return 1;
    case "4-Star":
      return 2;
  }
}

export function commonEnemyTierIndexForRarity(tier: WeaponCommonEnemyMaterialRarity): 0 | 1 | 2 {
  switch (tier) {
    case "1-Star":
      return 0;
    case "2-Star":
      return 1;
    case "3-Star":
      return 2;
  }
}
