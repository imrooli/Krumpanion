import type { AvailabilityGroupKey } from "../../domain/planner/types";
import type { MaterialCategory, MaterialSourceType } from "../../domain/staticData/types";

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  "mora",
  "character_exp",
  "character_ascension",
  "normal_boss_material",
  "talent_book",
  "weapon_ascension",
  "general_enemy_drop",
  "elite_enemy_drop",
  "enemy_drop",
  "weekly_boss",
  "local_specialty",
  "gemstone",
  "artifact_domain",
  "other",
];

export const SOURCE_TYPES: MaterialSourceType[] = [
  "domain_of_mastery",
  "domain_of_forgery",
  "artifact_domain",
  "normal_boss",
  "weekly_boss",
  "ley_line",
  "enemy_drop",
  "local_specialty",
  "alchemy",
  "other",
];

export const AVAILABILITY_OPTIONS: AvailabilityGroupKey[] = [
  "MON_THU_SUN",
  "TUE_FRI_SUN",
  "WED_SAT_SUN",
  "ALWAYS",
  "WEEKLY",
  "UNKNOWN",
];

export const ELEMENT_OPTIONS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"] as const;
export const WEAPON_TYPE_OPTIONS = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"] as const;
export const REGION_OPTIONS = [
  "Mondstadt",
  "Liyue",
  "Inazuma",
  "Sumeru",
  "Fontaine",
  "Natlan",
  "Nod-Krai",
  "Snezhnaya",
  "Khaenriah",
  "Other",
] as const;

export function parseJsonValue<T>(label: string, text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} must be valid JSON. ${detail}`);
  }
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
