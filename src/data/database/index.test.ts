import { describe, expect, it } from "vitest";
import { canonicalDatabase } from "./index";
import { validateCanonicalDatabase } from "./validation/validateDatabase";
import { createStaticData } from "../../domain/staticData/staticDataFactory";

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
    expect(canonicalDatabase.characters.characterProfiles.Jahoda.talentBookFamilyKey).toBe("Vagrancy");
    expect(canonicalDatabase.characters.characterProfiles.Neuvillette.talentBookFamilyKey).toBe("Equity");
    expect(canonicalDatabase.characters.travelerProfile.status).toBe("special_case");
  });

  it("validates without canonical database errors", () => {
    const report = validateCanonicalDatabase(canonicalDatabase);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBeGreaterThanOrEqual(0);
  });

  it("defaults 5-star weapon refinement policy to manual review and leaves 3-star weapons trackable", () => {
    const staticData = createStaticData();
    expect(staticData.weapons.AmosBow.refinementPolicy).toBe("manual_review");
    expect(staticData.weapons.CoolSteel.refinementPolicy).toBe("normal");
    expect(staticData.weapons.CoolSteel.refinementTrackable).toBe(true);
  });

  it("fails validation for invalid weapon refinement metadata", () => {
    const invalidDatabase = structuredClone(canonicalDatabase);
    invalidDatabase.weapons.weaponProfiles.AmosBow.acquisitionType = "invalid_type" as never;
    invalidDatabase.weapons.weaponProfiles.CoolSteel.refinementPolicy = "consume_everything" as never;
    invalidDatabase.weapons.weaponProfiles.TestTwoStarBlade = {
      ...invalidDatabase.weapons.weaponProfiles.CoolSteel,
      weaponKey: "TestTwoStarBlade",
      displayName: "Test Two-Star Blade",
      rarity: 2 as never,
      plannerEligible: false,
      refinementTrackable: true,
    };

    const report = validateCanonicalDatabase(invalidDatabase);
    const messages = report.issues.map((item) => item.message);

    expect(messages).toContain("Unknown acquisitionType invalid_type.");
    expect(messages).toContain("Unknown refinementPolicy consume_everything.");
    expect(messages).toContain("1-star/2-star weapons cannot be refinementTrackable.");
  });
});
