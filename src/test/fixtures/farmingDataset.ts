import base from "./animeGameData2.release.json" with { type: "json" };
import farming from "./animeGameData2.farming.json" with { type: "json" };
import type { AnimeDataset } from "../../adapters/animeGameData2";

export function farmingDataset(): AnimeDataset {
  const dataset: AnimeDataset = structuredClone(base);
  dataset.capabilities = ["identity-progression", "farming"];
  for (const [path, rows] of Object.entries(farming.files)) {
    if (path.includes("MaterialExcel")) {
      const updates = new Map((rows as Array<{ id: number }>).map(row => [row.id, row]));
      dataset.files[path] = (dataset.files[path] as Array<{ id: number }>).map(row => ({ ...row, ...updates.get(row.id) }));
    } else if (path.includes("TextMap_Medium")) dataset.files[path] = { ...dataset.files[path] as object, ...rows };
    else dataset.files[path] = structuredClone(rows);
  }
  return dataset;
}

export function hypotheticalPatchDataset(): AnimeDataset {
  const original = farmingDataset();
  const replacements: Record<number, number> = { 10000002: 90000001, 11501: 90000002, 104323: 9104323, 104324: 9104324, 104325: 9104325 };
  const replace = (value: unknown): unknown => typeof value === "number" ? replacements[value] ?? value : Array.isArray(value) ? value.map(replace) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)])) : value;
  const data = replace(original) as AnimeDataset;
  const text = data.files["TextMap/TextMap_MediumEN.json"] as Record<string, string>;
  for (const [table, names] of [["Avatar", { 90000001: "Browser Character" }], ["Weapon", { 90000002: "Browser Sword" }], ["Material", { 9104323: "Browser Teachings", 9104324: "Browser Guide", 9104325: "Browser Philosophies" }]] as const) {
    for (const row of data.files[`ExcelBinOutput/${table}ExcelConfigData.json`] as Array<{ id: number; nameTextMapHash: number }>) {
      const name = (names as Record<number, string>)[row.id]; if (name) text[String(row.nameTextMapHash)] = name;
    }
  }
  return data;
}
