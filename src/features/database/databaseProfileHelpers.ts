import type {
  CharacterElement,
  CharacterMaterialProfile,
  CharacterMaterialStatus,
  CharacterWeaponType,
  GeneralEnemyDropFamily,
  StaticGameData,
  UnresolvedCharacterMaterialReference,
  WeaponCatalogEntry,
  WeaponMaterialProfile,
} from "../../domain/staticData/types";
import { resolveEffectiveCharacterMetadata } from "../../domain/staticData/resolveEffectiveCharacterMetadata";
import { isTravelerElementKey, isTravelerSharedKey } from "../../domain/staticData/travelerRegistry";

export type GuidedProfileStatus = "complete" | "partial" | "unresolved" | "manual_review";

export interface CharacterProfileResolvedPreview {
  gems: Partial<Record<"sliver" | "fragment" | "chunk" | "gemstone", string>>;
  commonEnemy: Partial<Record<1 | 2 | 3, string>>;
  talentBooks: Partial<Record<"teachings" | "guide" | "philosophies", string>>;
}

export interface CharacterProfileValidationState {
  status: GuidedProfileStatus;
  missingFields: string[];
  errors: string[];
  warnings: string[];
  unresolvedReferences: UnresolvedCharacterMaterialReference[];
}

export interface CharacterProfileEditorState {
  characterKey: string;
  displayName: string;
  element?: CharacterElement;
  weaponType?: CharacterWeaponType;
  rarity?: 4 | 5;
  region?: string;
  profileStatus: GuidedProfileStatus;
  sourceStatus?: CharacterMaterialStatus;
  gemFamilyKey: string;
  normalBossMaterialKey: string;
  commonEnemyMaterialFamilyId: string;
  localSpecialtyKey: string;
  talentBookSeriesKey: string;
  weeklyBossMaterialKey: string;
  notes: string[];
  validation: CharacterProfileValidationState;
  preview: CharacterProfileResolvedPreview;
}

export interface WeaponProfileResolvedPreview {
  weaponAscension: Partial<Record<"tier1" | "tier2" | "tier3" | "tier4", string>>;
  eliteEnemy: Partial<Record<"low" | "mid" | "high", string>>;
  commonEnemy: Partial<Record<"low" | "mid" | "high", string>>;
}

export interface WeaponProfileValidationState {
  status: GuidedProfileStatus;
  missingFields: string[];
  errors: string[];
  warnings: string[];
}

export interface WeaponProfileEditorState {
  weaponKey: string;
  displayName: string;
  weaponType?: CharacterWeaponType;
  rarity?: 1 | 2 | 3 | 4 | 5;
  profileStatus: GuidedProfileStatus;
  weaponAscensionFamilyKey: string;
  eliteEnemyDropFamilyId: string;
  commonEnemyMaterialFamilyId: string;
  validation: WeaponProfileValidationState;
  preview: WeaponProfileResolvedPreview;
}

function normalizeCharacterProfile(
  characterKey: string,
  profile: CharacterMaterialProfile | undefined,
  staticData: StaticGameData,
): CharacterMaterialProfile {
  const character = resolveEffectiveCharacterMetadata(staticData, characterKey);
  return {
    characterKey,
    ...profile,
    name: profile?.name ?? profile?.displayName ?? character?.displayName,
    weaponType: profile?.weaponType ?? character?.weaponType,
    rarity: profile?.rarity ?? character?.rarity,
    element: profile?.element ?? character?.element,
    gemFamilyKey:
      profile?.gemFamilyKey ??
      profile?.elementGemFamilyKey ??
      profile?.element ??
      character?.element,
    normalBossMaterialKey: profile?.normalBossMaterialKey ?? profile?.normalBossMaterial,
    commonEnemyMaterialFamilyId:
      profile?.commonEnemyMaterialFamilyId ??
      profile?.enemyDropFamilyKey ??
      staticData.characterGeneralEnemyDropFamilyByKey[characterKey],
    localSpecialtyKey:
      profile?.localSpecialtyKey ??
      profile?.localSpecialty ??
      (profile?.localSpecialtySourceKey
        ? staticData.localSpecialtySources[profile.localSpecialtySourceKey]?.materialKey
        : undefined),
    talentBookSeriesKey: profile?.talentBookSeriesKey ?? profile?.talentBookFamilyKey,
    weeklyBossMaterialKey: profile?.weeklyBossMaterialKey ?? profile?.weeklyBossMaterial,
    normalBossMaterial: profile?.normalBossMaterialKey ?? profile?.normalBossMaterial ?? "",
    weeklyBossMaterial: profile?.weeklyBossMaterialKey ?? profile?.weeklyBossMaterial ?? "",
  };
}

