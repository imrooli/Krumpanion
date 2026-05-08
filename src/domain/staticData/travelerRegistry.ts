import type {
  CharacterCatalogEntry,
  CharacterMaterialProfile,
  TravelerElementKey,
  TravelerElementProfile,
  TravelerProfile,
} from "./types";

export const TRAVELER_SHARED_KEY = "Traveler" as const;
export const TRAVELER_ELEMENT_KEYS: TravelerElementKey[] = [
  "traveler_anemo",
  "traveler_geo",
  "traveler_electro",
  "traveler_dendro",
  "traveler_hydro",
  "traveler_pyro",
];

const TRAVELER_ELEMENT_SEEDS: Record<TravelerElementKey, TravelerElementProfile> = {
  traveler_anemo: {
    key: "traveler_anemo",
    displayName: "Traveler: Anemo Talents",
    element: "Anemo",
    playable: true,
    characterKind: "traveler_element",
    talentBookFamilyKey: "Freedom",
    commonEnemyDropFamilyKey: "samachurl_materials",
    weeklyBossMaterialKey: "DvalinsSigh",
    status: "complete",
  },
  traveler_geo: {
    key: "traveler_geo",
    displayName: "Traveler: Geo Talents",
    element: "Geo",
    playable: true,
    characterKind: "traveler_element",
    talentBookFamilyKey: "Gold",
    commonEnemyDropFamilyKey: "hilichurl_shooter_materials",
    weeklyBossMaterialKey: "TailOfBoreas",
    status: "complete",
    warnings: ["Traveler talent materials vary by element and should be reviewed if override data disagrees."],
  },
  traveler_electro: {
    key: "traveler_electro",
    displayName: "Traveler: Electro Talents",
    element: "Electro",
    playable: true,
    characterKind: "traveler_element",
    talentBookFamilyKey: "Transience",
    commonEnemyDropFamilyKey: "nobushi_materials",
    weeklyBossMaterialKey: "DragonLordsCrown",
    status: "complete",
  },
  traveler_dendro: {
    key: "traveler_dendro",
    displayName: "Traveler: Dendro Talents",
    element: "Dendro",
    playable: true,
    characterKind: "traveler_element",
    talentBookFamilyKey: "Admonition",
    commonEnemyDropFamilyKey: "fungus_materials",
    weeklyBossMaterialKey: "MudraOfTheMaleficGeneral",
    status: "complete",
  },
  traveler_hydro: {
    key: "traveler_hydro",
    displayName: "Traveler: Hydro Talents",
    element: "Hydro",
    playable: true,
    characterKind: "traveler_element",
    talentBookFamilyKey: "Equity",
    commonEnemyDropFamilyKey: "fontemer_aberrant_materials",
    weeklyBossMaterialKey: "WorldspanFern",
    status: "complete",
  },
  traveler_pyro: {
    key: "traveler_pyro",
    displayName: "Traveler: Pyro Talents",
    element: "Pyro",
    playable: true,
    characterKind: "traveler_element",
    talentBookFamilyKey: "Contention",
    commonEnemyDropFamilyKey: "sauroform_tribal_warrior_materials",
    weeklyBossMaterialKey: "TheCornerstoneOfStarsAndFlames",
    status: "complete",
  },
};

export const TRAVELER_PROFILE: TravelerProfile = {
  baseCharacterKey: TRAVELER_SHARED_KEY,
  displayName: "Traveler",
  sharedLevelProfileKey: TRAVELER_SHARED_KEY,
  availableElements: TRAVELER_ELEMENT_KEYS,
};

export function isTravelerSharedKey(characterKey: string): characterKey is typeof TRAVELER_SHARED_KEY {
  return characterKey === TRAVELER_SHARED_KEY;
}

export function isTravelerElementKey(characterKey: string): characterKey is TravelerElementKey {
  return TRAVELER_ELEMENT_KEYS.includes(characterKey as TravelerElementKey);
}

export function isTravelerGoalKey(characterKey: string): boolean {
  return isTravelerSharedKey(characterKey) || isTravelerElementKey(characterKey);
}

export function buildTravelerCatalogEntries(): Record<string, CharacterCatalogEntry> {
  return {
    [TRAVELER_SHARED_KEY]: {
      key: TRAVELER_SHARED_KEY,
      displayName: "Traveler",
      element: "Anemo",
      weaponType: "Sword",
      rarity: 5,
      playable: true,
      characterKind: "traveler",
      region: "Mondstadt",
    },
    ...Object.fromEntries(
      Object.values(TRAVELER_ELEMENT_SEEDS).map((profile) => [
        profile.key,
        {
          key: profile.key,
          displayName: profile.displayName,
          element: profile.element,
          weaponType: "Sword",
          rarity: 5,
          playable: true,
          characterKind: "traveler_element",
          region:
            profile.element === "Anemo"
              ? "Mondstadt"
              : profile.element === "Geo"
                ? "Liyue"
                : profile.element === "Electro"
                  ? "Inazuma"
                  : profile.element === "Dendro"
                    ? "Sumeru"
                    : profile.element === "Hydro"
                      ? "Fontaine"
                      : "Natlan",
        } satisfies CharacterCatalogEntry,
      ]),
    ),
  };
}

export function buildTravelerCharacterProfiles(): Record<string, CharacterMaterialProfile> {
  return {
    [TRAVELER_SHARED_KEY]: {
      characterKey: TRAVELER_SHARED_KEY,
      displayName: "Traveler",
      element: "Anemo",
      weaponType: "Sword",
      rarity: 5,
      gemFamilyKey: "Traveler",
      localSpecialtyKey: "WindwheelAster",
      commonEnemyMaterialFamilyId: "hilichurl_materials",
      normalBossMaterial: "",
      weeklyBossMaterial: "",
      status: "verified",
      notes: [
        "Traveler shared level and ascension are modeled separately from Traveler elemental talent goals.",
      ],
    },
    ...Object.fromEntries(
      Object.values(TRAVELER_ELEMENT_SEEDS).map((profile) => [
        profile.key,
        {
          characterKey: profile.key,
          displayName: profile.displayName,
          element: profile.element,
          weaponType: "Sword",
          rarity: 5,
          talentBookSeriesKey: profile.talentBookFamilyKey,
          commonEnemyMaterialFamilyId: profile.commonEnemyDropFamilyKey,
          weeklyBossMaterialKey: profile.weeklyBossMaterialKey,
          normalBossMaterial: "",
          weeklyBossMaterial: profile.weeklyBossMaterialKey ?? "",
          status: profile.status === "complete" ? "verified" : "needs_manual_review",
          notes: profile.warnings,
        } satisfies CharacterMaterialProfile,
      ]),
    ),
  };
}

export function buildTravelerElementProfiles(): Record<TravelerElementKey, TravelerElementProfile> {
  return structuredClone(TRAVELER_ELEMENT_SEEDS);
}

export function getTravelerGoalLabel(characterKey: string): string | null {
  if (isTravelerSharedKey(characterKey)) {
    return "Traveler — Shared Level";
  }
  if (isTravelerElementKey(characterKey)) {
    return TRAVELER_ELEMENT_SEEDS[characterKey].displayName;
  }
  return null;
}
