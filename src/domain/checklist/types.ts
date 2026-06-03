export type ResetWindowChecklistKey =
  | "dailyCommissions"
  | "dailyForging"
  | "battlePassDailyClaims"
  | "battlePassWeeklyClaims"
  | "weeklyBountiesRequests"
  | "stardustExchange"
  | "artifactTransmuter"
  | "realmDepot";

export type CooldownChecklistKey = "parametricTransformer" | "crystalflyTrap" | "expeditions";

export type ChecklistTaskKey = ResetWindowChecklistKey | "weeklyBossClaims" | CooldownChecklistKey | "realmCurrency";

export type ChecklistSectionKey = "daily" | "weekly" | "monthly" | "patch_cycle" | "cooldowns" | "realm";

export interface ChecklistCompletionState {
  completedAt?: string;
}

export interface WeeklyBossClaimsChecklistState {
  usedCount: number;
  updatedAt?: string;
}

export interface ChecklistCooldownState {
  lastUsedAt?: string;
}

export interface RealmCurrencyChecklistState {
  lastClaimedAt?: string;
  realmLevel: number;
  trustRank: number;
}

export interface AccountChecklistState {
  dailyCommissions: ChecklistCompletionState;
  dailyForging: ChecklistCompletionState;
  battlePassDailyClaims: ChecklistCompletionState;
  battlePassWeeklyClaims: ChecklistCompletionState;
  weeklyBountiesRequests: ChecklistCompletionState;
  stardustExchange: ChecklistCompletionState;
  weeklyBossClaims: WeeklyBossClaimsChecklistState;
  artifactTransmuter: ChecklistCompletionState;
  realmDepot: ChecklistCompletionState;
  parametricTransformer: ChecklistCooldownState;
  crystalflyTrap: ChecklistCooldownState;
  expeditions: {
    lastClaimedAt?: string;
  };
  realmCurrency: RealmCurrencyChecklistState;
}

export type ChecklistTaskStatus = "incomplete" | "complete" | "available" | "on_cooldown" | "ready";
export type ChecklistTimeReferenceKind = "reset" | "available";

export interface ChecklistTaskView {
  key: ChecklistTaskKey;
  label: string;
  section: ChecklistSectionKey;
  status: ChecklistTaskStatus;
  statusLabel: string;
  needsAttention: boolean;
  windowLabel: string;
  timeLabel: string;
  nextResetAt?: string;
  nextAvailableAt?: string;
  resetsSoon: boolean;
  usedCount?: number;
  maxCount?: number;
  lastCompletedAt?: string;
  lastUsedAt?: string;
  readyAt?: string;
  realmLevel?: number;
  trustRank?: number;
  ratePerHour?: number;
  capacity?: number;
  timeToFullHours?: number;
  settingsSummary?: string;
}

export interface ChecklistSectionView {
  key: ChecklistSectionKey;
  label: string;
  tasks: ChecklistTaskView[];
}

export interface ChecklistSummaryView {
  needsAttentionCount: number;
  completeCount: number;
  onCooldownCount: number;
  availableCount: number;
  nextResetLabel: string;
  nextResetAt?: string;
}

export interface ChecklistAccountSummaryView {
  accountId: string;
  accountName: string;
  needsAttentionCount: number;
  completeCount: number;
  onCooldownCount: number;
  availableCount: number;
}

export interface ChecklistViewModel {
  summary: ChecklistSummaryView;
  sections: ChecklistSectionView[];
  tasks: ChecklistTaskView[];
}

function clampWeeklyBossClaimCount(value: number): number {
  return Math.max(0, Math.min(3, Math.floor(value)));
}

function clampRealmLevel(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.max(1, Math.min(10, Math.floor(value as number)));
}

function clampTrustRank(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.max(1, Math.min(10, Math.floor(value as number)));
}

