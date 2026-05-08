import { resolveExistingMaterialKey, resolveInventoryMaterialKey } from "./materialKeyMapping";
import type {
  CharacterCatalogEntry,
  CharacterMaterialImportRow,
  CharacterMaterialProfile,
  CharacterMaterialStatus,
  ElementGemFamily,
  GeneralEnemyDropFamily,
  GeneratedCharacterMaterialBundle,
  LocalSpecialtyMaterial,
  MaterialCategory,
  MaterialDescriptor,
  TalentBookFamily,
  UnresolvedCharacterMaterialReference,
} from "./types";

export interface CharacterMaterialImportContext {
  sourceVersion: string;
  rawTable: string;
  characters: Record<string, CharacterCatalogEntry>;
  materials: Record<string, MaterialDescriptor>;
  elementGemFamilies: Record<string, ElementGemFamily>;
  generalEnemyDropFamilies: Record<string, GeneralEnemyDropFamily>;
  localSpecialties: Record<string, LocalSpecialtyMaterial>;
  talentBookFamilies: Record<string, TalentBookFamily>;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function toCharacterMaterialImportKey(displayName: string): string {
  return displayName
    .replace(/^"|"$/g, "")
    .replace(/\?/g, "")
    .replace(/['’"`:.,!?()[\]\-–—]/g, " ")
    .replace(/&/g, " And ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function buildMaterialLookupMaps(materials: Record<string, MaterialDescriptor>) {
  return materials;
}

function resolveMaterialKey(name: string, materialMaps: ReturnType<typeof buildMaterialLookupMaps>): string | undefined {
  const normalizedName = normalizeWhitespace(name);
  if (!normalizedName || normalizedName === "???") {
    return undefined;
  }

  return resolveExistingMaterialKey(normalizedName, materialMaps);
}

function buildCharacterLookup(characters: Record<string, CharacterCatalogEntry>) {
  const byDisplayName = new Map<string, string>();
  for (const character of Object.values(characters)) {
    byDisplayName.set(normalizeWhitespace(character.displayName).toLowerCase(), character.key);
    byDisplayName.set(character.key.toLowerCase(), character.key);
  }
  return byDisplayName;
}

function isCharacterStart(lines: string[], index: number): boolean {
  const current = normalizeWhitespace(lines[index] ?? "");
  const next = normalizeWhitespace(lines[index + 1] ?? "");
  if (!current || !next) {
    return false;
  }
  return next.toLowerCase().startsWith(`${current.toLowerCase()} `);
}

function extractGemRepresentative(detailLine: string, displayName: string): string {
  const normalized = normalizeWhitespace(detailLine);
  if (normalized.toLowerCase().startsWith(`${displayName.toLowerCase()} `)) {
    return normalized.slice(displayName.length).trim();
  }
  return normalized;
}

export function parseCharacterMaterialSourceTable(rawTable: string): CharacterMaterialImportRow[] {
  const lines = rawTable
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const start = lines.findIndex((line) => line === "Characters");
  if (start < 0) {
    return [];
  }

  const rows: CharacterMaterialImportRow[] = [];
  let index = start + 1;
  while (index < lines.length) {
    const displayName = normalizeWhitespace(lines[index]);
    const detailLine = lines[index + 1];
    if (!displayName || !detailLine) {
      break;
    }

    const gemRepresentativeName = extractGemRepresentative(detailLine, displayName);
    index += 2;

    const trailingCells: string[] = [];
    while (index < lines.length && !isCharacterStart(lines, index)) {
      trailingCells.push(normalizeWhitespace(lines[index]));
      index += 1;
    }

    rows.push({
      displayName,
      gemRepresentativeName,
      trailingCells,
    });
  }

  return rows;
}

function buildGemRepresentativeMap(elementGemFamilies: Record<string, ElementGemFamily>) {
  const map = new Map<string, string>();
  for (const family of Object.values(elementGemFamilies)) {
    for (const key of [family.sliver, family.fragment, family.chunk, family.gemstone]) {
      map.set(key, family.key);
    }
  }
  return map;
}

function buildEnemyRepresentativeMap(generalEnemyDropFamilies: Record<string, GeneralEnemyDropFamily>) {
  const map = new Map<string, { familyId: string; displayName: string }>();
  for (const family of Object.values(generalEnemyDropFamilies)) {
    for (const key of family.materialKeys) {
      map.set(key, { familyId: family.familyId, displayName: family.displayName });
    }
  }
  return map;
}

function buildTalentRepresentativeMap(talentBookFamilies: Record<string, TalentBookFamily>) {
  const map = new Map<string, string>();
  for (const family of Object.values(talentBookFamilies)) {
    map.set(family.teachings, family.key);
    map.set(family.guide, family.key);
    map.set(family.philosophies, family.key);
  }
  return map;
}

function createIssue(
  characterKey: string,
  displayName: string,
  materialSlot: UnresolvedCharacterMaterialReference["materialSlot"],
  rawName: string,
  reason: string,
  status: CharacterMaterialStatus,
): UnresolvedCharacterMaterialReference {
  return {
    characterKey,
    displayName,
    materialSlot,
    rawName,
    generatedKey: rawName ? toCharacterMaterialImportKey(rawName) : "",
    reason,
    status,
  };
}

function upsertBetaMaterial(
  materials: Record<string, MaterialDescriptor>,
  rawName: string,
  category: MaterialCategory,
): string {
  const key = toCharacterMaterialImportKey(rawName);
  materials[key] ??= {
    key,
    displayName: rawName,
    category,
  };
  return key;
}

function deriveCharacterStatus(baseKnown: boolean, displayName: string): CharacterMaterialStatus {
  if (displayName === "Traveler") {
    return "needs_manual_review";
  }
  return baseKnown ? "verified" : "beta";
}

export function buildCharacterMaterialImportBundle(context: CharacterMaterialImportContext): GeneratedCharacterMaterialBundle {
  const parsedRows = parseCharacterMaterialSourceTable(context.rawTable);
  const characterLookup = buildCharacterLookup(context.characters);
  const materialMaps = buildMaterialLookupMaps(context.materials);
  const gemMap = buildGemRepresentativeMap(context.elementGemFamilies);
  const enemyMap = buildEnemyRepresentativeMap(context.generalEnemyDropFamilies);
  const talentMap = buildTalentRepresentativeMap(context.talentBookFamilies);
  const localSpecialtyByName = new Map(
    Object.values(context.localSpecialties).map((item) => [normalizeWhitespace(item.displayName).toLowerCase(), item]),
  );

  const profiles: Record<string, CharacterMaterialProfile> = {};
  const characters: Record<string, CharacterCatalogEntry> = {};
  const materials: Record<string, MaterialDescriptor> = {};
  const unresolvedReferences: UnresolvedCharacterMaterialReference[] = [];

  for (const row of parsedRows) {
    const generatedCharacterKey = toCharacterMaterialImportKey(row.displayName);
    const characterKey = characterLookup.get(row.displayName.toLowerCase()) ?? generatedCharacterKey;
    const baseKnown = Boolean(context.characters[characterKey]);
    const baseStatus = deriveCharacterStatus(baseKnown, row.displayName);
    const notes: string[] = [];

    const profile: CharacterMaterialProfile = {
      characterKey,
      displayName: row.displayName,
      status: baseStatus,
      sourceVersion: context.sourceVersion,
      normalBossMaterial: "",
      weeklyBossMaterial: "",
      notes,
    };

    if (row.displayName === "Traveler") {
      notes.push("Traveler row stored as a generic fallback only and requires manual review by element/region.");
    }

    const gemRepresentativeKey = resolveInventoryMaterialKey(row.gemRepresentativeName);
    profile.ascensionGemRepresentativeName = row.gemRepresentativeName;
    profile.ascensionGemRepresentativeKey = gemRepresentativeKey;
    const gemFamilyKey = gemMap.get(gemRepresentativeKey);
    if (gemFamilyKey) {
      profile.elementGemFamilyKey = gemFamilyKey;
    } else {
      unresolvedReferences.push(
        createIssue(
          characterKey,
          row.displayName,
          "ascensionGem",
          row.gemRepresentativeName,
          "Representative ascension gem did not resolve to a known gem family.",
          baseStatus === "beta" ? "beta" : "unresolved",
        ),
      );
      profile.status = baseStatus === "needs_manual_review" ? baseStatus : baseStatus === "beta" ? "beta" : "unresolved";
    }

    const classified = row.trailingCells.map((value, index) => {
      const resolvedKey = resolveMaterialKey(value, materialMaps) ?? resolveInventoryMaterialKey(value);
      const enemyFamily = enemyMap.get(resolvedKey);
      const localSpecialty = localSpecialtyByName.get(value.toLowerCase());
      const talentFamily = talentMap.get(resolvedKey);
      const isUnknown = !enemyFamily && !localSpecialty && !talentFamily;
      return {
        value,
        index,
        resolvedKey,
        enemyFamily,
        localSpecialty,
        talentFamily,
        isUnknown,
      };
    });

    const firstTalentIndex = classified.find((entry) => entry.talentFamily)?.index ?? Number.POSITIVE_INFINITY;
    const unknownSingles = classified.filter((entry) => entry.isUnknown);

    const enemyEntry = classified.find((entry) => entry.enemyFamily);
    if (enemyEntry?.enemyFamily) {
      profile.enemyDropRepresentativeName = enemyEntry.value;
      profile.enemyDropRepresentativeKey = enemyEntry.resolvedKey;
      profile.enemyDropFamilyKey = enemyEntry.enemyFamily.familyId;
    } else {
      unresolvedReferences.push(
        createIssue(
          characterKey,
          row.displayName,
          "enemyDrop",
          classified[0]?.value ?? "",
          "Representative enemy drop did not resolve to a known general enemy drop family.",
          baseStatus === "beta" ? "beta" : "unresolved",
        ),
      );
      if (profile.status === "verified") {
        profile.status = "unresolved";
      }
    }

    const localSpecialtyEntry = classified.find((entry) => entry.localSpecialty);
    if (localSpecialtyEntry?.localSpecialty) {
      profile.localSpecialtyName = localSpecialtyEntry.localSpecialty.displayName;
      profile.localSpecialty = localSpecialtyEntry.localSpecialty.key;
      profile.localSpecialtyStatus = "verified";
    } else {
      const localCandidate = classified.find((entry) => localSpecialtyByName.has(entry.value.toLowerCase()));
      if (localCandidate) {
        const specialty = localSpecialtyByName.get(localCandidate.value.toLowerCase());
        if (specialty) {
          profile.localSpecialtyName = specialty.displayName;
          profile.localSpecialty = specialty.key;
          profile.localSpecialtyStatus = "verified";
        }
      } else {
        unresolvedReferences.push(
          createIssue(
            characterKey,
            row.displayName,
            "localSpecialty",
            "",
            "Local specialty did not resolve to a known local specialty record.",
            baseStatus === "beta" ? "beta" : "unresolved",
          ),
        );
        if (profile.status === "verified") {
          profile.status = "unresolved";
        }
      }
    }

    const talentEntry = classified.find((entry) => entry.talentFamily);
    if (talentEntry?.talentFamily) {
      profile.talentBookRepresentativeName = talentEntry.value;
      profile.talentBookRepresentativeKey = talentEntry.resolvedKey;
      profile.talentBookFamilyKey = talentEntry.talentFamily;
    } else {
      unresolvedReferences.push(
        createIssue(
          characterKey,
          row.displayName,
          "talentBook",
          "",
          "Talent book representative did not resolve to a known talent book family.",
          baseStatus === "beta" ? "beta" : "unresolved",
        ),
      );
      if (profile.status === "verified") {
        profile.status = "unresolved";
      }
    }

    const normalBossEntry = unknownSingles.find((entry) => entry.index < firstTalentIndex);
    if (normalBossEntry && normalBossEntry.value !== "???") {
      const existingBossKey = resolveMaterialKey(normalBossEntry.value, materialMaps);
      const allowBeta = baseStatus === "beta";
      if (existingBossKey) {
        profile.normalBossMaterialName = normalBossEntry.value;
        profile.normalBossMaterial = existingBossKey;
        profile.normalBossMaterialStatus = "verified";
      } else if (allowBeta) {
        profile.normalBossMaterialName = normalBossEntry.value;
        profile.normalBossMaterial = upsertBetaMaterial(materials, normalBossEntry.value, "character_ascension");
        profile.normalBossMaterialStatus = "beta";
        unresolvedReferences.push(
          createIssue(
            characterKey,
            row.displayName,
            "normalBossMaterial",
            normalBossEntry.value,
            "Normal boss material was not present in the canonical material registry and was registered as beta.",
            "beta",
          ),
        );
      } else {
        unresolvedReferences.push(
          createIssue(
            characterKey,
            row.displayName,
            "normalBossMaterial",
            normalBossEntry.value,
            "Normal boss material did not match the canonical material registry.",
            "unresolved",
          ),
        );
        if (profile.status === "verified") {
          profile.status = "unresolved";
        }
      }
    } else {
      unresolvedReferences.push(
        createIssue(
          characterKey,
          row.displayName,
          "normalBossMaterial",
          "",
          "Normal boss material is missing from the source row.",
          baseStatus === "beta" ? "beta" : "unresolved",
        ),
      );
      if (profile.status === "verified") {
        profile.status = "unresolved";
      }
    }

    const weeklyEntry =
      unknownSingles.find((entry) => entry.index > firstTalentIndex) ??
      unknownSingles.filter((entry) => entry !== normalBossEntry).slice(-1)[0];
    if (weeklyEntry && weeklyEntry.value !== "???") {
      const existingWeeklyKey = resolveMaterialKey(weeklyEntry.value, materialMaps);
      const allowBeta = baseStatus === "beta";
      if (existingWeeklyKey) {
        profile.weeklyBossMaterialName = weeklyEntry.value;
        profile.weeklyBossMaterial = existingWeeklyKey;
        profile.weeklyBossMaterialStatus = "verified";
      } else if (allowBeta) {
        profile.weeklyBossMaterialName = weeklyEntry.value;
        profile.weeklyBossMaterial = upsertBetaMaterial(materials, weeklyEntry.value, "weekly_boss");
        profile.weeklyBossMaterialStatus = "beta";
        unresolvedReferences.push(
          createIssue(
            characterKey,
            row.displayName,
            "weeklyBossMaterial",
            weeklyEntry.value,
            "Weekly boss material was not present in the canonical material registry and was registered as beta.",
            "beta",
          ),
        );
      } else {
        unresolvedReferences.push(
          createIssue(
            characterKey,
            row.displayName,
            "weeklyBossMaterial",
            weeklyEntry.value,
            "Weekly boss material did not match the canonical material registry.",
            "unresolved",
          ),
        );
        if (profile.status === "verified") {
          profile.status = "unresolved";
        }
      }
    } else if (weeklyEntry?.value === "???") {
      unresolvedReferences.push(
        createIssue(
          characterKey,
          row.displayName,
          "weeklyBossMaterial",
          weeklyEntry.value,
          "Weekly boss material is a placeholder and requires manual confirmation.",
          "unresolved",
        ),
      );
      profile.weeklyBossMaterialStatus = "unresolved";
      if (profile.status === "verified") {
        profile.status = "unresolved";
      }
    } else {
      unresolvedReferences.push(
        createIssue(
          characterKey,
          row.displayName,
          "weeklyBossMaterial",
          "",
          "Weekly boss material is missing from the source row.",
          baseStatus === "beta" ? "beta" : "unresolved",
        ),
      );
      if (profile.status === "verified") {
        profile.status = "unresolved";
      }
    }

    if (!baseKnown) {
      const localSpecialty = profile.localSpecialty ? context.localSpecialties[profile.localSpecialty] : undefined;
      characters[characterKey] = {
        key: characterKey,
        displayName: row.displayName,
        element: profile.elementGemFamilyKey as CharacterCatalogEntry["element"],
        region: localSpecialty?.region ?? (profile.talentBookFamilyKey ? context.talentBookFamilies[profile.talentBookFamilyKey]?.region : undefined),
      };
    }

    if (profiles[characterKey]) {
      const existing = JSON.stringify(profiles[characterKey]);
      const next = JSON.stringify(profile);
      if (existing !== next) {
        profiles[characterKey] = {
          ...profile,
          status: "needs_manual_review",
          notes: [...new Set([...(profiles[characterKey].notes ?? []), ...(profile.notes ?? []), "Conflicting duplicate Character Index rows detected."])],
        };
        unresolvedReferences.push(
          createIssue(
            characterKey,
            row.displayName,
            "ascensionGem",
            row.gemRepresentativeName,
            "Conflicting duplicate Character Index rows detected.",
            "needs_manual_review",
          ),
        );
      }
      continue;
    }

    if (row.displayName === "Traveler") {
      profile.status = "needs_manual_review";
    }

    profiles[characterKey] = profile;
  }

  return {
    sourceVersion: context.sourceVersion,
    characters,
    materials,
    profiles,
    unresolvedReferences,
  };
}
