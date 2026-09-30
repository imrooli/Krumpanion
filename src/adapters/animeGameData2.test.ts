import { describe, expect, it } from "vitest";
import fixture from "../test/fixtures/animeGameData2.release.json";
import { parseAnimeGameData2, type AnimeDataset } from "./animeGameData2";

const now = new Date("2026-09-28T12:00:00Z");
function dataset() { return structuredClone(fixture) as AnimeDataset; }
function rows(data: AnimeDataset, name: string) { return data.files[`ExcelBinOutput/${name}ExcelConfigData.json`] as Array<Record<string, unknown>>; }
describe("AnimeGameData2 release extraction", () => {
  it("extracts localized identity, ascension and distinct combat talent relationships", () => {
    const result = parseAnimeGameData2(dataset(), now);
    const ayaka = result.observations.find(row => row.gameId === 10000002)!;
    expect(ayaka).toMatchObject({ displayName: "Kamisato Ayaka", rarity: 5, weaponType: "Sword", element: "Cryo" });
    expect(ayaka.characterRequirements?.ascension["1"].costs).toEqual({ "104161": 1, "101202": 3, "112044": 3, "202": 20000 });
    expect(ayaka.characterRequirements?.talents.normal["2"]).toEqual({ costs: { "104323": 3, "112044": 6, "202": 12500 }, requiredAscension: 2 });
    expect(ayaka.characterRequirements?.provenance.relationshipIds).toEqual([2, 201, 231, 232, 239]);
    expect(result.observations.find(row => row.gameId === 11501)).toMatchObject({ displayName: "Aquila Favonia", rarity: 5, weaponType: "Sword", weaponRequirements: { ascension: { "1": { costs: { "114001": 5, "112014": 5, "112011": 3, "202": 10000 } } } } });
    expect(result.observations.find(row => row.gameId === 101202)).toMatchObject({ displayName: "Sakura Bloom", entityType: "material" });
    expect(result.observations.find(row => row.entityType === "artifactSet")).toMatchObject({ displayName: "Resolution of Sojourner", gameId: 10001 });
    expect(result.diagnostics).toEqual([]);
  });
  it.each(["AVATAR_SYNC_TEST", "AVATAR_ABANDON"])("never activates %s avatars", useType => {
    const data = dataset(); const clone = { ...rows(data, "Avatar")[0], id: 10000999, useType };
    rows(data, "Avatar").push(clone); rows(data, "AvatarCodex").push({ avatarId: 10000999, beginTime: "2020-01-01 00:00:00" });
    const result = parseAnimeGameData2(data, now);
    expect(result.observations.some(row => row.gameId === 10000999)).toBe(false);
    expect(result.diagnostics.some(row => row.gameId === 10000999)).toBe(true);
  });
  it("quarantines future, uncodexed and multi-depot avatars", () => {
    const data = dataset();
    for (const id of [90001, 90002, 90003]) rows(data, "Avatar").push({ ...rows(data, "Avatar")[0], id, ...(id === 90003 ? { candSkillDepotIds: [201, 202] } : {}) });
    rows(data, "AvatarCodex").push({ avatarId: 90001, beginTime: "2099-01-01 00:00:00" }, { avatarId: 90003, beginTime: "2020-01-01 00:00:00" });
    const result = parseAnimeGameData2(data, now);
    expect(result.observations.filter(row => row.entityType === "character")).toHaveLength(1);
    expect(result.diagnostics.filter(row => [90001, 90002, 90003].includes(row.gameId ?? 0))).toHaveLength(3);
  });
  it("filters unused weapons and does not use GOOD instance IDs", () => {
    const data = dataset(); rows(data, "WeaponCodex").find(row => row.weaponId === 11501)!.isDisuse = true;
    const result = parseAnimeGameData2(data, now);
    expect(result.observations.some(row => row.gameId === 11501)).toBe(false);
    expect(result.observations.find(row => row.gameId === 11101)?.weaponRequirements).toBeUndefined();
  });
  it("rejects missing required tables and incompatible cost fields", () => {
    const missing = dataset(); delete missing.files["ExcelBinOutput/MaterialExcelConfigData.json"];
    expect(() => parseAnimeGameData2(missing, now)).toThrow();
    const bad = dataset(); rows(bad, "AvatarPromote").find(row => row.promoteLevel === 1)!.costItems = [{ id: 999999, count: 1 }];
    expect(() => parseAnimeGameData2(bad, now)).toThrow(/No supported live/);
  });
  it("keeps talent tracks distinct and ignores passives and constellation levels", () => {
    const data = dataset(); const skill = rows(data, "ProudSkill").find(row => row.proudSkillGroupId === 232 && row.level === 2)!;
    skill.coinCost = 12345;
    rows(data, "ProudSkill").push({ proudSkillGroupId: 999, level: 2, costItems: [{ id: 99999, count: 999 }] });
    const character = parseAnimeGameData2(data, now).observations.find(row => row.entityType === "character")!;
    expect(character.characterRequirements?.talents.skill["2"].costs["202"]).toBe(12345);
    expect(character.characterRequirements?.talents.normal["2"].costs["202"]).toBe(12500);
    expect(character.characterRequirements?.talents.normal["11"]).toBeUndefined();
  });
  it("fails safely when localization is absent rather than showing hashes", () => {
    const data = dataset(); const map = data.files["TextMap/TextMap_MediumEN.json"] as Record<string, string>; delete map["1006042610"];
    expect(() => parseAnimeGameData2(data, now)).toThrow(/No supported live/);
  });
});