function buildCharacterPreview(
  profile: CharacterMaterialProfile,
  staticData: StaticGameData,
): CharacterProfileResolvedPreview {
  const gemFamily = profile.gemFamilyKey ? staticData.elementGemFamilies[profile.gemFamilyKey] : undefined;
  const commonEnemyFamily = profile.commonEnemyMaterialFamilyId
    ? staticData.generalEnemyDropFamilies[profile.commonEnemyMaterialFamilyId] ??
      toCompatibilityEnemyFamily(staticData.enemyDropFamilies[profile.commonEnemyMaterialFamilyId])
    : undefined;
  const talentBookFamily = profile.talentBookSeriesKey ? staticData.talentBookFamilies[profile.talentBookSeriesKey] : undefined;

  return {
    gems: {
      sliver: gemFamily?.sliver,
      fragment: gemFamily?.fragment,
      chunk: gemFamily?.chunk,
      gemstone: gemFamily?.gemstone,
    },
    commonEnemy: {
      1: commonEnemyFamily?.materialKeys[0],
      2: commonEnemyFamily?.materialKeys[1],
      3: commonEnemyFamily?.materialKeys[2],
    },
    talentBooks: {
      teachings: talentBookFamily?.teachings,
      guide: talentBookFamily?.guide,
      philosophies: talentBookFamily?.philosophies,
    },
  };
}

function toCompatibilityEnemyFamily(
  family: { low: string; mid: string; high: string } | undefined,
): Pick<GeneralEnemyDropFamily, "materialKeys"> | undefined {
  if (!family) {
    return undefined;
  }
  return {
    materialKeys: [family.low, family.mid, family.high],
  };
}

function validateDirectMaterialKey(
  materialKey: string,
  fieldLabel: string,
  resolver: (key: string) => boolean,
  errors: string[],
): void {
  if (!materialKey) {
    return;
  }

  if (materialKey.includes("?")) {
    errors.push(`${fieldLabel} cannot use placeholder values like "???".`);
    return;
  }

  if (!resolver(materialKey)) {
    errors.push(`${fieldLabel} must resolve to a known direct material key.`);
  }
}

export function buildCharacterProfileEditorState(
  characterKey: string,
  profile: CharacterMaterialProfile | undefined,
  staticData: StaticGameData,
): CharacterProfileEditorState {
  const normalized = normalizeCharacterProfile(characterKey, profile, staticData);
  const character = resolveEffectiveCharacterMetadata(staticData, characterKey);
  const unresolvedReferences = staticData.unresolvedCharacterMaterialReferences.filter(
    (entry) => entry.characterKey === characterKey,
  );
  const validation = validateCharacterProfile(normalized, unresolvedReferences, staticData);

  return {
    characterKey,
    displayName: character?.displayName ?? normalized.name ?? normalized.displayName ?? characterKey,
    element: normalized.element ?? character?.element,
    weaponType: normalized.weaponType ?? character?.weaponType,
    rarity: normalized.rarity ?? character?.rarity,
    region: character?.region,
    profileStatus: validation.status,
    sourceStatus: normalized.status,
    gemFamilyKey: normalized.gemFamilyKey ?? "",
    normalBossMaterialKey: normalized.normalBossMaterialKey ?? "",
    commonEnemyMaterialFamilyId: normalized.commonEnemyMaterialFamilyId ?? "",
    localSpecialtyKey: normalized.localSpecialtyKey ?? "",
    talentBookSeriesKey: normalized.talentBookSeriesKey ?? "",
    weeklyBossMaterialKey: normalized.weeklyBossMaterialKey ?? "",
    notes: normalized.notes ?? [],
    validation,
    preview: buildCharacterPreview(normalized, staticData),
  };
}

