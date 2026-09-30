import fixture from "./animeGameData2.release.json";
import { parseAnimeGameData2 } from "../../adapters/animeGameData2";

export function newLivePatch() {
  const result = parseAnimeGameData2(structuredClone(fixture), new Date("2026-09-28T12:00:00Z"));
  const character = result.observations.find(row => row.entityType === "character")!;
  character.gameId = 90000001; character.displayName = "New Character"; character.canonicalKey = "NewCharacter";
  const weapon = result.observations.find(row => row.gameId === 11501)!;
  weapon.gameId = 90000002; weapon.displayName = "New Sword"; weapon.canonicalKey = "NewSword";
  const flower = result.observations.find(row => row.gameId === 101202)!;
  flower.gameId = 90000003; flower.displayName = "New Flower"; flower.canonicalKey = "NewFlower";
  for (const step of Object.values(character.characterRequirements!.ascension)) {
    if (step.costs["101202"]) { step.costs["90000003"] = step.costs["101202"]; delete step.costs["101202"]; }
  }
  return result;
}
