import type { MaterialTotals } from "../../utils/collections";
import { resolveInventoryMaterialKey } from "./materialKeyMapping";
import type {
  CharacterMaterialProfile,
  CharacterProgressionEntry,
  LocalSpecialtyMaterial,
  MaterialRecord,
  NormalBossMaterial,
  WeaponAscensionMaterialFamilyRecord,
  WeaponExpMaterialRecord,
  StaticGameData,
  WeeklyBossMaterial,
  SpecialProgressionMaterial,
  WeaponProgressionEntry,
} from "./types";

export function buildLocalSpecialtyRegionIndex(
  localSpecialties: Record<string, LocalSpecialtyMaterial>,
): StaticGameData["localSpecialtiesByRegion"] {
  const byRegion: StaticGameData["localSpecialtiesByRegion"] = {
    Mondstadt: [],
    Liyue: [],
    Inazuma: [],
    Sumeru: [],
    Fontaine: [],
    Natlan: [],
    "Nod-Krai": [],
  };

  for (const item of Object.values(localSpecialties)) {
    byRegion[item.region].push(item);
  }

  return byRegion;
}

function normalizeNormalBossMaterials(
  normalBossMaterials: Record<string, NormalBossMaterial>,
): Record<string, NormalBossMaterial> {
  return Object.fromEntries(
    Object.entries(normalBossMaterials).map(([key, item]) => [
      resolveInventoryMaterialKey(key),
      {
        ...item,
        key: resolveInventoryMaterialKey(item.key),
      },
    ]),
  );
}

function normalizeWeeklyBossMaterials(
  weeklyBossMaterials: Record<string, WeeklyBossMaterial>,
): Record<string, WeeklyBossMaterial> {
  return Object.fromEntries(
    Object.entries(weeklyBossMaterials).map(([key, item]) => [
      resolveInventoryMaterialKey(key),
      {
        ...item,
        key: resolveInventoryMaterialKey(item.key),
      },
    ]),
  );
}

function normalizeSpecialProgressionMaterials(
  materials: Record<string, SpecialProgressionMaterial>,
): Record<string, SpecialProgressionMaterial> {
  return Object.fromEntries(
    Object.entries(materials).map(([key, item]) => [
      resolveInventoryMaterialKey(key),
      {
        ...item,
        key: resolveInventoryMaterialKey(item.key),
      },
    ]),
  );
}

function normalizeMaterialRecords(
  records: Record<string, MaterialRecord>,
): Record<string, MaterialRecord> {
  return Object.fromEntries(
    Object.entries(records).map(([key, item]) => [
      resolveInventoryMaterialKey(key),
      {
        ...item,
        key: resolveInventoryMaterialKey(item.key),
      },
    ]),
  );
}

function normalizeCraftingRecipes(
  recipes: Record<string, StaticGameData["recipes"][string]>,
): Record<string, StaticGameData["recipes"][string]> {
  return Object.fromEntries(
    Object.entries(recipes).map(([recipeKey, recipe]) => [
      recipeKey,
      {
        ...recipe,
        outputKey: resolveInventoryMaterialKey(recipe.outputKey ?? recipe.outputMaterialKey),
        outputMaterialKey: resolveInventoryMaterialKey(recipe.outputMaterialKey),
        inputMaterials: (recipe.inputMaterials ?? []).map((input) => ({
          ...input,
          materialKey: resolveInventoryMaterialKey(input.materialKey),
        })),
        ingredients: Object.fromEntries(
          Object.entries(recipe.ingredients).map(([ingredientKey, quantity]) => [resolveInventoryMaterialKey(ingredientKey), quantity]),
        ),
      },
    ]),
  );
}

function normalizeWeaponExpMaterials(
  materials: Record<string, WeaponExpMaterialRecord>,
): Record<string, WeaponExpMaterialRecord> {
  return Object.fromEntries(
    Object.entries(materials).map(([key, item]) => [
      resolveInventoryMaterialKey(key),
      {
        ...item,
        key: resolveInventoryMaterialKey(item.key),
      },
    ]),
  );
}

