import { describe, expect, it } from "vitest";
import { canonicalDatabase } from "../../data/database";
import { parseAnimeGameData2 } from "../../adapters/animeGameData2";
import { farmingDataset } from "../../test/fixtures/farmingDataset";
import { repairCanonicalDatabase } from "./repairCanonicalDatabase";
import { loadStaticData } from "./loadStaticData";
import { isGoalTrackableWeaponRecord } from "./targetability";
import { mergeHealthEvidence, type StaticDataIssue } from "./validateStaticData";

const upstream = () => parseAnimeGameData2(farmingDataset(), new Date("2026-09-29"));
describe("canonical repair", () => {
  it("fills missing fields with evidence, preserves curated values, and is idempotent", () => {
    const baseline = structuredClone(canonicalDatabase);
    const row = baseline.characters.characterProfiles.KamisatoAyaka;
    delete row.gameId; delete row.rarity; delete row.weaponType;
    const first = repairCanonicalDatabase(baseline, upstream());
    expect(first.candidate.characters.characterProfiles.KamisatoAyaka).toMatchObject({ gameId: 10000002, rarity: 5, weaponType: "Sword" });
    expect(first.candidate.characters.characterProfiles.KamisatoAyaka.localSpecialtyKey).toBe(row.localSpecialtyKey);
    expect(repairCanonicalDatabase(first.candidate, upstream()).findings.filter(row => row.result === "repair")).toEqual([]);
    row.rarity = 4;
    const conflict = repairCanonicalDatabase(baseline, upstream());
    expect(conflict.candidate.characters.characterProfiles.KamisatoAyaka.rarity).toBe(4);
    expect(conflict.findings).toContainEqual(expect.objectContaining({ key: "KamisatoAyaka", field: "rarity", result: "review" }));
  });
  it("adds low-rarity catalog identities without creating planner or refinement eligibility", () => {
    const baseline = structuredClone(canonicalDatabase); delete baseline.weapons.weaponProfiles.DullBlade;
    const result = repairCanonicalDatabase(baseline, upstream());
    expect(result.candidate.weapons.weaponProfiles.DullBlade).toMatchObject({ rarity: 1, plannerEligible: false, refinementTrackable: false, refinementPolicy: "not_trackable" });
    const data = loadStaticData(null, result.candidate);
    expect(isGoalTrackableWeaponRecord(data, "DullBlade")).toBe(false);
    expect(data.unresolvedWeaponReferences.some(row => row.generatedKey === "DullBlade")).toBe(false);
  });
  it("promotes only release-accepted profiles with matching complete progression", () => {
    const baseline = structuredClone(canonicalDatabase);
    const row = baseline.characters.characterProfiles.KamisatoAyaka; row.status = "beta"; row.releaseState = "beta"; row.plannerEligible = false;
    expect(repairCanonicalDatabase(baseline, upstream()).candidate.characters.characterProfiles.KamisatoAyaka.status).toBe("verified");
    row.localSpecialtyKey = "Cecilia";
    expect(repairCanonicalDatabase(baseline, upstream()).candidate.characters.characterProfiles.KamisatoAyaka.status).toBe("beta");
  });
});
describe("health evidence merging", () => {
  it("combines matching conditions while preserving both origins and distinct values", () => {
    const issue: StaticDataIssue = { id: "one", severity: "warning", category: "character_profile", entityKey: "A", message: "missing", condition: { recordType: "character", field: "rarity", kind: "missing", value: null }, evidence: [{ origin: "effective", code: "missing", message: "missing" }] };
    const merged = mergeHealthEvidence([issue, { ...issue, id: "two", evidence: [{ origin: "canonical", code: "missing", message: "baseline missing" }] }, { ...issue, id: "three", condition: { ...issue.condition!, kind: "invalid", value: 7 } }]);
    expect(merged).toHaveLength(2); expect(merged[0].evidence).toHaveLength(2); expect(merged[1].severity).toBe("warning");
  });
});
