import type { ImportedAccountState } from "../../domain/account/types";
import type {
  OverrideDataPack,
  StaticGameData,
} from "../../domain/staticData/types";
import { resolveEffectiveCharacterMetadata } from "../../domain/staticData/resolveEffectiveCharacterMetadata";
import {
  buildCharacterProfileEditorState,
  buildWeaponProfileEditorState,
  getGuidedStatusBadge,
} from "./databaseProfileHelpers";
import { isTravelerElementKey, isTravelerSharedKey } from "../../domain/staticData/travelerRegistry";
import { isIgnoredCharacterKey } from "../../domain/staticData/targetability";

export type DatabaseSection = "coverage" | "profiles" | "families" | "sources" | "advanced";

export interface CatalogRow {
  key: string;
  label: string;
  subtitle?: string;
  badges: string[];
  searchText: string;
}

export interface DatabaseSearchRecord {
  id: string;
  section: DatabaseSection;
  entityType:
    | "coverage_item"
    | "character"
    | "weapon"
    | "material"
    | "artifact"
    | "character_profile"
    | "weapon_profile"
    | "element_gem_family"
    | "talent_book_family"
    | "enemy_drop_family"
    | "weapon_ascension_family"
    | "local_specialty";
  key: string;
  label: string;
  subtitle?: string;
  badges: string[];
  searchText: string;
}

export interface CoverageQueueItem {
  id: string;
  label: string;
  key: string;
  subtitle?: string;
  badges: string[];
  section: DatabaseSection;
  entityType: string;
  recordKey: string;
}

export interface CoverageQueueGroup {
  key: string;
  title: string;
  description: string;
  items: CoverageQueueItem[];
}

export interface DatabaseCoverageModel {
  groups: CoverageQueueGroup[];
  rows: CatalogRow[];
}

export interface AccountCoverage {
  missingCharacterProfiles: string[];
  missingWeaponProfiles: string[];
  missingCharacterProgressions: string[];
  missingWeaponProgressions: string[];
  missingMaterialSources: string[];
  missingArtifactDomains: string[];
  incompleteCharacterProfiles: string[];
  incompleteWeaponProfiles: string[];
}

export function countSectionEntries(pack: OverrideDataPack | null): number {
  if (!pack) {
    return 0;
  }

  return [
    pack.characters,
    pack.materials,
    pack.elementGemFamilies,
    pack.talentBookFamilies,
    pack.enemyDropFamilies,
    pack.weaponAscensionFamilies,
    pack.localSpecialties,
    pack.normalBossMaterials,
    pack.localSpecialtySources,
    pack.characterMaterialProfiles,
    pack.characterProgressions,
    pack.weapons,
    pack.weaponMaterialProfiles,
    pack.weaponProgressions,
    pack.materialSources,
    pack.artifactDomains,
    pack.recipes,
  ].reduce((sum, section) => sum + Object.keys(section ?? {}).length, 0);
}