function normalizeWeaponAscensionMaterialFamilies(
  families: Record<string, WeaponAscensionMaterialFamilyRecord>,
): Record<string, WeaponAscensionMaterialFamilyRecord> {
  return Object.fromEntries(
    Object.entries(families).map(([key, family]) => [
      key,
      {
        ...family,
        tiers: {
          twoStar: resolveInventoryMaterialKey(family.tiers.twoStar),
          threeStar: resolveInventoryMaterialKey(family.tiers.threeStar),
          fourStar: resolveInventoryMaterialKey(family.tiers.fourStar),
          fiveStar: resolveInventoryMaterialKey(family.tiers.fiveStar),
        },
      },
    ]),
  );
}

function normalizeMaterialTotals(totals: MaterialTotals): MaterialTotals {
  return Object.entries(totals).reduce<MaterialTotals>((accumulator, [materialKey, amount]) => {
    const normalizedKey = resolveInventoryMaterialKey(materialKey);
    accumulator[normalizedKey] = (accumulator[normalizedKey] ?? 0) + amount;
    return accumulator;
  }, {});
}

function normalizeProgressionEntry(entry: CharacterProgressionEntry): CharacterProgressionEntry {
  return {
    ...entry,
    key: entry.key,
    levelTotals: Object.fromEntries(Object.entries(entry.levelTotals).map(([level, totals]) => [level, normalizeMaterialTotals(totals)])),
    ascensionTotals: Object.fromEntries(Object.entries(entry.ascensionTotals).map(([level, totals]) => [level, normalizeMaterialTotals(totals)])),
    talentTotals: Object.fromEntries(Object.entries(entry.talentTotals).map(([level, totals]) => [level, normalizeMaterialTotals(totals)])),
    levelCapExtensionTotals: entry.levelCapExtensionTotals
      ? Object.fromEntries(Object.entries(entry.levelCapExtensionTotals).map(([level, totals]) => [level, normalizeMaterialTotals(totals)]))
      : undefined,
  };
}

function normalizeWeaponProgressionEntry(entry: WeaponProgressionEntry): WeaponProgressionEntry {
  return {
    ...entry,
    key: entry.key,
    levelTotals: Object.fromEntries(Object.entries(entry.levelTotals).map(([level, totals]) => [level, normalizeMaterialTotals(totals)])),
    ascensionTotals: Object.fromEntries(Object.entries(entry.ascensionTotals).map(([level, totals]) => [level, normalizeMaterialTotals(totals)])),
  };
}

function normalizeCharacterMaterialProfile(
  key: string,
  profile: CharacterMaterialProfile,
  data: StaticGameData,
): CharacterMaterialProfile {
  const normalizedGemSeries = profile.gemSeries?.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as
    | [string, string, string, string]
    | undefined;
  const normalizedLocalSpecialtyKey = profile.localSpecialtyKey
    ? resolveInventoryMaterialKey(profile.localSpecialtyKey)
    : profile.localSpecialty
      ? resolveInventoryMaterialKey(profile.localSpecialty)
      : profile.localSpecialtySourceKey
        ? data.localSpecialtySources[profile.localSpecialtySourceKey]?.materialKey
        : undefined;
  const normalizedNormalBossMaterialKey = profile.normalBossMaterialKey
    ? resolveInventoryMaterialKey(profile.normalBossMaterialKey)
    : profile.normalBossMaterial
      ? resolveInventoryMaterialKey(profile.normalBossMaterial)
      : "";
  const normalizedWeeklyBossMaterialKey = profile.weeklyBossMaterialKey
    ? resolveInventoryMaterialKey(profile.weeklyBossMaterialKey)
    : profile.weeklyBossMaterial
      ? resolveInventoryMaterialKey(profile.weeklyBossMaterial)
      : "";
  const normalizedEnemyDropFamily = profile.enemyDropFamily?.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as
    | [string, string, string]
    | undefined;
  const normalizedTalentBookFamily = profile.talentBookFamily?.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as
    | [string, string, string]
    | undefined;
  const characterEntry = data.characters[key];
  const gemFamilyKey = profile.gemFamilyKey ?? profile.elementGemFamilyKey ?? profile.element ?? characterEntry?.element;
  const commonEnemyMaterialFamilyId =
    profile.commonEnemyMaterialFamilyId ?? profile.enemyDropFamilyKey ?? data.characterGeneralEnemyDropFamilyByKey[key];
  const talentBookSeriesKey = profile.talentBookSeriesKey ?? profile.talentBookFamilyKey;

  return {
    ...profile,
    characterKey: key,
    name: profile.name ?? profile.displayName ?? characterEntry?.displayName ?? key,
    displayName: profile.displayName ?? characterEntry?.displayName ?? key,
    weaponType: profile.weaponType ?? characterEntry?.weaponType,
    rarity: profile.rarity ?? characterEntry?.rarity,
    element: profile.element ?? characterEntry?.element,
    gemFamilyKey,
    normalBossMaterialKey: normalizedNormalBossMaterialKey,
    commonEnemyMaterialFamilyId,
    localSpecialtyKey: normalizedLocalSpecialtyKey,
    talentBookSeriesKey,
    weeklyBossMaterialKey: normalizedWeeklyBossMaterialKey,
    elementGemFamilyKey: gemFamilyKey,
    gemSeries: normalizedGemSeries,
    localSpecialty: normalizedLocalSpecialtyKey,
    normalBossMaterial: normalizedNormalBossMaterialKey,
    enemyDropFamilyKey: commonEnemyMaterialFamilyId,
    enemyDropFamily: normalizedEnemyDropFamily,
    talentBookFamilyKey: talentBookSeriesKey,
    talentBookFamily: normalizedTalentBookFamily,
    weeklyBossMaterial: normalizedWeeklyBossMaterialKey,
    post90ResourceKey: profile.post90ResourceKey ? resolveInventoryMaterialKey(profile.post90ResourceKey) : profile.post90ResourceKey,
  };
}

