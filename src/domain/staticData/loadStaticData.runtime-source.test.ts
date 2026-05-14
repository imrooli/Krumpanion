import { describe, expect, it, vi } from "vitest";

describe("loadStaticData canonical runtime source enforcement", () => {
  it("assembles runtime static data without loading deprecated runtime-era json bundles", async () => {
    vi.resetModules();

    const deprecatedRuntimeImports = [
      "../../data/runtime/characters.json",
      "../../data/runtime/discoveredCharacters.json",
      "../../data/runtime/materials.json",
      "../../data/runtime/discoveredMaterials.json",
      "../../data/runtime/weapons.json",
      "../../data/runtime/discoveredWeapons.json",
      "../../data/runtime/generated/characterMaterialProfiles.generated.json",
      "../../data/runtime/generated/generatedCharacters.generated.json",
      "../../data/runtime/generated/betaMaterials.generated.json",
      "../../data/runtime/generated/unresolvedCharacterMaterialReferences.generated.json",
      "../../data/runtime/generated/weaponGoalProfiles.generated.json",
    ];

    for (const specifier of deprecatedRuntimeImports) {
      vi.doMock(specifier, () => {
        throw new Error(`Deprecated runtime source should not be loaded: ${specifier}`);
      });
    }

    const { loadStaticData } = await import("./loadStaticData");
    const staticData = loadStaticData();

    expect(staticData.characters.Albedo.displayName).toBe("Albedo");
    expect(staticData.weaponMaterialProfiles.CoolSteel.weaponAscensionFamilyKey).toBe("Decarabian");
  });
});
