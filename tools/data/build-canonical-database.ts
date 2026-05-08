import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadStaticData } from "../../src/domain/staticData/loadStaticData.ts";
import { resolveEffectiveCharacterMetadata } from "../../src/domain/staticData/resolveEffectiveCharacterMetadata.ts";
import { isGoalTrackableWeaponRecord, isIgnoredCharacterKey, isPlayableGoalCharacter } from "../../src/domain/staticData/targetability.ts";
import type { StaticGameData } from "../../src/domain/staticData/types.ts";

type CanonicalStatus = "verified" | "unresolved" | "beta" | "special_case" | "ignored" | "deprecated";
type CanonicalReleaseState = "live" | "beta" | "unreleased" | "special_case" | "ignored" | "deprecated";

const CHARACTER_FIXES: Record<string, Partial<{
  normalBossMaterialKey: string;
  weeklyBossMaterialKey: string;
}>> = {
  Albedo: { normalBossMaterialKey: "BasaltPillar" },
  Charlotte: { normalBossMaterialKey: "TourbillonDevice", weeklyBossMaterialKey: "LightlessSilkString" },
  Chiori: { weeklyBossMaterialKey: "LightlessSilkString" },
  Cyno: { normalBossMaterialKey: "ThunderclapFruitcore" },
  Dori: { normalBossMaterialKey: "ThunderclapFruitcore" },
  KujouSara: { normalBossMaterialKey: "StormBeads" },
  Navia: { weeklyBossMaterialKey: "LightlessSilkString" },
  Ningguang: { normalBossMaterialKey: "BasaltPillar" },
  Noelle: { normalBossMaterialKey: "BasaltPillar" },
  Ororon: { weeklyBossMaterialKey: "LightlessSilkString" },
  RaidenShogun: { normalBossMaterialKey: "StormBeads" },
  Shenhe: { normalBossMaterialKey: "DragonheirsFalseFin" },
  Thoma: { normalBossMaterialKey: "SmolderingPearl" },
  Wriothesley: { normalBossMaterialKey: "TourbillonDevice" },
  YaeMiko: { normalBossMaterialKey: "DragonheirsFalseFin" },
  Yoimiya: { normalBossMaterialKey: "SmolderingPearl" },
  Zhongli: { normalBossMaterialKey: "BasaltPillar" },
};

const sortRecord = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));

const normalizeStatus = (status: string | undefined, fallback: CanonicalStatus = "unresolved"): CanonicalStatus => {
  switch (status) {
    case "verified":
      return "verified";
    case "beta":
      return "beta";
    case "special_case":
      return "special_case";
    case "ignored":
      return "ignored";
    case "deprecated":
      return "deprecated";
    case "needs_manual_review":
    case "unresolved":
      return "unresolved";
    default:
      return fallback;
  }
};

const inferReleaseState = (status: CanonicalStatus): CanonicalReleaseState => {
  switch (status) {
    case "beta":
      return "beta";
    case "special_case":
      return "special_case";
    case "ignored":
      return "ignored";
    case "deprecated":
      return "deprecated";
    default:
      return "live";
  }
};

function categoryFromMaterialRecord(staticData: StaticGameData, materialKey: string): string {
  const record = staticData.materialRecords[materialKey];
  const descriptor = staticData.materials[materialKey];
  const baseCategory = record?.category ?? descriptor?.category ?? "other";

  switch (baseCategory) {
    case "ascension_gem":
    case "gemstone":
      return "elemental_gem";
    case "general_enemy_drop":
      return "common_enemy_drop";
    case "character_talent_material":
    case "talent_book":
      return "talent_book";
    case "weapon_ascension_material":
    case "weapon_ascension":
      return "weapon_ascension_material";
    case "weapon_exp_material":
      return "weapon_exp";
    case "weapon_fodder_exp":
      return "weapon_fodder_exp";
    case "local_specialty":
      return "local_specialty";
    case "normal_boss_material":
      return "normal_boss_material";
    case "weekly_boss_material":
    case "weekly_boss":
      return "weekly_boss_material";
    case "elite_enemy_drop":
      return "elite_enemy_drop";
    case "special_progression_material":
      return "special_progression_material";
    case "mora":
      return "currency";
    case "character_exp":
      return "character_exp";
    default:
      return baseCategory;
  }
}

