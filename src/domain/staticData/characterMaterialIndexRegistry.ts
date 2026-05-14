/**
 * Deprecated maintenance-only helper.
 *
 * This registry reads runtime-era generated bundles so tooling and compatibility
 * tests can inspect them, but normal app runtime must load from src/data/database
 * through loadStaticData()/assembleBaseStaticData() instead.
 */
import generatedBetaMaterials from "../../data/runtime/generated/betaMaterials.generated.json";
import generatedCharacterProfiles from "../../data/runtime/generated/characterMaterialProfiles.generated.json";
import generatedCharacters from "../../data/runtime/generated/generatedCharacters.generated.json";
import generatedUnresolvedReferences from "../../data/runtime/generated/unresolvedCharacterMaterialReferences.generated.json";
import type {
  CharacterCatalogEntry,
  CharacterMaterialProfile,
  GeneratedCharacterMaterialBundle,
  MaterialDescriptor,
  UnresolvedCharacterMaterialReference,
} from "./types";

export const CHARACTER_INDEX_SOURCE_VERSION = generatedCharacterProfiles.sourceVersion;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function loadGeneratedCharacterMaterialBundle(): GeneratedCharacterMaterialBundle {
  return {
    sourceVersion: generatedCharacterProfiles.sourceVersion,
    characters: cloneJson(generatedCharacters.characters as Record<string, CharacterCatalogEntry>),
    materials: cloneJson(generatedBetaMaterials.materials as Record<string, MaterialDescriptor>),
    profiles: cloneJson(generatedCharacterProfiles.profiles as Record<string, CharacterMaterialProfile>),
    unresolvedReferences: cloneJson(
      generatedUnresolvedReferences.unresolvedReferences as UnresolvedCharacterMaterialReference[],
    ),
  };
}
