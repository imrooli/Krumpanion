import { availabilityDays } from "../../utils/days";
import type { AvailabilityGroupKey } from "../planner/types";
import type {
  CharacterElement,
  ElementGemFamily,
  MaterialDescriptor,
  MaterialRecord,
  MaterialSourceRecord,
  StaticGameData,
} from "./types";

const TIER_LABELS = {
  sliver: "Sliver",
  fragment: "Fragment",
  chunk: "Chunk",
  gemstone: "Gemstone",
  teachings: "Teachings",
  guide: "Guide",
  philosophies: "Philosophies",
} as const;

const DAY_NAMES_BY_AVAILABILITY: Record<AvailabilityGroupKey, string[]> = {
  MON_THU_SUN: ["Monday", "Thursday", "Sunday"],
  TUE_FRI_SUN: ["Tuesday", "Friday", "Sunday"],
  WED_SAT_SUN: ["Wednesday", "Saturday", "Sunday"],
  ALWAYS: ["Always"],
  WEEKLY: ["Weekly"],
  UNKNOWN: ["Unknown"],
};

function titleCaseFromKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bOf\b/g, "of")
    .replace(/\bTo\b/g, "to")
    .replace(/\bAnd\b/g, "and")
    .trim();
}

function buildDisplayName(materialKey: string, fallbackParts: string[]): string {
  if (fallbackParts.length > 0) {
    return fallbackParts.join(" ");
  }

  return titleCaseFromKey(materialKey);
}

function toLegacyMaterialCategory(record: MaterialRecord): MaterialDescriptor["category"] {
  switch (record.category) {
    case "ascension_gem":
      return "gemstone";
    case "general_enemy_drop":
      return "general_enemy_drop";
    case "elite_enemy_drop":
      return "elite_enemy_drop";
    case "weapon_ascension_material":
      return "weapon_ascension";
    case "weapon_exp_material":
      return "weapon_exp_material";
    case "weapon_fodder_exp":
      return "weapon_fodder_exp";
    case "local_specialty":
      return "local_specialty";
    case "normal_boss_material":
      return "normal_boss_material";
    case "character_talent_material":
      return "talent_book";
    case "weekly_boss_material":
      return "weekly_boss";
    case "special_progression_material":
      return record.key === "Mora" ? "mora" : "other";
    default:
      return "other";
  }
}

function toLegacyMaterialSources(record: MaterialRecord): MaterialSourceRecord[] {
  switch (record.source.type) {
    case "elemental_boss_drop_or_crafting":
      if (record.source.element === "Traveler") {
        return [
          {
            materialKey: record.key,
            sourceType: "other",
            sourceKey: "TravelerProgression",
            sourceName: "Traveler Progression",
            availability: "UNKNOWN",
            notes: record.notes?.[0] ?? "Traveler-specific gem family.",
          },
        ];
      }

      return [
        {
          materialKey: record.key,
          sourceType: "normal_boss",
          sourceKey: `${record.source.element ?? "Elemental"}Bosses`,
          sourceName: `${record.source.element ?? "Elemental"}-aligned Bosses`,
          availability: "ALWAYS",
          resinCost: 40,
          notes: "Dropped by elemental-aligned bosses and craftable upward at the alchemy bench.",
        },
      ];
    case "enemy_drop":
      return [
        {
          materialKey: record.key,
          sourceType: "enemy_drop",
          sourceKey: record.key,
          sourceName: record.source.enemyFamily,
          availability: "ALWAYS",
          notes: record.key,
        },
      ];
    case "domain_of_forgery":
      return [
        {
          materialKey: record.key,
          sourceType: "domain_of_forgery",
          sourceKey: record.familyKey ?? record.key,
          sourceName: record.source.domainName ?? record.displayName,
          availability: "UNKNOWN",
          region: record.source.region ?? undefined,
          notes: record.source.sourceHint,
        },
      ];
    case "local_specialty":
      return [
        {
          materialKey: record.key,
          sourceType: "local_specialty",
          sourceKey: record.key,
          sourceName: record.displayName,
          availability: "ALWAYS",
          region: record.source.region,
          notes: record.source.searchHint,
        },
      ];
    case "normal_boss":
      return [
        {
          materialKey: record.key,
          sourceType: "normal_boss",
          sourceKey: record.source.bossKey,
          sourceName: record.source.bossName,
          availability: "ALWAYS",
          notes: record.displayName,
        },
      ];
    case "domain_of_mastery":
      {
        const source = record.source;
      return [
        {
          materialKey: record.key,
          sourceType: "domain_of_mastery",
          sourceKey: source.domainName.replace(/\s+/g, ""),
          sourceName: source.domainName,
          availability: (
            Object.entries(DAY_NAMES_BY_AVAILABILITY).find(
              ([, value]) => value.join("|") === source.availableDays.join("|"),
            )?.[0] ?? "UNKNOWN"
          ) as AvailabilityGroupKey,
          region: source.region,
        },
      ];
      }
    case "weekly_boss":
      if (!record.source.bossKey) {
        return [];
      }

      return [
        {
          materialKey: record.key,
          sourceType: "weekly_boss",
          sourceKey: record.source.bossKey,
          sourceName: record.source.domainName ?? record.source.bossName ?? record.displayName,
          availability: "WEEKLY",
          notes: record.source.bossName ?? undefined,
        },
      ];
    case "special":
      return [
        {
          materialKey: record.key,
          sourceType: record.key === "Mora" ? "ley_line" : "other",
          sourceKey: record.key,
          sourceName: record.displayName,
          availability: record.key === "Mora" ? "ALWAYS" : "UNKNOWN",
          resinCost: record.key === "Mora" ? 20 : undefined,
          notes: record.source.sourceHint,
        },
      ];
    case "weapon_exp_material":
      return [
        {
          materialKey: record.key,
          sourceType: "weapon_exp_material",
          sourceKey: record.key,
          sourceName: record.displayName,
          availability: "ALWAYS",
          notes: record.source.sourceHint,
        },
      ];
    case "weapon_fodder":
      return [
        {
          materialKey: record.key,
          sourceType: "weapon_fodder",
          sourceKey: record.key,
          sourceName: record.displayName,
          availability: "ALWAYS",
          notes: record.source.sourceHint,
        },
      ];
    case "unresolved":
      return [];
    default:
      return [];
  }
}

