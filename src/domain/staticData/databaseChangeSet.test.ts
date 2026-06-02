import { describe, expect, it } from "vitest";
import { createStaticData } from "./staticDataFactory";
import {
  compileChangeSetToOverridePack,
  createEmptyDatabaseChangeSet,
  exportChangeSetToCanonicalBundle,
  mergeOverridePacks,
  validateChangeSet,
} from "./databaseChangeSet";

describe("databaseChangeSet", () => {
  it("creates a weekly boss group with three materials and shared weekly sources", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.weeklyBossGroups.TestBoss = {
      sourceKey: "TestBossDomain",
      bossKey: "TestBossDomain",
      bossName: "Test Boss",
      domainName: "Test Boss Domain",
      status: "beta",
      notes: ["Patch placeholder"],
      drops: [
        { key: "TestBossDropA", displayName: "Test Boss Drop A" },
        { key: "TestBossDropB", displayName: "Test Boss Drop B" },
        { key: "TestBossDropC", displayName: "Test Boss Drop C" },
      ],
    };

    const pack = compileChangeSetToOverridePack(changeSet);

    expect(Object.keys(pack.weeklyBossMaterials ?? {})).toEqual([
      "TestBossDropA",
      "TestBossDropB",
      "TestBossDropC",
    ]);
    expect(pack.materialSources?.TestBossDropA?.[0]).toMatchObject({
      sourceType: "weekly_boss",
      sourceKey: "TestBossDomain",
      availability: "WEEKLY",
    });
  });

  it("creates a talent book family with three material descriptors and mastery source rows", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.talentBookFamilies.TestDiscipline = {
      key: "TestDiscipline",
      teachingsKey: "TeachingsOfTestDiscipline",
      teachingsName: "Teachings of Test Discipline",
      guideKey: "GuideToTestDiscipline",
      guideName: "Guide to Test Discipline",
      philosophiesKey: "PhilosophiesOfTestDiscipline",
      philosophiesName: "Philosophies of Test Discipline",
      domainKey: "TestMasteryDomain",
      domainName: "Test Mastery Domain",
      availability: "MON_THU_SUN",
      region: "Fontaine",
      status: "beta",
      notes: ["Pending live release"],
    };

    const pack = compileChangeSetToOverridePack(changeSet);

    expect(pack.talentBookFamilies?.TestDiscipline?.domainName).toBe("Test Mastery Domain");
    expect(pack.materials?.TeachingsOfTestDiscipline?.category).toBe("talent_book");
    expect(pack.materialSources?.PhilosophiesOfTestDiscipline?.[0]).toMatchObject({
      sourceType: "domain_of_mastery",
      sourceKey: "TestMasteryDomain",
      availability: "MON_THU_SUN",
    });
  });

  it("updates character assignment preview through createStaticData", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.weeklyBossGroups.TestBoss = {
      sourceKey: "TestBossDomain",
      bossKey: "TestBossDomain",
      bossName: "Test Boss",
      domainName: "Test Boss Domain",
      status: "beta",
      notes: [],
      drops: [
        { key: "TestBossDropA", displayName: "Test Boss Drop A" },
        { key: "TestBossDropB", displayName: "Test Boss Drop B" },
        { key: "TestBossDropC", displayName: "Test Boss Drop C" },
      ],
    };
    changeSet.talentBookFamilies.TestDiscipline = {
      key: "TestDiscipline",
      teachingsKey: "TeachingsOfTestDiscipline",
      teachingsName: "Teachings of Test Discipline",
      guideKey: "GuideToTestDiscipline",
      guideName: "Guide to Test Discipline",
      philosophiesKey: "PhilosophiesOfTestDiscipline",
      philosophiesName: "Philosophies of Test Discipline",
      domainKey: "TestMasteryDomain",
      domainName: "Test Mastery Domain",
      availability: "MON_THU_SUN",
      region: "Fontaine",
      status: "beta",
      notes: [],
    };
    changeSet.commonEnemyDropFamilies.TestEnemy = {
      familyId: "test_enemy_materials",
      displayName: "Test Enemy Materials",
      sourceEnemyFamily: "Test Enemies",
      lowKey: "TestEnemyWhistle",
      lowName: "Test Enemy Whistle",
      midKey: "RefinedTestEnemyWhistle",
      midName: "Refined Test Enemy Whistle",
      highKey: "MasterTestEnemyWhistle",
      highName: "Master Test Enemy Whistle",
      status: "beta",
      notes: [],
    };
    changeSet.normalBossMaterials.TestBossCore = {
      key: "TestBossCore",
      displayName: "Test Boss Core",
      bossKey: "TestWorldBoss",
      bossDisplayName: "Test World Boss",
      status: "beta",
      notes: [],
    };
    changeSet.localSpecialties.TestBloom = {
      key: "TestBloom",
      displayName: "Test Bloom",
      region: "Fontaine",
      isPurchasable: false,
      purchaseVendors: [],
      searchHint: "Found around the test coast",
      notes: [],
    };
    changeSet.characters.TestCharlotte = {
      characterKey: "TestCharlotte",
      displayName: "Test Charlotte",
      element: "Cryo",
      weaponType: "Catalyst",
      rarity: 5,
      region: "Fontaine",
      releaseState: "beta",
      status: "beta",
      plannerEligible: true,
      aliases: ["Test Charlotte"],
      notes: [],
      sourceRefs: [],
      gemFamilyKey: "Cryo",
      normalBossMaterialKey: "TestBossCore",
      commonEnemyDropFamilyKey: "test_enemy_materials",
      localSpecialtyKey: "TestBloom",
      talentBookFamilyKey: "TestDiscipline",
      weeklyBossMaterialKey: "TestBossDropA",
    };

    const preview = createStaticData(mergeOverridePacks(null, compileChangeSetToOverridePack(changeSet)));

    expect(preview.characterMaterialProfiles.TestCharlotte.weeklyBossMaterialKey).toBe("TestBossDropA");
    expect(preview.talentBookFamilies.TestDiscipline.teachings).toBe("TeachingsOfTestDiscipline");
    expect(preview.weeklyBossMaterials.TestBossDropA.displayName).toBe("Test Boss Drop A");
  });

  it("surfaces incomplete character assignment validation", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.characters.TestIncomplete = {
      characterKey: "TestIncomplete",
      displayName: "Test Incomplete",
      releaseState: "beta",
      status: "beta",
      plannerEligible: true,
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

    const issues = validateChangeSet(changeSet, createStaticData());
    expect(issues.some((issue) => issue.entityKey === "TestIncomplete" && issue.severity === "error")).toBe(true);
  });

  it("exports canonical bundle files grouped by target database path", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.weeklyBossGroups.TestBoss = {
      sourceKey: "TestBossDomain",
      bossKey: "TestBossDomain",
      bossName: "Test Boss",
      domainName: "Test Boss Domain",
      status: "beta",
      notes: [],
      drops: [
        { key: "TestBossDropA", displayName: "Test Boss Drop A" },
        { key: "TestBossDropB", displayName: "Test Boss Drop B" },
        { key: "TestBossDropC", displayName: "Test Boss Drop C" },
      ],
    };

    const bundle = exportChangeSetToCanonicalBundle(changeSet);
    expect(bundle.files.some((file) => file.path.endsWith("weeklyBossMaterials.json"))).toBe(true);
    expect(bundle.files.some((file) => file.path.endsWith("materialSources.json"))).toBe(true);
  });
});
