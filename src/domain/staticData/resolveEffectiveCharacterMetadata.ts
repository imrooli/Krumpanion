import type { CharacterCatalogEntry, StaticGameData } from "./types";

export interface EffectiveCharacterMetadata {
  key: string;
  displayName: string;
  element?: CharacterCatalogEntry["element"];
  weaponType?: CharacterCatalogEntry["weaponType"];
  rarity?: CharacterCatalogEntry["rarity"];
  region?: string;
  playable?: boolean;
  characterKind?: CharacterCatalogEntry["characterKind"];
}

function pickFirstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

export function resolveEffectiveCharacterMetadata(
  staticData: StaticGameData,
  characterKey: string,
): EffectiveCharacterMetadata {
  const catalogEntry = staticData.characters[characterKey];
  const profile = staticData.characterMaterialProfiles[characterKey];

  return {
    key: characterKey,
    displayName: pickFirstDefined(catalogEntry?.displayName, profile?.displayName, profile?.name) ?? characterKey,
    element: pickFirstDefined(catalogEntry?.element, profile?.element),
    weaponType: pickFirstDefined(catalogEntry?.weaponType, profile?.weaponType),
    rarity: pickFirstDefined(catalogEntry?.rarity, profile?.rarity),
    region: catalogEntry?.region,
    playable: catalogEntry?.playable,
    characterKind: catalogEntry?.characterKind,
  };
}
