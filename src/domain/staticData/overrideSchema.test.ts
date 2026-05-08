import { describe, expect, it } from "vitest";
import { parseOverrideDataPack } from "./overrideSchema";

describe("overrideSchema", () => {
  it("accepts local specialty override records", () => {
    const parsed = parseOverrideDataPack(
      JSON.stringify({
        version: 1,
        localSpecialties: {
          TestBloom: {
            key: "TestBloom",
            displayName: "Test Bloom",
            category: "local_specialty",
            region: "Natlan",
            usedFor: ["character_ascension"],
            isPurchasable: true,
            purchaseVendors: ["Vendor One"],
            searchHint: "Found near bright cliffs",
            craftable: false,
          },
        },
      }),
    );

    expect(parsed.localSpecialties?.TestBloom?.region).toBe("Natlan");
  });
});