function buildCharacterProfiles(staticData: StaticGameData): Record<string, Record<string, unknown>> {
  const records: Record<string, Record<string, unknown>> = {};

  for (const characterKey of Object.keys(staticData.characters).sort()) {
    if (characterKey === "Traveler" || characterKey.startsWith("traveler_")) {
      continue;
    }

    const catalog = staticData.characters[characterKey] ?? { key: characterKey, displayName: characterKey };
    const effective = resolveEffectiveCharacterMetadata(staticData, characterKey);
    const profile = staticData.characterMaterialProfiles[characterKey];
    const fix = CHARACTER_FIXES[characterKey] ?? {};
    const status =
      isIgnoredCharacterKey(characterKey)
        ? "ignored"
        : normalizeStatus(profile?.status, "unresolved");
    const normalBossMaterialKey = fix.normalBossMaterialKey ?? profile?.normalBossMaterialKey ?? profile?.normalBoss ?? "";
    const weeklyBossMaterialKey = fix.weeklyBossMaterialKey ?? profile?.weeklyBossMaterialKey ?? profile?.weeklyBossMaterial ?? "";
    const hasPlannerFields =
      Boolean(effective.element) &&
      Boolean(profile?.elementGemFamilyKey ?? profile?.gemFamilyKey) &&
      Boolean(profile?.localSpecialtyKey ?? profile?.localSpecialty) &&
      Boolean(profile?.commonEnemyMaterialFamilyId ?? profile?.enemyDropFamilyKey) &&
      Boolean(profile?.talentBookSeriesKey ?? profile?.talentBookFamilyKey) &&
      Boolean(normalBossMaterialKey) &&
      Boolean(weeklyBossMaterialKey);
    const canonicalStatus: CanonicalStatus =
      status === "beta"
        ? "beta"
        : status === "ignored"
          ? "ignored"
          : hasPlannerFields
            ? "verified"
            : "unresolved";

    records[characterKey] = {
      characterKey,
      displayName: effective.displayName ?? catalog.displayName ?? characterKey,
      rarity: effective.rarity,
      weaponType: effective.weaponType,
      element: effective.element,
      elementGemFamilyKey: profile?.elementGemFamilyKey ?? profile?.gemFamilyKey ?? "",
      localSpecialtyKey: profile?.localSpecialtyKey ?? profile?.localSpecialty ?? "",
      commonEnemyDropFamilyKey: profile?.commonEnemyMaterialFamilyId ?? profile?.enemyDropFamilyKey ?? "",
      talentBookFamilyKey: profile?.talentBookSeriesKey ?? profile?.talentBookFamilyKey ?? "",
      normalBossMaterialKey,
      weeklyBossMaterialKey,
      releaseState: inferReleaseState(canonicalStatus),
      status: canonicalStatus,
      plannerEligible: canonicalStatus === "verified" && isPlayableGoalCharacter(staticData, characterKey),
      region: catalog.region ?? null,
      notes: profile?.notes ?? [],
      aliases: [effective.displayName ?? catalog.displayName ?? characterKey],
      sourceRefs: profile?.sourceVersion ? [profile.sourceVersion] : [],
    };
  }

  return sortRecord(records);
}

function buildTravelerProfile(staticData: StaticGameData): Record<string, unknown> {
  const sharedProfile = staticData.characterMaterialProfiles.Traveler;
  const elementVariants = Object.fromEntries(
    Object.values(staticData.travelerElementProfiles)
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map((profile) => [
        profile.element,
        {
          element: profile.element,
          talentBookFamilyKey: profile.talentBookFamilyKey,
          commonEnemyDropFamilyKey: profile.commonEnemyDropFamilyKey,
          weeklyBossMaterialKey: profile.weeklyBossMaterialKey ?? "",
          status: normalizeStatus(profile.status === "complete" ? "verified" : "unresolved"),
          notes: profile.warnings ?? [],
        },
      ]),
  );

  return {
    characterKey: "Traveler",
    displayName: "Traveler",
    status: "special_case",
    releaseState: "special_case",
    plannerEligible: true,
    sharedCharacterLevel: true,
    sharedAscension: true,
    rarity: 5,
    weaponType: "Sword",
    localSpecialtyKey: sharedProfile?.localSpecialtyKey ?? sharedProfile?.localSpecialty ?? "WindwheelAster",
    commonEnemyDropFamilyKey:
      sharedProfile?.commonEnemyMaterialFamilyId ?? sharedProfile?.enemyDropFamilyKey ?? "hilichurl_materials",
    notes: sharedProfile?.notes ?? [],
    elementVariants,
  };
}

