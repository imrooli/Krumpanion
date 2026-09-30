import { validateAnimeCore, schemaFailure } from "./animeSchema";
import { extractAnimeFarming, EXTRACTOR_VERSION, FARMING_FILES } from "./animeFarming";
import { z } from "zod";
import type { CharacterElement, CharacterWeaponType } from "../domain/staticData/types";
import { GameDataProviderError } from "../domain/staticData/upstreamTypes";
import type { CombatTalent, DataProvenance, ExactCharacterRequirements, GameDataObservation, GameDataProviderResult, ProgressionStep } from "../domain/staticData/upstreamTypes";

export const ANIME_PROVIDER_ID = "animegamedata2";
export const ANIME_TABLES = ["Avatar", "AvatarCodex", "AvatarPromote", "AvatarSkillDepot", "AvatarSkill", "ProudSkill", "Weapon", "WeaponCodex", "WeaponPromote", "Material", "Reliquary", "ReliquarySet", "ReliquaryCodex", "EquipAffix"] as const;
export const ANIME_FILES = [...ANIME_TABLES.map(name => `ExcelBinOutput/${name}ExcelConfigData.json`), "TextMap/TextMap_MediumEN.json"];
export const ALL_ANIME_FILES = [...ANIME_FILES, ...FARMING_FILES];
export interface AnimeDataset { capabilities?: string[]; revision: string; releaseVersion?: string; files: Record<string, unknown> }
type Row = Record<string, unknown>;
const integer = z.number().int().positive();
const costSchema = z.array(z.object({ id: integer.optional(), count: z.number().int().nonnegative().optional() }));
const weaponTypes: Record<string, CharacterWeaponType> = { WEAPON_SWORD_ONE_HAND: "Sword", WEAPON_CLAYMORE: "Claymore", WEAPON_POLE: "Polearm", WEAPON_BOW: "Bow", WEAPON_CATALYST: "Catalyst" };
const elements: Record<string, CharacterElement> = { Fire: "Pyro", Water: "Hydro", Ice: "Cryo", Electric: "Electro", Wind: "Anemo", Rock: "Geo", Grass: "Dendro" };

