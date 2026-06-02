import { describe, expect, it } from "vitest";
import { createStaticData } from "../staticData/staticDataFactory";
import type { OwnedWeapon } from "../account/types";
import { analyzeWeaponRefinementCollection } from "./refinementTracker";

function buildOwnedWeapon(
  weaponKey: string,
  overrides: Partial<OwnedWeapon> & Pick<OwnedWeapon, "weaponInstanceId">,
): OwnedWeapon {
  return {
    weaponInstanceId: overrides.weaponInstanceId,
    accountId: "account-1",
    weaponKey,
    weaponId: weaponKey,
    importName: weaponKey,
    importedName: weaponKey,
    importSourceId: overrides.weaponInstanceId,
    currentLevel: overrides.currentLevel ?? 1,
    currentAscension: overrides.currentAscension ?? 0,
    refinement: overrides.refinement ?? 1,
    equippedByCharacterId: overrides.equippedByCharacterId,
    equippedBy: overrides.equippedBy ?? overrides.equippedByCharacterId ?? null,
    location: overrides.location,
    lock: overrides.lock,
    locked: overrides.locked ?? overrides.lock ?? false,
    lastImportedAt: "2026-05-14T00:00:00.000Z",
  };
}

describe("analyzeWeaponRefinementCollection", () => {
  const staticData = createStaticData();

  it("marks an existing R5 copy as complete", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-r5", refinement: 5 })],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "FavoniusSword");
    expect(entry?.status).toBe("already_r5");
    expect(entry?.hasR5).toBe(true);
    expect(entry?.recommendationType).toBe("already_r5");
  });

  it("detects an upgrade opportunity from R2 plus two R1 copies", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-base", refinement: 2, currentLevel: 80, currentAscension: 5 }),
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-dupe-1", refinement: 1 }),
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-dupe-2", refinement: 1 }),
      ],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "FavoniusSword");
    expect(entry?.status).toBe("can_refine_now");
    expect(entry?.possibleRefinement).toBe(4);
    expect(entry?.copiesNeededForUniqueR5).toBe(1);
    expect(entry?.refinementOpportunities[0]?.consumableInstanceIds).toEqual(["fav-dupe-1", "fav-dupe-2"]);
  });

  it("reaches R5 from an R4 base and one safe duplicate", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("TheWidsith", { weaponInstanceId: "widsith-base", refinement: 4, currentLevel: 90, currentAscension: 6 }),
        buildOwnedWeapon("TheWidsith", { weaponInstanceId: "widsith-dupe", refinement: 1 }),
      ],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "TheWidsith");
    expect(entry?.status).toBe("can_refine_now");
    expect(entry?.possibleRefinement).toBe(5);
    expect(entry?.copiesNeededForUniqueR5).toBe(0);
  });

  it("reports missing copies when only one copy exists", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [buildOwnedWeapon("CoolSteel", { weaponInstanceId: "cool-single", refinement: 1 })],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "CoolSteel");
    expect(entry?.status).toBe("needs_more_copies");
    expect(entry?.copiesNeededForUniqueR5).toBe(4);
  });

  it("does not recommend locked or equipped duplicates for automatic consumption", () => {
    const lockedAnalysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-base", refinement: 2, currentLevel: 80 }),
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-locked", refinement: 1, lock: true }),
      ],
    });
    expect(lockedAnalysis.entries.find((item) => item.weaponKey === "FavoniusSword")?.status).toBe("unsafe_to_refine");

    const equippedAnalysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-base", refinement: 2, currentLevel: 80 }),
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-equipped", refinement: 1, equippedByCharacterId: "Furina" }),
      ],
    });
    expect(equippedAnalysis.entries.find((item) => item.weaponKey === "FavoniusSword")?.status).toBe("unsafe_to_refine");
  });

  it("prefers the highest-investment copy as base when refinement levels tie", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("Rust", { weaponInstanceId: "rust-low", refinement: 1, currentLevel: 1, currentAscension: 0 }),
        buildOwnedWeapon("Rust", { weaponInstanceId: "rust-high", refinement: 1, currentLevel: 80, currentAscension: 5 }),
      ],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "Rust");
    expect(entry?.copyEvaluations.find((copy) => copy.isBaseCandidate)?.instance.weaponInstanceId).toBe("rust-high");
  });

  it("uses manual review by default for 5-star duplicates", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("AmosBow", { weaponInstanceId: "amos-base", refinement: 1, currentLevel: 90, currentAscension: 6 }),
        buildOwnedWeapon("AmosBow", { weaponInstanceId: "amos-dupe", refinement: 1 }),
      ],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "AmosBow");
    expect(entry?.status).toBe("manual_review");
    expect(entry?.refinementPolicy).toBe("manual_review");
  });

  it("does not track 1-star or 2-star weapons for refinement goals", () => {
    const customStaticData = createStaticData();
    customStaticData.weapons.TrainingSword = {
      key: "TrainingSword",
      displayName: "Training Sword",
      weaponType: "Sword",
      rarity: 2,
      acquisitionType: "unknown",
      refinementTrackable: false,
      refinementPolicy: "not_trackable",
      limited: false,
      eventExclusive: false,
    };

    const analysis = analyzeWeaponRefinementCollection({
      staticData: customStaticData,
      ownedWeapons: [buildOwnedWeapon("TrainingSword", { weaponInstanceId: "training", refinement: 1 })],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "TrainingSword");
    expect(entry?.status).toBe("not_tracked");
    expect(entry?.recommendationType).toBe("not_refinement_trackable");
  });

  it("treats goal-linked duplicates as unsafe to consume", () => {
    const analysis = analyzeWeaponRefinementCollection({
      staticData,
      ownedWeapons: [
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-base", refinement: 2, currentLevel: 80 }),
        buildOwnedWeapon("FavoniusSword", { weaponInstanceId: "fav-goal", refinement: 1 }),
      ],
      linkedWeaponInstanceIds: ["fav-goal"],
    });

    const entry = analysis.entries.find((item) => item.weaponKey === "FavoniusSword");
    expect(entry?.status).toBe("unsafe_to_refine");
    expect(entry?.copyEvaluations.find((copy) => copy.instance.weaponInstanceId === "fav-goal")?.goalLinked).toBe(true);
  });
});