function addRecord(
  records: Record<string, MaterialRecord>,
  materials: Record<string, MaterialDescriptor>,
  materialSources: Record<string, MaterialSourceRecord[]>,
  record: MaterialRecord,
) {
  if (record.key === "???") {
    return;
  }

  records[record.key] = record;
  materials[record.key] = {
    key: record.key,
    displayName: record.displayName,
    category: toLegacyMaterialCategory(record),
    weaponExpValue:
      record.category === "weapon_exp_material" || record.category === "weapon_fodder_exp"
        ? record.expValue
        : undefined,
  };

  const rows = toLegacyMaterialSources(record);
  if (rows.length > 0) {
    materialSources[record.key] = rows;
  }
}

export const BRILLIANT_DIAMOND_FAMILY: ElementGemFamily = {
  key: "Traveler",
  element: "Traveler",
  sliver: "BrilliantDiamondSliver",
  fragment: "BrilliantDiamondFragment",
  chunk: "BrilliantDiamondChunk",
  gemstone: "BrilliantDiamondGemstone",
};

type MaterialRegistryInput = Pick<
  StaticGameData,
  | "materials"
  | "elementGemFamilies"
  | "generalEnemyDropFamilies"
  | "eliteEnemyDropFamilies"
  | "localSpecialties"
  | "normalBossMaterials"
  | "talentBookFamilies"
  | "weaponAscensionMaterialFamilies"
  | "weaponExpMaterials"
  | "weeklyBossMaterials"
  | "specialProgressionMaterials"
>;

