import { identityRecords } from "./entityIdentity";
import type { StaticGameData } from "./types";
import type { ProgressionStep } from "./upstreamTypes";

export function validateExactRequirements(data: StaticGameData): void {
  const validateSteps = (steps: Record<string, ProgressionStep>, first: number, last: number) => {
    if (Object.keys(steps).length !== last - first + 1) throw new Error("Incomplete exact progression");
    for (let level = first; level <= last; level++) {
      const step = steps[String(level)];
      if (!step || !Object.keys(step.costs).length) throw new Error(`Missing progression level ${level}`);
      for (const [key, amount] of Object.entries(step.costs)) if (!data.materials[key] || !Number.isSafeInteger(amount) || amount < 0) throw new Error(`Invalid material requirement ${key}`);
    }
  };
  for (const [key, requirements] of Object.entries(data.exactCharacterRequirements ?? {})) {
    if (!data.characters[key]) throw new Error(`Missing character ${key}`);
    validateSteps(requirements.ascension, 1, 6);
    for (const slot of ["normal", "skill", "burst"] as const) validateSteps(requirements.talents[slot], 2, 10);
  }
  for (const [key, requirements] of Object.entries(data.exactWeaponRequirements ?? {})) {
    if (!data.weapons[key]) throw new Error(`Missing weapon ${key}`);
    validateSteps(requirements.ascension, 1, 6);
  }
  for (const type of ["character", "weapon", "material", "artifactSet"] as const) {
    const ids = new Set<number>();
    for (const record of identityRecords(data, type)) {
      if (record.gameId === undefined) continue;
      if (!Number.isSafeInteger(record.gameId) || record.gameId <= 0 || ids.has(record.gameId)) throw new Error(`Conflicting ${type} game ID ${record.gameId}`);
      ids.add(record.gameId);
    }
  }
}

