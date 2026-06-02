import { describe, expect, it } from "vitest";
import { loadStaticData } from "../domain/staticData/loadStaticData";
import { importGoodAccountFromText } from "./goodImport";

describe("importGoodAccountFromText", () => {
  it("matches weapons against canonical-backed static data and keeps unmatched copies reported", () => {
    const staticData = loadStaticData();
    const payload = {
      format: "GOOD",
      version: 2,
      characters: [
        {
          key: "Furina",
          level: 90,
          constellation: 0,
          ascension: 6,
          talent: {
            auto: 6,
            skill: 10,
            burst: 10,
          },
        },
      ],
      weapons: [
        {
          key: "Cool Steel",
          level: 20,
          ascension: 1,
          refinement: 2,
          location: "",
          lock: false,
        },
        {
          key: "Not A Real Weapon",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
      ],
      artifacts: [],
      materials: {
        Mora: 1000,
      },
    };

    const result = importGoodAccountFromText(JSON.stringify(payload), staticData);

    expect(result.errors).toEqual([]);
    expect(result.account).not.toBeNull();
    expect(result.account?.characters[0]?.characterId).toBe("Furina");
    expect(result.account?.weapons[0]?.weaponKey).toBe("CoolSteel");
    expect(result.account?.unmatchedWeapons?.[0]?.importName).toBe("Not A Real Weapon");
    expect(result.account?.warnings.some((warning) => warning.type === "unknown_weapon" && warning.key === "Not A Real Weapon")).toBe(true);
  });

  it("keeps duplicate weapon copies as separate inventory instances with refinement and lock state", () => {
    const staticData = loadStaticData();
    const payload = {
      format: "GOOD",
      version: 3,
      characters: [],
      weapons: [
        {
          id: "fav-base",
          key: "Favonius Sword",
          level: 80,
          ascension: 5,
          refinement: 2,
          location: "Furina",
          lock: true,
        },
        {
          id: "fav-dupe",
          key: "Favonius Sword",
          level: 1,
          ascension: 0,
          refinement: 1,
          location: "",
          lock: false,
        },
      ],
      artifacts: [],
      materials: {},
    };

    const result = importGoodAccountFromText(JSON.stringify(payload), staticData);

    expect(result.errors).toEqual([]);
    expect(result.account?.weapons).toHaveLength(2);
    expect(result.account?.weapons[0]?.weaponKey).toBe("FavoniusSword");
    expect(result.account?.weapons[0]?.importSourceId).toBeTruthy();
    expect(result.account?.weapons[0]?.locked).toBe(true);
    expect(result.account?.weapons[0]?.equippedByCharacterId).toBe("Furina");
    expect(result.account?.weapons[1]?.weaponInstanceId).not.toBe(result.account?.weapons[0]?.weaponInstanceId);
  });
});
