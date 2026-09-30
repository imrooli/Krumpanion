import type { CanonicalDatabase } from "../../data/database/schema";
import { canonicalKeyForName, createIdentityResolver } from "./entityIdentity";
import { loadStaticData } from "./loadStaticData";
import { validateStaticData } from "./validateStaticData";
import { resolveCharacterProgression } from "../progression/resolveCharacterProgression";
import { cumulativeRequirements } from "../progression/exactRequirements";
import type { GameDataProviderResult, ProgressionStep } from "./upstreamTypes";

export interface CanonicalRepairFinding { key: string; field: string; before?: unknown; after?: unknown; result: "repair" | "review"; reason?: string }
export function repairCanonicalDatabase(input: CanonicalDatabase, upstream: GameDataProviderResult) {
  const candidate = structuredClone(input);
  const findings: CanonicalRepairFinding[] = [];
  const characters = candidate.characters.characterProfiles;
  const characterResolver = createIdentityResolver(Object.values(characters).map(row => ({ ...row, key: row.characterKey })));
  // Includes canonical weekly/special/family registries, without any user overrides.
  const baseline = loadStaticData(null, input);
  const materialResolver = createIdentityResolver(Object.values(baseline.materials));
  const materialKeys = new Map(upstream.observations.filter(row => row.entityType === "material").map(row => [String(row.gameId), materialResolver(row.displayName, row.gameId).key]));
  const repair = (key: string, field: string, before: unknown, after: unknown) => findings.push({ key, field, before, after, result: "repair" });
  const review = (key: string, field: string, before: unknown, after: unknown, reason: string) => findings.push({ key, field, before, after, result: "review", reason });
  const totals = (steps: Record<string, ProgressionStep>, first: number) => {
    const mapped: Record<string, ProgressionStep> = {};
    for (const [level, step] of Object.entries(steps)) {
      const costs: Record<string, number> = {};
      for (const [id, count] of Object.entries(step.costs)) { const key = materialKeys.get(id); if (!key) return undefined; costs[key] = count; }
      mapped[level] = { ...step, costs };
    }
    return cumulativeRequirements(mapped, first);
  };
  const equal = (left: Record<string, Record<string, number>> | undefined, right: Record<string, Record<string, number>> | undefined) => {
    if (!left || !right) return false;
    const normalize = (value: typeof left) => Object.entries(value).sort().map(([level, costs]) => [level, Object.entries(costs).filter(([, count]) => count !== 0).sort()]);
    return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
  };
  for (const observation of upstream.observations.filter(row => row.entityType === "character")) {
    const match = characterResolver(observation.displayName, observation.gameId);
    if (match.conflict) { review(observation.displayName, "identity", undefined, observation.gameId, match.conflict); continue; }
    if (!match.key) continue; // Baseline repair is not a patch importer.
    const row = characters[match.key];
    if (["ignored", "deprecated", "special_case"].includes(row.status)) continue;
    let changed = false, conflict = false;
    for (const field of ["gameId", "rarity", "weaponType", "element"] as const) {
      const incoming = observation[field]; if (incoming === undefined) continue;
      if (row[field] == null) {
        repair(match.key, field, row[field], incoming);
        Object.assign(row, { [field]: incoming }); changed = true;
      } else if (row[field] !== incoming) { conflict = true; review(match.key, field, row[field], incoming, "Curated value preserved"); }
    }
    if (["beta", "unresolved"].includes(row.status) && observation.characterRequirements) {
      const existing = resolveCharacterProgression(match.key, baseline, false).progression;
      const exact = observation.characterRequirements;
      const agrees = !conflict && equal(existing?.ascensionTotals, totals(exact.ascension, 0)) &&
        (['normal', 'skill', 'burst'] as const).every(slot => equal(existing?.talentTotalsBySkill?.[slot] ?? existing?.talentTotals, totals(exact.talents[slot], 1)) &&
          Object.entries(exact.talents[slot]).every(([level, step]) => step.requiredAscension === (existing?.talentAscensionRequirements?.[slot]?.[level] ?? baseline.universalTalentProgressionCore.totalsPerTalent[level]?.requiredAscension)));
      if (agrees) {
        for (const [field, after] of Object.entries({ status: "verified", releaseState: "live", plannerEligible: true })) { if (row[field as keyof typeof row] !== after) { repair(match.key, field, row[field as keyof typeof row], after); Object.assign(row, { [field]: after }); changed = true; } }
      } else review(match.key, "status", row.status, "verified", "Release accepted, but bundled progression does not exactly agree with all supported upstream phases/talents");
    }
    if (changed) row.provenance = observation.provenance;
  }
  const weapons = candidate.weapons.weaponProfiles;
  const weaponResolver = createIdentityResolver(Object.values(weapons).map(row => ({ ...row, key: row.weaponKey })));
  for (const observation of upstream.observations.filter(row => row.entityType === "weapon" && (row.rarity === 1 || row.rarity === 2))) {
    const match = weaponResolver(observation.displayName, observation.gameId);
    if (match.key) continue;
    const key = canonicalKeyForName(observation.displayName);
    if (!key || match.conflict || weapons[key]) { review(key, "identity", undefined, observation.gameId, match.conflict ?? "Canonical key collision"); continue; }
    weapons[key] = { weaponKey: key, displayName: observation.displayName, gameId: observation.gameId, provenance: observation.provenance, rarity: observation.rarity!, weaponType: observation.weaponType, weaponAscensionMaterialFamilyKey: "", eliteEnemyDropFamilyKey: "", commonEnemyDropFamilyKey: "", status: "verified", releaseState: "live", plannerEligible: false, refinementTrackable: false, refinementPolicy: "not_trackable", notes: ["Catalog identity only; low-rarity progression planning is unsupported."] };
    repair(key, "identity", undefined, weapons[key]);
  }
  const data = loadStaticData(null, candidate);
  const report = validateStaticData(data);
  if (report.summary.errorCount) throw new Error(`Canonical repair failed complete validation: ${report.issues.filter(row => row.severity === "error").map(row => row.message).join("; ")}`);
  return { candidate, findings, report };
}