export function validateCharacterProfile(
  profile: CharacterMaterialProfile,
  unresolvedReferences: UnresolvedCharacterMaterialReference[],
  staticData: StaticGameData,
): CharacterProfileValidationState {
  const missingFields: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const isTravelerShared = isTravelerSharedKey(profile.characterKey);
  const isTravelerElement = isTravelerElementKey(profile.characterKey);
  const isTraveler = isTravelerShared || isTravelerElement || profile.status === "needs_manual_review";

  const requiredFields = [
    ["gemFamilyKey", profile.gemFamilyKey],
    ["normalBossMaterialKey", profile.normalBossMaterialKey],
    ["commonEnemyMaterialFamilyId", profile.commonEnemyMaterialFamilyId],
    ["localSpecialtyKey", profile.localSpecialtyKey],
    ["talentBookSeriesKey", profile.talentBookSeriesKey],
    ["weeklyBossMaterialKey", profile.weeklyBossMaterialKey],
  ] as const;

  if (!isTraveler) {
    for (const [field, value] of requiredFields) {
      if (!value) {
        missingFields.push(field);
      }
    }
  } else if (isTravelerShared) {
    for (const [field, value] of [
      ["gemFamilyKey", profile.gemFamilyKey],
      ["commonEnemyMaterialFamilyId", profile.commonEnemyMaterialFamilyId],
      ["localSpecialtyKey", profile.localSpecialtyKey],
    ] as const) {
      if (!value) {
        missingFields.push(field);
      }
    }
  } else if (isTravelerElement) {
    for (const [field, value] of [
      ["commonEnemyMaterialFamilyId", profile.commonEnemyMaterialFamilyId],
      ["talentBookSeriesKey", profile.talentBookSeriesKey],
    ] as const) {
      if (!value) {
        missingFields.push(field);
      }
    }
  }

  if (profile.commonEnemyMaterialFamilyId) {
    if (!staticData.generalEnemyDropFamilies[profile.commonEnemyMaterialFamilyId]) {
      errors.push("Common enemy family must point to a General Enemy Drop family.");
    }
    if (staticData.eliteEnemyDropFamilies[profile.commonEnemyMaterialFamilyId]) {
      errors.push("Character profiles cannot use Elite Enemy Drop families.");
    }
  }

  if (profile.gemFamilyKey && !staticData.elementGemFamilies[profile.gemFamilyKey]) {
    errors.push("Gem family must resolve to a known elemental gem family.");
  }

  if (profile.localSpecialtyKey && !staticData.localSpecialties[profile.localSpecialtyKey]) {
    errors.push("Local specialty must resolve to a known Local Specialty.");
  }

  if (profile.talentBookSeriesKey && !staticData.talentBookFamilies[profile.talentBookSeriesKey]) {
    errors.push("Talent book series must resolve to a known Talent Book family.");
  }

  if (!isTravelerShared && !isTravelerElement) {
    validateDirectMaterialKey(
      profile.normalBossMaterialKey ?? "",
      "Normal boss material",
      (key) => Boolean(staticData.normalBossMaterials[key]),
      errors,
    );
  }
  validateDirectMaterialKey(
    profile.weeklyBossMaterialKey ?? "",
    "Weekly boss material",
    (key) => Boolean(staticData.materials[key] || staticData.specialProgressionMaterials[key]),
    errors,
  );

  if (profile.element && profile.gemFamilyKey) {
    const familyElement = staticData.elementGemFamilies[profile.gemFamilyKey]?.element;
    if (familyElement && familyElement !== profile.element) {
      warnings.push(`Gem family usually matches ${profile.element}, but this profile points to ${familyElement}.`);
    }
  }

  if (unresolvedReferences.length) {
    warnings.push(`${unresolvedReferences.length} unresolved source reference(s) still need review.`);
  }

  if (isTravelerShared) {
    warnings.push("Traveler shared level and ascension are modeled separately from elemental Traveler talent goals.");
  } else if (isTravelerElement) {
    warnings.push("Traveler elemental talent goals are modeled separately from Traveler shared level and ascension.");
  }

  let status: GuidedProfileStatus = "complete";
  if (profile.status === "needs_manual_review") {
    status = "manual_review";
  } else if (errors.length || unresolvedReferences.some((entry) => entry.status === "unresolved")) {
    status = "unresolved";
  } else if (missingFields.length || warnings.length || profile.status === "beta") {
    status = "partial";
  }

  return {
    status,
    missingFields,
    errors,
    warnings,
    unresolvedReferences,
  };
}

