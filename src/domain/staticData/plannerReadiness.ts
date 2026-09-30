import { validAvailability } from "../../utils/days";
import type { CharacterProgressionEntry, StaticGameData } from "./types";
import { resolveCharacterProgression } from "../progression/resolveCharacterProgression";
import { resolveWeaponProgression } from "../progression/resolveWeaponProgression";

function supportedProgression(data: StaticGameData, key: string) {
  const result = data.characters[key] ? resolveCharacterProgression(key, data, false) : resolveWeaponProgression(key, data);
  return result.warnings.some(row => row.type !== "migration_notice") ? null : result.progression;
}

export interface FarmingRequirement { materialKey: string; fields: string[]; affectedKeys: string[] }
export function groupFarmingRequirements(data: StaticGameData, requirements: FarmingRequirement[]): FarmingRequirement[] {
  const groups = new Map<string, FarmingRequirement>();
  for (const row of requirements) {
    const key = data.tieredMaterialIndex[row.materialKey]?.familyKey ?? row.materialKey;
    const previous = groups.get(key);
    groups.set(key, { materialKey: previous?.materialKey ?? row.materialKey,
      fields: [...new Set([...(previous?.fields ?? []), ...row.fields])],
      affectedKeys: [...new Set([...(previous?.affectedKeys ?? []), ...row.affectedKeys])] });
  }
  return [...groups.values()];
}
export function farmingRequirements(data: StaticGameData, keys?: string[]): FarmingRequirement[] {
  const consumers = new Map<string, Set<string>>();
  for (const key of keys ?? [...Object.keys(data.exactCharacterRequirements ?? {}), ...Object.keys(data.exactWeaponRequirements ?? {})]) {
    const progression = supportedProgression(data, key);
    if (!progression) continue;
    const character = progression as Partial<CharacterProgressionEntry>;
    const costs = [...Object.values(progression.ascensionTotals), ...Object.values(character.talentTotals ?? {}), ...Object.values(character.talentTotalsBySkill ?? {}).flatMap(levels => Object.values(levels))];
    for (const amounts of costs) for (const [materialKey, amount] of Object.entries(amounts)) {
      if (amount <= 0) continue;
      const set = consumers.get(materialKey) ?? new Set<string>(); set.add(key); consumers.set(materialKey, set);
    }
  }
  return [...consumers.entries()].flatMap(([materialKey, affected]) => {
    const sources = data.materialSources[materialKey] ?? [];
    const record = data.materialRecords[materialKey];
    // Established non-farmable rewards need no fabricated daily schedule.
    if (record?.source.type === "special" && record.source.sourceHint && record.status === "verified") return [];
    const hasResin = (source: typeof sources[number]) => (source.resinCost !== undefined && source.resinCost > 0) ||
      source.sourceType === "normal_boss" && Boolean(data.normalBossMaterials[materialKey]?.bossKey) ||
      source.sourceType === "weekly_boss" && record?.source.type === "weekly_boss" && Boolean(record.source.bossKey);
    const needsFamily = sources.every(source => ["domain_of_mastery", "domain_of_forgery"].includes(source.sourceType)) && sources.length > 0 && !data.tieredMaterialIndex[materialKey];
    const complete = !needsFamily && sources.some(source => source.sourceKey && source.sourceName && source.sourceType !== "other" && source.availability && validAvailability(source.availability) && source.availability !== "UNKNOWN" && (!['domain_of_mastery', 'domain_of_forgery', 'normal_boss', 'weekly_boss', 'ley_line'].includes(source.sourceType) || hasResin(source)));
    if (complete) return [];
    const source = sources[0];
    const fields: string[] = [];
    if (needsFamily) fields.push("Material family and tier");
    if (!source?.sourceKey || !source.sourceName || source.sourceType === "other") fields.push("Farming source");
    if (!source?.availability || !validAvailability(source.availability) || source.availability === "UNKNOWN") fields.push("Availability / domain schedule");
    if (source && ['domain_of_mastery', 'domain_of_forgery', 'normal_boss', 'weekly_boss', 'ley_line'].includes(source.sourceType) && !hasResin(source)) fields.push("Resin cost");
    return [{ materialKey, fields, affectedKeys: [...affected] }];
  });
}
export function plannerReadiness(data: StaticGameData, key: string): { state: "imported" | "farming_setup_required" | "planner_ready"; progressionComplete: boolean; requirements: FarmingRequirement[] } {
  const progressionComplete = Boolean(supportedProgression(data, key));
  const requirements = farmingRequirements(data, [key]);
  return { progressionComplete, state: !progressionComplete ? "imported" : requirements.length ? "farming_setup_required" : "planner_ready", requirements };
}