export function buildCanonicalMaterialRegistry(data: MaterialRegistryInput): {
  materialRecords: Record<string, MaterialRecord>;
  materials: Record<string, MaterialDescriptor>;
  materialSources: Record<string, MaterialSourceRecord[]>;
} {
  const materialRecords: Record<string, MaterialRecord> = {};
  const materials: Record<string, MaterialDescriptor> = {};
  const materialSources: Record<string, MaterialSourceRecord[]> = {};

  for (const family of Object.values(data.elementGemFamilies)) {
    const element = (family.element ?? family.key) as CharacterElement | "Traveler";
    for (const tierKey of ["sliver", "fragment", "chunk", "gemstone"] as const) {
      const materialKey = family[tierKey];
      addRecord(materialRecords, materials, materialSources, {
        key: materialKey,
        displayName:
          data.materials[materialKey]?.displayName ??
          buildDisplayName(materialKey, [titleCaseFromKey(materialKey.replace(TIER_LABELS[tierKey], "")), TIER_LABELS[tierKey]]),
        category: "ascension_gem",
        source: {
          type: "elemental_boss_drop_or_crafting",
          element,
        },
        usedFor: ["character_ascension"],
        craftable: true,
        conversionRatio: 3,
        status: "verified",
        notes: element === "Traveler" ? ["Traveler-specific gem family. Requires special handling."] : undefined,
      });
    }
  }

  for (const family of Object.values(data.generalEnemyDropFamilies)) {
    family.materialKeys.forEach((materialKey, index) => {
      addRecord(materialRecords, materials, materialSources, {
        key: materialKey,
        displayName: family.materialNames[index],
        category: "general_enemy_drop",
        source: {
          type: "enemy_drop",
          enemyFamily: family.sourceEnemyFamily,
        },
        usedFor: ["character_ascension", "weapon_ascension", "talent_leveling"],
        craftable: true,
        conversionRatio: 3,
        status: "verified",
      });
    });
  }

  for (const family of Object.values(data.eliteEnemyDropFamilies)) {
    family.materialKeys.forEach((materialKey, index) => {
      addRecord(materialRecords, materials, materialSources, {
        key: materialKey,
        displayName: family.materialNames[index],
        category: "elite_enemy_drop",
        source: {
          type: "enemy_drop",
          enemyFamily: family.sourceEnemyFamily,
        },
        usedFor: ["weapon_ascension"],
        craftable: true,
        conversionRatio: 3,
        status: "verified",
      });
    });
  }

  for (const family of Object.values(data.weaponAscensionMaterialFamilies)) {
    for (const [tierKey, materialKey] of Object.entries(family.tiers) as Array<
      [keyof typeof family.tiers, string]
    >) {
      addRecord(materialRecords, materials, materialSources, {
        key: materialKey,
        displayName: family.tierDisplayNames[tierKey],
        category: "weapon_ascension_material",
        rarity:
          tierKey === "twoStar"
            ? "2-Star"
            : tierKey === "threeStar"
              ? "3-Star"
              : tierKey === "fourStar"
                ? "4-Star"
                : "5-Star",
        familyKey: family.key,
        source: family.source,
        usedFor: ["weapon_ascension"],
        craftable: true,
        conversionRatio: 3,
        status: family.status,
      });
    }
  }

  for (const specialty of Object.values(data.localSpecialties)) {
    addRecord(materialRecords, materials, materialSources, {
      key: specialty.key,
      displayName: specialty.displayName,
      category: "local_specialty",
      source: {
        type: "local_specialty",
        region: specialty.region,
        purchaseVendors: specialty.purchaseVendors,
        searchHint: specialty.searchHint,
      },
      usedFor: ["character_ascension"],
      craftable: false,
      status: "verified",
    });
  }

  for (const material of Object.values(data.normalBossMaterials)) {
    addRecord(materialRecords, materials, materialSources, {
      key: material.key,
      displayName: material.displayName,
      category: "normal_boss_material",
      source: {
        type: "normal_boss",
        bossKey: material.bossKey,
        bossName: material.bossDisplayName,
      },
      usedFor: ["character_ascension"],
      craftable: false,
      status: "verified",
    });
  }

  for (const family of Object.values(data.talentBookFamilies)) {
    for (const [tierKey, materialKey] of [
      ["teachings", family.teachings],
      ["guide", family.guide],
      ["philosophies", family.philosophies],
    ] as const) {
      addRecord(materialRecords, materials, materialSources, {
        key: materialKey,
        displayName: data.materials[materialKey]?.displayName ?? buildDisplayName(materialKey, []),
        category: "character_talent_material",
        source: {
          type: "domain_of_mastery",
          region: family.region ?? "Unknown",
          domainName: family.domainName ?? family.domainKey ?? family.key,
          availableDays: (DAY_NAMES_BY_AVAILABILITY[family.availability ?? "UNKNOWN"] ?? availabilityDays(family.availability ?? "UNKNOWN")),
        },
        usedFor: ["talent_leveling"],
        craftable: true,
        conversionRatio: 3,
        status: "verified",
        notes: [`${titleCaseFromKey(family.key)} series ${TIER_LABELS[tierKey].toLowerCase()} material.`],
      });
    }
  }

  for (const material of Object.values(data.weeklyBossMaterials)) {
    addRecord(materialRecords, materials, materialSources, {
      key: material.key,
      displayName: material.displayName,
      category: "weekly_boss_material",
      source: material.source,
      usedFor: ["talent_leveling"],
      craftable: false,
      status: material.status,
      notes: material.notes,
    });
  }

  for (const material of Object.values(data.specialProgressionMaterials)) {
    addRecord(materialRecords, materials, materialSources, {
      key: material.key,
      displayName: material.displayName,
      category: "special_progression_material",
      source: material.source,
      usedFor: material.usedFor,
      craftable: false,
      status: material.status,
      notes: material.notes,
    });
  }

  for (const material of Object.values(data.weaponExpMaterials)) {
    addRecord(materialRecords, materials, materialSources, {
      key: material.key,
      displayName: material.displayName,
      category: material.category,
      rarity: material.rarity,
      expValue: material.expValue,
      source: material.source,
      usedFor: material.usedFor,
      craftable: false,
      status: material.status,
    });
  }

  return {
    materialRecords,
    materials,
    materialSources,
  };
}
