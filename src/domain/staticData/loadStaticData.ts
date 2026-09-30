import { canonicalDatabase } from "../../data/database";
import { validateExactRequirements } from "./validateExactRequirements";
import type { ImportedAccountState } from "../account/types";
import type { ImportWarning } from "../good/types";
import type { PlannerWarning } from "../planner/types";
import { assertCanonicalDatabaseValid } from "../../data/database/validation/validateDatabase";
import { applyOverridePack } from "./applyOverridePack";
import { assembleBaseStaticData } from "./assembleBaseStaticData";
import { buildDerivedStaticDataIndexes } from "./buildDerivedStaticDataIndexes";
import type { OverrideDataPack, StaticGameData } from "./types";

export function loadStaticData(overridePack?: OverrideDataPack | null, baseline = canonicalDatabase): StaticGameData {
  // Assembly order:
  // 1. Load the canonical database from src/data/database.
  // 2. Validate canonical source-of-truth records.
  // 3. Normalize the canonical database into the current StaticGameData shape.
  // 4. Apply validated override packs.
  // 5. Build derived lookup indexes and compatibility maps.
  assertCanonicalDatabaseValid(baseline);
  const baseData = assembleBaseStaticData(baseline);
  const dataWithOverrides = applyOverridePack(baseData, overridePack);
  const data = buildDerivedStaticDataIndexes(dataWithOverrides);
  validateExactRequirements(data);
  return data;
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
