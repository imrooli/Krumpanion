import exampleGood from "../../../examples/good.minimal.example.json";
import { describe, expect, it } from "vitest";
import { parseGoodFromText } from "./parseGood";

describe("parseGoodFromText", () => {
  it("parses a valid GOOD payload", () => {
    const result = parseGoodFromText(JSON.stringify(exampleGood));

    expect(result.errors).toEqual([]);
    expect(result.inventory?.charactersByKey.Furina.level).toBe(80);
    expect(Object.keys(result.inventory?.weaponsById ?? {})).toHaveLength(1);
    expect(result.inventory?.materialsByKey.Mora).toBe(1000000);
  });

  it("preserves separate weapon copies and accepts optional GOOD weapon ids", () => {
    const result = parseGoodFromText(
      JSON.stringify({
        format: "GOOD",
        version: 3,
        characters: [],
        artifacts: [],
        weapons: [
          { id: "weapon-a", key: "FavoniusSword", level: 80, ascension: 5, refinement: 2, location: "Furina", lock: true },
          { id: "weapon-b", key: "FavoniusSword", level: 1, ascension: 0, refinement: 1 },
        ],
        materials: {},
      }),
    );

    expect(Object.keys(result.inventory?.weaponsById ?? {})).toHaveLength(2);
    expect(Object.values(result.inventory?.weaponsById ?? {}).map((weapon) => weapon.id)).toHaveLength(2);
    expect(Object.values(result.inventory?.weaponsById ?? {}).map((weapon) => weapon.lock)).toContain(true);
  });

  it("warns when duplicate GOOD weapon ids are encountered", () => {
    const result = parseGoodFromText(
      JSON.stringify({
        format: "GOOD",
        version: 3,
        characters: [],
        artifacts: [],
        weapons: [
          { id: "weapon-dup", key: "FavoniusSword", level: 80, ascension: 5, refinement: 2, location: "", lock: false },
          { id: "weapon-dup", key: "FavoniusSword", level: 1, ascension: 0, refinement: 1, location: "", lock: false },
        ],
        materials: {},
      }),
    );

    expect(result.inventory).not.toBeNull();
    expect(result.inventory?.warnings.some((warning) => warning.type === "duplicate_weapon_id")).toBe(true);
  });

  it("rejects malformed GOOD payloads", () => {
    const result = parseGoodFromText(JSON.stringify({ format: "GOOD" }));

    expect(result.inventory).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
