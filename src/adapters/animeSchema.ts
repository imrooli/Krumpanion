import { GameDataProviderError } from "../domain/staticData/upstreamTypes";

export type AnimeRow = Record<string, unknown>;
export function schemaFailure(dataset: string, field: string, recordId?: unknown): never {
  const message = `Provider schema unsupported: ${dataset}, ${field}${recordId === undefined ? "" : ` (record ${String(recordId)})`}. Keep the current database and retry after updating Krumpanion or import a compatible bundle.`;
  throw new GameDataProviderError(message, undefined, [{ code: "unsupported_schema", dataset, field, recordId: recordId === undefined ? undefined : String(recordId), severity: "error", stage: "schema", message }]);
}
export function animeRows(files: Record<string, unknown>, path: string, fields: Record<string, "number" | "string" | "array">): AnimeRow[] {
  const value = files[path];
  if (!Array.isArray(value) || !value.length || value.some(row => !row || typeof row !== "object" || Array.isArray(row))) schemaFailure(path, "nonempty record array");
  const rows = value as AnimeRow[];
  for (const [field, kind] of Object.entries(fields)) {
    if (!rows.some(row => row[field] !== undefined)) schemaFailure(path, field);
    for (const row of rows) if (row[field] !== undefined && !(kind === "array" ? Array.isArray(row[field]) : typeof row[field] === kind)) schemaFailure(path, field, row.id ?? row.avatarId ?? row.weaponId);
  }
  return rows;
}
export function validateAnimeCore(files: Record<string, unknown>) {
  const signatures: Record<string, Record<string, "number" | "string" | "array">> = {
    Avatar: { id: "number", nameTextMapHash: "number", avatarPromoteId: "number", skillDepotId: "number", useType: "string" },
    AvatarCodex: { avatarId: "number", beginTime: "string" }, AvatarPromote: { avatarPromoteId: "number", promoteLevel: "number", costItems: "array", scoinCost: "number" },
    AvatarSkillDepot: { id: "number", skills: "array", energySkill: "number" }, AvatarSkill: { id: "number", proudSkillGroupId: "number" },
    ProudSkill: { proudSkillGroupId: "number", level: "number", costItems: "array", coinCost: "number" },
    Weapon: { id: "number", nameTextMapHash: "number", weaponPromoteId: "number", rankLevel: "number" }, WeaponCodex: { weaponId: "number" },
    WeaponPromote: { weaponPromoteId: "number", promoteLevel: "number", costItems: "array", coinCost: "number" },
    Material: { id: "number", nameTextMapHash: "number" }, Reliquary: { id: "number", setId: "number" },
    ReliquarySet: { setId: "number", equipAffixId: "number", containsList: "array" }, ReliquaryCodex: { suitId: "number" }, EquipAffix: { id: "number", nameTextMapHash: "number" },
  };
  for (const [table, signature] of Object.entries(signatures)) animeRows(files, `ExcelBinOutput/${table}ExcelConfigData.json`, signature);
  const path = "TextMap/TextMap_MediumEN.json";
  const text = files[path];
  if (!text || typeof text !== "object" || Array.isArray(text) || !Object.keys(text).length || Object.values(text).some(value => typeof value !== "string")) schemaFailure(path, "English localization map");
  const avatars = files["ExcelBinOutput/AvatarExcelConfigData.json"] as AnimeRow[];
  for (const row of avatars.filter(row => row.useType === "AVATAR_FORMAL")) for (const field of ["id", "avatarPromoteId", "skillDepotId", "nameTextMapHash"]) if (row[field] === undefined) schemaFailure("AvatarExcelConfigData", field, row.id);
}
