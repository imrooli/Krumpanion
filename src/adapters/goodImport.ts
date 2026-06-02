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

function normalizeLookupValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildWeaponCatalogLookup(staticData: StaticGameData | undefined) {
  const directKeyMap = new Map<string, string>();
  const exactNameMap = new Map<string, string>();
  const normalizedMap = new Map<string, string>();

  for (const weapon of Object.values(staticData?.weapons ?? {})) {
    directKeyMap.set(weapon.key, weapon.key);
    exactNameMap.set(weapon.displayName, weapon.key);
    normalizedMap.set(normalizeLookupValue(weapon.key), weapon.key);
    normalizedMap.set(normalizeLookupValue(weapon.displayName), weapon.key);
  }

  return {
    resolve(rawName: string): string | null {
      return (
        exactNameMap.get(rawName) ??
        directKeyMap.get(rawName) ??
        normalizedMap.get(normalizeLookupValue(rawName)) ??
        null
      );
    },
  };
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

  const normalizedWeapons = normalizeWeapons(parsed.inventory, staticData);

  return {
    account: {
      importMeta: parsed.inventory.importMeta,
      characters: normalizeCharacters(parsed.inventory),
      weapons: normalizedWeapons.weapons,
      unmatchedWeapons: normalizedWeapons.unmatchedWeapons,
      artifacts: normalizeArtifacts(parsed.inventory),
      inventory: parsed.inventory.materialsByKey,
      warnings: [...parsed.inventory.warnings, ...normalizedWeapons.warnings],
    },
    warnings: parsed.warnings,
    errors: parsed.errors,
  };
}
