import type { FarmingObservation, GameDataProviderResult } from "../domain/staticData/upstreamTypes";
import { animeRows, schemaFailure, type AnimeRow } from "./animeSchema";

export const FARMING_FILES = ["Combine", "MaterialSourceData", "Dungeon", "RewardPreview", "DungeonEntry"].map(name => `ExcelBinOutput/${name}ExcelConfigData.json`).concat(["ExcelBinOutput/ManualTextMapConfigData.json", "BinOutput/Scene/Point/scene3_point.json"]);
export const EXTRACTOR_VERSION = 3;
export const FARMING_TABLE_FILES = FARMING_FILES.filter(path => !path.startsWith("BinOutput/"));
export function requiredScenePointFiles(entries: unknown): string[] {
  if (!Array.isArray(entries)) schemaFailure("DungeonEntryExcelConfigData", "record array");
  const ids = new Set<number>();
  for (const entry of entries as AnimeRow[]) {
    if (!["DUNGEN_ENTRY_TYPE_AVATAR_TALENT", "DUNGEN_ENTRY_TYPE_WEAPON_PROMOTE"].includes(String(entry.type))) continue;
    if (!Number.isSafeInteger(entry.sceneId) || Number(entry.sceneId) <= 0) schemaFailure("DungeonEntryExcelConfigData", "sceneId", entry.id);
    ids.add(Number(entry.sceneId));
  }
  return [...ids].sort((a, b) => a - b).map(id => `BinOutput/Scene/Point/scene${id}_point.json`);
}
const items = (value: unknown): AnimeRow[] => Array.isArray(value) ? value.filter(row => row && typeof row === "object") as AnimeRow[] : [];
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;