export function createDefaultChecklistState(
  weeklyBossClaimsUsed = 0,
  weeklyBossClaimsUpdatedAt?: string,
): AccountChecklistState {
  return {
    dailyCommissions: {},
    dailyForging: {},
    battlePassDailyClaims: {},
    battlePassWeeklyClaims: {},
    weeklyBountiesRequests: {},
    stardustExchange: {},
    weeklyBossClaims: {
      usedCount: clampWeeklyBossClaimCount(weeklyBossClaimsUsed),
      ...(weeklyBossClaimsUpdatedAt ? { updatedAt: weeklyBossClaimsUpdatedAt } : {}),
    },
    artifactTransmuter: {},
    realmDepot: {},
    parametricTransformer: {},
    crystalflyTrap: {},
    expeditions: {},
    realmCurrency: {
      realmLevel: 10,
      trustRank: 10,
    },
  };
}

export function normalizeChecklistState(
  checklist: Partial<AccountChecklistState> | null | undefined,
  fallbackWeeklyBossClaimsUsed = 0,
  fallbackWeeklyBossClaimsUpdatedAt?: string,
): AccountChecklistState {
  const defaults = createDefaultChecklistState(fallbackWeeklyBossClaimsUsed, fallbackWeeklyBossClaimsUpdatedAt);
  return {
    dailyCommissions: {
      ...defaults.dailyCommissions,
      ...(checklist?.dailyCommissions ?? {}),
    },
    dailyForging: {
      ...defaults.dailyForging,
      ...(checklist?.dailyForging ?? {}),
    },
    battlePassDailyClaims: {
      ...defaults.battlePassDailyClaims,
      ...(checklist?.battlePassDailyClaims ?? {}),
    },
    battlePassWeeklyClaims: {
      ...defaults.battlePassWeeklyClaims,
      ...(checklist?.battlePassWeeklyClaims ?? {}),
    },
    weeklyBountiesRequests: {
      ...defaults.weeklyBountiesRequests,
      ...(checklist?.weeklyBountiesRequests ?? {}),
    },
    stardustExchange: {
      ...defaults.stardustExchange,
      ...(checklist?.stardustExchange ?? {}),
    },
    weeklyBossClaims: {
      ...defaults.weeklyBossClaims,
      ...(checklist?.weeklyBossClaims ?? {}),
      usedCount: clampWeeklyBossClaimCount(
        checklist?.weeklyBossClaims?.usedCount ?? defaults.weeklyBossClaims.usedCount,
      ),
    },
    artifactTransmuter: {
      ...defaults.artifactTransmuter,
      ...(checklist?.artifactTransmuter ?? {}),
    },
    realmDepot: {
      ...defaults.realmDepot,
      ...(checklist?.realmDepot ?? {}),
    },
    parametricTransformer: {
      ...defaults.parametricTransformer,
      ...(checklist?.parametricTransformer ?? {}),
    },
    crystalflyTrap: {
      ...defaults.crystalflyTrap,
      ...(checklist?.crystalflyTrap ?? {}),
    },
    expeditions: {
      ...defaults.expeditions,
      ...(checklist?.expeditions ?? {}),
    },
    realmCurrency: {
      ...defaults.realmCurrency,
      ...(checklist?.realmCurrency ?? {}),
      realmLevel: clampRealmLevel(checklist?.realmCurrency?.realmLevel ?? defaults.realmCurrency.realmLevel),
      trustRank: clampTrustRank(checklist?.realmCurrency?.trustRank ?? defaults.realmCurrency.trustRank),
    },
  };
}

export const RESET_WINDOW_CHECKLIST_KEYS: ResetWindowChecklistKey[] = [
  "dailyCommissions",
  "dailyForging",
  "battlePassDailyClaims",
  "battlePassWeeklyClaims",
  "weeklyBountiesRequests",
  "stardustExchange",
  "artifactTransmuter",
  "realmDepot",
];

export const COOLDOWN_CHECKLIST_KEYS: CooldownChecklistKey[] = [
  "parametricTransformer",
  "crystalflyTrap",
  "expeditions",
];
