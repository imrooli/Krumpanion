import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const goodRoot = path.resolve(repoRoot, "..", "GOOD_examples", "Darkends");
const outputRoot = path.resolve(repoRoot, "src", "data", "seed");

function collectJsonFiles(root) {
  const results = [];

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

function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .trim();
}

function inferMaterialCategory(key) {
  if (key === "Mora") {
    return "mora";
  }

  if (["WanderersAdvice", "AdventurersExperience", "HerosWit"].includes(key)) {
    return "character_exp";
  }

  if (/^(TeachingsOf|GuideTo|PhilosophiesOf)/.test(key)) {
    return "talent_book";
  }

  return "other";
}

function sortObjectKeys(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

if (!fs.existsSync(goodRoot)) {
  throw new Error(`GOOD examples root was not found: ${goodRoot}`);
}

const files = collectJsonFiles(goodRoot);
const characterKeys = new Set();
const weaponKeys = new Set();
const materialKeys = new Set();
const artifactSetKeys = new Set();

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const character of data.characters ?? []) {
    characterKeys.add(character.key);
  }

  for (const weapon of data.weapons ?? []) {
    weaponKeys.add(weapon.key);
  }

  for (const artifact of data.artifacts ?? []) {
    artifactSetKeys.add(artifact.setKey);
  }

  for (const materialKey of Object.keys(data.materials ?? {})) {
    materialKeys.add(materialKey);
  }
}

const generatedAt = new Date().toISOString();

const characters = {};
for (const key of [...characterKeys].sort()) {
  characters[key] = {
    key,
    displayName: humanizeKey(key),
  };
}

const weapons = {};
for (const key of [...weaponKeys].sort()) {
  weapons[key] = {
    key,
    displayName: humanizeKey(key),
  };
}

const materials = {};
for (const key of [...materialKeys].sort()) {
  materials[key] = {
    key,
    displayName: humanizeKey(key),
    category: inferMaterialCategory(key),
  };
}

const artifactSets = {};
for (const key of [...artifactSetKeys].sort()) {
  artifactSets[key] = {
    key,
    displayName: humanizeKey(key),
  };
}

fs.mkdirSync(outputRoot, { recursive: true });

fs.writeFileSync(
  path.join(outputRoot, "discoveredCharacters.json"),
  `${JSON.stringify(
    {
      version: 1,
      source: "Darkends GOOD corpus",
      generatedAt,
      characters: sortObjectKeys(characters),
    },
    null,
    2,
  )}\n`,
);

fs.writeFileSync(
  path.join(outputRoot, "discoveredWeapons.json"),
  `${JSON.stringify(
    {
      version: 1,
      source: "Darkends GOOD corpus",
      generatedAt,
      weapons: sortObjectKeys(weapons),
    },
    null,
    2,
  )}\n`,
);

fs.writeFileSync(
  path.join(outputRoot, "discoveredMaterials.json"),
  `${JSON.stringify(
    {
      version: 1,
      source: "Darkends GOOD corpus",
      generatedAt,
      materials: sortObjectKeys(materials),
    },
    null,
    2,
  )}\n`,
);

fs.writeFileSync(
  path.join(outputRoot, "discoveredArtifactSets.json"),
  `${JSON.stringify(
    {
      version: 1,
      source: "Darkends GOOD corpus",
      generatedAt,
      artifactSets: sortObjectKeys(artifactSets),
    },
    null,
    2,
  )}\n`,
);

process.stdout.write(
  `${JSON.stringify(
    {
      filesProcessed: files.length,
      counts: {
        characters: characterKeys.size,
        weapons: weaponKeys.size,
        materials: materialKeys.size,
        artifactSets: artifactSetKeys.size,
      },
    },
    null,
    2,
  )}\n`,
);
