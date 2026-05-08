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

  it("rejects malformed GOOD payloads", () => {
    const result = parseGoodFromText(JSON.stringify({ format: "GOOD" }));

    expect(result.inventory).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
