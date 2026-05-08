import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadStaticData } from "./loadStaticData";

function collectJsonFiles(root: string): string[] {
  const results: string[] = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

describe("discovered catalog coverage", () => {
  const corpusRoot = path.resolve(process.cwd(), "..", "GOOD_examples", "Darkends");
  const files = collectJsonFiles(corpusRoot);
  const staticData = loadStaticData();

  it("covers every discovered character, weapon, and material key from the Darkends corpus", () => {
    const missingCharacters = new Set<string>();
    const missingWeapons = new Set<string>();
    const missingMaterials = new Set<string>();

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
        characters?: Array<{ key: string }>;
        weapons?: Array<{ key: string }>;
        materials?: Record<string, number>;
      };

      for (const character of data.characters ?? []) {
        if (!staticData.characters[character.key]) {
          missingCharacters.add(character.key);
        }
      }

      for (const weapon of data.weapons ?? []) {
        if (!staticData.weapons[weapon.key]) {
          missingWeapons.add(weapon.key);
        }
      }

      for (const materialKey of Object.keys(data.materials ?? {})) {
        if (!staticData.materials[materialKey]) {
          missingMaterials.add(materialKey);
        }
      }
    }

    expect([...missingCharacters]).toEqual([]);
    expect([...missingWeapons]).toEqual([]);
    expect([...missingMaterials]).toEqual([]);
  });
});
