import { applyOverridePack } from "./applyOverridePack";
import { reconcileFarming } from "./reconcileFarming";
import type { UpdateDelta } from "./upstreamTypes";
import { validateStaticData } from "./validateStaticData";
import { validateExactRequirements } from "./validateExactRequirements";
import { compileChangeSetToOverridePack, createEmptyDatabaseChangeSet, mergeOverridePacks, type DatabaseChangeSet } from "./databaseChangeSet";
import { canonicalKeyForName, createIdentityResolver, identityRecords, resolveIdentity } from "./entityIdentity";
import { loadStaticData } from "./loadStaticData";
import { parseOverrideDataPack } from "./overrideSchema";
import type { OverrideDataPack, StaticGameData } from "./types";
import type { EntityType, GameDataDiscovery, GameDataObservation, GameDataProviderResult, ProgressionStep, UpstreamDiagnostic } from "./upstreamTypes";


export interface ReconciliationResult {
  delta: UpdateDelta;
  validationMs: number;
  changeSet: DatabaseChangeSet;
  overridePack: OverrideDataPack;
  staticData: StaticGameData;
  diagnostics: UpstreamDiagnostic[];
  summary: Partial<Record<EntityType, number>>;
  discoveries: Record<string, GameDataDiscovery>;
}
export function reconcileGameData(data: StaticGameData, overrides: OverrideDataPack | null, upstream: GameDataProviderResult, discoveries: Record<string, GameDataDiscovery>, measure: () => number = () => 0): ReconciliationResult {
  const changeSet = createEmptyDatabaseChangeSet();
  changeSet.label = `Live game data ${upstream.releaseVersion ?? upstream.revision.slice(0, 8)}`;
  changeSet.releaseTag = upstream.releaseVersion ?? upstream.revision;
  const automatic: NonNullable<DatabaseChangeSet["automaticData"]> = { characters: {}, weapons: {}, materials: {}, artifactSets: {}, exactCharacterRequirements: {}, exactWeaponRequirements: {} };
  changeSet.automaticData = automatic;
  const diagnostics = [...upstream.diagnostics];
  const summary: ReconciliationResult["summary"] = {};
  const catalogs = Object.fromEntries((["character", "weapon", "material", "artifactSet"] as const).map(type => [type, identityRecords(data, type)])) as Record<EntityType, ReturnType<typeof identityRecords>>;
  const resolvers = Object.fromEntries(Object.entries(catalogs).map(([type, records]) => [type, createIdentityResolver(records)])) as Record<EntityType, ReturnType<typeof createIdentityResolver>>;
  const recordsByKey = Object.fromEntries(Object.entries(catalogs).map(([type, records]) => [type, new Map(records.map(record => [record.key, record]))])) as Record<EntityType, Map<string, typeof catalogs.material[number]>>;
  const seen = new Set<string>();
  const required = new Set<number>();
  for (const row of upstream.observations) {
    const identity = `${row.entityType}:${row.gameId}`;
    if (seen.has(identity)) throw new Error(`Duplicate upstream observation ${identity}`);
    seen.add(identity);
    if (!Number.isSafeInteger(row.gameId) || row.gameId <= 0 || !row.displayName.trim()) throw new Error("Invalid upstream identity");
    const steps = [...Object.values(row.characterRequirements?.ascension ?? row.weaponRequirements?.ascension ?? {}), ...Object.values(row.characterRequirements?.talents ?? {}).flatMap(Object.values)];
    for (const step of steps) for (const id of Object.keys(step.costs)) required.add(Number(id));
  }
  for (const family of upstream.farming ?? []) if (family.materialIds.some(id => required.has(id) || catalogs.material.some(row => row.gameId === id))) for (const id of family.materialIds) required.add(id);
  const materialKeys = new Map<number, string>();
  const keys = new Map<GameDataObservation, string>();
  const ownedKeys = new Set<string>();
  for (const row of upstream.observations) {
    const match = resolvers[row.entityType](row.canonicalKey ?? row.displayName, row.gameId);
    const key = match.key ?? row.canonicalKey ?? canonicalKeyForName(row.displayName);
    const existingIdentity = recordsByKey[row.entityType].get(key);
    const collision = existingIdentity?.gameId !== undefined && existingIdentity.gameId !== row.gameId;
    if (match.conflict || collision || !key || ownedKeys.has(`${row.entityType}:${key}`)) {
      diagnostics.push({ entityType: row.entityType, gameId: row.gameId, message: match.conflict ?? `Canonical collision: ${key}` });
      continue;
    }
    if (row.entityType === "material" && !match.key && !required.has(row.gameId)) continue;
    ownedKeys.add(`${row.entityType}:${key}`); keys.set(row, key);
    if (row.entityType === "material") materialKeys.set(row.gameId, key);
  }
  const translate = (steps: Record<string, ProgressionStep>): Record<string, ProgressionStep> => Object.fromEntries(Object.entries(steps).map(([level, step]) => {
    const costs: Record<string, number> = {};
    for (const [id, amount] of Object.entries(step.costs)) {
      const key = materialKeys.get(Number(id));
      if (!key) throw new Error(`Material ${id} needs identity review`);
      costs[key] = (costs[key] ?? 0) + amount;
    }
    return [level, { ...step, costs }];
  }));
  for (const row of upstream.observations) {
    const key = keys.get(row); if (!key) continue;
    const existing = recordsByKey[row.entityType].get(key);
    const section = row.entityType === "character" ? "characters" : row.entityType === "weapon" ? "weapons" : row.entityType === "material" ? "materials" : "artifactSets";
    const manual = overrides?.[section]?.[key];
    const protectedFields = manual?.provenance ? manual.manualFields ?? [] : ["displayName", "rarity", "weaponType", "element"];
    const manualValues = manual as unknown as Record<string, unknown> | undefined;
    const observedValues = row as unknown as Record<string, unknown>;
    const identityConflict = protectedFields.some(field => manualValues?.[field] !== undefined && observedValues[field] !== undefined && manualValues[field] !== observedValues[field]);
    const manualProgression = row.entityType === "character" ? overrides?.exactCharacterRequirements?.[key]?.manual || overrides?.legacyExactCharacterProgressions?.[key] || (!data.exactCharacterRequirements?.[key] && overrides?.characterMaterialProfiles?.[key]) : row.entityType === "weapon" ? overrides?.exactWeaponRequirements?.[key]?.manual || overrides?.legacyExactWeaponProgressions?.[key] || (!data.exactWeaponRequirements?.[key] && overrides?.weaponMaterialProfiles?.[key]) : false;
    if (identityConflict || manualProgression) {
      diagnostics.push({ entityType: row.entityType, gameId: row.gameId, message: `Manual identity or progression for ${key} retained for review` }); continue;
    }
    const identity = { ...existing, key, gameId: row.gameId, displayName: row.displayName, aliases: [...new Set([...(existing?.aliases ?? []), ...(row.aliases ?? []), ...(existing && existing.displayName !== row.displayName ? [existing.displayName] : [])])], provenance: row.provenance };
    try {
      if (row.entityType === "material") automatic.materials![key] = { ...data.materials[key], ...identity, category: data.materials[key]?.category ?? "other" };
      if (row.entityType === "artifactSet") automatic.artifactSets![key] = { ...identity, memberGameIds: row.memberGameIds };
      if (row.entityType === "character") {
        if (!row.characterRequirements || (row.rarity !== 4 && row.rarity !== 5) || !row.weaponType) throw new Error("Character progression/metadata incomplete");
        const requirements = { ...row.characterRequirements, ascension: translate(row.characterRequirements.ascension), talents: { normal: translate(row.characterRequirements.talents.normal), skill: translate(row.characterRequirements.talents.skill), burst: translate(row.characterRequirements.talents.burst) } };
        automatic.exactCharacterRequirements![key] = requirements;
        automatic.characters![key] = { ...data.characters[key], ...identity, rarity: row.rarity, weaponType: row.weaponType, element: row.element ?? data.characters[key]?.element, playable: true, characterKind: "normal" };
      }
      if (row.entityType === "weapon") {
        if (!row.rarity || !row.weaponType || (row.rarity >= 3 && !row.weaponRequirements)) throw new Error("Weapon progression/metadata incomplete");
        if (row.weaponRequirements) automatic.exactWeaponRequirements![key] = { ...row.weaponRequirements, ascension: translate(row.weaponRequirements.ascension) };
        automatic.weapons![key] = { ...data.weapons[key], ...identity, rarity: row.rarity, weaponType: row.weaponType };
      }
      summary[row.entityType] = (summary[row.entityType] ?? 0) + 1;
    } catch (error) { diagnostics.push({ entityType: row.entityType, gameId: row.gameId, message: `${key}: ${String(error)}` }); }
  }
  const activatedMaterials = new Set<string>();
  for (const requirements of Object.values(automatic.exactCharacterRequirements!)) for (const step of [...Object.values(requirements.ascension), ...Object.values(requirements.talents).flatMap(Object.values)]) for (const key of Object.keys(step.costs)) activatedMaterials.add(key);
  for (const requirements of Object.values(automatic.exactWeaponRequirements!)) for (const step of Object.values(requirements.ascension)) for (const key of Object.keys(step.costs)) activatedMaterials.add(key);
  for (const family of upstream.farming ?? []) if (family.materialIds.some(id => activatedMaterials.has(materialKeys.get(id) ?? "") || data.materials[materialKeys.get(id) ?? ""])) for (const id of family.materialIds) { const key = materialKeys.get(id); if (key) activatedMaterials.add(key); }
  for (const key of Object.keys(automatic.materials!)) if (!data.materials[key] && !activatedMaterials.has(key)) { delete automatic.materials![key]; summary.material = (summary.material ?? 1) - 1; }
  let overridePack = parseOverrideDataPack(JSON.stringify(mergeOverridePacks(overrides, compileChangeSetToOverridePack(changeSet))));
  const farming = reconcileFarming(applyOverridePack(data, overridePack), overridePack, upstream.farming ?? [], diagnostics);
  overridePack = parseOverrideDataPack(JSON.stringify(farming.overridePack));
  const staticData = loadStaticData(overridePack);
  const validationStarted = measure();
  validateExactRequirements(staticData);
  const errors = validateStaticData(staticData).issues.filter(issue => issue.severity === "error");
  if (errors.length) throw new Error(`Update failed database validation: ${errors.slice(0, 5).map(issue => issue.message).join("; ")}`);
  const validationMs = measure() - validationStarted;
  const delta: UpdateDelta = { added: 0, changed: 0, unchanged: 0, review: diagnostics.length, progression: 0, families: farming.families, domains: farming.domains, schedules: 0, affectedKeys: [] };
  const content = (value: unknown): string => JSON.stringify(value, (key, item: unknown) => key === "provenance" ? undefined : item);
  for (const type of ["character", "weapon", "material", "artifactSet"] as const) for (const row of identityRecords(staticData, type)) {
    if (!row.provenance || row.provenance.provider !== upstream.provider) continue;
    const old = recordsByKey[type].get(row.key);
    const before = type === "character" ? data.exactCharacterRequirements?.[row.key] : type === "weapon" ? data.exactWeaponRequirements?.[row.key] : undefined;
    const after = type === "character" ? staticData.exactCharacterRequirements?.[row.key] : type === "weapon" ? staticData.exactWeaponRequirements?.[row.key] : undefined;
    const progressionChanged = content(before) !== content(after);
    if (progressionChanged) delta.progression++;
    if (!old) delta.added++; else if (content(old) !== content(row) || progressionChanged) delta.changed++; else delta.unchanged++;
    if (type === "character" || type === "weapon") if (!old || content(old) !== content(row) || progressionChanged) delta.affectedKeys.push(row.key);
  }
  const materialCandidates = upstream.observations.filter(row => row.entityType === "material").map(row => ({ ...row, key: String(row.gameId) }));
  const candidateResolver = createIdentityResolver(materialCandidates);
  const nextDiscoveries = Object.fromEntries(Object.entries(discoveries).map(([id, discovery]) => {
    if (discovery.status === "ignored") return [id, discovery];
    const match = resolveIdentity(identityRecords(staticData, discovery.entityType), discovery.rawKey, discovery.candidateGameId);
    const candidate = !match.key && discovery.entityType === "material" ? candidateResolver(discovery.rawKey) : undefined;
    return [id, { ...discovery, status: match.key ? "resolved" : "needs_review", candidateKey: match.key, candidateGameId: candidate?.key ? Number(candidate.key) : discovery.candidateGameId, notes: match.conflict ?? candidate?.conflict ?? (candidate?.key ? "Upstream material identity found; not activated without supported progression or manual review." : undefined) } satisfies GameDataDiscovery];
  }));
  return { delta, validationMs, changeSet, overridePack, staticData, diagnostics, summary, discoveries: nextDiscoveries };
}
