import type { ImportedAccountState } from "../account/types";
import type { ImportWarning } from "../good/types";
import type { PlannerWarning } from "../planner/types";
import { applyOverridePack } from "./applyOverridePack";
import { assembleBaseStaticData } from "./assembleBaseStaticData";
import { buildDerivedStaticDataIndexes } from "./buildDerivedStaticDataIndexes";
import type { OverrideDataPack, StaticGameData } from "./types";

export function loadStaticData(overridePack?: OverrideDataPack | null): StaticGameData {
  // Assembly order:
  // 1. Build base registries from seed runtime JSON plus generated bundles.
  // 2. Construct canonical materials and source rows once during base assembly.
  // 3. Apply override packs on top of the consolidated base model.
  // 4. Build derived lookup indexes and compatibility maps without rebuilding canonical rows.
  const baseData = assembleBaseStaticData();
  const dataWithOverrides = applyOverridePack(baseData, overridePack);
  return buildDerivedStaticDataIndexes(dataWithOverrides);
}

export function buildInventoryWarnings(
  account: ImportedAccountState | null,
  staticData: StaticGameData,
): ImportWarning[] {
  if (!account) {
    return [];
  }

  const warnings = [...account.warnings];

  for (const character of account.characters) {
    const key = character.characterId;
    if (!staticData.characters[key]) {
      warnings.push({
        type: "unknown_character",
        key,
        message: `Character ${key} is present in the GOOD import but not in the local seed data.`,
      });
    }
  }

  for (const key of Object.keys(account.inventory)) {
    if (!staticData.materials[key]) {
      warnings.push({
        type: "unknown_material",
        key,
        message: `Material ${key} is present in the GOOD import but not in the local seed data.`,
      });
    }
  }

  return warnings;
}

export function buildUnknownDataWarnings(staticData: StaticGameData): PlannerWarning[] {
  return staticData.appliedOverrideKeys.map((key) => ({
    type: "migration_notice",
    key,
    message: `Override data is active for ${key}.`,
  }));
}
