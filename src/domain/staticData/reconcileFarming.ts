import { buildFarmingOverride, farmingConfigurationFor, type FarmingConfiguration } from "./farmingConfiguration";
import { applyOverridePack } from "./applyOverridePack";
import type { OverrideDataPack, StaticGameData } from "./types";
import type { FarmingField, FarmingObservation, UpstreamDiagnostic } from "./upstreamTypes";

const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function value(form: FarmingConfiguration, field: FarmingField): unknown {
  if (field === "family") return [form.familyKey, form.tierKeys];
  if (field === "source") return [form.sourceType, form.sourceKey, form.sourceName];
  return form[field];
}
export function applyFarmingField(current: FarmingConfiguration, proposed: FarmingConfiguration, field: FarmingField): FarmingConfiguration {
  if (field === "family") return { ...current, familyKey: proposed.familyKey, tierKeys: proposed.tierKeys };
  if (field === "source") return { ...current, sourceKey: proposed.sourceKey, sourceName: proposed.sourceName, sourceType: proposed.sourceType };
  return { ...current, [field]: proposed[field] };
}
export function reconcileFarming(data: StaticGameData, input: OverrideDataPack, observations: FarmingObservation[], diagnostics: UpstreamDiagnostic[]) {
  let pack = input;
  let effective = data;
  let families = 0, domains = 0;
  const materialIds = new Map(Object.values(data.materials).filter(row => row.gameId).map(row => [row.gameId!, row.key]));
  for (const observation of observations) {
    pack = { ...pack, farmingRelationships: { ...pack.farmingRelationships, [`upstream:${observation.kind}:${observation.materialIds[0]}`]: observation } };
    // These are current compiler capabilities, not a universal family classification rule.
    const supported = observation.materialIds.length === (observation.kind === "talent" ? 3 : 4);
    const tierKeys = observation.materialIds.map(id => materialIds.get(id));
    if (!supported || tierKeys.some(key => !key)) {
      diagnostics.push({ code: "unsupported_family_shape", severity: "warning", stage: "farming", message: `Family ${observation.materialIds.join("/")} requires review; current planner cannot activate this relationship.` }); continue;
    }
    const keys = tierKeys as string[];
    const materialKey = keys[0];
    const current = farmingConfigurationFor(effective, materialKey);
    const existingFamilyKeys = new Set(keys.flatMap(key => effective.tieredMaterialIndex[key]?.familyKey ?? []));
    if (existingFamilyKeys.size > 1) { diagnostics.push({ code: "family_collision", severity: "warning", message: `Materials ${keys.join(", ")} already belong to conflicting families.` }); continue; }
    const familyKey = current.familyKey || `${observation.kind === "talent" ? "Talent" : "Weapon"}Family${observation.materialIds[0]}`;
    const existingTiers = effective.tieredMaterialIndex[materialKey]?.tierKeys;
    if (!existingTiers && (effective.talentBookFamilies[familyKey] || effective.weaponAscensionFamilies[familyKey])) { diagnostics.push({ code: "family_collision", severity: "warning", message: `Family key ${familyKey} is already in use.` }); continue; }
    const resource = `family:${familyKey}`;
    const origins = { ...pack.farmingOrigins?.[resource] };
    const knownDomain = observation.domain && Object.entries(pack.farmingOrigins ?? {}).find(([, fields]) => fields.source?.domainGameId === observation.domain!.gameId);
    const knownFamily = knownDomain?.[0].replace(/^family:/, "");
    const knownDomainKey = knownFamily ? effective.talentBookFamilies[knownFamily]?.domainKey ?? effective.weaponAscensionFamilies[knownFamily]?.domainKey : undefined;
    // Exact localization corroborates an established relationship; it never invents a reward join.
    const sameDomain = observation.domain && current.sourceName === observation.domain.name;
    const proposed: FarmingConfiguration = { ...current, materialKey, familyKey, tierKeys: keys,
      sourceType: observation.kind === "talent" ? "domain_of_mastery" : "domain_of_forgery",
      sourceKey: observation.domain ? knownDomainKey ?? (sameDomain ? current.sourceKey : `UpstreamDomain${observation.domain.gameId}`) : current.sourceKey,
      sourceName: observation.domain?.name ?? current.sourceName,
      resinCost: observation.domain?.resinCost ?? current.resinCost,
    };
    const existingDomain = effective.domainsOfMastery[proposed.sourceKey] ?? effective.domainsOfForgery[proposed.sourceKey];
    const domainCollision = observation.domain && proposed.sourceKey !== current.sourceKey && existingDomain && existingDomain.name !== observation.domain.name;
    if (domainCollision) diagnostics.push({ code: "domain_collision", severity: "warning", stage: "farming", message: `${proposed.sourceKey} is already used by a different domain; retain manual domain setup.` });
    let form = { ...current };
    const fields: FarmingField[] = ["family", ...(observation.domain && !domainCollision ? ["source" as const] : []), ...(observation.domain?.resinCost && !domainCollision ? ["resinCost" as const] : [])];
    let changed = false;
    for (const field of fields) {
      const hasValue = field === "family" ? Boolean(current.familyKey) : field === "source" ? Boolean(current.sourceKey && current.sourceName && current.sourceType !== "other") : current.resinCost !== undefined;
      if (equal(value(current, field), value(proposed, field))) continue;
      if (hasValue && origins[field]?.source !== "upstream") {
        const id = `${resource}:${field}`;
        const previous = pack.farmingConflicts?.[id];
        const conflict = { id, materialKey, field, proposed, provenance: observation.provenance, domainGameId: observation.domain?.gameId, status: previous && equal(value(previous.proposed, field), value(proposed, field)) ? previous.status : "pending" as const };
        pack = { ...pack, farmingConflicts: { ...pack.farmingConflicts, [id]: conflict } };
        diagnostics.push({ code: "manual_farming_conflict", severity: "warning", stage: "reconcile", message: `${familyKey}: existing ${field} retained; review upstream suggestion in Farming Setup.` });
      } else {
        form = applyFarmingField(form, proposed, field);
        origins[field] = { source: "upstream", provenance: observation.provenance, ...(field === "source" && observation.domain ? { domainGameId: observation.domain.gameId } : {}) };
        changed = true;
        if (field === "family") families++;
        if (field === "source") domains++;
      }
    }
    // A family without a verified physical domain stays unscheduled.
    if (form.sourceType === "other" && form.familyKey) form.sourceType = proposed.sourceType;
    if (changed) {
      pack = buildFarmingOverride(effective, pack, form, false);
      pack.farmingOrigins = { ...pack.farmingOrigins, [resource]: origins };
      pack.farmingRelationships = { ...pack.farmingRelationships, [resource]: observation };
      // The generic authoring compiler has default recipe costs. Replace only newly derived recipes.
      if (!existingTiers) for (let i = 1; i < keys.length; i++) {
        const key = keys[i]; const recipe = pack.recipes?.[key];
        if (recipe) { const exact = { ...recipe, moraCost: observation.recipeCoins[i - 1] }; pack.recipes = { ...pack.recipes, [key]: exact }; pack.craftingRecipes = { ...pack.craftingRecipes, [key]: exact }; }
      }
      effective = applyOverridePack(effective, pack);
    }
  }
  return { overridePack: pack, families, domains };
}
