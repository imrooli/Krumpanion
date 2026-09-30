import type { OverrideDataPack } from "./types";

export type OverrideRecordSection = Exclude<keyof OverrideDataPack, "version" | "label">;

export function createEditableOverridePack(overridePack: OverrideDataPack | null): OverrideDataPack {
  return (
    overridePack ?? {
      version: 1,
      label: "Krumpanion Database Overrides",
    }
  );
}

export function setOverridePackLabel(overridePack: OverrideDataPack | null, label: string): OverrideDataPack {
  return {
    ...createEditableOverridePack(overridePack),
    label,
  };
}

export function upsertOverrideRecord<TKey extends OverrideRecordSection>(
  overridePack: OverrideDataPack | null,
  section: TKey,
  recordKey: string,
  value: unknown,
): OverrideDataPack {
  const nextPack = createEditableOverridePack(overridePack);
  const nextSection = { ...((nextPack[section] as Record<string, unknown> | undefined) ?? {}) };
  if (["characters", "weapons", "materials", "artifactSets"].includes(section) && value && typeof value === "object") {
    const previous = nextSection[recordKey] as Record<string, unknown> | undefined;
    const supplied = value as Record<string, unknown>;
    const fields = ["displayName", "rarity", "weaponType", "element"].filter(field => field in supplied && previous?.[field] !== supplied[field]);
    nextSection[recordKey] = { ...previous, ...value, manualFields: [...new Set([...(previous?.manualFields as string[] ?? []), ...fields])] };
  } else nextSection[recordKey] = value;

  return {
    ...nextPack,
    [section]: nextSection,
  };
}

export function removeOverrideRecord<TKey extends OverrideRecordSection>(
  overridePack: OverrideDataPack | null,
  section: TKey,
  recordKey: string,
): OverrideDataPack {
  const nextPack = createEditableOverridePack(overridePack);
  const currentSection = { ...((nextPack[section] as Record<string, unknown> | undefined) ?? {}) };
  delete currentSection[recordKey];

  return {
    ...nextPack,
    [section]: Object.keys(currentSection).length ? currentSection : undefined,
  };
}

export function markManualDatabaseChanges(previous: OverrideDataPack | null, next: OverrideDataPack): OverrideDataPack {
  const result = structuredClone(next);
  for (const section of ["characters", "weapons", "materials", "artifactSets"] as const) {
    for (const [key, row] of Object.entries(result[section] ?? {})) {
      const old = previous?.[section]?.[key];
      if (!old) continue;
      const fields = (["displayName", "rarity", "weaponType", "element"] as const).filter(field => {
        const a = row as unknown as Record<string, unknown>; const b = old as unknown as Record<string, unknown>;
        return field in a && a[field] !== b[field];
      });
      row.manualFields = [...new Set([...(old.manualFields ?? []), ...(row.manualFields ?? []), ...fields])];
    }
  }
  for (const section of ["exactCharacterRequirements", "exactWeaponRequirements"] as const) {
    for (const [key, row] of Object.entries(result[section] ?? {})) {
      const old = previous?.[section]?.[key];
      if (!old || JSON.stringify(old) !== JSON.stringify(row)) row.manual = true;
    }
  }
  for (const [resource, origins] of Object.entries(result.farmingOrigins ?? {})) {
    const familyKey = resource.replace(/^family:/, "");
    const family = result.talentBookFamilies?.[familyKey] ?? result.weaponAscensionFamilies?.[familyKey];
    const oldFamily = previous?.talentBookFamilies?.[familyKey] ?? previous?.weaponAscensionFamilies?.[familyKey];
    if (!family || !oldFamily) continue;
    const materialKeys = result.tieredMaterialIndex ? Object.values(result.tieredMaterialIndex).filter(row => row.familyKey === familyKey).map(row => row.materialKey) : [];
    const a = family as unknown as Record<string, unknown>, b = oldFamily as unknown as Record<string, unknown>;
    if (["teachings", "guide", "philosophies", "tier1", "tier2", "tier3", "tier4"].some(key => a[key] !== b[key])) origins.family = { source: "manual" };
    if (a.availability !== b.availability) origins.availability = { source: "manual" };
    if (a.domainKey !== b.domainKey || a.domainName !== b.domainName) origins.source = { source: "manual" };
    for (const key of materialKeys) {
      const source = result.materialSources?.[key]?.[0], old = previous?.materialSources?.[key]?.[0];
      if (!source || !old) continue;
      if (source.resinCost !== old.resinCost) origins.resinCost = { source: "manual" };
      if (source.availability !== old.availability) origins.availability = { source: "manual" };
      if (source.sourceKey !== old.sourceKey || source.sourceName !== old.sourceName || source.sourceType !== old.sourceType) origins.source = { source: "manual" };
    }
  }
  return result;
}