export function extractAnimeFarming(files: Record<string, unknown>, result: GameDataProviderResult): FarmingObservation[] {
  const table = (name: string, fields: Parameters<typeof animeRows>[2]) => animeRows(files, `ExcelBinOutput/${name}ExcelConfigData.json`, fields);
  const combine = table("Combine", { combineId: "number", materialItems: "array", resultItemId: "number", resultItemCount: "number" });
  const sources = table("MaterialSourceData", { id: "number", dungeonGroup: "array" });
  const dungeons = table("Dungeon", { id: "number", subType: "string", passRewardPreviewID: "number" });
  const rewards = table("RewardPreview", { id: "number", previewItems: "array" });
  const entries = table("DungeonEntry", { id: "number", sceneId: "number", dungeonEntryId: "number", descriptionCycleRewardList: "array" });
  const manual = animeRows(files, "ExcelBinOutput/ManualTextMapConfigData.json", { textMapId: "string", textMapContentTextMapHash: "number" });
  const scenePoints = new Map<string, Record<string, AnimeRow>>();
  for (const path of requiredScenePointFiles(entries)) {
    // Old capability-2 bundles can only establish scene 3; other scenes stay manual.
    if (!(path in files)) { if ((result.extractorVersion ?? 1) >= 3) schemaFailure(path, "required scene points"); continue; }
    const points = (files[path] as { points?: Record<string, AnimeRow> } | undefined)?.points;
    if (!points || typeof points !== "object" || Array.isArray(points)) schemaFailure(path, "points");
    scenePoints.set(path, points);
  }
  const text = files["TextMap/TextMap_MediumEN.json"] as Record<string, string>;
  const materials = new Map((files["ExcelBinOutput/MaterialExcelConfigData.json"] as AnimeRow[]).map(row => [Number(row.id), row]));
  const sourceMap = new Map(sources.map(row => [Number(row.id), row]));
  const dungeonMap = new Map(dungeons.map(row => [Number(row.id), row]));
  const rewardMap = new Map(rewards.map(row => [Number(row.id), row]));
  const manualMap = new Map(manual.map(row => [String(row.textMapId), row.textMapContentTextMapHash]));
  const edges = combine.flatMap(row => {
    const inputs = items(row.materialItems).filter(item => positive(item.id));
    if (row.recipeType !== "RECIPE_TYPE_COMBINE" || ![2, 3].includes(Number(row.combineType)) || inputs.length !== 1 || inputs[0].count !== 3 || row.resultItemCount !== 1 || Number(row.dropId ?? 0) !== 0 || items(row.randomItems).some(item => positive(item.id))) return [];
    const from = Number(inputs[0].id), to = Number(row.resultItemId);
    if (!materials.has(from) || !materials.has(to) || Number(materials.get(to)!.rankLevel) !== Number(materials.get(from)!.rankLevel) + 1 || !Number.isSafeInteger(row.scoinCost) || Number(row.scoinCost) < 0) return [];
    return [{ from, to, id: Number(row.combineId), coins: Number(row.scoinCost), kind: row.combineType === 3 ? "talent" as const : "weapon" as const }];
  });
  const observedMaterials = new Set(result.observations.filter(row => row.entityType === "material").map(row => row.gameId));
  const observations: FarmingObservation[] = [];
  const review = (id: number, message: string) => result.diagnostics.push({ code: "farming_review", gameId: id, severity: "warning", stage: "farming", message });
  for (const first of edges.filter(edge => !edges.some(other => other.to === edge.from))) {
    const chain = [first.from]; const links: typeof edges = []; let current = first.from; let ambiguous = false;
    for (let n = 0; n <= edges.length; n++) {
      const next = edges.filter(edge => edge.from === current);
      if (!next.length) break;
      if (next.length !== 1 || edges.filter(edge => edge.to === next[0].to).length !== 1 || next[0].kind !== first.kind || chain.includes(next[0].to)) { ambiguous = true; break; }
      links.push(next[0]); current = next[0].to; chain.push(current);
    }
    if (ambiguous || chain.length < 2 || chain.some(id => !observedMaterials.has(id))) { review(first.from, "Incomplete or ambiguous structured material family; retain manual setup."); continue; }
    const subtype = first.kind === "talent" ? "DUNGEON_SUB_TALENT" : "DUNGEON_SUB_WEAPON";
    const stageIds = [...new Set(chain.flatMap(id => (sourceMap.get(id)?.dungeonGroup as number[] | undefined) ?? []).filter(positive))];
    const stages = stageIds.map(id => dungeonMap.get(id));
    const validStages = stages.length > 0 && stages.every(stage => stage && stage.subType === subtype && stage.stateType === "DUNGEON_STATE_RELEASE");
    const rewardIds = new Set(stages.flatMap(stage => items(rewardMap.get(Number(stage?.passRewardPreviewID))?.previewItems).map(item => Number(item.id))));
    const usage = result.observations.some(row => Object.values(first.kind === "talent" ? row.characterRequirements?.talents.normal ?? {} : row.weaponRequirements?.ascension ?? {}).some(step => chain.some(id => step.costs[String(id)] !== undefined)));
    if (!usage && !validStages) { review(first.from, "Material family classification lacks supported progression or domain evidence."); continue; }
    const provenance = { provider: result.provider, revision: result.revision, table: "CombineExcelConfigData", relationshipIds: links.map(link => link.id) };
    const observation: FarmingObservation = { kind: first.kind, materialIds: chain, recipeIds: links.map(link => link.id), recipeCoins: links.map(link => link.coins), stageIds, rewardPreviewIds: stages.flatMap(stage => positive(stage?.passRewardPreviewID) ? [stage.passRewardPreviewID] : []), provenance };
    const domainEntries = entries.filter(entry => entry.type === (first.kind === "talent" ? "DUNGEN_ENTRY_TYPE_AVATAR_TALENT" : "DUNGEN_ENTRY_TYPE_WEAPON_PROMOTE") && chain.every(id => (entry.descriptionCycleRewardList as unknown[]).some(group => Array.isArray(group) && group.includes(id))));
    if (validStages && chain.every(id => rewardIds.has(id)) && domainEntries.length === 1) {
      const entry = domainEntries[0];
      const point = scenePoints.get(`BinOutput/Scene/Point/scene${entry.sceneId}_point.json`)?.[String(entry.dungeonEntryId)];
      const name = text[String(manualMap.get(String(point?.titleTextID)))]?.trim();
      if (name) {
        const costs = stages.map(stage => stage?.statueCostID === 106 ? stage.statueCostCount : undefined);
        const resinCost = positive(costs[0]) && costs.every(cost => cost === costs[0]) ? costs[0] : undefined;
        observation.domain = { gameId: Number(entry.id), name, resinCost };
        observation.provenance = { ...provenance, table: "Combine → MaterialSourceData → Dungeon → RewardPreview → DungeonEntry → ScenePoint → ManualTextMap", relationshipIds: [...provenance.relationshipIds, ...stageIds, Number(entry.id)] };
      } else review(first.from, "Domain localization or scene identity is unavailable; domain remains manual.");
    } else review(first.from, "Domain reward relationship is incomplete or ambiguous; domain remains manual.");
    observations.push(observation);
  }
  return observations;
}
