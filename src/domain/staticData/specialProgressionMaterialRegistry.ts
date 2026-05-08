import type {
  MaterialDescriptor,
  MaterialSourceRecord,
  SpecialProgressionMaterial,
  StaticGameData,
} from "./types";

export const SPECIAL_PROGRESSION_MATERIALS: Record<string, SpecialProgressionMaterial> = {
  Mora: {
    key: "Mora",
    displayName: "Mora",
    category: "special_progression_material",
    source: {
      type: "special",
      sourceHint: "General currency from many gameplay sources.",
    },
    usedFor: [
      "character_ascension",
      "character_leveling",
      "talent_leveling",
      "weapon_ascension",
      "general_currency",
    ],
    craftable: false,
    status: "verified",
  },
  CrownOfInsight: {
    key: "CrownOfInsight",
    displayName: "Crown of Insight",
    category: "special_progression_material",
    source: {
      type: "special",
      sourceHint: "Limited event and permanent offering-system reward.",
    },
    usedFor: ["talent_leveling"],
    craftable: false,
    status: "verified",
  },
  DustOfAzoth: {
    key: "DustOfAzoth",
    displayName: "Dust of Azoth",
    category: "special_progression_material",
    source: {
      type: "special",
      sourceHint: "Used for elemental gem conversion at the crafting bench.",
    },
    usedFor: ["character_ascension"],
    craftable: false,
    status: "verified",
  },
  MasterlessStellaFortuna: {
    key: "MasterlessStellaFortuna",
    displayName: "Masterless Stella Fortuna",
    category: "special_progression_material",
    source: {
      type: "special",
      sourceHint: "Post-90 progression material from user-defined project rules. Verify against allowed sources before treating as live game data.",
    },
    usedFor: ["post_90_unlock"],
    craftable: false,
    status: "needs_manual_review",
  },
  TheCornerstoneOfStarsAndFlames: {
    key: "TheCornerstoneOfStarsAndFlames",
    displayName: "The Cornerstone of Stars and Flames",
    category: "special_progression_material",
    source: {
      type: "special",
      sourceHint: "Traveler-specific Pyro talent progression material acquired from Traveler progression content.",
    },
    usedFor: ["talent_leveling"],
    craftable: false,
    status: "verified",
  },
};

function toLegacyMaterialCategory(key: string): MaterialDescriptor["category"] {
  if (key === "Mora") {
    return "mora";
  }

  return "other";
}

function toLegacyMaterialSourceRecord(material: SpecialProgressionMaterial): MaterialSourceRecord {
  const notes = material.source.type === "special" ? material.source.sourceHint : material.source.reason;

  if (material.key === "Mora") {
    return {
      materialKey: material.key,
      sourceType: "ley_line",
      sourceKey: "leyLineOutcropBlossomOfWealth",
      sourceName: "Ley Line Outcrop: Blossom of Wealth",
      availability: "ALWAYS",
      resinCost: 20,
      notes,
    };
  }

  return {
    materialKey: material.key,
    sourceType: "other",
    sourceKey: material.key,
    sourceName: material.displayName,
    availability: "UNKNOWN",
    notes,
  };
}

export function buildSpecialProgressionMaterialRegistry(): {
  specialProgressionMaterials: StaticGameData["specialProgressionMaterials"];
  materials: Record<string, MaterialDescriptor>;
  materialSources: Record<string, MaterialSourceRecord[]>;
} {
  const specialProgressionMaterials = SPECIAL_PROGRESSION_MATERIALS;
  const materials = Object.fromEntries(
    Object.values(specialProgressionMaterials).map((item) => [
      item.key,
      {
        key: item.key,
        displayName: item.displayName,
        category: toLegacyMaterialCategory(item.key),
      } satisfies MaterialDescriptor,
    ]),
  );
  const materialSources = Object.fromEntries(
    Object.values(specialProgressionMaterials).map((item) => [item.key, [toLegacyMaterialSourceRecord(item)]]),
  );

  return {
    specialProgressionMaterials,
    materials,
    materialSources,
  };
}
