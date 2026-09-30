import { createIdentityResolver, identityRecords } from "../domain/staticData/entityIdentity";
import { discoverGoodEntities } from "../domain/staticData/goodDiscoveries";
import type { ImportedAccountState, OwnedArtifact, OwnedCharacter, OwnedWeapon, UnmatchedOwnedWeapon } from "../domain/account/types";
import { parseGoodFromText } from "../domain/good/parseGood";
import type { ImportResult } from "../domain/good/types";
import type { StaticGameData } from "../domain/staticData/types";

function normalizeCharacters(account: NonNullable<ImportResult["inventory"]>): OwnedCharacter[] {
  return Object.values(account.charactersByKey).map((character) => ({
    characterId: character.key,
    currentLevel: character.level,
    currentAscension: character.ascension,
    constellation: character.constellation,
    currentTalents: {
      normal: character.talent.auto,
      skill: character.talent.skill,
      burst: character.talent.burst,
    },
    enabled: true,
  }));
}

function buildWeaponCatalogLookup(staticData: StaticGameData | undefined) {
  const resolver = staticData ? createIdentityResolver(identityRecords(staticData, "weapon")) : undefined;
  return { resolve: (rawName: string) => resolver ? resolver(rawName).key ?? null : rawName };
}

function normalizeWeapons(
  account: NonNullable<ImportResult["inventory"]>,
  staticData: StaticGameData | undefined,
): { weapons: OwnedWeapon[]; unmatchedWeapons: UnmatchedOwnedWeapon[]; warnings: ImportedAccountState["warnings"] } {
  const lookup = buildWeaponCatalogLookup(staticData);
  const weapons: OwnedWeapon[] = [];
  const unmatchedWeapons: UnmatchedOwnedWeapon[] = [];
  const warnings: ImportedAccountState["warnings"] = [];

  for (const weapon of Object.values(account.weaponsById)) {
    const canonicalWeaponKey = lookup.resolve(weapon.key) ?? (staticData ? null : weapon.key);

    if (!canonicalWeaponKey) {
      unmatchedWeapons.push({
        weaponInstanceId: weapon.id,
        importName: weapon.key,
        importedName: weapon.key,
        importSourceId: weapon.id,
        currentLevel: weapon.level,
        currentAscension: weapon.ascension,
        refinement: weapon.refinement,
        equippedByCharacterId: weapon.location || undefined,
        equippedBy: weapon.location || null,
        location: weapon.location,
        lock: weapon.lock,
        locked: weapon.lock,
      });
      warnings.push({
        type: "unknown_weapon",
        key: weapon.key,
        message: `Weapon ${weapon.key} could not be matched to the canonical weapon database and was kept in unmatched weapons.`,
      });
      continue;
    }

    weapons.push({
      weaponInstanceId: weapon.id,
      weaponKey: canonicalWeaponKey,
      weaponId: canonicalWeaponKey,
      importName: weapon.key,
      importedName: weapon.key,
      importSourceId: weapon.id,
      currentLevel: weapon.level,
      currentAscension: weapon.ascension,
      refinement: weapon.refinement,
      equippedByCharacterId: weapon.location || undefined,
      equippedBy: weapon.location || null,
      location: weapon.location,
      lock: weapon.lock,
      locked: weapon.lock,
    });
  }

  return { weapons, unmatchedWeapons, warnings };
}

function normalizeArtifacts(account: NonNullable<ImportResult["inventory"]>): OwnedArtifact[] {
  return Object.values(account.artifactsById).map((artifact) => ({
    artifactInstanceId: artifact.id,
    setId: artifact.setKey,
    slotKey: artifact.slotKey,
    level: artifact.level,
    rarity: artifact.rarity,
    mainStatKey: artifact.mainStatKey,
    location: artifact.location,
    lock: artifact.lock,
    substats: artifact.substats,
    astralMark: artifact.astralMark,
    elixerCrafted: artifact.elixerCrafted,
    totalRolls: artifact.totalRolls,
    unactivatedSubstats: artifact.unactivatedSubstats,
  }));
}

export interface GoodAccountImportResult {
  account: ImportedAccountState | null;
  warnings: ImportResult["warnings"];
  errors: string[];
}

export function importGoodAccountFromText(text: string, staticData?: StaticGameData): GoodAccountImportResult {
  const parsed = parseGoodFromText(text);

  if (!parsed.inventory) {
    return {
      account: null,
      warnings: parsed.warnings,
      errors: parsed.errors,
    };
  }

  if (staticData) {
    const resolvers = Object.fromEntries((["character", "material", "artifactSet"] as const).map(type => [type, createIdentityResolver(identityRecords(staticData, type))]));
    const resolve = (type: "character" | "material" | "artifactSet", key: string) => resolvers[type](key).key ?? key;
    parsed.inventory.charactersByKey = Object.fromEntries(Object.values(parsed.inventory.charactersByKey).map(row => { const key = resolve("character", row.key); return [key, { ...row, key }]; }));
    const materials: Record<string, number> = {};
    for (const [raw, amount] of Object.entries(parsed.inventory.materialsByKey)) { const key = resolve("material", raw); materials[key] = (materials[key] ?? 0) + amount; }
    parsed.inventory.materialsByKey = materials;
    parsed.inventory.artifactsById = Object.fromEntries(Object.entries(parsed.inventory.artifactsById).map(([id, row]) => [id, { ...row, setKey: resolve("artifactSet", row.setKey), location: row.location ? resolve("character", row.location) : row.location }]));
    parsed.inventory.weaponsById = Object.fromEntries(Object.entries(parsed.inventory.weaponsById).map(([id, row]) => [id, { ...row, location: row.location ? resolve("character", row.location) : row.location }]));
  }
  const normalizedWeapons = normalizeWeapons(parsed.inventory, staticData);

  const account: ImportedAccountState = {
      importMeta: parsed.inventory.importMeta,
      characters: normalizeCharacters(parsed.inventory),
      weapons: normalizedWeapons.weapons,
      unmatchedWeapons: normalizedWeapons.unmatchedWeapons,
      artifacts: normalizeArtifacts(parsed.inventory),
      inventory: parsed.inventory.materialsByKey,
      warnings: [...parsed.inventory.warnings, ...normalizedWeapons.warnings],
  };
  if (staticData) for (const discovery of discoverGoodEntities(account, staticData)) {
    if (discovery.entityType === "character" || discovery.entityType === "material") account.warnings.push({ type: discovery.entityType === "character" ? "unknown_character" : "unknown_material", key: discovery.rawKey, message: `Unknown ${discovery.entityType} ${discovery.rawKey} was preserved for database discovery.` });
  }
  return { account, warnings: parsed.warnings, errors: parsed.errors };
}
