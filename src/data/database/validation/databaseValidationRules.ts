export const CANONICAL_CHARACTER_STATUSES = new Set([
  "verified",
  "unresolved",
  "beta",
  "special_case",
  "ignored",
  "deprecated",
] as const);

export const CANONICAL_RELEASE_STATES = new Set([
  "live",
  "beta",
  "unreleased",
  "special_case",
  "ignored",
  "deprecated",
] as const);

export const VALID_CHARACTER_WEAPON_TYPES = new Set(["Sword", "Claymore", "Polearm", "Bow", "Catalyst"]);
export const VALID_CHARACTER_ELEMENTS = new Set(["Anemo", "Cryo", "Dendro", "Electro", "Geo", "Hydro", "Pyro"]);
export const VALID_WEAPON_RARITIES = new Set([3, 4, 5]);

export const REQUIRED_CHARACTER_FIXES: Record<
  string,
  Partial<{ normalBossMaterialKey: string; weeklyBossMaterialKey: string }>
> = {
  Albedo: { normalBossMaterialKey: "BasaltPillar" },
  Charlotte: { normalBossMaterialKey: "TourbillonDevice", weeklyBossMaterialKey: "LightlessSilkString" },
  Chiori: { weeklyBossMaterialKey: "LightlessSilkString" },
  Cyno: { normalBossMaterialKey: "ThunderclapFruitcore" },
  Dori: { normalBossMaterialKey: "ThunderclapFruitcore" },
  KujouSara: { normalBossMaterialKey: "StormBeads" },
  Navia: { weeklyBossMaterialKey: "LightlessSilkString" },
  Ningguang: { normalBossMaterialKey: "BasaltPillar" },
  Noelle: { normalBossMaterialKey: "BasaltPillar" },
  Ororon: { weeklyBossMaterialKey: "LightlessSilkString" },
  RaidenShogun: { normalBossMaterialKey: "StormBeads" },
  Shenhe: { normalBossMaterialKey: "DragonheirsFalseFin" },
  Thoma: { normalBossMaterialKey: "SmolderingPearl" },
  Wriothesley: { normalBossMaterialKey: "TourbillonDevice" },
  YaeMiko: { normalBossMaterialKey: "DragonheirsFalseFin" },
  Yoimiya: { normalBossMaterialKey: "SmolderingPearl" },
  Zhongli: { normalBossMaterialKey: "BasaltPillar" },
};

export const REQUIRED_CANONICAL_MATERIAL_KEYS = [
  "BasaltPillar",
  "ThunderclapFruitcore",
  "StormBeads",
  "DragonheirsFalseFin",
  "SmolderingPearl",
  "TourbillonDevice",
  "LightlessSilkString",
] as const;