export function getCharacterProfileCoverage(characterKey: string, staticData: StaticGameData) {
  const state = buildCharacterProfileEditorState(characterKey, staticData.characterMaterialProfiles[characterKey], staticData);
  const elementGemReady = Boolean(state.gemFamilyKey && staticData.elementGemFamilies[state.gemFamilyKey]);
  const enemyDropReady = Boolean(
    state.commonEnemyMaterialFamilyId && staticData.generalEnemyDropFamilies[state.commonEnemyMaterialFamilyId],
  );
  const talentBookReady = Boolean(state.talentBookSeriesKey && staticData.talentBookFamilies[state.talentBookSeriesKey]);
  const localSpecialtyReady = Boolean(state.localSpecialtyKey && staticData.localSpecialties[state.localSpecialtyKey]);
  const normalBossReady = Boolean(
    state.normalBossMaterialKey && staticData.normalBossMaterials[state.normalBossMaterialKey],
  );
  const weeklyBossReady = Boolean(
    state.weeklyBossMaterialKey &&
      (staticData.materials[state.weeklyBossMaterialKey] || staticData.specialProgressionMaterials[state.weeklyBossMaterialKey]),
  );
  const complete = isTravelerSharedKey(characterKey)
    ? elementGemReady && enemyDropReady && localSpecialtyReady
    : isTravelerElementKey(characterKey)
      ? enemyDropReady && talentBookReady
      : elementGemReady && enemyDropReady && talentBookReady && localSpecialtyReady && normalBossReady && weeklyBossReady;

  return {
    complete,
    status: state.profileStatus,
    elementGemReady,
    enemyDropReady,
    talentBookReady,
    localSpecialtyReady,
    normalBossReady,
    weeklyBossReady,
    missingFields: state.validation.missingFields,
    unresolvedCount: state.validation.unresolvedReferences.length,
    warnings: state.validation.warnings,
    usingLegacy: Boolean(staticData.legacyCharacterProgressions[characterKey] && !staticData.characterMaterialProfiles[characterKey]),
  };
}

export function getWeaponProfileCoverage(weaponKey: string, staticData: StaticGameData) {
  const state = buildWeaponProfileEditorState(weaponKey, staticData.weaponMaterialProfiles[weaponKey], staticData);
  const weaponAscensionReady = Boolean(
    state.weaponAscensionFamilyKey && staticData.weaponAscensionFamilies[state.weaponAscensionFamilyKey],
  );
  const eliteEnemyReady = Boolean(
    state.eliteEnemyDropFamilyId && staticData.eliteEnemyDropFamilies[state.eliteEnemyDropFamilyId],
  );
  const commonEnemyReady = Boolean(
    state.commonEnemyMaterialFamilyId && staticData.generalEnemyDropFamilies[state.commonEnemyMaterialFamilyId],
  );
  const complete = weaponAscensionReady && eliteEnemyReady && commonEnemyReady && Boolean(state.rarity);

  return {
    complete,
    status: state.profileStatus,
    weaponAscensionReady,
    eliteEnemyReady,
    commonEnemyReady,
    missingFields: state.validation.missingFields,
    warnings: state.validation.warnings,
    usingLegacy: Boolean(staticData.legacyWeaponProgressions[weaponKey] && !staticData.weaponMaterialProfiles[weaponKey]),
  };
}

export function buildAccountCoverage(account: ImportedAccountState | null, staticData: StaticGameData): AccountCoverage {
  const characterKeys = [...new Set((account?.characters ?? []).map((character) => character.characterId))].sort();
  const weaponKeys = [...new Set((account?.weapons ?? []).map((weapon) => weapon.weaponKey))].sort();
  const materialKeys = Object.keys(account?.inventory ?? {}).sort();
  const artifactSetKeys = [...new Set((account?.artifacts ?? []).map((artifact) => artifact.setId))].sort();

  return {
    missingCharacterProfiles: characterKeys.filter((key) => !staticData.characterMaterialProfiles[key]),
    missingWeaponProfiles: weaponKeys.filter((key) => !staticData.weaponMaterialProfiles[key]),
    missingCharacterProgressions: characterKeys.filter((key) => !staticData.characterProgressions[key] && !staticData.characterMaterialProfiles[key]),
    missingWeaponProgressions: weaponKeys.filter((key) => !staticData.weaponProgressions[key] && !staticData.weaponMaterialProfiles[key]),
    missingMaterialSources: materialKeys.filter((key) => !(staticData.materialSources[key] ?? []).length),
    missingArtifactDomains: artifactSetKeys.filter((key) => !staticData.artifactDomains[key]),
    incompleteCharacterProfiles: characterKeys.filter((key) => {
      const profile = staticData.characterMaterialProfiles[key];
      return profile ? !getCharacterProfileCoverage(key, staticData).complete : false;
    }),
    incompleteWeaponProfiles: weaponKeys.filter((key) => {
      const profile = staticData.weaponMaterialProfiles[key];
      return profile ? !getWeaponProfileCoverage(key, staticData).complete : false;
    }),
  };
}