function buildWeaponPreview(
  profile: WeaponMaterialProfile,
  staticData: StaticGameData,
): WeaponProfileResolvedPreview {
  const weaponAscensionFamily = profile.weaponAscensionFamilyKey
    ? staticData.weaponAscensionFamilies[profile.weaponAscensionFamilyKey]
    : undefined;
  const eliteFamilyId = profile.eliteEnemyDropFamilyId ?? profile.eliteEnemyFamilyKey;
  const eliteFamily = eliteFamilyId
    ? staticData.eliteEnemyDropFamilies[eliteFamilyId] ??
      toCompatibilityEnemyFamily(staticData.enemyDropFamilies[eliteFamilyId])
    : undefined;
  const commonFamilyId = profile.commonEnemyFamilyKey ?? staticData.weaponGeneralEnemyDropFamilyByKey[profile.weaponKey];
  const commonFamily = commonFamilyId
    ? staticData.generalEnemyDropFamilies[commonFamilyId] ??
      toCompatibilityEnemyFamily(staticData.enemyDropFamilies[commonFamilyId])
    : undefined;

  return {
    weaponAscension: {
      tier1: weaponAscensionFamily?.tier1,
      tier2: weaponAscensionFamily?.tier2,
      tier3: weaponAscensionFamily?.tier3,
      tier4: weaponAscensionFamily?.tier4,
    },
    eliteEnemy: {
      low: eliteFamily?.materialKeys[0],
      mid: eliteFamily?.materialKeys[1],
      high: eliteFamily?.materialKeys[2],
    },
    commonEnemy: {
      low: commonFamily?.materialKeys[0],
      mid: commonFamily?.materialKeys[1],
      high: commonFamily?.materialKeys[2],
    },
  };
}

export function buildWeaponProfileEditorState(
  weaponKey: string,
  profile: WeaponMaterialProfile | undefined,
  staticData: StaticGameData,
): WeaponProfileEditorState {
  const weapon = staticData.weapons[weaponKey];
  const normalized: WeaponMaterialProfile = {
    weaponKey,
    rarity: profile?.rarity ?? (weapon?.rarity as 1 | 2 | 3 | 4 | 5 | undefined),
    weaponType: profile?.weaponType ?? weapon?.weaponType,
    weaponAscensionFamilyKey: profile?.weaponAscensionFamilyKey,
    eliteEnemyDropFamilyId: profile?.eliteEnemyDropFamilyId ?? profile?.eliteEnemyFamilyKey,
    commonEnemyFamilyKey: profile?.commonEnemyFamilyKey ?? staticData.weaponGeneralEnemyDropFamilyByKey[weaponKey],
    ...profile,
  };
  const validation = validateWeaponProfile(normalized, staticData);

  return {
    weaponKey,
    displayName: weapon?.displayName ?? weaponKey,
    weaponType: normalized.weaponType ?? weapon?.weaponType,
    rarity: normalized.rarity ?? (weapon?.rarity as 1 | 2 | 3 | 4 | 5 | undefined),
    profileStatus: validation.status,
    weaponAscensionFamilyKey: normalized.weaponAscensionFamilyKey ?? "",
    eliteEnemyDropFamilyId: normalized.eliteEnemyDropFamilyId ?? "",
    commonEnemyMaterialFamilyId: normalized.commonEnemyFamilyKey ?? "",
    validation,
    preview: buildWeaponPreview(normalized, staticData),
  };
}

