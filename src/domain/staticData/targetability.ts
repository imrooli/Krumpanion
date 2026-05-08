import { resolveEffectiveCharacterMetadata } from "./resolveEffectiveCharacterMetadata";
import type { CharacterCatalogEntry, StaticGameData, WeaponCatalogEntry } from "./types";
import { isTravelerElementKey, isTravelerSharedKey } from "./travelerRegistry";

const IGNORED_CHARACTER_KEYS = new Set(["Manekin", "Manekina"]);

function normalizeCharacter(
  staticData: StaticGameData,
  characterKey: string,
): CharacterCatalogEntry & {
  rarity?: 4 | 5;
} {
  const character = resolveEffectiveCharacterMetadata(staticData, characterKey);
  return {
    ...character,
    displayName: character.displayName ?? characterKey,
  };
}

export function isIgnoredCharacterKey(characterKey: string): boolean {
  return IGNORED_CHARACTER_KEYS.has(characterKey);
}

export function isPlayableGoalCharacter(staticData: StaticGameData, characterKey: string): boolean {
  if (isIgnoredCharacterKey(characterKey)) {
    return false;
  }

  if (isTravelerSharedKey(characterKey) || isTravelerElementKey(characterKey)) {
    return true;
  }

  const character = normalizeCharacter(staticData, characterKey);
  if (!character.displayName) {
    return false;
  }

  const rawCharacter = staticData.characters[characterKey] as
    | {
        playable?: boolean;
        characterKind?: string;
      }
    | undefined;

  if (rawCharacter?.playable === false) {
    return false;
  }

  if (rawCharacter?.characterKind && ["non_playable", "manual_review"].includes(rawCharacter.characterKind)) {
    return false;
  }

  if (character.rarity === undefined) {
    return Boolean(staticData.characters[characterKey] || staticData.characterMaterialProfiles[characterKey]);
  }

  return character.rarity === 4 || character.rarity === 5;
}

export function getGoalPickableCharacters(staticData: StaticGameData): CharacterCatalogEntry[] {
  return Object.keys(staticData.characters)
    .filter((characterKey) => isPlayableGoalCharacter(staticData, characterKey))
    .map((characterKey) => normalizeCharacter(staticData, characterKey))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function isGoalTrackableWeaponRecord(staticData: StaticGameData, weaponKey: string): boolean {
  const weapon = staticData.weapons[weaponKey];
  const profile = staticData.weaponMaterialProfiles[weaponKey];
  const rarity = weapon?.rarity ?? profile?.rarity;
  if (rarity !== 3 && rarity !== 4 && rarity !== 5) {
    return false;
  }
  if (!profile) {
    return false;
  }
  if (profile.goalTrackable === false) {
    return false;
  }
  if (profile.status === "needs_manual_review" || profile.status === "unresolved") {
    return false;
  }
  return Boolean(
    (profile.weaponAscensionFamilyKey || profile.weaponAscensionMaterialFamily?.every(Boolean)) &&
      (profile.eliteEnemyDropFamilyId || profile.eliteEnemyFamilyKey || profile.eliteEnemyFamily?.every(Boolean)) &&
      (profile.commonEnemyFamilyKey || profile.commonEnemyFamily?.every(Boolean)),
  );
}

export function getGoalTrackableWeapons(staticData: StaticGameData): WeaponCatalogEntry[] {
  return Object.entries(staticData.weapons)
    .filter(([weaponKey]) => isGoalTrackableWeaponRecord(staticData, weaponKey))
    .map(([, weapon]) => weapon)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}
