import artifactDomains from "../../data/runtime/artifactDomains.json";
import characterAscensionCosts from "../../data/runtime/characterAscensionCosts.json";
import characters from "../../data/runtime/characters.json";
import discoveredArtifactSets from "../../data/runtime/discoveredArtifactSets.json";
import discoveredCharacters from "../../data/runtime/discoveredCharacters.json";
import discoveredMaterials from "../../data/runtime/discoveredMaterials.json";
import discoveredWeapons from "../../data/runtime/discoveredWeapons.json";
import materials from "../../data/runtime/materials.json";
import materialSources from "../../data/runtime/materialSources.json";
import recipes from "../../data/runtime/recipes.json";
import resinRules from "../../data/runtime/resinRules.json";
import talentCosts from "../../data/runtime/talentCosts.json";
import weaponAscensionCosts from "../../data/runtime/weaponAscensionCosts.json";
import weapons from "../../data/runtime/weapons.json";
import characterMaterialProfiles from "../../data/runtime/progressionCore/characterMaterialProfiles.json";
import elementGemFamilies from "../../data/runtime/progressionCore/elementGemFamilies.json";
import enemyDropFamilies from "../../data/runtime/progressionCore/enemyDropFamilies.json";
import localSpecialtySources from "../../data/runtime/progressionCore/localSpecialtySources.json";
import talentBookFamilies from "../../data/runtime/progressionCore/talentBookFamilies.json";
import universalCharacterProgression from "../../data/runtime/progressionCore/universalCharacterProgression.json";
import universalMaterials from "../../data/runtime/progressionCore/universalMaterials.json";
import universalMaterialSources from "../../data/runtime/progressionCore/universalMaterialSources.json";
import universalTalentProgression from "../../data/runtime/progressionCore/universalTalentProgression.json";
import universalWeaponProgression from "../../data/runtime/progressionCore/universalWeaponProgression.json";
import weaponAscensionFamilies from "../../data/runtime/progressionCore/weaponAscensionFamilies.json";
import weaponMaterialProfiles from "../../data/runtime/progressionCore/weaponMaterialProfiles.json";

export const runtimeSeedData = {
  artifactDomains,
  characterAscensionCosts,
  characters,
  discoveredArtifactSets,
  discoveredCharacters,
  discoveredMaterials,
  discoveredWeapons,
  materials,
  materialSources,
  recipes,
  resinRules,
  talentCosts,
  weaponAscensionCosts,
  weapons,
  progressionCore: {
    characterMaterialProfiles,
    elementGemFamilies,
    enemyDropFamilies,
    localSpecialtySources,
    talentBookFamilies,
    universalCharacterProgression,
    universalMaterials,
    universalMaterialSources,
    universalTalentProgression,
    universalWeaponProgression,
    weaponAscensionFamilies,
    weaponMaterialProfiles,
  },
};
