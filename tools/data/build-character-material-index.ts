/**
 * Maintenance-only generator for legacy runtime bundles.
 *
 * The app runtime must not load these generated files as source truth. Review
 * any useful output from this script and migrate it into src/data/database
 * before relying on it in normal application behavior.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import baseCharacters from "../../src/data/runtime/characters.json";
import discoveredCharacters from "../../src/data/runtime/discoveredCharacters.json";
import baseMaterials from "../../src/data/runtime/materials.json";
import discoveredMaterials from "../../src/data/runtime/discoveredMaterials.json";
import baseWeapons from "../../src/data/runtime/weapons.json";
import discoveredWeapons from "../../src/data/runtime/discoveredWeapons.json";
import progressionCoreMaterials from "../../src/data/runtime/progressionCore/universalMaterials.json";
import baseElementGemFamilies from "../../src/data/runtime/progressionCore/elementGemFamilies.json";
import baseTalentBookFamilies from "../../src/data/runtime/progressionCore/talentBookFamilies.json";
import { buildNormalBossMaterialRegistry } from "../../src/domain/staticData/normalBossMaterialRegistry";
import { buildWeeklyBossMaterialRegistry } from "../../src/domain/staticData/weeklyBossMaterialRegistry";
import { buildSpecialProgressionMaterialRegistry } from "../../src/domain/staticData/specialProgressionMaterialRegistry";
import { buildCharacterMaterialImportBundle } from "../../src/domain/staticData/characterMaterialImport";
import { buildGeneralEnemyDropRegistry } from "../../src/domain/staticData/generalEnemyDropRegistry";
import { buildLocalSpecialtyRegistry } from "../../src/domain/staticData/localSpecialtyRegistry";
import type {
  CharacterCatalogEntry,
  ElementGemFamily,
  MaterialDescriptor,
  TalentBookFamily,
  WeaponCatalogEntry,
} from "../../src/domain/staticData/types";

function mapByKey<T extends { key: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.key, item]));
}

function getSourceVersion(rawTable: string): string {
  const lines = rawTable
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(0, 2).join(" ");
}

async function main() {
  const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const sourcePath = path.join(repoRoot, "data_sources", "character-index", "character-index-6.5-6.6.txt");
  const outputDir = path.join(repoRoot, "src", "data", "runtime", "generated");
  const rawTable = await readFile(sourcePath, "utf8");

  const baseCharactersRecord = {
    ...(discoveredCharacters.characters as Record<string, CharacterCatalogEntry>),
    ...(baseCharacters.characters as Record<string, CharacterCatalogEntry>),
  };
  const baseWeaponsRecord = {
    ...(discoveredWeapons.weapons as Record<string, WeaponCatalogEntry>),
    ...(baseWeapons.weapons as Record<string, WeaponCatalogEntry>),
  };
  const localSpecialtyRegistry = buildLocalSpecialtyRegistry();
  const generalRegistry = buildGeneralEnemyDropRegistry(baseCharactersRecord, baseWeaponsRecord);
  const normalBossMaterialRegistry = buildNormalBossMaterialRegistry();
  const weeklyBossMaterialRegistry = buildWeeklyBossMaterialRegistry();
  const specialProgressionMaterialRegistry = buildSpecialProgressionMaterialRegistry();

  const bundle = buildCharacterMaterialImportBundle({
    sourceVersion: getSourceVersion(rawTable),
    rawTable,
    characters: baseCharactersRecord,
        materials: {
      ...(discoveredMaterials.materials as Record<string, MaterialDescriptor>),
      ...mapByKey(
        (progressionCoreMaterials.materials as Array<MaterialDescriptor & { expValue?: number; weaponExpValue?: number }>).map((material) => ({
          key: material.key,
          displayName: material.displayName,
          category: material.category,
          characterExpValue: material.expValue,
          weaponExpValue: material.weaponExpValue,
        })),
      ),

      // Canonical registries required for character material profile resolution.
      // These must be available during generation, not only at runtime, otherwise
      // generated profiles incorrectly mark known boss/weekly/special materials
      // as unresolved.
      ...localSpecialtyRegistry.materials,
      ...normalBossMaterialRegistry.materials,
      ...weeklyBossMaterialRegistry.materials,
      ...specialProgressionMaterialRegistry.materials,
      ...generalRegistry.materials,

      ...(baseMaterials.materials as Record<string, MaterialDescriptor>),
    },
    elementGemFamilies: mapByKey(baseElementGemFamilies.families as ElementGemFamily[]),
    generalEnemyDropFamilies: generalRegistry.families,
    localSpecialties: localSpecialtyRegistry.localSpecialties,
    talentBookFamilies: mapByKey(baseTalentBookFamilies.families as TalentBookFamily[]),
  });

  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(outputDir, "characterMaterialProfiles.generated.json"),
      `${JSON.stringify({ sourceVersion: bundle.sourceVersion, profiles: bundle.profiles }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "generatedCharacters.generated.json"),
      `${JSON.stringify({ sourceVersion: bundle.sourceVersion, characters: bundle.characters }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "betaMaterials.generated.json"),
      `${JSON.stringify({ sourceVersion: bundle.sourceVersion, materials: bundle.materials }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, "unresolvedCharacterMaterialReferences.generated.json"),
      `${JSON.stringify({ sourceVersion: bundle.sourceVersion, unresolvedReferences: bundle.unresolvedReferences }, null, 2)}\n`,
      "utf8",
    ),
  ]);

  process.stdout.write(
    `Generated character material bundle with ${Object.keys(bundle.profiles).length} profiles and ${bundle.unresolvedReferences.length} unresolved references.\n`,
  );
}

void main();
