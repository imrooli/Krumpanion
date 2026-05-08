export type GoalPlanningMode = "owned" | "prefarm" | "manual";

export interface CharacterGoal {
  characterKey: string;
  planningMode?: GoalPlanningMode;
  priority: number;
  targetLevel?: number;
  targetAscension?: number;
  talents?: {
    auto?: number;
    skill?: number;
    burst?: number;
  };
  currentOverride?: {
    level?: number;
    ascension?: number;
    talents?: {
      auto?: number;
      skill?: number;
      burst?: number;
    };
  };
  enabled: boolean;
  notes?: string;
}

export interface WeaponGoal {
  goalId?: string;
  accountId?: string;
  weaponKey: string;
  linkedCharacterKey?: string;
  linkedInventoryInstanceId?: string;
  useOwnedInstance?: boolean;
  linkStatus?: "linked" | "stale" | "unlinked_prefarm";
  planningMode?: GoalPlanningMode;
  priority: number;
  targetLevel?: number;
  targetAscensionPhase?: number;
  currentOverride?: {
    level?: number;
    ascension?: number;
  };
  enabled: boolean;
  notes?: string;
  // Deprecated compatibility fields for migration and older UI call sites.
  id?: string;
  ownedWeaponInstanceId?: string;
  targetAscension?: number;
  instanceHint?: string;
  location?: string;
}

export interface ArtifactGoal {
  id: string;
  characterKey?: string;
  domainKey: string;
  targetSetKeys: string[];
  priority: number;
  weeklyResinBudget?: number;
  desiredMainStats?: Partial<Record<"flower" | "plume" | "sands" | "goblet" | "circlet", string[]>>;
  desiredSubstats?: string[];
  enabled: boolean;
  notes?: string;
}

export interface PlannerSettings {
  worldLevel?: number;
  domainLevel?: "I" | "II" | "III" | "IV";
  useHighestUnlockedDomain?: boolean;
  craftAwareEstimates?: boolean;
  craftingModeForRequirementSatisfaction?: "guaranteed" | "expected_value";
  craftingModeForResinEstimate?: "guaranteed" | "expected_value";
  allowCraftingTalentExpectedValue?: boolean;
  showCraftingVarianceWarning?: boolean;
  allowDustOfAzothConversion?: boolean;
  preserveOffElementGemsByDefault?: boolean;
  showDustOfAzothOption?: boolean;
  craftingPassiveOverrides?: {
    talentMaterials?: string | null;
    weaponAscensionMaterials?: string | null;
    characterWeaponEnhancementMaterials?: string | null;
    potions?: string | null;
  };
  currentResin?: number;
  condensedResinOwned?: number;
  fragileResinOwned?: number;
  transientResinOwned?: number;
  includePrimogemRefillPlanning?: boolean;
  weeklyBossDiscountClaimsUsed?: number;
  weeklyBossDiscountClaims?: number;
  assumeCondensedResinEquivalentForDomains?: boolean;
  estimateOpenWorldEnemyDrops?: boolean;
  dailyResinBudget: number;
  includeArtifactGoals: boolean;
}

export interface KrumpanionGoalState {
  version: 3;
  profileName?: string;
  characterGoals: Record<string, CharacterGoal>;
  weaponGoals: Record<string, WeaponGoal>;
  artifactGoals: ArtifactGoal[];
}

export interface KrumpanionGoals extends KrumpanionGoalState {
  plannerSettings: PlannerSettings;
}

export interface AppSettings {
  activeTab: AppSection;
  plannerView: PlannerView;
}

export type AppSection =
  | "dashboard"
  | "planner"
  | "crafting"
  | "goals"
  | "inventory"
  | "database"
  | "settings";

export type PlannerView = "today" | "week" | "materials" | "character" | "source";

export const DEFAULT_GOAL_STATE: KrumpanionGoalState = {
  version: 3,
  characterGoals: {},
  weaponGoals: {},
  artifactGoals: [],
};

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  worldLevel: 8,
  domainLevel: "IV",
  useHighestUnlockedDomain: true,
  craftAwareEstimates: true,
  craftingModeForRequirementSatisfaction: "guaranteed",
  craftingModeForResinEstimate: "expected_value",
  allowCraftingTalentExpectedValue: true,
  showCraftingVarianceWarning: true,
  allowDustOfAzothConversion: false,
  preserveOffElementGemsByDefault: true,
  showDustOfAzothOption: true,
  craftingPassiveOverrides: {},
  currentResin: 0,
  condensedResinOwned: 0,
  fragileResinOwned: 0,
  transientResinOwned: 0,
  includePrimogemRefillPlanning: false,
  weeklyBossDiscountClaimsUsed: 0,
  assumeCondensedResinEquivalentForDomains: true,
  estimateOpenWorldEnemyDrops: false,
  dailyResinBudget: 180,
  includeArtifactGoals: true,
};

export const DEFAULT_GOALS: KrumpanionGoals = {
  ...DEFAULT_GOAL_STATE,
  plannerSettings: {
    ...DEFAULT_PLANNER_SETTINGS,
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  activeTab: "dashboard",
  plannerView: "today",
};
