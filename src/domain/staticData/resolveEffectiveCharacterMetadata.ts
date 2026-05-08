import generatedCharacterProfiles from "../../data/runtime/generated/characterMaterialProfiles.generated.json";
import generatedCharacters from "../../data/runtime/generated/generatedCharacters.generated.json";
import type { CharacterCatalogEntry, CharacterMaterialProfile, StaticGameData } from "./types";

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

const GENERATED_CHARACTER_CATALOG = generatedCharacters.characters as Record<string, CharacterCatalogEntry>;
const GENERATED_CHARACTER_PROFILES = generatedCharacterProfiles.profiles as Record<string, CharacterMaterialProfile>;

function pickFirstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

export function resolveEffectiveCharacterMetadata(
  staticData: StaticGameData,
  characterKey: string,
): EffectiveCharacterMetadata {
  const catalogEntry = staticData.characters[characterKey];
  const profile = staticData.characterMaterialProfiles[characterKey];
  const generatedCatalogEntry = GENERATED_CHARACTER_CATALOG[characterKey];
  const generatedProfile = GENERATED_CHARACTER_PROFILES[characterKey];

  return {
    key: characterKey,
    displayName:
      pickFirstDefined(
        catalogEntry?.displayName,
        profile?.displayName,
        profile?.name,
        generatedCatalogEntry?.displayName,
        generatedProfile?.displayName,
        generatedProfile?.name,
      ) ?? characterKey,
    element: pickFirstDefined(
      catalogEntry?.element,
      profile?.element,
      generatedCatalogEntry?.element,
      generatedProfile?.element,
    ),
    weaponType: pickFirstDefined(
      catalogEntry?.weaponType,
      profile?.weaponType,
      generatedCatalogEntry?.weaponType,
      generatedProfile?.weaponType,
    ),
    rarity: pickFirstDefined(
      catalogEntry?.rarity,
      profile?.rarity,
      generatedCatalogEntry?.rarity,
      generatedProfile?.rarity,
    ),
    region: pickFirstDefined(catalogEntry?.region, generatedCatalogEntry?.region),
    playable: pickFirstDefined(catalogEntry?.playable, generatedCatalogEntry?.playable),
    characterKind: pickFirstDefined(catalogEntry?.characterKind, generatedCatalogEntry?.characterKind),
  };
}
