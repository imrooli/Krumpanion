import { describe, expect, it } from "vitest";
import { createEmptyDatabaseChangeSet, getPatchManifestRecordMetadataKey, type ChangeSetValidationIssue } from "../../domain/staticData/databaseChangeSet";
import { buildManifestRecordRows, filterAndGroupManifestRecordRows } from "./patchManifestRecordsModel";

describe("patchManifestRecordsModel", () => {
  it("groups manifest records by patch workflow instead of raw insertion order", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.characters.TestCharacter = {
      characterKey: "TestCharacter",
      displayName: "Test Character",
      releaseState: "beta",
      status: "beta",
      plannerEligible: false,
      aliases: [],
      notes: [],
      sourceRefs: [],
      gemFamilyKey: "",
      normalBossMaterialKey: "",
      commonEnemyDropFamilyKey: "",
      localSpecialtyKey: "",
      talentBookFamilyKey: "",
      weeklyBossMaterialKey: "",
    };
    changeSet.localSpecialties.TestFlower = {
      key: "TestFlower",
      displayName: "Test Flower",
      region: "Fontaine",
      isPurchasable: false,
      purchaseVendors: [],
      searchHint: "",
      notes: [],
    };

    const groups = filterAndGroupManifestRecordRows(buildManifestRecordRows(changeSet, []), {
      search: "",
      group: "all",
      kind: "all",
      status: "all",
      sort: "recommended",
    });

    expect(groups.map((group) => group.label)).toEqual(["Characters", "Material Families"]);
    expect(groups[0].rows[0]).toMatchObject({
      key: "TestCharacter",
      generatedOutputHint: "Character catalog + planner profile",
    });
  });

  it("filters by issue status and surfaces issue counts on rows", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.weapons.TestSword = {
      weaponKey: "TestSword",
      displayName: "Test Sword",
      rarity: 4,
      weaponAscensionMaterialFamilyKey: "",
      eliteEnemyDropFamilyKey: "",
      commonEnemyDropFamilyKey: "",
      releaseState: "beta",
      status: "beta",
      plannerEligible: false,
      aliases: [],
      notes: [],
    };
    const issues: ChangeSetValidationIssue[] = [{
      id: "weapon-TestSword-missing",
      severity: "error",
      scope: "change_set",
      entityType: "weaponProfile",
      entityKey: "TestSword",
      message: "Weapon profile is incomplete.",
    }];

    const groups = filterAndGroupManifestRecordRows(buildManifestRecordRows(changeSet, issues), {
      search: "",
      group: "all",
      kind: "all",
      status: "blocking",
      sort: "recommended",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].rows[0]).toMatchObject({ key: "TestSword", errorCount: 1 });
  });

  it("supports modified record sorting metadata", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.recordMetadata = {
      [getPatchManifestRecordMetadataKey("localSpecialty", "OldFlower")]: {
        id: getPatchManifestRecordMetadataKey("localSpecialty", "OldFlower"),
        kind: "localSpecialty",
        mode: "modify",
        sourceCanonicalKey: "OldFlower",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    };
    changeSet.localSpecialties.OldFlower = {
      key: "OldFlower",
      displayName: "Old Flower",
      region: "Fontaine",
      isPurchasable: false,
      purchaseVendors: [],
      searchHint: "",
      notes: [],
    };

    const row = buildManifestRecordRows(changeSet, [])[0];

    expect(row).toMatchObject({
      mode: "modify",
      sourceCanonicalKey: "OldFlower",
      groupLabel: "Material Families",
    });
  });
});
