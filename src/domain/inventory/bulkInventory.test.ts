import { describe, expect, it } from "vitest";
import { loadStaticData } from "../staticData/loadStaticData";
import { parseBulkInventoryText } from "./bulkInventory";

describe("parseBulkInventoryText", () => {
  it("resolves material names and keys from comma-separated rows", () => {
    const staticData = loadStaticData();
    const result = parseBulkInventoryText("Mora, 1200000\nHero's Wit, 24\nMysticEnhancementOre, 12", staticData);

    expect(result.validUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialKey: "Mora", quantity: 1200000 }),
        expect.objectContaining({ materialKey: "HerosWit", quantity: 24 }),
        expect.objectContaining({ materialKey: "MysticEnhancementOre", quantity: 12 }),
      ]),
    );
    expect(result.invalidRows).toEqual([]);
    expect(result.unmatchedRows).toEqual([]);
  });

  it("supports tab-separated rows", () => {
    const staticData = loadStaticData();
    const result = parseBulkInventoryText("Mora\t5000\nMystic Enhancement Ore\t6", staticData);

    expect(result.validUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialKey: "Mora", quantity: 5000 }),
        expect.objectContaining({ materialKey: "MysticEnhancementOre", quantity: 6 }),
      ]),
    );
  });

  it("reports unmatched and invalid rows separately", () => {
    const staticData = loadStaticData();
    const result = parseBulkInventoryText("Unknown Material, 10\nMora, -5\nHero's Wit, 2.5", staticData);

    expect(result.unmatchedRows).toEqual([
      expect.objectContaining({ rowNumber: 1, inputName: "Unknown Material" }),
    ]);
    expect(result.invalidRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2 }),
        expect.objectContaining({ rowNumber: 3 }),
      ]),
    );
  });

  it("merges duplicate rows by summing their quantities", () => {
    const staticData = loadStaticData();
    const result = parseBulkInventoryText("Mora, 100\nMora, 50\nMora\t25", staticData);

    expect(result.validUpdates).toEqual([expect.objectContaining({ materialKey: "Mora", quantity: 175 })]);
    expect(result.duplicateRows).toEqual([
      expect.objectContaining({ materialKey: "Mora", resolvedQuantity: 175, rowNumbers: [1, 2, 3] }),
    ]);
  });
});
