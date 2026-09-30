import type { EntityType, GameIdentity } from "./upstreamTypes";
import type { StaticGameData } from "./types";

export interface IdentityRecord extends GameIdentity { key: string; displayName: string }
export function normalizeIdentity(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
export function canonicalKeyForName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").split(/[^a-zA-Z0-9]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join("");
}
export function identityRecords(data: StaticGameData, type: EntityType): IdentityRecord[] {
  if (type === "character") return Object.values(data.characters);
  if (type === "weapon") return Object.values(data.weapons);
  if (type === "material") return Object.values(data.materials);
  const sets = Object.fromEntries(Object.values(data.artifactDomains).map(set => [set.setKey, { key: set.setKey, displayName: set.setName }]));
  return Object.values({ ...sets, ...data.artifactSets });
}
export function createIdentityResolver(records: IdentityRecord[]) {
  const ids = new Map<number, IdentityRecord[]>();
  const aliases = new Map<string, IdentityRecord[]>();
  const keys = new Map<string, IdentityRecord[]>();
  const names = new Map<string, IdentityRecord[]>();
  const add = <T>(index: Map<T, IdentityRecord[]>, value: T, record: IdentityRecord) => {
    const entries = index.get(value) ?? []; if (!entries.includes(record)) entries.push(record); index.set(value, entries);
  };
  for (const record of records) {
    if (record.gameId !== undefined) add(ids, record.gameId, record);
    for (const alias of record.aliases ?? []) add(aliases, alias, record);
    add(keys, record.key, record); add(names, normalizeIdentity(record.key), record); add(names, normalizeIdentity(record.displayName), record);
  }
  return (rawKey: string, gameId?: number): { key?: string; conflict?: string } => {
    const unique = (matches: IdentityRecord[]) => matches.length === 1 ? { key: matches[0].key } : { conflict: `Ambiguous identity: ${rawKey}` };
    if (gameId !== undefined) { const byId = ids.get(gameId); if (byId?.length) return unique(byId); }
    for (const matches of [aliases.get(rawKey), keys.get(rawKey), names.get(normalizeIdentity(rawKey))]) {
      if (!matches?.length) continue;
      if (gameId !== undefined && matches.some(record => record.gameId !== undefined && record.gameId !== gameId)) return { conflict: `Game ID conflicts with ${rawKey}` };
      return unique(matches);
    }
    return {};
  };
}
export function resolveIdentity(records: IdentityRecord[], rawKey: string, gameId?: number): { key?: string; conflict?: string } {
  return createIdentityResolver(records)(rawKey, gameId);
}