function buildWeaponProfiles(staticData: StaticGameData): Record<string, Record<string, unknown>> {
  const records: Record<string, Record<string, unknown>> = {};

  for (const weaponKey of Object.keys(staticData.weapons).sort()) {
    const weapon = staticData.weapons[weaponKey];
    const profile = staticData.weaponMaterialProfiles[weaponKey];
    const rarity = weapon?.rarity ?? profile?.rarity;
    if (rarity !== 3 && rarity !== 4 && rarity !== 5) {
      continue;
    }

    const normalizedProfileStatus = normalizeStatus(profile?.status, "unresolved");
    const hasPlannerFields =
      Boolean(profile?.weaponAscensionFamilyKey) &&
      Boolean(profile?.eliteEnemyDropFamilyId ?? profile?.eliteEnemyFamilyKey) &&
      Boolean(profile?.commonEnemyFamilyKey);
    const status: CanonicalStatus =
      normalizedProfileStatus === "beta"
        ? "beta"
        : hasPlannerFields
          ? "verified"
          : "unresolved";

    records[weaponKey] = {
      weaponKey,
      displayName: weapon.displayName,
      weaponType: weapon.weaponType ?? profile?.weaponType ?? null,
      rarity,
      weaponAscensionMaterialFamilyKey: profile?.weaponAscensionFamilyKey ?? "",
      eliteEnemyDropFamilyKey: profile?.eliteEnemyDropFamilyId ?? profile?.eliteEnemyFamilyKey ?? "",
      commonEnemyDropFamilyKey: profile?.commonEnemyFamilyKey ?? "",
      releaseState: inferReleaseState(status),
      status,
      plannerEligible: status === "verified" && isGoalTrackableWeaponRecord(staticData, weaponKey),
      notes: profile?.notes ?? [],
      aliases: [weapon.displayName],
    };
  }

  return sortRecord(records);
}

function buildMaterials(staticData: StaticGameData): Record<string, Record<string, unknown>> {
  const records: Record<string, Record<string, unknown>> = {};
  const familyByMaterial = staticData.materialFamilyByKey;
  const tieredIndex = staticData.tieredMaterialIndex;

  for (const materialKey of Object.keys(staticData.materials).sort()) {
    const descriptor = staticData.materials[materialKey];
    const record = staticData.materialRecords[materialKey];
    const sourceKeys = (staticData.materialSources[materialKey] ?? []).map((source) => source.sourceKey);
    const familyRef = familyByMaterial[materialKey];
    const tierRef = tieredIndex[materialKey];

    records[materialKey] = {
      materialKey,
      displayName: descriptor.displayName,
      category: categoryFromMaterialRecord(staticData, materialKey),
      legacyCategory: descriptor.category,
      recordCategory: record?.category ?? null,
      rarity: record?.rarity ?? null,
      familyKey: record?.familyKey ?? familyRef?.familyKey ?? tierRef?.familyKey ?? null,
      tier: tierRef?.tierIndex ?? null,
      sourceKeys,
      status: normalizeStatus(record?.status, "verified"),
      notes: record?.notes ?? [],
      usedFor: record?.usedFor ?? [],
      craftable: record?.craftable ?? false,
      conversionRatio: record?.conversionRatio ?? null,
      source: record?.source ?? null,
      characterExpValue: descriptor.characterExpValue ?? null,
      weaponExpValue: descriptor.weaponExpValue ?? record?.expValue ?? null,
    };
  }

  return sortRecord(records);
}

