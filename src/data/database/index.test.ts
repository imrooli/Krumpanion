import { describe, expect, it } from "vitest";
import { canonicalDatabase } from "./index";
import { validateCanonicalDatabase } from "./validation/validateDatabase";

describe("canonicalDatabase", () => {
  it("loads the canonical source-of-truth directory and marks legacy runtime sources deprecated", () => {
    expect(canonicalDatabase.metadata.sourceOfTruthDirectory).toBe("src/data/database");
    expect(canonicalDatabase.metadata.deprecatedRuntimeSources).toContain(
      "src/data/runtime/generated/characterMaterialProfiles.generated.json",
    );
    expect(canonicalDatabase.metadata.deprecatedRuntimeSources).toContain("src/data/runtime/progressionCore/*");
  });

  it("includes the known fragile character fixes in canonical profiles", () => {
    expect(canonicalDatabase.characters.characterProfiles.Albedo.normalBossMaterialKey).toBe("BasaltPillar");
    expect(canonicalDatabase.characters.characterProfiles.Charlotte.normalBossMaterialKey).toBe("TourbillonDevice");
    expect(canonicalDatabase.characters.characterProfiles.Charlotte.weeklyBossMaterialKey).toBe("LightlessSilkString");
    expect(canonicalDatabase.characters.characterProfiles.Wriothesley.normalBossMaterialKey).toBe("TourbillonDevice");
    expect(canonicalDatabase.characters.travelerProfile.status).toBe("special_case");
  });

  it("validates without canonical database errors", () => {
    const report = validateCanonicalDatabase(canonicalDatabase);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBeGreaterThanOrEqual(0);
  });
});
