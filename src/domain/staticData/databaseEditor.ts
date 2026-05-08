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
  nextSection[recordKey] = value;

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