export function normalizeStaticDataMaterialReferences(data: StaticGameData): StaticGameData {
  const normalizedLocalSpecialties = Object.fromEntries(
    Object.entries(data.localSpecialties).map(([key, item]) => [
      key,
      {
        ...item,
        key: resolveInventoryMaterialKey(item.key),
      },
    ]),
  );
  const normalizedNormalBossMaterials = normalizeNormalBossMaterials(data.normalBossMaterials);
  const normalizedWeeklyBossMaterials = normalizeWeeklyBossMaterials(data.weeklyBossMaterials);
  const normalizedSpecialProgressionMaterials = normalizeSpecialProgressionMaterials(data.specialProgressionMaterials);
  const normalizedMaterialRecords = normalizeMaterialRecords(data.materialRecords);
  const normalizedWeaponExpMaterials = normalizeWeaponExpMaterials(data.weaponExpMaterials);
  const normalizedWeaponAscensionMaterialFamilies = normalizeWeaponAscensionMaterialFamilies(data.weaponAscensionMaterialFamilies);

  return {
    ...data,
    elementGemFamilies: Object.fromEntries(
      Object.entries(data.elementGemFamilies).map(([key, family]) => [
        key,
        {
          ...family,
          sliver: resolveInventoryMaterialKey(family.sliver),
          fragment: resolveInventoryMaterialKey(family.fragment),
          chunk: resolveInventoryMaterialKey(family.chunk),
          gemstone: resolveInventoryMaterialKey(family.gemstone),
        },
      ]),
    ),
    talentBookFamilies: Object.fromEntries(
      Object.entries(data.talentBookFamilies).map(([key, family]) => [
        key,
        {
          ...family,
          teachings: resolveInventoryMaterialKey(family.teachings),
          guide: resolveInventoryMaterialKey(family.guide),
          philosophies: resolveInventoryMaterialKey(family.philosophies),
        },
      ]),
    ),
    enemyDropFamilies: Object.fromEntries(
      Object.entries(data.enemyDropFamilies).map(([key, family]) => [
        key,
        {
          ...family,
          low: resolveInventoryMaterialKey(family.low),
          mid: resolveInventoryMaterialKey(family.mid),
          high: resolveInventoryMaterialKey(family.high),
          top: family.top ? resolveInventoryMaterialKey(family.top) : undefined,
        },
      ]),
    ),
    generalEnemyDropFamilies: Object.fromEntries(
      Object.entries(data.generalEnemyDropFamilies).map(([key, family]) => [
        key,
        {
          ...family,
          materialKeys: family.materialKeys.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as [string, string, string],
          usedByCharacterKeys: family.usedByCharacterKeys?.map((characterKey) => characterKey),
          usedByCharacterReferences: family.usedByCharacterReferences?.map((reference) => ({ ...reference })),
          usedByWeaponKeys: family.usedByWeaponKeys?.map((weaponKey) => weaponKey),
        },
      ]),
    ),
    localSpecialties: normalizedLocalSpecialties,
    localSpecialtiesByRegion: buildLocalSpecialtyRegionIndex(normalizedLocalSpecialties),
    normalBossMaterials: normalizedNormalBossMaterials,
    weeklyBossMaterials: normalizedWeeklyBossMaterials,
    specialProgressionMaterials: normalizedSpecialProgressionMaterials,
    materialRecords: normalizedMaterialRecords,
    tieredMaterialIndex: Object.fromEntries(
      Object.entries(data.tieredMaterialIndex).map(([materialKey, item]) => [
        resolveInventoryMaterialKey(materialKey),
        {
          ...item,
          materialKey: resolveInventoryMaterialKey(item.materialKey),
          tierKeys: item.tierKeys.map((tierKey) => resolveInventoryMaterialKey(tierKey)),
        },
      ]),
    ),
    weaponExpMaterials: normalizedWeaponExpMaterials,
    weaponAscensionMaterialFamilies: normalizedWeaponAscensionMaterialFamilies,
    eliteEnemyDropFamilies: Object.fromEntries(
      Object.entries(data.eliteEnemyDropFamilies).map(([key, family]) => [
        key,
        {
          ...family,
          materialKeys: family.materialKeys.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as [string, string, string],
          usedByWeaponKeys: family.usedByWeaponKeys?.map((weaponKey) => weaponKey),
        },
      ]),
    ),
    weaponAscensionFamilies: Object.fromEntries(
      Object.entries(data.weaponAscensionFamilies).map(([key, family]) => [
        key,
        {
          ...family,
          tier1: resolveInventoryMaterialKey(family.tier1),
          tier2: resolveInventoryMaterialKey(family.tier2),
          tier3: resolveInventoryMaterialKey(family.tier3),
          tier4: resolveInventoryMaterialKey(family.tier4),
        },
      ]),
    ),
    localSpecialtySources: Object.fromEntries(
      Object.entries(data.localSpecialtySources).map(([key, source]) => [
        key,
        {
          ...source,
          materialKey: resolveInventoryMaterialKey(source.materialKey),
        },
      ]),
    ),
    characterMaterialProfiles: Object.fromEntries(
      Object.entries(data.characterMaterialProfiles).map(([key, profile]) => [
        key,
        normalizeCharacterMaterialProfile(key, profile, data),
      ]),
    ),
    weaponMaterialProfiles: Object.fromEntries(
      Object.entries(data.weaponMaterialProfiles).map(([key, profile]) => [
        key,
        {
          ...profile,
          weaponAscensionMaterialFamily: profile.weaponAscensionMaterialFamily?.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as
            | [string, string, string, string]
            | undefined,
          eliteEnemyFamily: profile.eliteEnemyFamily?.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as [string, string, string] | undefined,
          commonEnemyFamily: profile.commonEnemyFamily?.map((materialKey) => resolveInventoryMaterialKey(materialKey)) as [string, string, string] | undefined,
        },
      ]),
    ),
    characterProgressions: Object.fromEntries(
      Object.entries(data.characterProgressions).map(([key, entry]) => [key, normalizeProgressionEntry(entry)]),
    ),
    weaponProgressions: Object.fromEntries(
      Object.entries(data.weaponProgressions).map(([key, entry]) => [key, normalizeWeaponProgressionEntry(entry)]),
    ),
    legacyCharacterProgressions: Object.fromEntries(
      Object.entries(data.legacyCharacterProgressions).map(([key, entry]) => [key, normalizeProgressionEntry(entry)]),
    ),
    legacyWeaponProgressions: Object.fromEntries(
      Object.entries(data.legacyWeaponProgressions).map(([key, entry]) => [key, normalizeWeaponProgressionEntry(entry)]),
    ),
    materialSources: Object.fromEntries(
      Object.entries(data.materialSources).map(([materialKey, rows]) => [
        resolveInventoryMaterialKey(materialKey),
        rows.map((row) => ({
          ...row,
          materialKey: resolveInventoryMaterialKey(row.materialKey),
        })),
      ]),
    ),
    recipes: normalizeCraftingRecipes(data.recipes),
    craftingRecipes: normalizeCraftingRecipes(data.craftingRecipes),
    materialFamilyByKey: Object.fromEntries(
      Object.entries(data.materialFamilyByKey).map(([materialKey, familyReference]) => [
        resolveInventoryMaterialKey(materialKey),
        familyReference,
      ]),
    ),
  };
}