export function parseAnimeGameData2(dataset: AnimeDataset, now = new Date()): GameDataProviderResult {
  if (!dataset.revision) throw new Error("Dataset revision is required.");
  validateAnimeCore(dataset.files);
  const tables = Object.fromEntries(ANIME_TABLES.map(name => {
    const value = dataset.files[`ExcelBinOutput/${name}ExcelConfigData.json`];
    return [name, z.array(z.record(z.unknown())).min(1).parse(value)];
  })) as Record<typeof ANIME_TABLES[number], Row[]>;
  const textMap = z.record(z.string()).parse(dataset.files["TextMap/TextMap_MediumEN.json"]);
  const result: GameDataProviderResult = { provider: ANIME_PROVIDER_ID, revision: dataset.revision, releaseVersion: dataset.releaseVersion, observations: [], diagnostics: [] };
  const provenance = (table: string, relationshipIds?: number[]): DataProvenance => ({ provider: ANIME_PROVIDER_ID, revision: dataset.revision, table, relationshipIds });
  const index = (rows: Row[], field: string) => {
    const map = new Map<number, Row>();
    for (const row of rows) {
      const id = integer.parse(row[field]);
      if (map.has(id)) throw new Error(`Duplicate ${field}: ${id}`);
      map.set(id, row);
    }
    return map;
  };
  const avatars = index(tables.Avatar, "id");
  const weapons = index(tables.Weapon, "id");
  const materials = index(tables.Material, "id");
  const depots = index(tables.AvatarSkillDepot, "id");
  const skills = index(tables.AvatarSkill, "id");
  const name = (row: Row) => {
    const hash = integer.parse(row.nameTextMapHash);
    const value = textMap[String(hash)]?.trim();
    if (!value || /^(?:test|\?+|dummy)(?:\b|$)/i.test(value)) throw new Error(`Missing or unusable English localization for ${hash}`);
    return value;
  };
  const materialObservations = new Map<number, GameDataObservation>();
  const material = (id: number): GameDataObservation => {
    const row = materials.get(id);
    if (!row) throw new Error(`Missing material ${id}`);
    return { entityType: "material", gameId: id, displayName: name(row), provenance: provenance("MaterialExcelConfigData") };
  };
  const costs = (row: Row, coinField: string, required: Set<number>): ProgressionStep => {
    const totals: Record<string, number> = {};
    const parsedCosts = costSchema.safeParse(row.costItems);
    if (!parsedCosts.success) schemaFailure(coinField === "scoinCost" ? "AvatarPromoteExcelConfigData" : row.proudSkillGroupId ? "ProudSkillExcelConfigData" : "WeaponPromoteExcelConfigData", "costItems", row.id ?? row.proudSkillGroupId);
    for (const item of parsedCosts.data) {
      if (item.id === undefined && item.count === undefined) continue;
      if (item.id === undefined || item.count === undefined) throw new Error("Incomplete cost item");
      if (!item.count) continue;
      material(item.id); required.add(item.id);
      totals[String(item.id)] = (totals[String(item.id)] ?? 0) + item.count;
    }
    const coins = z.number().int().nonnegative().parse(row[coinField] ?? 0);
    if (coins) { material(202); required.add(202); totals["202"] = (totals["202"] ?? 0) + coins; }
    if (!Object.keys(totals).length) throw new Error("Empty progression cost");
    return { costs: totals };
  };
  const promote = (rows: Row[], field: string, id: number, coin: string, required: Set<number>, maxPhase = 6) => {
    const steps: Record<string, ProgressionStep> = {};
    for (const row of rows.filter(row => row[field] === id)) {
      const phase = z.number().int().min(0).parse(row.promoteLevel ?? 0);
      if (phase === 0) continue;
      if (phase > maxPhase || steps[String(phase)]) throw new Error(`Unsupported or duplicate promotion phase ${phase}`);
      steps[String(phase)] = costs(row, coin, required);
    }
    for (let phase = 1; phase <= maxPhase; phase++) if (!steps[String(phase)]) throw new Error(`Missing promotion phase ${phase}`);
    return steps;
  };
  const accept = (observation: GameDataObservation, required: Set<number>) => {
    result.observations.push(observation);
    for (const id of required) materialObservations.set(id, material(id));
  };
  for (const codex of tables.AvatarCodex) {
    const gameId = integer.parse(codex.avatarId);
    try {
      const avatar = avatars.get(gameId);
      if (!avatar || avatar.useType !== "AVATAR_FORMAL") throw new Error("Not a formal playable avatar");
      // Codex time has no timezone. Waiting until the end of its UTC date avoids early activation.
      const release = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/).parse(codex.beginTime);
      const releaseAt = Date.parse(`${release.slice(0, 10)}T23:59:59Z`);
      if (!Number.isFinite(releaseAt) || releaseAt > now.getTime()) throw new Error("Release date has not elapsed");
      if (Array.isArray(avatar.candSkillDepotIds) && avatar.candSkillDepotIds.length > 1) throw new Error("Multiple skill depots require review; existing progression retained");
      const rarity = avatar.qualityType === "QUALITY_PURPLE" ? 4 : ["QUALITY_ORANGE", "QUALITY_ORANGE_SP"].includes(String(avatar.qualityType)) ? 5 : undefined;
      const weaponType = weaponTypes[String(avatar.weaponType)];
      if (!rarity || !weaponType) throw new Error("Unsupported rarity or weapon type");
      const promoteId = integer.parse(avatar.avatarPromoteId);
      const depotId = integer.parse(avatar.skillDepotId);
      const depot = depots.get(depotId);
      if (!depot) throw new Error(`Missing skill depot ${depotId}`);
      const depotSkills = z.array(z.number().int().nonnegative()).min(2).parse(depot.skills);
      const ids = [integer.parse(depotSkills[0]), integer.parse(depotSkills[1]), integer.parse(depot.energySkill)];
      if (new Set(ids).size !== 3) throw new Error("Combat talent slots are not distinct");
      const element = elements[String(skills.get(ids[2])?.costElemType)];
      if (!element) throw new Error("Missing supported elemental identity");
      const required = new Set<number>();
      const talents = {} as ExactCharacterRequirements["talents"];
      const groups: number[] = [];
      for (const [slot, skillId] of (["normal", "skill", "burst"] as CombatTalent[]).map((slot, i) => [slot, ids[i]] as const)) {
        const skill = skills.get(skillId);
        const group = integer.parse(skill?.proudSkillGroupId); groups.push(group);
        const steps: Record<string, ProgressionStep> = {};
        for (const row of tables.ProudSkill.filter(row => row.proudSkillGroupId === group)) {
          const level = integer.parse(row.level);
          if (level < 2 || level > 10) continue;
          if (steps[String(level)]) throw new Error(`Duplicate talent level ${level}`);
          steps[String(level)] = { ...costs(row, "coinCost", required), requiredAscension: z.number().int().min(0).max(6).parse(row.breakLevel ?? 0) };
        }
        for (let level = 2; level <= 10; level++) if (!steps[String(level)]) throw new Error(`Missing ${slot} talent level ${level}`);
        talents[slot] = steps;
      }
      const p = provenance("AvatarExcelConfigData", [promoteId, depotId, ...groups]);
      accept({ entityType: "character", gameId, displayName: name(avatar), rarity, weaponType, element, provenance: p, characterRequirements: { ascension: promote(tables.AvatarPromote, "avatarPromoteId", promoteId, "scoinCost", required), talents, provenance: p } }, required);
    } catch (error) { if (error instanceof GameDataProviderError) throw error; result.diagnostics.push({ entityType: "character", gameId, message: String(error) }); }
  }
  const codexAvatarIds = new Set(tables.AvatarCodex.map(row => row.avatarId));
  for (const avatar of tables.Avatar) if (avatar.useType === "AVATAR_FORMAL" && !codexAvatarIds.has(avatar.id)) result.diagnostics.push({ entityType: "character", gameId: Number(avatar.id), message: "No live codex identity; existing special-character behavior retained." });
  for (const codex of tables.WeaponCodex) {
    const gameId = integer.parse(codex.weaponId);
    try {
      if (codex.isDisuse === true) throw new Error("Weapon is marked unused");
      const row = weapons.get(gameId);
      if (!row || row.itemType !== "ITEM_WEAPON") throw new Error("Missing obtainable weapon identity");
      if (row.isDisuse === true) throw new Error("Weapon is marked unused");
      const rarity = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).parse(row.rankLevel);
      const weaponType = weaponTypes[String(row.weaponType)];
      if (!weaponType) throw new Error("Unsupported weapon type");
      const promoteId = integer.parse(row.weaponPromoteId);
      const required = new Set<number>(); const p = provenance("WeaponExcelConfigData", [promoteId]);
      // Low-rarity weapons are retained as identities; current planner tracks rarity 3–5.
      const requirements = rarity >= 3 ? { ascension: promote(tables.WeaponPromote, "weaponPromoteId", promoteId, "coinCost", required), provenance: p } : undefined;
      accept({ entityType: "weapon", gameId, displayName: name(row), rarity, weaponType, weaponRequirements: requirements, provenance: p }, required);
    } catch (error) { if (error instanceof GameDataProviderError) throw error; result.diagnostics.push({ entityType: "weapon", gameId, message: String(error) }); }
  }
  const setIds = new Set(tables.ReliquaryCodex.map(row => row.suitId));
  const reliquaries = index(tables.Reliquary, "id");
  for (const set of tables.ReliquarySet) {
    const gameId = integer.parse(set.setId);
    if (!setIds.has(gameId)) continue;
    try {
      const affixes = tables.EquipAffix.filter(row => row.id === set.equipAffixId);
      const names = [...new Set(affixes.map(name))];
      if (names.length !== 1) throw new Error("Artifact-set name is ambiguous");
      const members = z.array(integer).min(1).parse(set.containsList);
      if (members.some(id => reliquaries.get(id)?.setId !== gameId)) throw new Error("Artifact set has missing or conflicting members");
      result.observations.push({ entityType: "artifactSet", gameId, displayName: names[0], memberGameIds: members, provenance: provenance("ReliquarySetExcelConfigData", [integer.parse(set.equipAffixId)]) });
    } catch (error) { if (error instanceof GameDataProviderError) throw error; result.diagnostics.push({ entityType: "artifactSet", gameId, message: String(error) }); }
  }
  // All named material identities are available for matching existing catalogs/discoveries,
  // but reconciliation only activates new ones referenced by accepted progression.
  for (const [id] of materials) {
    if (materialObservations.has(id)) continue;
    try { materialObservations.set(id, material(id)); } catch { /* Internal unnamed items are not candidates. */ }
  }
  result.observations.push(...materialObservations.values());
  if (!result.observations.some(row => row.entityType === "character") || !result.observations.some(row => row.entityType === "weapon")) throw new Error("No supported live character/weapon records; upstream schema may have changed.");
  result.extractorVersion = dataset.capabilities?.includes("scene-points") ? EXTRACTOR_VERSION : dataset.capabilities?.includes("farming") ? 2 : 1;
  if (dataset.capabilities?.includes("farming")) result.farming = extractAnimeFarming(dataset.files, result);
  return result;
}
