import type { ImportedAccountState, MultiAccountUserState } from "../account/types";
import { createIdentityResolver, identityRecords, normalizeIdentity } from "./entityIdentity";
import type { StaticGameData } from "./types";
import type { EntityType, GameDataDiscovery } from "./upstreamTypes";

export function discoverGoodEntities(account: ImportedAccountState, data: StaticGameData): Array<{ entityType: EntityType; rawKey: string }> {
  const candidates: Array<{ entityType: EntityType; rawKey: string }> = [
    ...account.characters.map(row => ({ entityType: "character" as const, rawKey: row.characterId })),
    ...account.weapons.map(row => ({ entityType: "weapon" as const, rawKey: row.weaponKey })),
    ...(account.unmatchedWeapons ?? []).map(row => ({ entityType: "weapon" as const, rawKey: row.importName })),
    ...Object.keys(account.inventory).map(rawKey => ({ entityType: "material" as const, rawKey })),
    ...account.artifacts.map(row => ({ entityType: "artifactSet" as const, rawKey: row.setId })),
  ];
  const resolvers = Object.fromEntries((["character", "weapon", "material", "artifactSet"] as const).map(type => [type, createIdentityResolver(identityRecords(data, type))]));
  return candidates.filter(row => !resolvers[row.entityType](row.rawKey).key);
}
export function mergeGoodDiscoveries(existing: Record<string, GameDataDiscovery>, account: ImportedAccountState, accountId: string, data: StaticGameData, now: string): Record<string, GameDataDiscovery> {
  const next = { ...existing };
  for (const row of discoverGoodEntities(account, data)) {
    const id = `${row.entityType}:${normalizeIdentity(row.rawKey) || row.rawKey}`;
    const prior = next[id];
    next[id] = { ...prior, ...row, id, firstSeen: prior?.firstSeen ?? now, lastSeen: now, accountIds: [...new Set([...(prior?.accountIds ?? []), accountId])], source: "GOOD", status: prior?.status === "ignored" ? "ignored" : "detected" };
  }
  return next;
}

/** Resolve the current internal snapshot, never replay an old GOOD file. */
export function resolvePreservedAccounts(user: MultiAccountUserState, data: StaticGameData): MultiAccountUserState {
  const resolvers = Object.fromEntries((["character", "weapon", "material", "artifactSet"] as const).map(type => [type, createIdentityResolver(identityRecords(data, type))]));
  const resolve = (type: EntityType, raw: string) => resolvers[type](raw).key ?? raw;
  const inventory = (values: Record<string, number>) => {
    const next: Record<string, number> = {};
    for (const [raw, amount] of Object.entries(values)) { const key = resolve("material", raw); next[key] = (next[key] ?? 0) + amount; }
    return next;
  };
  return { ...user, accountsById: Object.fromEntries(Object.entries(user.accountsById).map(([id, account]) => {
    const unmatched = account.unmatchedWeapons ?? [];
    const newlyMatched = unmatched.flatMap(row => {
      const key = resolvers.weapon(row.importName).key;
      return key ? [{ ...row, weaponKey: key, weaponId: key }] : [];
    });
    const matchedIds = new Set(newlyMatched.map(row => row.weaponInstanceId));
    return [id, {
      ...account,
      characters: account.characters.map(row => ({ ...row, characterId: resolve("character", row.characterId) })),
      weapons: [...account.weapons, ...newlyMatched].map(row => ({ ...row, weaponKey: resolve("weapon", row.weaponKey), weaponId: resolve("weapon", row.weaponKey), equippedBy: row.equippedBy ? resolve("character", row.equippedBy) : row.equippedBy, location: row.location ? resolve("character", row.location) : row.location, equippedByCharacterId: row.equippedByCharacterId ? resolve("character", row.equippedByCharacterId) : undefined })),
      unmatchedWeapons: unmatched.filter(row => !matchedIds.has(row.weaponInstanceId)),
      artifacts: account.artifacts.map(row => ({ ...row, setId: resolve("artifactSet", row.setId), location: row.location ? resolve("character", row.location) : row.location })),
      inventory: inventory(account.inventory), importedInventory: inventory(account.importedInventory),
      materialEditState: Object.fromEntries(Object.entries(account.materialEditState).map(([key, value]) => [resolve("material", key), value])),
      goals: { ...account.goals,
        artifactGoals: account.goals.artifactGoals.map(goal => ({ ...goal, characterKey: goal.characterKey ? resolve("character", goal.characterKey) : goal.characterKey, targetSetKeys: goal.targetSetKeys.map(key => resolve("artifactSet", key)) })),
        characterGoals: Object.fromEntries(Object.entries(account.goals.characterGoals).map(([key, goal]) => { const canonical = resolve("character", key); return [canonical, { ...goal, characterKey: canonical }]; })),
        weaponGoals: Object.fromEntries(Object.entries(account.goals.weaponGoals).map(([key, goal]) => [key, { ...goal, weaponKey: resolve("weapon", goal.weaponKey), linkedCharacterKey: goal.linkedCharacterKey ? resolve("character", goal.linkedCharacterKey) : undefined, location: goal.location ? resolve("character", goal.location) : goal.location }])),
      },
      warnings: account.warnings.filter(warning => !warning.key || !(warning.type === "unknown_character" && resolvers.character(warning.key).key || warning.type === "unknown_weapon" && resolvers.weapon(warning.key).key || warning.type === "unknown_material" && resolvers.material(warning.key).key)),
    }];
  })) };
}
