import {
  buildEliteEnemyDerivedDataFromFamilies,
  buildEliteEnemyMaterialFamilyIndex,
  buildWeaponEliteEnemyFamilyMap,
} from "./eliteEnemyDropRegistry";
import {
  buildGeneralEnemyDerivedDataFromFamilies,
  buildGeneralEnemyMaterialFamilyIndex,
} from "./generalEnemyDropRegistry";
import { normalizeStaticDataMaterialReferences, buildLocalSpecialtyRegionIndex } from "./normalizeStaticDataMaterialReferences";
import type { StaticGameData } from "./types";

export function buildDerivedStaticDataIndexes(data: StaticGameData): StaticGameData {
  const normalized = normalizeStaticDataMaterialReferences(data);
  const generalDerived = buildGeneralEnemyDerivedDataFromFamilies(
    normalized.generalEnemyDropFamilies,
    normalized.characters,
    normalized.weapons,
  );
  const eliteDerived = buildEliteEnemyDerivedDataFromFamilies(normalized.eliteEnemyDropFamilies, normalized.weapons);
  const weaponFamilyLinks = buildWeaponEliteEnemyFamilyMap(normalized.eliteEnemyDropFamilies, normalized.weapons);
  const materialFamilyByKey = {
    ...normalized.materialFamilyByKey,
    ...buildGeneralEnemyMaterialFamilyIndex(normalized.generalEnemyDropFamilies),
    ...buildEliteEnemyMaterialFamilyIndex(normalized.eliteEnemyDropFamilies),
  };
  const registryInput: StaticGameData = {
    ...normalized,
    materials: {
      ...generalDerived.materials,
      ...eliteDerived.materials,
      ...normalized.materials,
    },
    enemyDropFamilies: {
      ...generalDerived.compatibilityFamilies,
      ...normalized.enemyDropFamilies,
      ...eliteDerived.compatibilityFamilies,
    },
    generalEnemyDropFamilies: generalDerived.families,
    eliteEnemyDropFamilies: eliteDerived.families,
    materialSources: {
      ...generalDerived.materialSources,
      ...eliteDerived.materialSources,
      ...normalized.materialSources,
    },
    materialFamilyByKey,
    characterGeneralEnemyDropFamilyByKey: generalDerived.characterGeneralEnemyDropFamilyByKey,
    weaponGeneralEnemyDropFamilyByKey: generalDerived.weaponGeneralEnemyDropFamilyByKey,
    weaponEliteEnemyDropFamilyByKey: weaponFamilyLinks.weaponEliteEnemyDropFamilyByKey,
    generalEnemyDropCharacterReferences: generalDerived.generalEnemyDropCharacterReferences,
    unresolvedCharacterReferences: generalDerived.unresolvedCharacterReferences,
    unresolvedWeaponReferences: [...generalDerived.unresolvedWeaponReferences, ...weaponFamilyLinks.unresolvedWeaponReferences],
  };

  return {
    ...registryInput,
    generalEnemyDropFamilies: generalDerived.families,
    eliteEnemyDropFamilies: eliteDerived.families,
    localSpecialties: normalized.localSpecialties,
    localSpecialtiesByRegion: buildLocalSpecialtyRegionIndex(normalized.localSpecialties),
    normalBossMaterials: normalized.normalBossMaterials,
    recipes: {
      ...generalDerived.recipes,
      ...eliteDerived.recipes,
      ...normalized.recipes,
    },
    craftingRecipes: {
      ...generalDerived.recipes,
      ...eliteDerived.recipes,
      ...normalized.craftingRecipes,
    },
    materialFamilyByKey,
    characterGeneralEnemyDropFamilyByKey: generalDerived.characterGeneralEnemyDropFamilyByKey,
    weaponGeneralEnemyDropFamilyByKey: generalDerived.weaponGeneralEnemyDropFamilyByKey,
    weaponEliteEnemyDropFamilyByKey: weaponFamilyLinks.weaponEliteEnemyDropFamilyByKey,
    generalEnemyDropCharacterReferences: generalDerived.generalEnemyDropCharacterReferences,
    unresolvedCharacterReferences: generalDerived.unresolvedCharacterReferences,
    unresolvedCharacterMaterialReferences: normalized.unresolvedCharacterMaterialReferences,
    unresolvedWeaponReferences: [...generalDerived.unresolvedWeaponReferences, ...weaponFamilyLinks.unresolvedWeaponReferences],
    materialRecords: normalized.materialRecords,
  };
}
