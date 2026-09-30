import { validAvailability } from "../../utils/days";
import type { AvailabilityGroupKey } from "../planner/types";
import { compileChangeSetToOverridePack, createEmptyDatabaseChangeSet, mergeOverridePacks } from "./databaseChangeSet";
import { canonicalKeyForName } from "./entityIdentity";
import type { MaterialCategory, MaterialSourceType, OverrideDataPack, StaticGameData } from "./types";

export interface FarmingConfiguration {
  materialKey: string;
  sourceType: MaterialSourceType;
  sourceKey: string;
  sourceName: string;
  availability: AvailabilityGroupKey;
  resinCost?: number;
  region: string;
  familyKey: string;
  tierKeys: string[];
}
export function buildFarmingOverride(data: StaticGameData, overrides: OverrideDataPack | null, input: FarmingConfiguration, manual = true): OverrideDataPack {
  if (!data.materials[input.materialKey]) throw new Error("Select an existing material");
  if (input.resinCost !== undefined && (!Number.isFinite(input.resinCost) || input.resinCost < 0)) throw new Error("Resin cost must be nonnegative");
  if (!validAvailability(input.availability)) throw new Error("Select valid availability days");
  const tierKeys = input.tierKeys.filter(Boolean);
  if (tierKeys.some(key => !data.materials[key]) || new Set(tierKeys).size !== tierKeys.length) throw new Error("Family tiers must reference distinct existing materials");
  const sourceKey = input.sourceKey || canonicalKeyForName(input.sourceName);
  const patch = createEmptyDatabaseChangeSet();
  const familyKey = input.familyKey.trim();
  const names = (key: string) => data.materials[key].displayName;
  const completeFamily = Boolean(familyKey && (input.sourceType === "domain_of_mastery" && tierKeys.length === 3 || input.sourceType === "domain_of_forgery" && tierKeys.length === 4 || input.sourceType === "enemy_drop" && tierKeys.length === 3));
  if (completeFamily && !tierKeys.includes(input.materialKey)) throw new Error("The selected material must belong to this family");
  const common = { key: familyKey, domainKey: sourceKey, domainName: input.sourceName, region: input.region, availability: input.availability, status: "verified" as const, notes: [] };
  if (completeFamily && input.sourceType === "domain_of_mastery") patch.talentBookFamilies[familyKey] = { ...common, teachingsKey: tierKeys[0], teachingsName: names(tierKeys[0]), guideKey: tierKeys[1], guideName: names(tierKeys[1]), philosophiesKey: tierKeys[2], philosophiesName: names(tierKeys[2]) };
  if (completeFamily && input.sourceType === "domain_of_forgery") patch.weaponAscensionFamilies[familyKey] = { ...common, displayName: familyKey, twoStarKey: tierKeys[0], twoStarName: names(tierKeys[0]), threeStarKey: tierKeys[1], threeStarName: names(tierKeys[1]), fourStarKey: tierKeys[2], fourStarName: names(tierKeys[2]), fiveStarKey: tierKeys[3], fiveStarName: names(tierKeys[3]) };
  if (completeFamily && input.sourceType === "enemy_drop") patch.commonEnemyDropFamilies[familyKey] = { familyId: familyKey, displayName: familyKey, sourceEnemyFamily: input.sourceName, lowKey: tierKeys[0], lowName: names(tierKeys[0]), midKey: tierKeys[1], midName: names(tierKeys[1]), highKey: tierKeys[2], highName: names(tierKeys[2]), status: "verified", notes: [] };
  if (sourceKey && input.sourceName && ["domain_of_mastery", "domain_of_forgery", "weekly_boss"].includes(input.sourceType)) patch.sourceDomains[sourceKey] = { domainKey: sourceKey, domainType: input.sourceType === "domain_of_mastery" ? "mastery" : input.sourceType === "domain_of_forgery" ? "forgery" : "trounce", name: input.sourceName, region: input.region, location: "", availability: input.availability, linkedFamilyKeys: completeFamily ? [familyKey] : [], listedRewards: completeFamily ? tierKeys.map(names) : [names(input.materialKey)], elements: [], notes: [] };
  const compiled = compileChangeSetToOverridePack(patch);
  // Adding a material/family to an established domain preserves its other rewards.
  const mastery = compiled.domainsOfMastery?.[sourceKey];
  if (mastery) { const old = data.domainsOfMastery[sourceKey]; compiled.domainsOfMastery![sourceKey] = { ...mastery, ...old, name: input.sourceName, region: input.region, resinCost: input.resinCost ?? old?.resinCost ?? mastery.resinCost, talentFamilies: [...new Set([...(old?.talentFamilies ?? []), ...mastery.talentFamilies])], listedRewards: [...new Set([...(old?.listedRewards ?? []), ...mastery.listedRewards])] }; }
  const forgery = compiled.domainsOfForgery?.[sourceKey];
  if (forgery) { const old = data.domainsOfForgery[sourceKey]; compiled.domainsOfForgery![sourceKey] = { ...forgery, ...old, name: input.sourceName, region: input.region, resinCost: input.resinCost ?? old?.resinCost ?? forgery.resinCost, weaponAscensionFamilies: [...new Set([...(old?.weaponAscensionFamilies ?? []), ...forgery.weaponAscensionFamilies])], listedRewards: [...new Set([...(old?.listedRewards ?? []), ...forgery.listedRewards])] }; }
  const trounce = compiled.trounceDomains?.[sourceKey];
  if (trounce) { const old = data.trounceDomains[sourceKey]; compiled.trounceDomains![sourceKey] = { ...trounce, ...old, name: input.sourceName, region: input.region, resinCostFirstThreeWeekly: input.resinCost ?? old?.resinCostFirstThreeWeekly ?? trounce.resinCostFirstThreeWeekly, weeklyTalentMaterials: [...new Set([...(old?.weeklyTalentMaterials ?? []), input.materialKey])] }; }
  // Editing a schedule must not reset existing recipe costs or crafting corrections.
  for (const key of tierKeys) {
    if (data.recipes[key] && compiled.recipes?.[key]) compiled.recipes[key] = data.recipes[key];
    if (data.craftingRecipes[key] && compiled.craftingRecipes?.[key]) compiled.craftingRecipes[key] = data.craftingRecipes[key];
  }
  const pack = mergeOverridePacks(overrides, compiled)!;
  const categoryBySource: Partial<Record<MaterialSourceType, MaterialCategory>> = { domain_of_mastery: "talent_book", domain_of_forgery: "weapon_ascension", normal_boss: "normal_boss_material", weekly_boss: "weekly_boss", enemy_drop: "general_enemy_drop", local_specialty: "local_specialty" };
  for (const key of completeFamily ? tierKeys : [input.materialKey]) {
    pack.materials = { ...pack.materials, [key]: { ...data.materials[key], ...compiled.materials?.[key], gameId: data.materials[key].gameId, provenance: data.materials[key].provenance, aliases: data.materials[key].aliases, category: categoryBySource[input.sourceType] ?? data.materials[key].category } };
    pack.materialSources = { ...pack.materialSources, [key]: [{ materialKey: key, sourceType: input.sourceType, sourceKey, sourceName: input.sourceName, availability: input.availability, resinCost: input.resinCost, region: input.region }] };
  }
  pack.farmingDrafts = { ...pack.farmingDrafts, [input.materialKey]: { ...input, sourceKey } };
  if (manual) {
    const previous = farmingConfigurationFor(data, input.materialKey);
    const resource = input.familyKey ? `family:${input.familyKey}` : `material:${input.materialKey}`;
    const origins = { ...pack.farmingOrigins?.[resource] };
    if (previous.availability !== input.availability) origins.availability = { source: "manual" };
    if (previous.resinCost !== input.resinCost) origins.resinCost = { source: "manual" };
    if (previous.familyKey !== input.familyKey || JSON.stringify(previous.tierKeys) !== JSON.stringify(input.tierKeys)) origins.family = { source: "manual" };
    if (previous.sourceKey !== sourceKey || previous.sourceName !== input.sourceName || previous.sourceType !== input.sourceType) origins.source = { source: "manual" };
    pack.farmingOrigins = { ...pack.farmingOrigins, [resource]: origins };
  }
  return pack;
}

export function farmingConfigurationFor(data: StaticGameData, materialKey: string): FarmingConfiguration {
  const source = data.materialSources[materialKey]?.[0];
  const family = data.tieredMaterialIndex[materialKey];
  return { materialKey, sourceType: source?.sourceType ?? "other", sourceKey: source?.sourceKey ?? "", sourceName: source?.sourceName ?? "", availability: source?.availability ?? "UNKNOWN", resinCost: source?.resinCost, region: source?.region ?? "", familyKey: family?.familyKey ?? "", tierKeys: family?.tierKeys ?? [] };
}
