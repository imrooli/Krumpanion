import { describe, expect, it } from "vitest";
import { createEditableOverridePack, removeOverrideRecord, setOverridePackLabel, upsertOverrideRecord } from "./databaseEditor";

describe("databaseEditor helpers", () => {
  it("creates a default editable override pack", () => {
    const pack = createEditableOverridePack(null);
    expect(pack.version).toBe(1);
    expect(pack.label).toContain("Krumpanion");
  });

  it("upserts and removes override records without mutating other sections", () => {
    const withCharacter = upsertOverrideRecord(null, "characters", "Furina", {
      key: "Furina",
      displayName: "Lady Furina",
    });

    expect(withCharacter.characters?.Furina.displayName).toBe("Lady Furina");

    const withLabel = setOverridePackLabel(withCharacter, "Custom Data");
    expect(withLabel.label).toBe("Custom Data");
    expect(withLabel.characters?.Furina.displayName).toBe("Lady Furina");

    const removed = removeOverrideRecord(withLabel, "characters", "Furina");
    expect(removed.characters).toBeUndefined();
    expect(removed.label).toBe("Custom Data");
  });
});
