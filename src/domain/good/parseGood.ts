import { z } from "zod";
import { createStableEntityId } from "../../utils/stableIds";
import type {
  GoodArtifact,
  GoodCharacter,
  GoodImport,
  GoodWeapon,
  ImportResult,
  ImportWarning,
  NormalizedGoodArtifact,
  NormalizedGoodInventory,
  NormalizedGoodWeapon,
} from "./types";

const goodCharacterSchema = z.object({
  key: z.string(),
  level: z.number().int().min(1).max(100),
  constellation: z.number().int().min(0).max(6),
  ascension: z.number().int().min(0).max(6),
  talent: z.object({
    auto: z.number().int().min(1).max(15),
    skill: z.number().int().min(1).max(15),
    burst: z.number().int().min(1).max(15),
  }),
});

const goodWeaponSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String).optional(),
  key: z.string(),
  level: z.number().int().min(1).max(90),
  ascension: z.number().int().min(0).max(6),
  refinement: z.number().int().min(1).max(5),
  location: z.string().optional().default(""),
  lock: z.boolean().optional().default(false),
});

const goodArtifactSchema = z.object({
  setKey: z.string(),
  slotKey: z.enum(["flower", "plume", "sands", "goblet", "circlet"]),
  level: z.number().int().min(0).max(20),
  rarity: z.number().int().min(1).max(5),
  mainStatKey: z.string(),
  location: z.string(),
  lock: z.boolean(),
  substats: z.array(
    z.object({
      key: z.string(),
      value: z.number(),
      initialValue: z.number().optional(),
    }),
  ),
  astralMark: z.boolean().optional(),
  elixerCrafted: z.boolean().optional(),
  totalRolls: z.number().optional(),
  unactivatedSubstats: z
    .array(
      z.object({
        key: z.string(),
        value: z.number(),
        initialValue: z.number().optional(),
      }),
    )
    .optional(),
});

const goodImportSchema = z.object({
  format: z.string(),
  version: z.number().int(),
  source: z.string().optional(),
  characters: z.array(goodCharacterSchema),
  artifacts: z.array(goodArtifactSchema).optional(),
  weapons: z.array(goodWeaponSchema).optional(),
  materials: z.record(z.number().nonnegative()).optional(),
});

function normalizeCharacters(
  characters: GoodCharacter[],
  warnings: ImportWarning[],
): Record<string, GoodCharacter> {
  const next: Record<string, GoodCharacter> = {};

  for (const character of characters) {
    if (next[character.key]) {
      warnings.push({
        type: "duplicate_character",
        key: character.key,
        message: `Duplicate character ${character.key} detected. The last entry was kept.`,
      });
    }

    next[character.key] = character;
  }

  return next;
}

function normalizeWeapons(
  weapons: GoodWeapon[],
  warnings: ImportWarning[],
): Record<string, NormalizedGoodWeapon> {
  const next: Record<string, NormalizedGoodWeapon> = {};
  const counts = new Map<string, number>();

  for (const weapon of weapons) {
    const location = weapon.location ?? "";
    const lock = weapon.lock ?? false;
    const rawImportId = weapon.id?.trim() || null;
    const generatedSignatureKey = `${weapon.key}:${location}:${lock}`;
    const signature = [location, lock];
    const occurrence = (counts.get(rawImportId ?? generatedSignatureKey) ?? 0) + 1;
    counts.set(rawImportId ?? generatedSignatureKey, occurrence);

    if (rawImportId && occurrence > 1) {
      warnings.push({
        type: "duplicate_weapon_id",
        key: rawImportId,
        message: `GOOD weapon id ${rawImportId} appeared multiple times. Duplicate copies were preserved with deterministic local ids.`,
      });
    }

    const id = rawImportId
      ? createStableEntityId("weapon", weapon.key, [rawImportId], occurrence)
      : createStableEntityId("weapon", weapon.key, signature, occurrence);

    if (next[id]) {
      warnings.push({
        type: "duplicate_weapon_id",
        key: id,
        message: `Generated a duplicate weapon id for ${weapon.key}. The newest entry replaced the earlier one.`,
      });
    }

    next[id] = {
      ...weapon,
      location,
      lock,
      id,
    };
  }

  return next;
}

function normalizeArtifacts(
  artifacts: GoodArtifact[],
  warnings: ImportWarning[],
): Record<string, NormalizedGoodArtifact> {
  const next: Record<string, NormalizedGoodArtifact> = {};
  const counts = new Map<string, number>();

  for (const artifact of artifacts) {
    const signature = [artifact.slotKey, artifact.location, artifact.level, artifact.mainStatKey, artifact.rarity];
    const occurrence = (counts.get(`${artifact.setKey}:${artifact.slotKey}:${artifact.location}`) ?? 0) + 1;
    counts.set(`${artifact.setKey}:${artifact.slotKey}:${artifact.location}`, occurrence);

    const id = createStableEntityId("artifact", artifact.setKey, signature, occurrence);

    if (next[id]) {
      warnings.push({
        type: "duplicate_artifact_id",
        key: id,
        message: `Generated a duplicate artifact id for ${artifact.setKey}. The newest entry replaced the earlier one.`,
      });
    }

    next[id] = { ...artifact, id };
  }

  return next;
}

function normalizeMaterials(materials: Record<string, number> | undefined): Record<string, number> {
  return { ...(materials ?? {}) };
}

export function parseGoodFromText(text: string, now = new Date()): ImportResult {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      inventory: null,
      warnings: [],
      errors: [error instanceof Error ? error.message : "The GOOD file is not valid JSON."],
    };
  }

  const result = goodImportSchema.safeParse(parsedJson);
  if (!result.success) {
    return {
      inventory: null,
      warnings: [],
      errors: result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
    };
  }

  return {
    inventory: normalizeGoodImport(result.data, now),
    warnings: [],
    errors: [],
  };
}

export function normalizeGoodImport(parsed: GoodImport, now = new Date()): NormalizedGoodInventory {
  const warnings: ImportWarning[] = [];

  return {
    importMeta: {
      format: parsed.format,
      version: parsed.version,
      source: parsed.source,
      importedAt: now.toISOString(),
    },
    charactersByKey: normalizeCharacters(parsed.characters, warnings),
    weaponsById: normalizeWeapons(parsed.weapons ?? [], warnings),
    artifactsById: normalizeArtifacts(parsed.artifacts ?? [], warnings),
    materialsByKey: normalizeMaterials(parsed.materials),
    warnings,
  };
}
