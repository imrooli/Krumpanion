import { readFile, writeFile } from "node:fs/promises";
import { decodeAnimeBundle } from "../../src/adapters/gameDataTransport";
import { parseAnimeGameData2 } from "../../src/adapters/animeGameData2";
import { canonicalDatabase } from "../../src/data/database";
import { loadStaticData } from "../../src/domain/staticData/loadStaticData";
import { createIdentityResolver } from "../../src/domain/staticData/entityIdentity";
import { resolveCharacterProgression } from "../../src/domain/progression/resolveCharacterProgression";
import { cumulativeRequirements } from "../../src/domain/progression/exactRequirements";
import { repairCanonicalDatabase } from "../../src/domain/staticData/repairCanonicalDatabase";

const path = process.argv[2];
if (!path) throw new Error("Usage: npx tsx tools/data/audit-phase4.ts <bundle.json> [--write]");
const dataset = await decodeAnimeBundle(JSON.parse(await readFile(path, "utf8")));
const upstream = parseAnimeGameData2(dataset, new Date("2026-09-30T12:00:00Z"));
const observation = upstream.observations.find(row => row.entityType === "character" && row.gameId === 10000131);
if (!observation?.characterRequirements) throw new Error("Nicole not accepted by the pinned parser");
const data = loadStaticData();
const resolver = createIdentityResolver(Object.values(data.materials));
const narrowResolver = createIdentityResolver(Object.values(canonicalDatabase.materials.materials).map(row => ({ ...row, key: row.materialKey })));
const steps = { ascension: observation.characterRequirements.ascension, ...observation.characterRequirements.talents };
const ids = new Set(Object.values(steps).flatMap(section => Object.values(section).flatMap(step => Object.keys(step.costs))));
const materials = upstream.observations.filter(row => row.entityType === "material" && ids.has(String(row.gameId)));
const identities = materials.map(row => ({ gameId: row.gameId, displayName: row.displayName, key: resolver(row.displayName, row.gameId).key, primaryCatalogKey: narrowResolver(row.displayName, row.gameId).key ?? null }));
const keys = new Map(identities.map(row => [String(row.gameId), row.key]));
const existing = resolveCharacterProgression("Nicole", data, false).progression!;
const comparison = Object.entries(steps).map(([section, entries]) => {
  const mapped = Object.fromEntries(Object.entries(entries).map(([level, step]) => [level, { ...step, costs: Object.fromEntries(Object.entries(step.costs).map(([id, count]) => {
    const key = keys.get(id); if (!key) throw new Error(`Unmapped material ${id}`); return [key, count];
  })) }]));
  const before = section === "ascension" ? existing.ascensionTotals : existing.talentTotals;
  const after = cumulativeRequirements(mapped, section === "ascension" ? 0 : 1);
  const differences = Object.keys(after).flatMap(level => [...new Set([...Object.keys(before[level] ?? {}), ...Object.keys(after[level])])].filter(key => (before[level]?.[key] ?? 0) !== (after[level][key] ?? 0)).map(key => ({ level, key, before: before[level]?.[key] ?? 0, upstream: after[level][key] ?? 0 })));
  return { section, bundledCumulative: before, upstreamSteps: entries, mappedCumulative: after, differences,
    prerequisites: section === "ascension" ? undefined : Object.entries(entries).map(([level, step]) => ({ level, bundled: data.universalTalentProgressionCore.totalsPerTalent[level].requiredAscension, upstream: step.requiredAscension })) };
});
// Dataset payloads stay transient; the report stores only selected join evidence.
const table = (name: string): Array<Record<string, unknown>> => dataset.files[`ExcelBinOutput/${name}.json`] as Array<Record<string, unknown>>;
const weapons = [11419, 11420, 11421].map(id => {
  const row = table("WeaponExcelConfigData").find(row => row.id === id)!;
  const promotions = table("WeaponPromoteExcelConfigData").filter(p => p.weaponPromoteId === row.weaponPromoteId);
  return { gameId: id, canonicalKey: `PrizedIsshinBlade_i_n${id}`, displayName: "Prized Isshin Blade", rarity: row.rankLevel, weaponType: row.weaponType, icon: row.icon, skillAffix: row.skillAffix, promoteId: row.weaponPromoteId,
    codexMember: table("WeaponCodexExcelConfigData").some(row => row.weaponId === id),
    progression: promotions.map(p => ({ phase: p.promoteLevel ?? 0, costs: p.costItems, mora: p.coinCost ?? 0 })),
    conclusion: "Separate upstream identity. No codex membership; incomplete cost IDs. Permanent ownability/acquisition and refinement semantics unproven. Keep planner/refinement disabled; preserve ambiguous GOOD names." };
});
const health = JSON.parse(await readFile("codex/reports/static_data_health.json", "utf8"));
const leyLines = health.issues.filter((row: { category: string; severity: string }) => row.category === "ley_line_outcrop" && row.severity === "warning");
const categories = ["Fungus", "Electro Cicin", "Hydro Cicin", "Flying Serpent", "Eye of the Storm"].map(category => ({ category,
  classification: category === "Fungus" ? "Unsupported multi-family mapping; source does not encode enemy-state conditions" : "No progression material join in the bundled source; absence of drops is not proven",
  findings: leyLines.filter((row: { message: string }) => category === "Fungus" ? /Fungus|shroom/.test(row.message) : row.message.includes(category)).map((row: { id: string; message: string }) => ({ id: row.id, evidence: row.message })) }));
const report = { revision: dataset.revision, checkedAt: "2026-09-30T12:00:00Z", nicole: { gameId: observation.gameId, codex: table("AvatarCodexExcelConfigData").find(row => row.avatarId === observation.gameId), profile: canonicalDatabase.characters.characterProfiles.Nicole, identities, comparison,
  cause: "Repair lookup omitted the canonical weeklyBossMaterials registry containing CounterfeitResin (113087); numerical progression agrees." }, weapons, leyLines: categories, repairPreview: repairCanonicalDatabase(canonicalDatabase, upstream).findings };
if (process.argv.includes("--write")) {
  await writeFile("codex/reports/phase4_database_audit.json", `${JSON.stringify(report, null, 2)}\n`);
  await writeFile("src/test/fixtures/nicoleUpstream.json", `${JSON.stringify({ ...upstream, observations: [observation, ...materials], farming: [], diagnostics: [] }, null, 2)}\n`);
}
console.log(JSON.stringify({ revision: dataset.revision, differences: comparison.flatMap(row => row.differences), primaryCatalogOmissions: identities.filter(row => !row.primaryCatalogKey), leyLines: categories.map(row => ({ category: row.category, count: row.findings.length })), repairPreview: report.repairPreview }, null, 2));
