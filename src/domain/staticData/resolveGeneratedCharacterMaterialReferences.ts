import { resolveExistingMaterialKey } from "./materialKeyMapping";
import { isTravelerSharedKey } from "./travelerRegistry";
import type { CharacterMaterialProfile, StaticGameData, UnresolvedCharacterMaterialReference } from "./types";

function buildGemFamilyByMaterial(staticData: StaticGameData): Record<string, string> {
  return Object.values(staticData.elementGemFamilies).reduce<Record<string, string>>((accumulator, family) => {
    accumulator[family.sliver] = family.key;
    accumulator[family.fragment] = family.key;
    accumulator[family.chunk] = family.key;
    accumulator[family.gemstone] = family.key;
    return accumulator;
  }, {});
}

function buildTalentFamilyByMaterial(staticData: StaticGameData): Record<string, string> {
  return Object.values(staticData.talentBookFamilies).reduce<Record<string, string>>((accumulator, family) => {
    accumulator[family.teachings] = family.key;
    accumulator[family.guide] = family.key;
    accumulator[family.philosophies] = family.key;
    return accumulator;
  }, {});
}

function applyResolvedReference(
  profile: CharacterMaterialProfile,
  reference: UnresolvedCharacterMaterialReference,
  resolvedKey: string,
  staticData: StaticGameData,
  gemFamilyByMaterial: Record<string, string>,
  talentFamilyByMaterial: Record<string, string>,
): boolean {
  switch (reference.materialSlot) {
    case "ascensionGem": {
      const familyKey = gemFamilyByMaterial[resolvedKey];
      if (!familyKey) {
        return false;
      }
      profile.gemFamilyKey = familyKey;
      profile.elementGemFamilyKey = familyKey;
      profile.ascensionGemRepresentativeKey = resolvedKey;
      profile.ascensionGemRepresentativeName = staticData.materials[resolvedKey]?.displayName ?? reference.rawName;
      return true;
    }
    case "normalBossMaterial":
      if (!staticData.normalBossMaterials[resolvedKey]) {
        return false;
      }
      profile.normalBossMaterialKey = resolvedKey;
      profile.normalBossMaterial = resolvedKey;
      profile.normalBossMaterialStatus = "verified";
      profile.normalBossMaterialName = staticData.materials[resolvedKey]?.displayName ?? reference.rawName;
      return true;
    case "enemyDrop": {
      const familyReference = staticData.materialFamilyByKey[resolvedKey];
      if (!familyReference || familyReference.category !== "general_enemy_drop") {
        return false;
      }
      profile.commonEnemyMaterialFamilyId = familyReference.familyId;
      profile.enemyDropFamilyKey = familyReference.familyId;
      profile.enemyDropRepresentativeKey = resolvedKey;
      profile.enemyDropRepresentativeName = staticData.materials[resolvedKey]?.displayName ?? reference.rawName;
      return true;
    }
    case "localSpecialty":
      if (!staticData.localSpecialties[resolvedKey]) {
        return false;
      }
      profile.localSpecialtyKey = resolvedKey;
      profile.localSpecialty = resolvedKey;
      profile.localSpecialtyName = staticData.localSpecialties[resolvedKey]?.displayName ?? reference.rawName;
      profile.localSpecialtyStatus = "verified";
      return true;
    case "talentBook": {
      const familyKey = talentFamilyByMaterial[resolvedKey];
      if (!familyKey) {
        return false;
      }
      profile.talentBookSeriesKey = familyKey;
      profile.talentBookFamilyKey = familyKey;
      profile.talentBookRepresentativeKey = resolvedKey;
      profile.talentBookRepresentativeName = staticData.materials[resolvedKey]?.displayName ?? reference.rawName;
      return true;
    }
    case "weeklyBossMaterial":
      if (!staticData.weeklyBossMaterials[resolvedKey] && !staticData.specialProgressionMaterials[resolvedKey]) {
        return false;
      }
      profile.weeklyBossMaterialKey = resolvedKey;
      profile.weeklyBossMaterial = resolvedKey;
      profile.weeklyBossMaterialStatus = "verified";
      profile.weeklyBossMaterialName = staticData.materials[resolvedKey]?.displayName ?? reference.rawName;
      return true;
    default:
      return false;
  }
}

export function resolveGeneratedCharacterMaterialReferences(staticData: StaticGameData): StaticGameData {
  const nextProfiles = { ...staticData.characterMaterialProfiles };
  const nextUnresolved: UnresolvedCharacterMaterialReference[] = [];
  const gemFamilyByMaterial = buildGemFamilyByMaterial(staticData);
  const talentFamilyByMaterial = buildTalentFamilyByMaterial(staticData);

  for (const reference of staticData.unresolvedCharacterMaterialReferences) {
    if (isTravelerSharedKey(reference.characterKey)) {
      continue;
    }

    const profile = nextProfiles[reference.characterKey];
    if (!profile) {
      nextUnresolved.push(reference);
      continue;
    }

    const resolvedKey = resolveExistingMaterialKey(reference.rawName, staticData.materials);
    if (
      resolvedKey &&
      applyResolvedReference(profile, reference, resolvedKey, staticData, gemFamilyByMaterial, talentFamilyByMaterial)
    ) {
      continue;
    }

    nextUnresolved.push(reference);
  }

  return {
    ...staticData,
    characterMaterialProfiles: nextProfiles,
    unresolvedCharacterMaterialReferences: nextUnresolved,
  };
}
