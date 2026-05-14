/**
 * Deprecated maintenance-only helper.
 *
 * The canonical runtime source of truth for weapons lives in src/data/database.
 * This generated registry remains available for migration checks and legacy
 * comparison tests only.
 */
import weaponGoalProfilesData from "../../data/runtime/generated/weaponGoalProfiles.generated.json";
import type { CharacterWeaponType, MaterialStatus, WeaponCatalogEntry, WeaponMaterialProfile, WeaponRarity } from "./types";

export type WeaponGoalProfileRarity = "3-Star" | "4-Star" | "5-Star";
export type WeaponGoalProfileStatus = Extract<MaterialStatus, "verified" | "needs_manual_review">;

export interface WeaponGoalProfile {
  key: string;
  weaponName: string;
  weaponType: CharacterWeaponType;
  rarity: WeaponGoalProfileRarity;
  weaponAscensionFamilyKey: string;
  eliteEnemyFamilyKey: string;
  commonEnemyFamilyKey: string;
  goalTrackable: true;
  status: "verified";
  notes?: string[];
}

export interface ManualReviewWeaponGoalProfile {
  key: string;
  weaponName: string;
  weaponType: CharacterWeaponType;
  rarity: WeaponGoalProfileRarity;
  weaponAscensionFamilyKey: string | null;
  eliteEnemyFamilyKey: string | null;
  commonEnemyFamilyKey: string | null;
  goalTrackable: false;
  status: "needs_manual_review";
  notes?: string[];
}

interface WeaponGoalProfileSource {
  version: number;
  profiles: Record<string, WeaponGoalProfile>;
  manualReviewProfiles: Record<string, ManualReviewWeaponGoalProfile>;
}

const sourceData = weaponGoalProfilesData as WeaponGoalProfileSource;

export const WEAPON_GOAL_PROFILES = sourceData.profiles;
export const MANUAL_REVIEW_WEAPON_GOAL_PROFILES = sourceData.manualReviewProfiles;

export const VALID_WEAPON_ASCENSION_FAMILY_KEYS = [
  "Decarabian",
  "BorealWolf",
  "DandelionGladiator",
  "Guyun",
  "MistVeiledElixir",
  "Aerosiderite",
  "DistantSea",
  "Narukami",
  "Mask",
  "ForestDew",
  "OasisGarden",
  "ScorchingMight",
  "AncientChord",
  "PureSacredDewdrop",
  "PristineSea",
  "BlazingSacrificialHeart",
  "SacredLord",
  "NightWind",
  "ArtfulDevice",
  "LongNightFlint",
  "FarNorthScions",
] as const;

export const VALID_ELITE_ENEMY_FAMILY_KEYS = [
  "Mitachurl",
  "AbyssMage",
  "HumanoidRuinMachine",
  "FatuiCicinMage",
  "FatuiPyroAgent",
  "Vishap",
  "RuinSentinel",
  "MirrorMaiden",
  "Riftwolf",
  "BlackSerpents",
  "StateShiftedFungus",
  "RuinDrake",
  "PrimalConstruct",
  "ConsecratedBeast",
  "HilichurlRogue",
  "TaintedHydroPhantasm",
  "BreacherPrimus",
  "FatuiOperative",
  "XuanwenBeast",
  "PraetorianGolem",
  "AvatarOfLava",
  "WayobManifestation",
  "SecretSourceAutomatonHunterSeeker",
  "TenebrousMimesis",
  "FurnaceShellMountainWeasel",
  "FrostnightScion",
  "RadiantBeast",
  "WastelandWildHunt",
  "FisherOfHiddenDepths",
  "DomainKeeper",
] as const;

export const VALID_COMMON_ENEMY_FAMILY_KEYS = [
  "Slime",
  "Hilichurl",
  "Samachurl",
  "HilichurlShooter",
  "FatuiSkirmisher",
  "TreasureHoarder",
  "Whopperflower",
  "Nobushi",
  "Specter",
  "Fungus",
  "TheEremites",
  "FontemerAberrant",
  "ClockworkMeka",
  "NatlanSaurian",
  "SauroformTribalWarrior",
  "Oprichniki",
  "Landcruiser",
] as const;

export const ELITE_ENEMY_FAMILY_KEY_TO_ID: Record<(typeof VALID_ELITE_ENEMY_FAMILY_KEYS)[number], string> = {
  Mitachurl: "mitachurl_materials",
  AbyssMage: "abyss_mage_materials",
  HumanoidRuinMachine: "humanoid_ruin_machine_materials",
  FatuiCicinMage: "fatui_cicin_mage_materials",
  FatuiPyroAgent: "fatui_pyro_agent_materials",
  Vishap: "vishap_materials",
  RuinSentinel: "ruin_sentinel_materials",
  MirrorMaiden: "mirror_maiden_materials",
  Riftwolf: "riftwolf_materials",
  BlackSerpents: "black_serpent_materials",
  StateShiftedFungus: "state_shifted_fungus_materials",
  RuinDrake: "ruin_drake_materials",
  PrimalConstruct: "primal_construct_materials",
  ConsecratedBeast: "consecrated_beast_materials",
  HilichurlRogue: "hilichurl_rogue_materials",
  TaintedHydroPhantasm: "tainted_hydro_phantasm_materials",
  BreacherPrimus: "breacher_primus_materials",
  FatuiOperative: "fatui_operative_materials",
  XuanwenBeast: "xuanwen_beast_materials",
  PraetorianGolem: "praetorian_golem_materials",
  AvatarOfLava: "avatar_of_lava_materials",
  WayobManifestation: "wayob_manifestation_materials",
  SecretSourceAutomatonHunterSeeker: "secret_source_automaton_hunter_seeker_materials",
  TenebrousMimesis: "tenebrous_mimesis_materials",
  FurnaceShellMountainWeasel: "furnace_shell_mountain_weasel_materials",
  FrostnightScion: "frostnight_scion_materials",
  RadiantBeast: "radiant_beast_materials",
  WastelandWildHunt: "wasteland_wild_hunt_materials",
  FisherOfHiddenDepths: "fisher_of_hidden_depths_materials",
  DomainKeeper: "domain_keeper_materials",
};

