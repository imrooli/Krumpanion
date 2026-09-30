import { describe, expect, it } from "vitest";
import { farmingDataset } from "../test/fixtures/farmingDataset";
import { parseAnimeGameData2 } from "./animeGameData2";

const now = new Date("2026-09-29T12:00:00Z");
describe("structured farming extraction", () => {
  it("derives families, stages and physical domains without inventing weekdays or yield", () => {
    const result = parseAnimeGameData2(farmingDataset(), now);
    expect(result.farming).toHaveLength(2);
    const weapon = result.farming!.find(row => row.kind === "weapon")!;
    expect(weapon.materialIds).toEqual([114001, 114002, 114003, 114004]);
    expect(weapon.domain).toMatchObject({ name: "Cecilia Garden", resinCost: 20 });
    expect(weapon.stageIds).toHaveLength(4);
    expect(weapon.recipeCoins).toEqual([125, 350, 1075]);
    expect(weapon).not.toHaveProperty("availability");
    expect(weapon).not.toHaveProperty("yield");
  });
  it("localizes physical entries in other scenes and keeps stage scenes separate", () => {
    const dataset = farmingDataset(); dataset.capabilities!.push("scene-points");
    const entries = dataset.files["ExcelBinOutput/DungeonEntryExcelConfigData.json"] as Array<Record<string, unknown>>;
    for (const entry of entries) entry.sceneId = 99;
    dataset.files["BinOutput/Scene/Point/scene99_point.json"] = dataset.files["BinOutput/Scene/Point/scene3_point.json"];
    delete dataset.files["BinOutput/Scene/Point/scene3_point.json"];
    const result = parseAnimeGameData2(dataset, now);
    expect(result.extractorVersion).toBe(3);
    expect(result.farming?.every(row => row.domain?.name)).toBe(true);
    dataset.files["BinOutput/Scene/Point/scene99_point.json"] = { points: [] };
    expect(() => parseAnimeGameData2(dataset, now)).toThrow(/points/);
    delete dataset.files["BinOutput/Scene/Point/scene99_point.json"];
    expect(() => parseAnimeGameData2(dataset, now)).toThrow(/required scene/);
  });
  it("never infers weekdays from obfuscated daily fields or reordered preview groups", () => {
    const dataset = farmingDataset();
    dataset.files["ExcelBinOutput/DailyDungeonConfigData.json"] = [{ id: 17, OCGGLOILBEP: [5258], PJABKILGJOB: [5254, 5255, 5256, 5257] }];
    const entries = dataset.files["ExcelBinOutput/DungeonEntryExcelConfigData.json"] as Array<{ descriptionCycleRewardList: number[][] }>;
    for (const entry of entries) entry.descriptionCycleRewardList.reverse();
    const result = parseAnimeGameData2(dataset, now);
    expect(result.farming?.every(row => !("availability" in row))).toBe(true);
    expect(result.farming).toHaveLength(2);
  });
  it("does not derive families from similar names or randomized conversions", () => {
    const dataset = farmingDataset();
    const rows = dataset.files["ExcelBinOutput/CombineExcelConfigData.json"] as Array<Record<string, unknown>>;
    for (const row of rows) row.randomItems = [{ id: 114001, count: 1 }];
    expect(parseAnimeGameData2(dataset, now).farming).toEqual([]);
  });
  it("retains a family but requires manual domain setup when reward entries are ambiguous", () => {
    const dataset = farmingDataset();
    const rows = dataset.files["ExcelBinOutput/DungeonEntryExcelConfigData.json"] as Array<Record<string, unknown>>;
    rows.push({ ...rows.find(row => row.id === 2), id: 999 });
    expect(parseAnimeGameData2(dataset, now).farming!.find(row => row.kind === "weapon")?.domain).toBeUndefined();
  });
  it("represents unusual ordered family shapes independently of current compiler support", () => {
    const dataset = farmingDataset();
    const rows = dataset.files["ExcelBinOutput/CombineExcelConfigData.json"] as Array<Record<string, unknown>>;
    dataset.files["ExcelBinOutput/CombineExcelConfigData.json"] = rows.filter(row => row.resultItemId !== 114004);
    const family = parseAnimeGameData2(dataset, now).farming!.find(row => row.kind === "weapon");
    expect(family?.materialIds).toEqual([114001, 114002, 114003]);
    expect(family?.kind).toBe("weapon");
  });
  it.each(["AvatarExcelConfigData", "DungeonExcelConfigData", "CombineExcelConfigData"])("reports dataset-specific structural drift in %s", table => {
    const dataset = farmingDataset();
    dataset.files[`ExcelBinOutput/${table}.json`] = [{ renamed: true }];
    expect(() => parseAnimeGameData2(dataset, now)).toThrow(/Provider schema unsupported/);
  });
  it("rejects incompatible localization structure", () => {
    const dataset = farmingDataset(); dataset.files["TextMap/TextMap_MediumEN.json"] = [];
    expect(() => parseAnimeGameData2(dataset, now)).toThrow(/localization/);
  });
});