export function validateWeaponProfile(
  profile: WeaponMaterialProfile,
  staticData: StaticGameData,
): WeaponProfileValidationState {
  const missingFields: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!profile.weaponAscensionFamilyKey) {
    missingFields.push("weaponAscensionFamilyKey");
  } else if (!staticData.weaponAscensionFamilies[profile.weaponAscensionFamilyKey]) {
    errors.push("Weapon ascension family must resolve to a known weapon ascension family.");
  }

  const eliteFamilyId = profile.eliteEnemyDropFamilyId ?? profile.eliteEnemyFamilyKey;
  if (!eliteFamilyId) {
    missingFields.push("eliteEnemyDropFamilyId");
  } else if (!staticData.eliteEnemyDropFamilies[eliteFamilyId]) {
    errors.push(
      staticData.generalEnemyDropFamilies[eliteFamilyId]
        ? "Elite enemy family currently resolves as a Common/General Enemy Drop family, not an Elite Enemy Drop family."
        : "Elite enemy family must resolve to a known Elite Enemy Drop family.",
    );
  }

  const commonFamilyId = profile.commonEnemyFamilyKey;
  if (!commonFamilyId) {
    missingFields.push("commonEnemyFamilyKey");
  } else if (!staticData.generalEnemyDropFamilies[commonFamilyId]) {
    errors.push("Common enemy family must resolve to a known General Enemy Drop family.");
  } else if (staticData.eliteEnemyDropFamilies[commonFamilyId]) {
    errors.push("Weapon common enemy family cannot point to an Elite Enemy Drop family.");
  }

  if (!profile.rarity) {
    missingFields.push("rarity");
  }
  if (!profile.weaponType) {
    warnings.push("Weapon type is still missing from the catalog metadata.");
  }

  let status: GuidedProfileStatus = "complete";
  if (errors.length) {
    status = "unresolved";
  } else if (missingFields.length || warnings.length) {
    status = "partial";
  }

  return {
    status,
    missingFields,
    errors,
    warnings,
  };
}

export function buildCharacterProfileOverride(
  state: CharacterProfileEditorState,
  existing: CharacterMaterialProfile | undefined,
): CharacterMaterialProfile {
  return {
    ...(existing ?? {}),
    characterKey: state.characterKey,
    displayName: existing?.displayName ?? state.displayName,
    element: existing?.element ?? state.element,
    weaponType: existing?.weaponType ?? state.weaponType,
    rarity: existing?.rarity ?? state.rarity,
    gemFamilyKey: state.gemFamilyKey || undefined,
    normalBossMaterialKey: state.normalBossMaterialKey || undefined,
    normalBossMaterial: state.normalBossMaterialKey,
    commonEnemyMaterialFamilyId: state.commonEnemyMaterialFamilyId || undefined,
    enemyDropFamilyKey: state.commonEnemyMaterialFamilyId || undefined,
    localSpecialtyKey: state.localSpecialtyKey || undefined,
    localSpecialty: state.localSpecialtyKey || undefined,
    localSpecialtySourceKey: undefined,
    talentBookSeriesKey: state.talentBookSeriesKey || undefined,
    talentBookFamilyKey: state.talentBookSeriesKey || undefined,
    weeklyBossMaterialKey: state.weeklyBossMaterialKey || undefined,
    weeklyBossMaterial: state.weeklyBossMaterialKey,
    notes: state.notes,
  };
}

export function buildWeaponProfileOverride(
  state: WeaponProfileEditorState,
  existing: WeaponMaterialProfile | undefined,
): WeaponMaterialProfile {
  return {
    ...(existing ?? {}),
    weaponKey: state.weaponKey,
    rarity: state.rarity,
    weaponType: state.weaponType,
    weaponAscensionFamilyKey: state.weaponAscensionFamilyKey || undefined,
    eliteEnemyDropFamilyId: state.eliteEnemyDropFamilyId || undefined,
    eliteEnemyFamilyKey: state.eliteEnemyDropFamilyId || undefined,
    commonEnemyFamilyKey: state.commonEnemyMaterialFamilyId || undefined,
  };
}

export function buildWeaponCatalogOverride(
  state: WeaponProfileEditorState,
  existing: WeaponCatalogEntry | undefined,
): WeaponCatalogEntry {
  return {
    key: state.weaponKey,
    displayName: existing?.displayName ?? state.displayName,
    weaponType: state.weaponType,
    rarity: state.rarity,
  };
}

export function getGuidedStatusBadge(status: GuidedProfileStatus): string {
  switch (status) {
    case "complete":
      return "complete";
    case "partial":
      return "partial";
    case "unresolved":
      return "unresolved";
    case "manual_review":
      return "manual review";
    default:
      return status;
  }
}