export const COMMON_ENEMY_FAMILY_KEY_TO_ID: Record<(typeof VALID_COMMON_ENEMY_FAMILY_KEYS)[number], string> = {
  Slime: "slime_materials",
  Hilichurl: "hilichurl_materials",
  Samachurl: "samachurl_materials",
  HilichurlShooter: "hilichurl_shooter_materials",
  FatuiSkirmisher: "fatui_skirmisher_materials",
  TreasureHoarder: "treasure_hoarder_materials",
  Whopperflower: "whopperflower_materials",
  Nobushi: "nobushi_materials",
  Specter: "specter_materials",
  Fungus: "fungus_materials",
  TheEremites: "eremite_materials",
  FontemerAberrant: "fontemer_aberrant_materials",
  ClockworkMeka: "clockwork_meka_materials",
  NatlanSaurian: "natlan_saurian_materials",
  SauroformTribalWarrior: "sauroform_tribal_warrior_materials",
  Oprichniki: "fatui_oprichniki_materials",
  Landcruiser: "landcruiser_materials",
};

function rarityLabelToNumber(rarity: WeaponGoalProfileRarity): Extract<WeaponRarity, 3 | 4 | 5> {
  switch (rarity) {
    case "3-Star":
      return 3;
    case "4-Star":
      return 4;
    case "5-Star":
      return 5;
  }
}

function toCatalogEntry(profile: WeaponGoalProfile | ManualReviewWeaponGoalProfile): WeaponCatalogEntry {
  return {
    key: profile.key,
    displayName: profile.weaponName,
    weaponType: profile.weaponType,
    rarity: rarityLabelToNumber(profile.rarity),
  };
}

export function buildWeaponGoalProfileCatalogEntries(): Record<string, WeaponCatalogEntry> {
  return Object.fromEntries(
    [...Object.values(WEAPON_GOAL_PROFILES), ...Object.values(MANUAL_REVIEW_WEAPON_GOAL_PROFILES)].map((profile) => [
      profile.key,
      toCatalogEntry(profile),
    ]),
  );
}

export function buildWeaponGoalProfileMaterialProfiles(): Record<string, WeaponMaterialProfile> {
  return Object.fromEntries(
    Object.values(WEAPON_GOAL_PROFILES).map((profile) => [
      profile.key,
      {
        weaponKey: profile.key,
        rarity: rarityLabelToNumber(profile.rarity),
        weaponType: profile.weaponType,
        weaponAscensionFamilyKey: profile.weaponAscensionFamilyKey,
        eliteEnemyDropFamilyId:
          ELITE_ENEMY_FAMILY_KEY_TO_ID[
            profile.eliteEnemyFamilyKey as keyof typeof ELITE_ENEMY_FAMILY_KEY_TO_ID
          ],
        eliteEnemyFamilyKey:
          ELITE_ENEMY_FAMILY_KEY_TO_ID[
            profile.eliteEnemyFamilyKey as keyof typeof ELITE_ENEMY_FAMILY_KEY_TO_ID
          ],
        commonEnemyFamilyKey:
          COMMON_ENEMY_FAMILY_KEY_TO_ID[
            profile.commonEnemyFamilyKey as keyof typeof COMMON_ENEMY_FAMILY_KEY_TO_ID
          ],
        goalTrackable: true,
        status: "verified",
        notes: profile.notes,
      } satisfies WeaponMaterialProfile,
    ]),
  );
}

export function listWeaponGoalProfileValidationIssues(): string[] {
  const issues: string[] = [];

  for (const profile of Object.values(WEAPON_GOAL_PROFILES)) {
    if (!VALID_WEAPON_ASCENSION_FAMILY_KEYS.includes(profile.weaponAscensionFamilyKey as (typeof VALID_WEAPON_ASCENSION_FAMILY_KEYS)[number])) {
      issues.push(`${profile.key}: unknown weapon ascension family ${profile.weaponAscensionFamilyKey}`);
    }
    if (!VALID_ELITE_ENEMY_FAMILY_KEYS.includes(profile.eliteEnemyFamilyKey as (typeof VALID_ELITE_ENEMY_FAMILY_KEYS)[number])) {
      issues.push(`${profile.key}: unknown elite enemy family ${profile.eliteEnemyFamilyKey}`);
    }
    if (!VALID_COMMON_ENEMY_FAMILY_KEYS.includes(profile.commonEnemyFamilyKey as (typeof VALID_COMMON_ENEMY_FAMILY_KEYS)[number])) {
      issues.push(`${profile.key}: unknown common enemy family ${profile.commonEnemyFamilyKey}`);
    }
  }

  return issues;
}
