import { describe, expect, it } from "vitest";
import { createStaticData } from "./staticDataFactory";
import { parseOverrideDataPack } from "./overrideSchema";
import { validateStaticData } from "./validateStaticData";
import {
  cloneCanonicalRecordToPatchManifest,
  compileChangeSetToOverridePack,
  createEmptyDatabaseChangeSet,
  deletePatchManifestRecord,
  exportChangeSetToCanonicalBundle,
  mergeOverridePacks,
  renamePatchManifestRecord,
  validateChangeSet,
  validatePatchManifestRecord,
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
    expect(pack.tieredMaterialIndex?.GuideToTestDiscipline).toMatchObject({
      familyKey: "TestDiscipline",
      familyType: "talent_book_family",
      tierIndex: 1,
    });
    expect(pack.recipes?.PhilosophiesOfTestDiscipline).toMatchObject({
      outputMaterialKey: "PhilosophiesOfTestDiscipline",
      category: "talent_level_up_material",
      ingredients: { GuideToTestDiscipline: 3 },
    });
    expect(pack.materialRecords?.TeachingsOfTestDiscipline?.rarity).toBeUndefined();
  });

  it("emits schema-valid override material records without null optional fields", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.talentBookFamilies.TestFortitude = {
      key: "TestFortitude",
      teachingsKey: "TeachingsOfTestFortitude",
      teachingsName: "Teachings of Test Fortitude",
      guideKey: "GuideToTestFortitude",
      guideName: "Guide to Test Fortitude",
      philosophiesKey: "PhilosophiesOfTestFortitude",
      philosophiesName: "Philosophies of Test Fortitude",
      domainKey: "TestFortitudeDomain",
      domainName: "Test Fortitude Domain",
      availability: "MON_THU_SUN",
      region: "Natlan",
      status: "verified",
      notes: [],
    };

    const pack = compileChangeSetToOverridePack(changeSet);

    expect(pack.materialRecords?.TeachingsOfTestFortitude).not.toHaveProperty("rarity");
    expect(() => parseOverrideDataPack(JSON.stringify(pack))).not.toThrow();
  });

  it("exports broader patch manifest records for source domains, weapons, artifacts, recipes, and tier indexes", () => {
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
      notes: [],
    };
    changeSet.sourceDomains.TestMasteryDomain = {
      domainKey: "TestMasteryDomain",
      domainType: "mastery",
      name: "Test Mastery Domain",
      region: "Fontaine",
      location: "Test Valley",
      availability: "MON_THU_SUN",
      linkedFamilyKeys: ["TestDiscipline"],
      listedRewards: ["TeachingsOfTestDiscipline", "GuideToTestDiscipline", "PhilosophiesOfTestDiscipline"],
      elements: ["Hydro"],
      notes: [],
    };
    changeSet.weapons.TestSword = {
      weaponKey: "TestSword",
      displayName: "Test Sword",
      weaponType: "Sword",
      rarity: 4,
      acquisitionType: "unknown",
      weaponAscensionMaterialFamilyKey: "TestWeaponFamily",
      eliteEnemyDropFamilyKey: "test_elite_family",
      commonEnemyDropFamilyKey: "test_common_family",
      releaseState: "live",
      status: "verified",
      plannerEligible: true,
      aliases: ["Test Sword"],
      notes: [],
    };
    changeSet.artifactDomains.TestArtifactSet = {
      setKey: "TestArtifactSet",
      setName: "Test Artifact Set",
      hasStandardDomainSource: true,
      domainKey: "TestArtifactDomain",
      domainName: "Test Artifact Domain",
      domainLocation: "Test Ruins",
      region: "Fontaine",
      availability: "ALWAYS",
      resinCost: 20,
      pairedSetKeys: ["PairedTestSet"],
    };

    const bundle = exportChangeSetToCanonicalBundle(changeSet);
    const paths = bundle.files.map((file) => file.path);

    expect(paths).toContain("src/data/database/sources/domainSchedule.json");
    expect(paths).toContain("src/data/database/weapons/weaponProfiles.json");
    expect(paths).toContain("src/data/database/artifacts/artifactDomains.json");
    expect(paths).toContain("src/data/database/crafting/recipes.json");
    expect(paths).toContain("src/data/database/crafting/tieredMaterialIndex.json");
    expect(bundle.overridePack.domainsOfMastery?.TestMasteryDomain?.talentFamilies).toEqual(["TestDiscipline"]);
    expect(bundle.overridePack.weaponMaterialProfiles?.TestSword?.goalTrackable).toBe(true);
  });

  it("promotes manifest enemy families used by weapon elite slots into elite preview records", () => {
    const baseStaticData = createStaticData();
    const changeSet = createEmptyDatabaseChangeSet();
    const weaponAscensionFamilyKey = Object.keys(baseStaticData.weaponAscensionMaterialFamilies)[0];
    const commonEnemyFamilyKey = Object.keys(baseStaticData.generalEnemyDropFamilies)[0];

    changeSet.commonEnemyDropFamilies.TestEliteFamily = {
      familyId: "TestEliteFamily",
      displayName: "Test Elite Family",
      sourceEnemyFamily: "Test Elite Enemy",
      lowKey: "TestEliteLow",
      lowName: "Test Elite Low",
      midKey: "TestEliteMid",
      midName: "Test Elite Mid",
      highKey: "TestEliteHigh",
      highName: "Test Elite High",
      status: "verified",
      notes: [],
    };
    changeSet.weapons.TestEliteWeapon = {
      weaponKey: "TestEliteWeapon",
      displayName: "Test Elite Weapon",
      weaponType: "Sword",
      rarity: 4,
      acquisitionType: "unknown",
      weaponAscensionMaterialFamilyKey: weaponAscensionFamilyKey,
      eliteEnemyDropFamilyKey: "TestEliteFamily",
      commonEnemyDropFamilyKey: commonEnemyFamilyKey,
      releaseState: "live",
      status: "verified",
      plannerEligible: true,
      aliases: ["Test Elite Weapon"],
      notes: [],
    };

    const overridePack = compileChangeSetToOverridePack(changeSet);
    const previewStaticData = createStaticData(overridePack);
    const report = validateStaticData(previewStaticData);

    expect(overridePack.eliteEnemyDropFamilies?.TestEliteFamily).toMatchObject({
      category: "elite_enemy_drop",
      materialKeys: ["TestEliteLow", "TestEliteMid", "TestEliteHigh"],
      usedByWeaponKeys: ["TestEliteWeapon"],
    });
    expect(previewStaticData.eliteEnemyDropFamilies.TestEliteFamily).toBeTruthy();
    expect(report.issues.some((issue) => issue.id === "weapon_profile:missing_elite_enemy_family:TestEliteWeapon")).toBe(false);
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

  it("blocks beta planner eligibility until records are live verified", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.weapons.TestBetaWeapon = {
      weaponKey: "TestBetaWeapon",
      displayName: "Test Beta Weapon",
      weaponType: "Sword",
      rarity: 4,
      acquisitionType: "unknown",
      weaponAscensionMaterialFamilyKey: "TestWeaponFamily",
      eliteEnemyDropFamilyKey: "test_elite_family",
      commonEnemyDropFamilyKey: "test_common_family",
      releaseState: "beta",
      status: "beta",
      plannerEligible: true,
      aliases: [],
      notes: [],
    };

    const issues = validateChangeSet(changeSet, createStaticData());

    expect(issues.some((issue) => issue.id === "weapon-TestBetaWeapon-planner-beta" && issue.severity === "error")).toBe(true);
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

  it("clones existing canonical characters and weapons into modify-mode manifest drafts", () => {
    const staticData = createStaticData();
    const characterKey = Object.keys(staticData.characters)[0];
    const weaponKey = Object.keys(staticData.weapons)[0];

    const withCharacter = cloneCanonicalRecordToPatchManifest("characterAssignment", characterKey, staticData);
    const withWeapon = cloneCanonicalRecordToPatchManifest("weaponProfile", weaponKey, staticData, withCharacter);

    expect(withWeapon.characters[characterKey]?.characterKey).toBe(characterKey);
    expect(withWeapon.weapons[weaponKey]?.weaponKey).toBe(weaponKey);
    expect(withWeapon.recordMetadata?.[`characterAssignment:${characterKey}`]).toMatchObject({
      mode: "modify",
      sourceCanonicalKey: characterKey,
    });
    expect(withWeapon.recordMetadata?.[`weaponProfile:${weaponKey}`]).toMatchObject({
      mode: "modify",
      sourceCanonicalKey: weaponKey,
    });
  });

  it("renames and deletes manifest records without leaving stale object keys", () => {
    const changeSet = createEmptyDatabaseChangeSet();
    changeSet.characters.OldCharacter = {
      characterKey: "OldCharacter",
      displayName: "Old Character",
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

    const renamed = renamePatchManifestRecord(changeSet, "characterAssignment", "OldCharacter", "NewCharacter");
    expect(renamed.characters.OldCharacter).toBeUndefined();
    expect(renamed.characters.NewCharacter.characterKey).toBe("NewCharacter");

    const deleted = deletePatchManifestRecord(renamed, "characterAssignment", "NewCharacter");
    expect(deleted.characters.NewCharacter).toBeUndefined();
    expect(deleted.recordMetadata?.["characterAssignment:NewCharacter"]).toBeUndefined();
  });

  it("validates a single manifest draft through the shared validation path", () => {
    const issues = validatePatchManifestRecord(
      "characterAssignment",
      "Incomplete",
      {
        characterKey: "Incomplete",
        displayName: "Incomplete",
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
      },
      createStaticData(),
    );

    expect(issues.some((issue) => issue.severity === "error")).toBe(true);
  });
});