async function writeJson(rootDir: string, relativePath: string, value: unknown): Promise<void> {
  const filePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const staticData = loadStaticData();
  const canonicalRoot = path.join(rootDir, "src", "data", "database");

  const characterProfiles = buildCharacterProfiles(staticData);
  const travelerProfile = buildTravelerProfile(staticData);
  const weaponProfiles = buildWeaponProfiles(staticData);
  const materials = buildMaterials(staticData);

  await writeJson(canonicalRoot, "characters/characterProfiles.json", characterProfiles);
  await writeJson(canonicalRoot, "characters/travelerProfile.json", travelerProfile);
  await writeJson(canonicalRoot, "weapons/weaponProfiles.json", weaponProfiles);

  await writeJson(canonicalRoot, "materials/materials.json", materials);
  await writeJson(canonicalRoot, "materials/elementalGemFamilies.json", sortRecord(staticData.elementGemFamilies));
  await writeJson(canonicalRoot, "materials/localSpecialties.json", sortRecord(staticData.localSpecialties));
  await writeJson(canonicalRoot, "materials/commonEnemyDropFamilies.json", sortRecord(staticData.generalEnemyDropFamilies));
  await writeJson(canonicalRoot, "materials/eliteEnemyDropFamilies.json", sortRecord(staticData.eliteEnemyDropFamilies));
  await writeJson(canonicalRoot, "materials/normalBossMaterials.json", sortRecord(staticData.normalBossMaterials));
  await writeJson(canonicalRoot, "materials/weeklyBossMaterials.json", sortRecord(staticData.weeklyBossMaterials));
  await writeJson(canonicalRoot, "materials/talentBookFamilies.json", sortRecord(staticData.talentBookFamilies));
  await writeJson(canonicalRoot, "materials/weaponAscensionMaterialFamilies.json", sortRecord(staticData.weaponAscensionMaterialFamilies));
  await writeJson(canonicalRoot, "materials/specialProgressionMaterials.json", sortRecord(staticData.specialProgressionMaterials));

  await writeJson(canonicalRoot, "progression/characterAscensionCosts.json", staticData.universalCharacterProgressionCore);
  await writeJson(canonicalRoot, "progression/characterLevelExp.json", {
    levelExpCurve: staticData.universalCharacterProgressionCore.levelExpCurve,
    levelExpTotals: staticData.universalCharacterProgressionCore.levelExpTotals,
    levelingMoraCurve: staticData.universalCharacterProgressionCore.levelingMoraCurve,
    recommendedExpItems: staticData.universalCharacterProgressionCore.recommendedExpItems,
  });
  await writeJson(canonicalRoot, "progression/talentLevelCosts.json", staticData.universalTalentProgressionCore);
  await writeJson(canonicalRoot, "progression/weaponAscensionCosts.json", {
    weaponAscensionPhaseCaps: staticData.weaponAscensionPhaseCaps,
    weaponAscensionCosts: staticData.weaponAscensionCosts,
    weaponAscensionTotals20To90: staticData.weaponAscensionTotals20To90,
  });
  await writeJson(canonicalRoot, "progression/weaponLevelExp.json", {
    universalWeaponProgressionCore: staticData.universalWeaponProgressionCore,
    weaponExpRequirements: staticData.weaponExpRequirements,
    weaponExpTotals1To90: staticData.weaponExpTotals1To90,
  });
  await writeJson(canonicalRoot, "progression/weaponExpItems.json", staticData.weaponExpMaterials);
  await writeJson(canonicalRoot, "progression/legacyCharacterProgressions.json", staticData.legacyCharacterProgressions);
  await writeJson(canonicalRoot, "progression/legacyWeaponProgressions.json", staticData.legacyWeaponProgressions);

  await writeJson(canonicalRoot, "sources/resinActivities.json", {
    resinRules: staticData.resinRules,
    resinSystem: staticData.resinSystem,
    resinActivityCosts: staticData.resinActivityCosts,
    plannerDefaults: staticData.plannerDefaults,
  });
  await writeJson(canonicalRoot, "sources/domainSchedule.json", {
    domainsOfForgery: staticData.domainsOfForgery,
    domainsOfMastery: staticData.domainsOfMastery,
    trounceDomains: staticData.trounceDomains,
  });
  await writeJson(canonicalRoot, "sources/materialSources.json", sortRecord(staticData.materialSources));
  await writeJson(canonicalRoot, "sources/leyLineRewards.json", staticData.leyLineRewardsByWorldLevel);
  await writeJson(canonicalRoot, "sources/bossLootEstimates.json", {
    normalBossAscensionGemDropsByWorldLevel: staticData.normalBossAscensionGemDropsByWorldLevel,
    weeklyBossAscensionGemDropsByWorldLevel: staticData.weeklyBossAscensionGemDropsByWorldLevel,
    normalBossUniqueMaterialDropMeanByWorldLevel: staticData.normalBossUniqueMaterialDropMeanByWorldLevel,
    weeklyTalentMaterialDropMeanByWorldLevel: staticData.weeklyTalentMaterialDropMeanByWorldLevel,
    bossGemThreeStarRollMean: staticData.bossGemThreeStarRollMean,
    bossGemDropPackMeanByRewardLevel: staticData.bossGemDropPackMeanByRewardLevel,
    bossGemDropPackRarityDistribution: staticData.bossGemDropPackRarityDistribution,
  });
  await writeJson(canonicalRoot, "sources/domainLootEstimates.json", {
    weaponAscensionDomainDropModel: staticData.weaponAscensionDomainDropModel,
    talentBookDomainDropModel: staticData.talentBookDomainDropModel,
  });
  await writeJson(
    canonicalRoot,
    "sources/enemyRouteSources.json",
    Object.fromEntries(
      Object.entries(staticData.materialSources)
        .filter(([, sources]) =>
          sources.some((source) =>
            ["enemy_drop", "local_specialty", "world_gathering"].includes(source.sourceType),
          ),
        )
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );

  await writeJson(canonicalRoot, "crafting/recipes.json", sortRecord(staticData.craftingRecipes));
  await writeJson(canonicalRoot, "crafting/tieredMaterialIndex.json", sortRecord(staticData.tieredMaterialIndex));
  await writeJson(canonicalRoot, "crafting/craftingUtilityPassives.json", sortRecord(staticData.craftingUtilityPassives));
  await writeJson(canonicalRoot, "crafting/craftingPlannerDefaults.json", staticData.craftingPlannerDefaults);
  await writeJson(canonicalRoot, "crafting/gemConversionDefaults.json", staticData.gemConversionDefaults);

  await writeJson(canonicalRoot, "artifacts/artifactDomains.json", sortRecord(staticData.artifactDomains));
}

void main();
