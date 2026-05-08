import { loadStaticData } from "./loadStaticData";
import type { OverrideDataPack, StaticGameData } from "./types";

export function createStaticData(overridePack?: OverrideDataPack | null): StaticGameData {
  return loadStaticData(overridePack);
}
