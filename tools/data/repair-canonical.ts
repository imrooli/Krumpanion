import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalDatabase } from "../../src/data/database";
import { decodeAnimeBundle } from "../../src/adapters/gameDataTransport";
import { parseAnimeGameData2 } from "../../src/adapters/animeGameData2";
import { repairCanonicalDatabase } from "../../src/domain/staticData/repairCanonicalDatabase";

const bundlePath = process.argv[2];
if (!bundlePath || bundlePath.startsWith("--")) throw new Error("Usage: npm run data:repair-canonical -- <bundle.json> [--apply]");
const dataset = await decodeAnimeBundle(JSON.parse(await readFile(bundlePath, "utf8")));
const result = repairCanonicalDatabase(canonicalDatabase, parseAnimeGameData2(dataset));
console.log(JSON.stringify({ revision: dataset.revision, applied: process.argv.includes("--apply"), findings: result.findings, errors: result.report.summary.errorCount }, null, 2));
if (process.argv.includes("--apply")) {
  // Both complete canonical/effective validations have passed before either source file is written.
  for (const [path, value] of [["characters/characterProfiles.json", result.candidate.characters.characterProfiles], ["weapons/weaponProfiles.json", result.candidate.weapons.weaponProfiles]] as const) {
    await writeFile(resolve("src/data/database", path), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}
