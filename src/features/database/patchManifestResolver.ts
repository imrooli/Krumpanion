import type { StaticGameData } from "../../domain/staticData/types";

export type KnownKeyType =
  | "artifactSet"
  | "character"
  | "commonEnemyDropFamily"
  | "eliteEnemyDropFamily"
  | "elementGemFamily"
  | "localSpecialty"
  | "material"
  | "normalBossMaterial"
  | "sourceDomain"
  | "talentBookFamily"
  | "weapon"
  | "weaponAscensionFamily"
  | "weeklyBossMaterial";

export interface KnownKeyCandidate {
  key: string;
  label: string;
  type: KnownKeyType;
  subtitle?: string;
  matchReason: string;
}

export interface KnownKeyLookupIndex {
  byType: Record<KnownKeyType, KnownKeyCandidate[]>;
  exactByType: Record<KnownKeyType, Map<string, KnownKeyCandidate[]>>;
  normalizedByType: Record<KnownKeyType, Map<string, KnownKeyCandidate[]>>;
}

export interface KnownKeyResolution {
  status: "empty" | "exact" | "normalized" | "suggested" | "ambiguous" | "missing";
  candidates: KnownKeyCandidate[];
  message: string;
}

export function normalizeReferenceText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function generateKeyFromName(value: string): string {
  return value
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function pushCandidate(
  byType: KnownKeyLookupIndex["byType"],
  type: KnownKeyType,
  key: string,
  label: string,
  subtitle?: string,
  extraTerms: string[] = [],
) {
  if (!key) {
    return;
  }
  byType[type].push({
    key,
    label: label || key,
    type,
    subtitle,
    matchReason: [key, label, subtitle, ...extraTerms].filter(Boolean).join(" "),
  });
}

export function buildKnownKeyLookupIndex(staticData: StaticGameData): KnownKeyLookupIndex {
  const byType: KnownKeyLookupIndex["byType"] = {
    artifactSet: [],
    character: [],
    commonEnemyDropFamily: [],
    eliteEnemyDropFamily: [],
    elementGemFamily: [],
    localSpecialty: [],
    material: [],
    normalBossMaterial: [],
    sourceDomain: [],
    talentBookFamily: [],
    weapon: [],
    weaponAscensionFamily: [],
    weeklyBossMaterial: [],
  };

  for (const [key, record] of Object.entries(staticData.characters)) {
    pushCandidate(byType, "character", key, record.displayName ?? key, [record.element, record.weaponType, record.region].filter(Boolean).join(" "), getStringArray((record as { aliases?: unknown }).aliases));
  }
  for (const [key, record] of Object.entries(staticData.weapons)) {
    pushCandidate(byType, "weapon", key, record.displayName ?? key, [record.weaponType, record.rarity ? `${record.rarity}-star` : ""].filter(Boolean).join(" "), getStringArray((record as { aliases?: unknown }).aliases));
  }
  for (const [key, record] of Object.entries(staticData.materials)) {
    pushCandidate(byType, "material", key, record.displayName ?? key, record.category);
  }
  for (const [key, record] of Object.entries(staticData.materialRecords)) {
    pushCandidate(byType, "material", key, record.displayName ?? key, record.category);
  }
  for (const [key, family] of Object.entries(staticData.elementGemFamilies)) {
    pushCandidate(byType, "elementGemFamily", key, key, family.element, [family.sliver, family.fragment, family.chunk, family.gemstone]);
  }
  for (const [key, family] of Object.entries(staticData.talentBookFamilies)) {
    pushCandidate(byType, "talentBookFamily", key, key, [family.domainName, family.region, family.availability].filter(Boolean).join(" "), [family.teachings, family.guide, family.philosophies]);
  }
  for (const [key, family] of Object.entries(staticData.generalEnemyDropFamilies)) {
    pushCandidate(byType, "commonEnemyDropFamily", key, family.displayName ?? key, family.sourceEnemyFamily, family.materialNames);
  }
  for (const [key, family] of Object.entries(staticData.eliteEnemyDropFamilies)) {
    pushCandidate(byType, "eliteEnemyDropFamily", key, family.displayName ?? key, family.sourceEnemyFamily, family.materialNames);
  }
  for (const [key, family] of Object.entries(staticData.weaponAscensionMaterialFamilies)) {
    pushCandidate(byType, "weaponAscensionFamily", key, family.displayName ?? key, [family.source.domainName, family.source.region].filter(Boolean).join(" "), Object.values(family.tiers));
  }
  for (const [key, family] of Object.entries(staticData.weaponAscensionFamilies)) {
    pushCandidate(byType, "weaponAscensionFamily", key, key, [family.domainName, family.region, family.availability].filter(Boolean).join(" "), [family.tier1, family.tier2, family.tier3, family.tier4]);
  }
  for (const [key, specialty] of Object.entries(staticData.localSpecialties)) {
    pushCandidate(byType, "localSpecialty", key, specialty.displayName ?? key, specialty.region, [specialty.searchHint, ...specialty.purchaseVendors]);
  }
  for (const [key, material] of Object.entries(staticData.normalBossMaterials)) {
    pushCandidate(byType, "normalBossMaterial", key, material.displayName ?? key, material.bossDisplayName);
  }
  for (const [key, material] of Object.entries(staticData.weeklyBossMaterials)) {
    pushCandidate(byType, "weeklyBossMaterial", key, material.displayName ?? key, material.source.type === "weekly_boss" ? material.source.bossName ?? undefined : undefined);
  }
  for (const [key, material] of Object.entries(staticData.specialProgressionMaterials)) {
    pushCandidate(byType, "weeklyBossMaterial", key, material.displayName ?? key, material.source?.type);
  }
  for (const [key, domain] of Object.entries(staticData.domainsOfMastery)) {
    pushCandidate(byType, "sourceDomain", key, domain.name ?? key, ["Domain of Mastery", domain.region, domain.location].filter(Boolean).join(" "), domain.listedRewards);
  }
  for (const [key, domain] of Object.entries(staticData.domainsOfForgery)) {
    pushCandidate(byType, "sourceDomain", key, domain.name ?? key, ["Domain of Forgery", domain.region, domain.location].filter(Boolean).join(" "), domain.listedRewards);
  }
  for (const [key, domain] of Object.entries(staticData.trounceDomains)) {
    pushCandidate(byType, "sourceDomain", key, domain.name ?? key, ["Trounce Domain", domain.region, domain.location].filter(Boolean).join(" "), domain.weeklyTalentMaterials);
  }
  for (const [key, domain] of Object.entries(staticData.artifactDomains)) {
    pushCandidate(byType, "artifactSet", key, domain.setName ?? key, domain.hasStandardDomainSource ? domain.domainName : "No standard source", [domain.domainKey ?? "", ...(domain.pairedSetKeys ?? [])]);
  }

  for (const type of Object.keys(byType) as KnownKeyType[]) {
    const unique = new Map<string, KnownKeyCandidate>();
    for (const candidate of byType[type]) {
      if (!unique.has(candidate.key)) {
        unique.set(candidate.key, candidate);
      }
    }
    byType[type] = [...unique.values()].sort((left, right) => left.label.localeCompare(right.label));
  }

  const exactByType = {} as KnownKeyLookupIndex["exactByType"];
  const normalizedByType = {} as KnownKeyLookupIndex["normalizedByType"];
  for (const type of Object.keys(byType) as KnownKeyType[]) {
    exactByType[type] = new Map();
    normalizedByType[type] = new Map();
    for (const candidate of byType[type]) {
      exactByType[type].set(candidate.key, [...(exactByType[type].get(candidate.key) ?? []), candidate]);
      for (const field of [candidate.key, candidate.label, candidate.subtitle ?? ""]) {
        const normalized = normalizeReferenceText(field);
        if (normalized) {
          const existing = normalizedByType[type].get(normalized) ?? [];
          if (!existing.some((entry) => entry.key === candidate.key)) {
            normalizedByType[type].set(normalized, [...existing, candidate]);
          }
        }
      }
    }
  }

  return { byType, exactByType, normalizedByType };
}

export function resolveKnownKey(index: KnownKeyLookupIndex, type: KnownKeyType, value: string): KnownKeyResolution {
  const query = value.trim();
  if (!query) {
    return { status: "empty", candidates: [], message: "No key selected yet." };
  }

  const candidates = index.byType[type] ?? [];
  const exact = index.exactByType[type].get(query) ?? [];
  if (exact.length === 1) {
    return { status: "exact", candidates: exact, message: `Resolved to ${exact[0].label}.` };
  }
  if (exact.length > 1) {
    return { status: "ambiguous", candidates: exact, message: "Multiple exact records share this key." };
  }

  const normalizedQuery = normalizeReferenceText(query);
  const normalized = index.normalizedByType[type].get(normalizedQuery) ?? [];
  if (normalized.length === 1) {
    return { status: "normalized", candidates: normalized, message: `This looks like ${normalized[0].key}.` };
  }
  if (normalized.length > 1) {
    return { status: "ambiguous", candidates: normalized.slice(0, 6), message: "Several records look like this value." };
  }

  const suggested = candidates
    .filter((candidate) => normalizeReferenceText(candidate.matchReason).includes(normalizedQuery))
    .slice(0, 6);
  if (suggested.length) {
    return { status: "suggested", candidates: suggested, message: "Possible matches found." };
  }

  return { status: "missing", candidates: [], message: "No known key matches this value yet." };
}
