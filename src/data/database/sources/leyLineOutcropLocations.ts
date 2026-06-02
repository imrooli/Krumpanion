import commonEnemyDropFamilies from "../materials/commonEnemyDropFamilies.json";
import eliteEnemyDropFamilies from "../materials/eliteEnemyDropFamilies.json";
import rawLeyLineCoverage from "../../../../data_sources/krumpanion_ley_line_outcrop_material_coverage.json";
import type { CanonicalDatabase } from "../schema";

type CanonicalLeyLineOutcropLocation = CanonicalDatabase["sources"]["leyLineOutcropLocations"][string];

interface RawLeyLineEnemy {
  enemyKey: string;
  enemyName: string;
  count: number;
  dropFamilyKeys?: string[];
  dropFamilies?: string[];
  materialNames?: string[];
}

interface RawLeyLineWave {
  waveNumber: number;
  enemies: RawLeyLineEnemy[];
}

interface RawLeyLineOutcrop {
  locationKey: string;
  region: string;
  areaName: string;
  locationNumber: number;
  beginDescription?: string;
  waves: RawLeyLineWave[];
  notes?: string[];
}

function normalizeName(value: string): string {
  return value.replace(/['’]/g, "").replace(/\s+/g, "").toLowerCase();
}

function familyMaterialSignature(materialNames: string[]): string {
  return [...materialNames].map(normalizeName).sort().join("|");
}

function buildCanonicalFamilySignatureMap(): Map<string, string> {
  const signatureMap = new Map<string, string>();
  const register = (familyKey: string, materialNames: string[]) => {
    signatureMap.set(familyMaterialSignature(materialNames), familyKey);
  };

  for (const [familyKey, family] of Object.entries(commonEnemyDropFamilies)) {
    register(familyKey, family.materialNames);
  }

  for (const [familyKey, family] of Object.entries(eliteEnemyDropFamilies)) {
    register(familyKey, family.materialNames);
  }

  return signatureMap;
}

const canonicalFamilySignatures = buildCanonicalFamilySignatureMap();

function resolveCanonicalFamilyKey(materialNames: string[] | undefined): string | undefined {
  if (!materialNames || materialNames.length === 0) {
    return undefined;
  }
  return canonicalFamilySignatures.get(familyMaterialSignature(materialNames));
}

const typedRawLeyLineOutcrops = (rawLeyLineCoverage as { leyLineOutcrops: RawLeyLineOutcrop[] }).leyLineOutcrops;

export const leyLineOutcropLocations: CanonicalDatabase["sources"]["leyLineOutcropLocations"] = Object.fromEntries(
  typedRawLeyLineOutcrops.map((location) => {
    const notes = [
      ...(location.beginDescription ? [location.beginDescription] : []),
      ...(location.notes ?? []),
    ];

    const canonicalLocation: CanonicalLeyLineOutcropLocation = {
      locationKey: location.locationKey,
      region: location.region,
      areaName: location.areaName,
      locationNumber: location.locationNumber,
      waves: location.waves.map((wave) => wave.waveNumber),
      notes: notes.length > 0 ? notes : undefined,
      spawns: location.waves.flatMap((wave) =>
        wave.enemies.map((enemy) => ({
          enemyName: enemy.enemyName,
          count: enemy.count,
          dropFamilyKey: resolveCanonicalFamilyKey(enemy.materialNames),
          notes:
            resolveCanonicalFamilyKey(enemy.materialNames) == null && enemy.materialNames?.length
              ? [`Unresolved family mapping for materials: ${enemy.materialNames.join(", ")}`]
              : undefined,
        })),
      ),
    };

    return [canonicalLocation.locationKey, canonicalLocation];
  }),
);
