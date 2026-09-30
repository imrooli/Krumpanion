import { describe, expect, it } from "vitest";
import { loadStaticData } from "./loadStaticData";
import { reconcileGameData } from "./reconcileGameData";
import { newLivePatch } from "../../test/fixtures/newLivePatch";
import { plannerReadiness } from "./plannerReadiness";
import { resolveCharacterProgression } from "../progression/resolveCharacterProgression";
import { resolveWeaponProgression } from "../progression/resolveWeaponProgression";
import { buildFarmingOverride } from "./farmingConfiguration";
import { validateStaticData } from "./validateStaticData";
import { parseOverrideDataPack } from "./overrideSchema";
import { createDefaultSaveFile } from "../save/types";
import { migrateSaveFile } from "../save/migrations";
import { resolveIdentity } from "./entityIdentity";
import { markManualDatabaseChanges } from "./databaseEditor";

const base = loadStaticData();
describe("upstream reconciliation", () => {
  it("retains manual Tier 1/2 changes and reconciles the same revision idempotently", () => {
    const first = reconcileGameData(base, null, newLivePatch(), {});
    const identical = reconcileGameData(first.staticData, first.overridePack, newLivePatch(), {});
    expect(identical.overridePack).toEqual(first.overridePack);
    const edited = structuredClone(first.overridePack);
    edited.characters!.NewCharacter.displayName = "My character name";
    edited.exactWeaponRequirements!.NewSword.ascension["1"].costs.Mora = 123;
    const manual = markManualDatabaseChanges(first.overridePack, edited);
    const next = reconcileGameData(loadStaticData(manual), manual, newLivePatch(), {});
    expect(next.staticData.characters.NewCharacter.displayName).toBe("My character name");
    expect(next.staticData.exactWeaponRequirements!.NewSword.ascension["1"].costs.Mora).toBe(123);
    expect(next.diagnostics.filter(row => /Manual identity or progression/.test(row.message))).toHaveLength(2);
  });
  it("keeps incomplete farming drafts explicitly unready and preserves existing domain rewards", () => {
    const first = reconcileGameData(base, null, newLivePatch(), {});
    const input = { materialKey: "NewFlower", sourceType: "local_specialty" as const, sourceName: "", sourceKey: "", availability: "UNKNOWN" as const, region: "", familyKey: "", tierKeys: [] };
    const draft = buildFarmingOverride(first.staticData, first.overridePack, input);
    expect(plannerReadiness(loadStaticData(draft), "NewCharacter").state).toBe("farming_setup_required");
    expect(parseOverrideDataPack(JSON.stringify(draft)).farmingDrafts?.NewFlower).toEqual(input);
    const [key, domain] = Object.entries(first.staticData.domainsOfMastery)[0];
    const configured = buildFarmingOverride(first.staticData, first.overridePack, { ...input, sourceType: "domain_of_mastery", sourceKey: key, sourceName: domain.name, resinCost: 20 });
    expect(configured.domainsOfMastery?.[key].talentFamilies).toEqual(domain.talentFamilies);
    expect(configured.domainsOfMastery?.[key].listedRewards).toEqual(expect.arrayContaining(domain.listedRewards));
  });
  it("activates exact Tier 1/2 without farming data and survives save/reload", () => {
    const result = reconcileGameData(base, null, newLivePatch(), {});
    expect(result.staticData.characters.NewCharacter.gameId).toBe(90000001);
    expect(result.staticData.weapons.NewSword.gameId).toBe(90000002);
    expect(result.staticData.materials.NewFlower.gameId).toBe(90000003);
    const character = resolveCharacterProgression("NewCharacter", result.staticData, false);
    expect(character.usingLegacyExact).toBe(false);
    expect(character.progression?.ascensionTotals["1"].NewFlower).toBe(3);
    expect(character.progression?.ascensionTotals["6"].NewFlower).toBe(168);
    expect(resolveWeaponProgression("NewSword", result.staticData).progression?.ascensionTotals["1"].Mora).toBe(10000);
    expect(plannerReadiness(result.staticData, "NewCharacter")).toMatchObject({ progressionComplete: true, state: "farming_setup_required" });
    expect(validateStaticData(result.staticData).issues.filter(row => row.severity === "error" && row.entityKey === "NewCharacter")).toEqual([]);
    const save = createDefaultSaveFile(); save.overridePack = result.overridePack; save.gameDataUpdates.appliedRevision = newLivePatch().revision;
    const reloaded = migrateSaveFile(JSON.parse(JSON.stringify(save)))!;
    expect(reloaded.schemaVersion).toBe(15);
    expect(reloaded.gameDataUpdates.appliedRevision).toBe(newLivePatch().revision);
    expect(loadStaticData(reloaded.overridePack).materials.NewFlower.gameId).toBe(90000003);
  });
  it("uses IDs across renames and never duplicates a matching canonical record", () => {
    const first = reconcileGameData(base, null, newLivePatch(), {});
    const next = newLivePatch(); const character = next.observations.find(row => row.gameId === 90000001)!;
    character.displayName = "Renamed Character"; character.canonicalKey = undefined;
    const second = reconcileGameData(first.staticData, first.overridePack, next, {});
    expect(second.staticData.characters.NewCharacter.displayName).toBe("Renamed Character");
    expect(second.staticData.characters.RenamedCharacter).toBeUndefined();
    expect(second.staticData.characters.NewCharacter.aliases).toContain("New Character");
  });
  it("rejects conflicting identities and duplicate observations deterministically", () => {
    const first = reconcileGameData(base, null, newLivePatch(), {});
    const next = newLivePatch(); next.observations.find(row => row.gameId === 90000001)!.gameId = 90000009;
    const second = reconcileGameData(first.staticData, first.overridePack, next, {});
    expect(second.staticData.characters.NewCharacter.gameId).toBe(90000001);
    expect(second.diagnostics.some(row => /conflict|collision/i.test(row.message))).toBe(true);
    const duplicate = newLivePatch(); duplicate.observations.push(duplicate.observations[0]);
    expect(() => reconcileGameData(base, null, duplicate, {})).toThrow(/Duplicate/);
  });
  it("requires unique aliases and supports explicit aliases before normalized names", () => {
    expect(resolveIdentity([{ key: "One", displayName: "Same" }, { key: "Two", displayName: "Same" }], "Same").conflict).toBeDefined();
    expect(resolveIdentity([{ key: "One", displayName: "One", aliases: ["KnownAlias"] }], "KnownAlias").key).toBe("One");
  });
  it("preserves manual sources during resync and reaches planner readiness after configuration", () => {
    const first = reconcileGameData(base, null, newLivePatch(), {});
    const pack = buildFarmingOverride(first.staticData, first.overridePack, { materialKey: "NewFlower", sourceType: "local_specialty", sourceName: "New island", sourceKey: "NewIsland", availability: "ALWAYS", region: "New region", familyKey: "", tierKeys: [] });
    const data = loadStaticData(parseOverrideDataPack(JSON.stringify(pack)));
    expect(data.materials.NewFlower.gameId).toBe(90000003);
    expect(plannerReadiness(data, "NewCharacter").requirements.some(row => row.materialKey === "NewFlower")).toBe(false);
    const second = reconcileGameData(data, pack, newLivePatch(), {});
    expect(second.staticData.materialSources.NewFlower[0].sourceName).toBe("New island");
    expect(second.staticData.materials.NewFlower.category).toBe("local_specialty");
  });
  it("rejects invalid costs atomically without mutating the input", () => {
    const patch = newLivePatch(); patch.observations.find(row => row.entityType === "character")!.characterRequirements!.ascension["1"].costs["202"] = -5;
    expect(() => reconcileGameData(base, null, patch, {})).toThrow();
    expect(base.characters.NewCharacter).toBeUndefined();
  });
  it("migrates schema 13 and recovers interrupted checks without inventing game IDs", () => {
    const legacy = { ...createDefaultSaveFile(), schemaVersion: 13, gameDataUpdates: undefined };
    const migrated = migrateSaveFile(legacy)!;
    expect(migrated.schemaVersion).toBe(15); expect(migrated.gameDataUpdates.discoveries).toEqual({});
    migrated.gameDataUpdates.status = "downloading";
    expect(migrateSaveFile(migrated)?.gameDataUpdates.status).toBe("failed");
  });
});
