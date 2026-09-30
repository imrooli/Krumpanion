import { describe, expect, it } from "vitest";
import nicole from "../../test/fixtures/nicoleUpstream.json";
import { canonicalDatabase } from "../../data/database";
import { repairCanonicalDatabase } from "./repairCanonicalDatabase";
import type { GameDataProviderResult } from "./upstreamTypes";
import { loadStaticData } from "./loadStaticData";
import { plannerReadiness, groupFarmingRequirements } from "./plannerReadiness";
import { createIdentityResolver, identityRecords } from "./entityIdentity";
import { importGoodAccountFromText } from "../../adapters/goodImport";
import { discoverGoodEntities } from "./goodDiscoveries";
import { validateCanonicalDatabase } from "../../data/database/validation/validateDatabase";

describe("Phase 4 canonical closure", () => {
  it("resolves Nicole's weekly material from the canonical registry and guards each combat prerequisite", () => {
    const baseline = structuredClone(canonicalDatabase);
    Object.assign(baseline.characters.characterProfiles.Nicole, { status: "beta", releaseState: "beta", plannerEligible: false });
    expect(baseline.materials.materials.CounterfeitResin).toBeUndefined();
    const upstream = structuredClone(nicole) as GameDataProviderResult;
    const repaired = repairCanonicalDatabase(baseline, upstream);
    expect(repaired.candidate.characters.characterProfiles.Nicole).toMatchObject({ status: "verified", releaseState: "live", plannerEligible: true });
    expect(repaired.findings.filter(row => row.result === "repair").map(row => row.field)).toEqual(['status', 'releaseState', 'plannerEligible']);
    expect(repairCanonicalDatabase(repaired.candidate, upstream).findings).toEqual([]);
    upstream.observations[0].characterRequirements!.talents.burst['7'].requiredAscension = 4;
    expect(repairCanonicalDatabase(baseline, upstream).candidate.characters.characterProfiles.Nicole.status).toBe('beta');
    upstream.observations[0].characterRequirements!.talents.burst['7'].requiredAscension = 5;
    upstream.observations[0].characterRequirements!.talents.skill['7'].costs['113087'] = 2;
    expect(repairCanonicalDatabase(baseline, upstream).candidate.characters.characterProfiles.Nicole.status).toBe('beta');
  });
  it("distinguishes verified weapon IDs while preserving ambiguous GOOD instances", () => {
    const data = loadStaticData();
    const resolve = createIdentityResolver(identityRecords(data, 'weapon'));
    for (const id of [11419, 11420, 11421]) {
      const key = `PrizedIsshinBlade_i_n${id}`;
      expect(resolve('Prized Isshin Blade', id).key).toBe(key);
      expect(resolve(key).key).toBe(key);
      expect(canonicalDatabase.weapons.weaponProfiles[key]).toMatchObject({ plannerEligible: false, refinementTrackable: false });
    }
    expect(resolve('Prized Isshin Blade').conflict).toContain('Ambiguous');
    const result = importGoodAccountFromText(JSON.stringify({ format: 'GOOD', version: 3, source: 'audit', weapons: [
      { id: '11419', key: 'Prized Isshin Blade', level: 1, ascension: 0, refinement: 1 },
      { id: 'instance-two', key: 'PrizedIsshinBlade_i_n11420', level: 1, ascension: 0, refinement: 1 },
    ], characters: [], artifacts: [], materials: {} }), data);
    expect(result.errors).toEqual([]);
    expect(result.account!.unmatchedWeapons![0].weaponInstanceId).toContain('11419');
    expect(result.account!.unmatchedWeapons).toHaveLength(1);
    expect(result.account!.weapons[0].weaponKey).toBe('PrizedIsshinBlade_i_n11420');
    expect(discoverGoodEntities(result.account!, data)).toContainEqual(expect.objectContaining({ rawKey: 'Prized Isshin Blade', entityType: 'weapon' }));
    const finding = validateCanonicalDatabase().issues.find(row => row.key === 'Prized Isshin Blade');
    expect(finding?.severity).toBe('info');
    const conflict = structuredClone(canonicalDatabase);
    conflict.weapons.weaponProfiles.PrizedIsshinBlade_i_n11420.gameId = 11419;
    expect(validateCanonicalDatabase(conflict).issues.find(row => row.key === 'Prized Isshin Blade')?.severity).toBe('warning');
  });
  it("recognizes complete bundled progression and reports actual missing farming fields", () => {
    const data = loadStaticData();
    const before = plannerReadiness(data, 'KamisatoAyaka');
    expect(before.progressionComplete).toBe(true);
    expect(before.state).toBe('planner_ready');
    delete data.characters.KamisatoAyaka.region;
    expect(plannerReadiness(data, 'KamisatoAyaka').state).toBe('planner_ready');
    data.materialSources.PerpetualHeart = [];
    expect(plannerReadiness(data, 'KamisatoAyaka')).toMatchObject({ progressionComplete: true, state: 'farming_setup_required' });
    expect(plannerReadiness(data, 'KamisatoAyaka').requirements.find(r => r.materialKey === 'PerpetualHeart')?.fields).toContain('Farming source');
  });
  it("retains every consumer and missing field when grouping shared farming tiers", () => {
    const data = loadStaticData();
    expect(groupFarmingRequirements(data, [
      { materialKey: 'TeachingsOfFreedom', affectedKeys: ['A'], fields: ['Availability / domain schedule'] },
      { materialKey: 'GuideToFreedom', affectedKeys: ['B'], fields: ['Resin cost'] },
    ])).toEqual([{ materialKey: 'TeachingsOfFreedom', affectedKeys: ['A', 'B'], fields: ['Availability / domain schedule', 'Resin cost'] }]);
  });
  it("keeps all 63 unsupported ley-line spawns outside established drop-family coverage", () => {
    const data = loadStaticData();
    const unresolved = Object.values(data.leyLineOutcropLocations).flatMap(location => location.spawns.filter(spawn => !spawn.dropFamilyKey));
    expect(unresolved).toHaveLength(63);
    expect(unresolved.filter(row => /Fungus|shroom/.test(row.enemyName))).toHaveLength(54);
    for (const [name, count] of [['Electro Cicin', 3], ['Hydro Cicin', 3], ['Flying Serpent', 2], ['Eye of the Storm', 1]] as const) expect(unresolved.filter(row => row.enemyName === name)).toHaveLength(count);
    for (const location of Object.values(data.leyLineOutcropLocations)) {
      expect(location.derivedDropFamilies?.flatMap(family => [...family.guaranteedEnemySpawns, ...family.optionalNearbyEnemySpawns]).some(spawn => /Fungus|shroom/.test(spawn.enemyName))).toBe(false);
    }
  });
});