export function filterRows(rows: CatalogRow[], query: string, badgeFilter = "all"): CatalogRow[] {
  const normalized = query.trim().toLowerCase();
  return rows
    .filter((row) => (badgeFilter === "all" ? true : row.badges.includes(badgeFilter)))
    .filter((row) => (normalized ? row.searchText.includes(normalized) : true))
    .slice(0, normalized ? 150 : 80);
}

export function buildCharacterRows(staticData: StaticGameData, overridePack: OverrideDataPack | null): CatalogRow[] {
  return Object.keys(staticData.characters)
    .map((characterKey) => {
      const entry = resolveEffectiveCharacterMetadata(staticData, characterKey);
      const coverage = getCharacterProfileCoverage(characterKey, staticData);
      return {
        key: characterKey,
        label: entry.displayName,
        subtitle: [entry.element, entry.weaponType, entry.region].filter(Boolean).join(" | "),
        badges: [
          staticData.characterMaterialProfiles[characterKey]
            ? `profile ${getGuidedStatusBadge(coverage.status)}`
            : "needs profile",
          coverage.usingLegacy ? "legacy fallback" : "profile-first",
          overridePack?.characters?.[characterKey] ? "override" : "seed",
        ],
        searchText: `${characterKey} ${entry.displayName} ${entry.element ?? ""} ${entry.weaponType ?? ""} ${entry.region ?? ""}`.toLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildWeaponRows(staticData: StaticGameData, overridePack: OverrideDataPack | null): CatalogRow[] {
  return Object.values(staticData.weapons)
    .map((entry) => {
      const coverage = getWeaponProfileCoverage(entry.key, staticData);
      return {
        key: entry.key,
        label: entry.displayName,
        subtitle: [entry.weaponType, entry.rarity ? `${entry.rarity}*` : undefined].filter(Boolean).join(" | "),
        badges: [
          staticData.weaponMaterialProfiles[entry.key] ? `profile ${getGuidedStatusBadge(coverage.status)}` : "needs profile",
          coverage.usingLegacy ? "legacy fallback" : "profile-first",
          overridePack?.weapons?.[entry.key] ? "override" : "seed",
        ],
        searchText: `${entry.key} ${entry.displayName} ${entry.weaponType ?? ""} ${entry.rarity ?? ""}`.toLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildMaterialRows(staticData: StaticGameData, overridePack: OverrideDataPack | null): CatalogRow[] {
  return Object.values(staticData.materials)
    .map((entry) => ({
      key: entry.key,
      label: entry.displayName,
      subtitle: entry.category,
      badges: [
        (staticData.materialSources[entry.key] ?? []).length ? "has sources" : "needs sources",
        staticData.recipes[entry.key] ? "recipe" : "no recipe",
        overridePack?.materials?.[entry.key] ? "override" : "seed",
      ].filter((badge): badge is string => Boolean(badge)),
      searchText: `${entry.key} ${entry.displayName} ${entry.category}`.toLowerCase(),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildArtifactRows(
  staticData: StaticGameData,
  overridePack: OverrideDataPack | null,
  account: ImportedAccountState | null,
): CatalogRow[] {
  const setKeys = [...new Set([...Object.keys(staticData.artifactDomains), ...(account?.artifacts ?? []).map((artifact) => artifact.setId)])].sort();
  return setKeys.map((setKey) => {
    const domain = staticData.artifactDomains[setKey];
    return {
      key: setKey,
      label: domain?.setName ?? setKey,
      subtitle: domain?.hasStandardDomainSource ? domain.domainName : "No standard domain source",
      badges: [domain ? domain.availability : "needs domain", overridePack?.artifactDomains?.[setKey] ? "override" : "seed"].filter(
        (badge): badge is string => Boolean(badge),
      ),
      searchText: `${setKey} ${domain?.domainName ?? ""} ${domain?.domainKey ?? ""}`.toLowerCase(),
    };
  });
}

function buildFamilyRows<T extends { key: string }>(
  records: Record<string, T>,
  mapRow: (record: T) => Omit<CatalogRow, "key">,
): CatalogRow[] {
  return Object.values(records)
    .map((record) => ({
      key: record.key,
      ...mapRow(record),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildElementGemFamilyRows(staticData: StaticGameData) {
  return buildFamilyRows(staticData.elementGemFamilies, (family) => ({
    label: family.key,
    subtitle: family.element ?? "Element gem family",
    badges: ["family", "shared"],
    searchText: `${family.key} ${family.element ?? ""} ${family.sliver} ${family.fragment} ${family.chunk} ${family.gemstone}`.toLowerCase(),
  }));
}

export function buildTalentBookFamilyRows(staticData: StaticGameData) {
  return buildFamilyRows(staticData.talentBookFamilies, (family) => ({
    label: family.key,
    subtitle: [family.domainName, family.availability, family.region].filter(Boolean).join(" | "),
    badges: ["family", family.availability ?? "UNKNOWN"],
    searchText: `${family.key} ${family.teachings} ${family.guide} ${family.philosophies} ${family.domainName ?? ""} ${family.region ?? ""}`.toLowerCase(),
  }));
}

export function buildEnemyDropFamilyRows(staticData: StaticGameData) {
  return buildFamilyRows(staticData.enemyDropFamilies, (family) => ({
    label: family.key,
    subtitle: family.notes,
    badges: ["family", "shared"],
    searchText: `${family.key} ${family.low} ${family.mid} ${family.high} ${family.top ?? ""} ${family.notes ?? ""}`.toLowerCase(),
  }));
}

export function buildWeaponAscensionFamilyRows(staticData: StaticGameData) {
  return buildFamilyRows(staticData.weaponAscensionFamilies, (family) => ({
    label: family.key,
    subtitle: [family.domainName, family.availability, family.region].filter(Boolean).join(" | "),
    badges: ["family", family.availability ?? "UNKNOWN"],
    searchText: `${family.key} ${family.tier1} ${family.tier2} ${family.tier3} ${family.tier4} ${family.domainName ?? ""}`.toLowerCase(),
  }));
}

export function buildLocalSpecialtyRows(staticData: StaticGameData) {
  return buildFamilyRows(staticData.localSpecialties, (item) => ({
    label: item.displayName,
    subtitle: [item.region, item.isPurchasable ? item.purchaseVendors.join(", ") : "Wild only"].filter(Boolean).join(" | "),
    badges: ["local specialty", item.region, item.isPurchasable ? "purchasable" : "wild only"],
    searchText: `${item.key} ${item.displayName} ${item.region} ${item.purchaseVendors.join(" ")} ${item.searchHint}`.toLowerCase(),
  }));
}

export function buildDatabaseSearchIndex(
  staticData: StaticGameData,
  overridePack: OverrideDataPack | null,
  account: ImportedAccountState | null,
): DatabaseSearchRecord[] {
  const rows: DatabaseSearchRecord[] = [];
  const coverage = buildDatabaseCoverage(staticData, account);
  for (const group of coverage.groups) {
    for (const item of group.items.slice(0, 80)) {
      rows.push({
        id: `coverage:${item.id}`,
        section: "coverage",
        entityType: "coverage_item",
        key: item.id,
        label: item.label,
        subtitle: item.subtitle,
        badges: item.badges,
        searchText: `${item.label} ${item.recordKey} ${item.subtitle ?? ""} ${item.badges.join(" ")}`.toLowerCase(),
      });
    }
  }
  for (const row of buildCharacterRows(staticData, overridePack)) {
    rows.push({ id: `character:${row.key}`, section: "profiles", entityType: "character", ...row });
    rows.push({ id: `character_profile:${row.key}`, section: "profiles", entityType: "character_profile", ...row });
  }
  for (const row of buildWeaponRows(staticData, overridePack)) {
    rows.push({ id: `weapon:${row.key}`, section: "profiles", entityType: "weapon", ...row });
    rows.push({ id: `weapon_profile:${row.key}`, section: "profiles", entityType: "weapon_profile", ...row });
  }
  for (const row of buildMaterialRows(staticData, overridePack)) {
    rows.push({ id: `material:${row.key}`, section: "sources", entityType: "material", ...row });
  }
  for (const row of buildArtifactRows(staticData, overridePack, account)) {
    rows.push({ id: `artifact:${row.key}`, section: "sources", entityType: "artifact", ...row });
  }
  for (const row of buildElementGemFamilyRows(staticData)) {
    rows.push({ id: `element_gem_family:${row.key}`, section: "families", entityType: "element_gem_family", ...row });
  }
  for (const row of buildTalentBookFamilyRows(staticData)) {
    rows.push({ id: `talent_book_family:${row.key}`, section: "families", entityType: "talent_book_family", ...row });
  }
  for (const row of buildEnemyDropFamilyRows(staticData)) {
    rows.push({ id: `enemy_drop_family:${row.key}`, section: "families", entityType: "enemy_drop_family", ...row });
  }
  for (const row of buildWeaponAscensionFamilyRows(staticData)) {
    rows.push({ id: `weapon_ascension_family:${row.key}`, section: "families", entityType: "weapon_ascension_family", ...row });
  }
  for (const row of buildLocalSpecialtyRows(staticData)) {
    rows.push({ id: `local_specialty:${row.key}`, section: "families", entityType: "local_specialty", ...row });
  }
  return rows;
}

export function filterDatabaseSearchIndex(records: DatabaseSearchRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  return records.filter((record) => record.searchText.includes(normalized)).slice(0, 20);
}

export function countFamilyUsage(staticData: StaticGameData, familyKey: string, familyType: DatabaseSearchRecord["entityType"]): number {
  if (familyType === "element_gem_family") {
    return Object.keys(staticData.characters).filter((characterKey) => {
      const state = buildCharacterProfileEditorState(
        characterKey,
        staticData.characterMaterialProfiles[characterKey],
        staticData,
      );
      return state.gemFamilyKey === familyKey;
    }).length;
  }
  if (familyType === "talent_book_family") {
    return Object.values(staticData.characterMaterialProfiles).filter(
      (profile) => (profile.talentBookSeriesKey ?? profile.talentBookFamilyKey) === familyKey,
    ).length;
  }
  if (familyType === "enemy_drop_family") {
    return (
      Object.values(staticData.characterMaterialProfiles).filter(
        (profile) => (profile.commonEnemyMaterialFamilyId ?? profile.enemyDropFamilyKey) === familyKey,
      ).length +
      Object.values(staticData.weaponMaterialProfiles).filter(
        (profile) =>
          profile.commonEnemyFamilyKey === familyKey ||
          profile.eliteEnemyDropFamilyId === familyKey ||
          profile.eliteEnemyFamilyKey === familyKey,
      ).length
    );
  }
  if (familyType === "weapon_ascension_family") {
    return Object.values(staticData.weaponMaterialProfiles).filter((profile) => profile.weaponAscensionFamilyKey === familyKey).length;
  }
  if (familyType === "local_specialty") {
    return Object.values(staticData.characterMaterialProfiles).filter((profile) => {
      if ((profile.localSpecialtyKey ?? profile.localSpecialty) === familyKey) {
        return true;
      }
      if (!profile.localSpecialtySourceKey) {
        return false;
      }
      return staticData.localSpecialtySources[profile.localSpecialtySourceKey]?.materialKey === familyKey;
    }).length;
  }
  return 0;
}

function buildCoverageItem(
  id: string,
  label: string,
  section: DatabaseSection,
  entityType: string,
  recordKey: string,
  subtitle: string,
  badges: string[],
): CoverageQueueItem {
  return { id, key: recordKey, label, section, entityType, recordKey, subtitle, badges };
}

export function buildDatabaseCoverage(staticData: StaticGameData, account: ImportedAccountState | null): DatabaseCoverageModel {
  const accountCoverage = buildAccountCoverage(account, staticData);
  const missingCharacterProfileItems = [
    ...accountCoverage.missingCharacterProfiles.map((key) =>
      buildCoverageItem(
        `missing-character-profile:${key}`,
        staticData.characters[key]?.displayName ?? key,
        "profiles",
        "characterProfiles",
        key,
        "Imported character is missing a material identity profile.",
        ["missing profile", "account import"],
      ),
    ),
    ...accountCoverage.incompleteCharacterProfiles.map((key) =>
      buildCoverageItem(
        `partial-character-profile:${key}`,
        staticData.characters[key]?.displayName ?? key,
        "profiles",
        "characterProfiles",
        key,
        "Character profile still has unresolved or incomplete material identity fields.",
        ["partial profile", ...getCharacterProfileCoverage(key, staticData).missingFields.slice(0, 2)],
      ),
    ),
  ];

  const missingWeaponProfileItems = [
    ...accountCoverage.missingWeaponProfiles.map((key) =>
      buildCoverageItem(
        `missing-weapon-profile:${key}`,
        staticData.weapons[key]?.displayName ?? key,
        "profiles",
        "weaponProfiles",
        key,
        "Imported weapon is missing a material identity profile.",
        ["missing profile", "account import"],
      ),
    ),
    ...accountCoverage.incompleteWeaponProfiles.map((key) =>
      buildCoverageItem(
        `partial-weapon-profile:${key}`,
        staticData.weapons[key]?.displayName ?? key,
        "profiles",
        "weaponProfiles",
        key,
        "Weapon profile still has unresolved or incomplete family mappings.",
        ["partial profile", ...getWeaponProfileCoverage(key, staticData).missingFields.slice(0, 2)],
      ),
    ),
  ];

  const unresolvedCharacterMaterialItems = staticData.unresolvedCharacterMaterialReferences.map((reference) =>
    buildCoverageItem(
      `unresolved-character-material:${reference.characterKey}:${reference.materialSlot}:${reference.rawName}`,
      reference.displayName,
      "profiles",
      "characterProfiles",
      reference.characterKey,
      `${reference.materialSlot}: ${reference.rawName}`,
      [reference.status, reference.materialSlot],
    ),
  );

  const manualReviewItems = Object.keys(staticData.characterMaterialProfiles)
    .filter((characterKey) => getCharacterProfileCoverage(characterKey, staticData).status === "manual_review")
    .map((characterKey) =>
      buildCoverageItem(
        `manual-review:${characterKey}`,
        staticData.characters[characterKey]?.displayName ?? characterKey,
        "profiles",
        "characterProfiles",
        characterKey,
        "Profile requires manual review before it should be treated as verified.",
        ["manual review"],
      ),
    )
    .concat(
      Object.keys(staticData.weaponMaterialProfiles)
        .filter((weaponKey) => getWeaponProfileCoverage(weaponKey, staticData).status === "partial")
        .map((weaponKey) =>
          buildCoverageItem(
            `manual-review-weapon:${weaponKey}`,
            staticData.weapons[weaponKey]?.displayName ?? weaponKey,
            "profiles",
            "weaponProfiles",
            weaponKey,
            "Weapon profile is intentionally held in review and excluded from normal planning until verified.",
            ["manual review", "weapon"],
          ),
        ),
    )
    .concat(
      Object.keys(staticData.characters)
        .filter((characterKey) => isIgnoredCharacterKey(characterKey))
        .map((characterKey) =>
          buildCoverageItem(
            `ignored-character:${characterKey}`,
            staticData.characters[characterKey]?.displayName ?? characterKey,
            "profiles",
            "characters",
            characterKey,
            "Ignored non-playable record kept for diagnostics only.",
            ["ignored", "non-playable"],
          ),
        ),
    );

  const materialsMissingSourceItems = Object.values(staticData.materials)
    .filter((material) => !(staticData.materialSources[material.key] ?? []).length)
    .slice(0, 60)
    .map((material) =>
      buildCoverageItem(
        `material-source-gap:${material.key}`,
        material.displayName,
        "sources",
        "materialSources",
        material.key,
        "Material has no planner-facing source metadata yet.",
        [material.category, "needs sources"],
      ),
    );

  const localSpecialtyMetadataItems = Object.values(staticData.localSpecialties)
    .filter((item) => !item.searchHint.trim() || (item.isPurchasable && item.purchaseVendors.length === 0))
    .map((item) =>
      buildCoverageItem(
        `local-specialty-gap:${item.key}`,
        item.displayName,
        "families",
        "localSpecialties",
        item.key,
        "Local Specialty is missing vendor or search metadata.",
        [item.region, item.isPurchasable ? "vendor gap" : "search gap"],
      ),
    );

  const importGapItems = [
    ...accountCoverage.missingMaterialSources.map((key) =>
      buildCoverageItem(
        `import-material-source-gap:${key}`,
        staticData.materials[key]?.displayName ?? key,
        "sources",
        "materialSources",
        key,
        "Imported inventory references this material but no source metadata exists yet.",
        ["account import", "needs sources"],
      ),
    ),
    ...accountCoverage.missingArtifactDomains.map((key) =>
      buildCoverageItem(
        `import-artifact-domain-gap:${key}`,
        key,
        "sources",
        "artifactDomains",
        key,
        "Imported artifact set still needs a domain mapping.",
        ["account import", "artifact domain"],
      ),
    ),
  ];

  const groups: CoverageQueueGroup[] = [
    {
      key: "character-profiles",
      title: "Character profile gaps",
      description: "Missing or partial character identity profiles should be the first cleanup target.",
      items: missingCharacterProfileItems,
    },
    {
      key: "weapon-profiles",
      title: "Weapon profile gaps",
      description: "Missing or partial weapon identity profiles block reliable weapon planning.",
      items: missingWeaponProfileItems,
    },
    {
      key: "unresolved-character-materials",
      title: "Unresolved character material references",
      description: "Source imports that still have beta, mismatched, or unresolved material names.",
      items: unresolvedCharacterMaterialItems,
    },
    {
      key: "manual-review",
      title: "Manual review",
      description: "Profiles intentionally held back from verification, such as Traveler fallback data.",
      items: manualReviewItems,
    },
    {
      key: "material-sources",
      title: "Materials missing source metadata",
      description: "Planner-facing source rows still missing from the material registry.",
      items: materialsMissingSourceItems,
    },
    {
      key: "local-specialty-metadata",
      title: "Local specialty metadata gaps",
      description: "Vendor and search-hint cleanup for direct overworld specialties.",
      items: localSpecialtyMetadataItems,
    },
    {
      key: "account-import-gaps",
      title: "Imported account gaps",
      description: "Database coverage issues discovered directly from the active GOOD import.",
      items: importGapItems,
    },
  ];

  return {
    groups,
    rows: groups.flatMap((group) =>
      group.items.map((item) => ({
        key: item.id,
        label: item.label,
        subtitle: item.subtitle,
        badges: item.badges,
        searchText: `${item.label} ${item.recordKey} ${item.subtitle ?? ""} ${item.badges.join(" ")}`.toLowerCase(),
      })),
    ),
  };
}
