import type { DayOfWeek } from "../planner/types";
import type { KrumpanionAccount } from "../account/types";
import { getGenshinResetDay } from "../../utils/days";
import type {
  AccountChecklistState,
  ChecklistAccountSummaryView,
  ChecklistSectionKey,
  ChecklistSectionView,
  ChecklistTaskView,
  ChecklistViewModel,
  CooldownChecklistKey,
  ResetWindowChecklistKey,
} from "./types";

const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const GENSHIN_RESET_HOUR = 2;
const DAY_MS = 24 * 60 * 60 * 1000;
const SOON_WINDOW_MS = 6 * 60 * 60 * 1000;
const PARAMETRIC_TRANSFORMER_COOLDOWN_MS = ((6 * 24) + 22) * 60 * 60 * 1000;
const CRYSTALFLY_TRAP_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const EXPEDITION_COOLDOWN_MS = 20 * 60 * 60 * 1000;
const PATCH_CYCLE_DAYS = 42;
const REALM_DEFAULT_LEVEL = 10;
const REALM_DEFAULT_TRUST_RANK = 10;

export const REALM_LEVELS = [
  { level: 1, name: "Bare-Bones", adeptalEnergyNeeded: 0, realmCurrencyPerHour: 4 },
  { level: 2, name: "Humble Abode", adeptalEnergyNeeded: 2000, realmCurrencyPerHour: 8 },
  { level: 3, name: "Cozy", adeptalEnergyNeeded: 3000, realmCurrencyPerHour: 12 },
  { level: 4, name: "Queen-Size", adeptalEnergyNeeded: 4500, realmCurrencyPerHour: 16 },
  { level: 5, name: "Elegant", adeptalEnergyNeeded: 6000, realmCurrencyPerHour: 20 },
  { level: 6, name: "Exquisite", adeptalEnergyNeeded: 8000, realmCurrencyPerHour: 22 },
  { level: 7, name: "Extraordinary", adeptalEnergyNeeded: 10000, realmCurrencyPerHour: 24 },
  { level: 8, name: "Stately", adeptalEnergyNeeded: 12000, realmCurrencyPerHour: 26 },
  { level: 9, name: "Luxury", adeptalEnergyNeeded: 15000, realmCurrencyPerHour: 28 },
  { level: 10, name: "Fit for a King", adeptalEnergyNeeded: 20000, realmCurrencyPerHour: 30 },
] as const;

export const REALM_TRUST_RANKS = [
  { trustRank: 1, trustRequiredForRank: 0, trustTotal: 0, realmCurrencyCapacity: 300 },
  { trustRank: 2, trustRequiredForRank: 300, trustTotal: 300, realmCurrencyCapacity: 600 },
  { trustRank: 3, trustRequiredForRank: 600, trustTotal: 900, realmCurrencyCapacity: 900 },
  { trustRank: 4, trustRequiredForRank: 1000, trustTotal: 1900, realmCurrencyCapacity: 1200 },
  { trustRank: 5, trustRequiredForRank: 1500, trustTotal: 3400, realmCurrencyCapacity: 1400 },
  { trustRank: 6, trustRequiredForRank: 1500, trustTotal: 4900, realmCurrencyCapacity: 1600 },
  { trustRank: 7, trustRequiredForRank: 1500, trustTotal: 6400, realmCurrencyCapacity: 1800 },
  { trustRank: 8, trustRequiredForRank: 1500, trustTotal: 7900, realmCurrencyCapacity: 2000 },
  { trustRank: 9, trustRequiredForRank: 1500, trustTotal: 9400, realmCurrencyCapacity: 2200 },
  { trustRank: 10, trustRequiredForRank: 1500, trustTotal: 10900, realmCurrencyCapacity: 2400 },
] as const;

const PACIFIC_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type PacificDateTimeParts = LocalDateParts & {
  weekday: DayOfWeek;
  hour: number;
  minute: number;
  second: number;
};

type ResetWindow = {
  startAt: Date;
  endAt: Date;
  section: ChecklistSectionKey;
  label: string;
};

function parsePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function getPacificDateTimeParts(date: Date): PacificDateTimeParts {
  const parts = PACIFIC_PARTS_FORMATTER.formatToParts(date);
  return {
    year: Number.parseInt(parsePart(parts, "year"), 10),
    month: Number.parseInt(parsePart(parts, "month"), 10),
    day: Number.parseInt(parsePart(parts, "day"), 10),
    weekday: parsePart(parts, "weekday") as DayOfWeek,
    hour: Number.parseInt(parsePart(parts, "hour"), 10),
    minute: Number.parseInt(parsePart(parts, "minute"), 10),
    second: Number.parseInt(parsePart(parts, "second"), 10),
  };
}

function asComparableUtcValue(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): number {
  return Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, input.second);
}

function pacificDateTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  second?: number;
}): Date {
  const desired = {
    ...input,
    minute: input.minute ?? 0,
    second: input.second ?? 0,
  };

  let guess = asComparableUtcValue(desired);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const resolved = getPacificDateTimeParts(new Date(guess));
    const delta = asComparableUtcValue(desired) - asComparableUtcValue(resolved);
    if (delta === 0) {
      break;
    }
    guess += delta;
  }

  return new Date(guess);
}

function addLocalDays(date: LocalDateParts, days: number): LocalDateParts {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function addLocalMonths(date: LocalDateParts, months: number): LocalDateParts {
  const next = new Date(Date.UTC(date.year, date.month - 1 + months, 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: 1,
  };
}

function toLocalDayNumber(date: LocalDateParts): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / DAY_MS);
}

function buildLocalResetDate(now: Date): LocalDateParts {
  const pacific = getPacificDateTimeParts(now);
  const localDate = {
    year: pacific.year,
    month: pacific.month,
    day: pacific.day,
  };
  return pacific.hour < GENSHIN_RESET_HOUR ? addLocalDays(localDate, -1) : localDate;
}

function formatDuration(ms: number): string {
  const remainingMinutes = Math.max(0, Math.ceil(ms / (60 * 1000)));
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const minutes = remainingMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function clampRealmLevel(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return REALM_DEFAULT_LEVEL;
  }
  return Math.max(1, Math.min(10, Math.floor(value as number)));
}

function clampTrustRank(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return REALM_DEFAULT_TRUST_RANK;
  }
  return Math.max(1, Math.min(10, Math.floor(value as number)));
}

function formatResetLabel(endAt: Date, now: Date): string {
  return `Resets in ${formatDuration(endAt.getTime() - now.getTime())}`;
}

function formatAvailabilityLabel(endAt: Date, now: Date): string {
  return `Available in ${formatDuration(endAt.getTime() - now.getTime())}`;
}

function isSoon(targetAt: Date | undefined, now: Date): boolean {
  if (!targetAt) {
    return false;
  }
  const delta = targetAt.getTime() - now.getTime();
  return delta > 0 && delta <= SOON_WINDOW_MS;
}

function buildDailyWindow(now: Date): ResetWindow {
  const startDate = buildLocalResetDate(now);
  const startAt = pacificDateTimeToUtc({
    ...startDate,
    hour: GENSHIN_RESET_HOUR,
  });
  return {
    startAt,
    endAt: pacificDateTimeToUtc({
      ...addLocalDays(startDate, 1),
      hour: GENSHIN_RESET_HOUR,
    }),
    section: "daily",
    label: "Daily reset",
  };
}

function buildWeeklyWindow(now: Date): ResetWindow {
  const startDate = buildLocalResetDate(now);
  const currentResetDay = getGenshinResetDay(now);
  const daysSinceMonday: Record<DayOfWeek, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };
  const weeklyStartDate = addLocalDays(startDate, -daysSinceMonday[currentResetDay]);
  return {
    startAt: pacificDateTimeToUtc({
      ...weeklyStartDate,
      hour: GENSHIN_RESET_HOUR,
    }),
    endAt: pacificDateTimeToUtc({
      ...addLocalDays(weeklyStartDate, 7),
      hour: GENSHIN_RESET_HOUR,
    }),
    section: "weekly",
    label: "Weekly reset",
  };
}

function buildMonthlyWindow(now: Date): ResetWindow {
  const startDate = buildLocalResetDate(now);
  const monthlyStartDate = {
    year: startDate.year,
    month: startDate.month,
    day: 1,
  };
  return {
    startAt: pacificDateTimeToUtc({
      ...monthlyStartDate,
      hour: GENSHIN_RESET_HOUR,
    }),
    endAt: pacificDateTimeToUtc({
      ...addLocalMonths(monthlyStartDate, 1),
      hour: GENSHIN_RESET_HOUR,
    }),
    section: "monthly",
    label: "Monthly reset",
  };
}

function buildPatchCycleWindow(now: Date): ResetWindow {
  const startDate = buildLocalResetDate(now);
  const anchorDate: LocalDateParts = {
    year: 2026,
    month: 5,
    day: 20,
  };
  const cycleOffset = Math.floor((toLocalDayNumber(startDate) - toLocalDayNumber(anchorDate)) / PATCH_CYCLE_DAYS);
  const cycleStartDate = addLocalDays(anchorDate, cycleOffset * PATCH_CYCLE_DAYS);
  return {
    startAt: pacificDateTimeToUtc({
      ...cycleStartDate,
      hour: GENSHIN_RESET_HOUR,
    }),
    endAt: pacificDateTimeToUtc({
      ...addLocalDays(cycleStartDate, PATCH_CYCLE_DAYS),
      hour: GENSHIN_RESET_HOUR,
    }),
    section: "patch_cycle",
    label: "Patch cycle",
  };
}

function isCompletedInWindow(completedAt: string | undefined, window: ResetWindow): boolean {
  if (!completedAt) {
    return false;
  }
  const completed = Date.parse(completedAt);
  if (Number.isNaN(completed)) {
    return false;
  }
  return completed >= window.startAt.getTime();
}

export function getEffectiveWeeklyBossClaimsUsed(checklist: AccountChecklistState, now: Date): number {
  const weeklyWindow = buildWeeklyWindow(now);
  const updatedAt = checklist.weeklyBossClaims.updatedAt ? Date.parse(checklist.weeklyBossClaims.updatedAt) : Number.NaN;
  if (!Number.isFinite(updatedAt) || updatedAt < weeklyWindow.startAt.getTime()) {
    return 0;
  }
  return Math.max(0, Math.min(3, Math.floor(checklist.weeklyBossClaims.usedCount)));
}

export function getRealmCurrencyRatePerHour(realmLevel: number): number {
  return REALM_LEVELS.find((entry) => entry.level === clampRealmLevel(realmLevel))?.realmCurrencyPerHour ?? 30;
}

export function getRealmCurrencyCapacity(trustRank: number): number {
  return REALM_TRUST_RANKS.find((entry) => entry.trustRank === clampTrustRank(trustRank))?.realmCurrencyCapacity ?? 2400;
}

export function getRealmCurrencyTimeToFullHours(realmLevel: number, trustRank: number): number {
  return getRealmCurrencyCapacity(trustRank) / getRealmCurrencyRatePerHour(realmLevel);
}

function buildResetTaskView(params: {
  key: ResetWindowChecklistKey;
  label: string;
  state: { completedAt?: string };
  window: ResetWindow;
  now: Date;
  section?: ChecklistSectionKey;
  windowLabel?: string;
}): ChecklistTaskView {
  const completed = isCompletedInWindow(params.state.completedAt, params.window);
  return {
    key: params.key,
    label: params.label,
    section: params.section ?? params.window.section,
    status: completed ? "complete" : "incomplete",
    statusLabel: completed ? "Complete" : "Incomplete",
    needsAttention: !completed,
    windowLabel: params.windowLabel ?? params.window.label,
    timeLabel: formatResetLabel(params.window.endAt, params.now),
    nextResetAt: params.window.endAt.toISOString(),
    resetsSoon: isSoon(params.window.endAt, params.now),
    lastCompletedAt: params.state.completedAt,
  };
}

function buildCooldownTaskView(params: {
  key: CooldownChecklistKey;
  label: string;
  cooldownMs: number;
  lastUsedAt?: string;
  windowLabel: string;
  now: Date;
}): ChecklistTaskView {
  const lastUsedAt = params.lastUsedAt ? Date.parse(params.lastUsedAt) : Number.NaN;
  const nextAvailableAt = Number.isFinite(lastUsedAt) ? new Date(lastUsedAt + params.cooldownMs) : undefined;
  const available = !nextAvailableAt || nextAvailableAt.getTime() <= params.now.getTime();
  return {
    key: params.key,
    label: params.label,
    section: "cooldowns",
    status: available ? "ready" : "on_cooldown",
    statusLabel: available ? "Ready" : "On Cooldown",
    needsAttention: available,
    windowLabel: params.windowLabel,
    timeLabel: available ? "Ready now" : formatAvailabilityLabel(nextAvailableAt, params.now),
    nextAvailableAt: nextAvailableAt?.toISOString(),
    resetsSoon: isSoon(nextAvailableAt, params.now),
    lastUsedAt: params.lastUsedAt,
    readyAt: nextAvailableAt?.toISOString(),
  };
}

function buildWeeklyBossClaimsTask(checklist: AccountChecklistState, now: Date): ChecklistTaskView {
  const window = buildWeeklyWindow(now);
  const usedCount = getEffectiveWeeklyBossClaimsUsed(checklist, now);
  const complete = usedCount >= 3;
  return {
    key: "weeklyBossClaims",
    label: "Weekly Boss Claims",
    section: "weekly",
    status: complete ? "complete" : "incomplete",
    statusLabel: complete ? "Complete" : "Incomplete",
    needsAttention: !complete,
    windowLabel: `${usedCount} / 3 used`,
    timeLabel: formatResetLabel(window.endAt, now),
    nextResetAt: window.endAt.toISOString(),
    resetsSoon: isSoon(window.endAt, now),
    usedCount,
    maxCount: 3,
    lastCompletedAt: checklist.weeklyBossClaims.updatedAt,
  };
}

function buildRealmCurrencyTask(checklist: AccountChecklistState, now: Date): ChecklistTaskView {
  const realmLevel = clampRealmLevel(checklist.realmCurrency.realmLevel);
  const trustRank = clampTrustRank(checklist.realmCurrency.trustRank);
  const ratePerHour = getRealmCurrencyRatePerHour(realmLevel);
  const capacity = getRealmCurrencyCapacity(trustRank);
  const timeToFullHours = getRealmCurrencyTimeToFullHours(realmLevel, trustRank);
  const timeToFullMs = timeToFullHours * 60 * 60 * 1000;
  const lastClaimedAt = checklist.realmCurrency.lastClaimedAt ? Date.parse(checklist.realmCurrency.lastClaimedAt) : Number.NaN;
  const nextAvailableAt = Number.isFinite(lastClaimedAt) ? new Date(lastClaimedAt + timeToFullMs) : undefined;
  const isFull = !nextAvailableAt || nextAvailableAt.getTime() <= now.getTime();

  return {
    key: "realmCurrency",
    label: "Realm Currency",
    section: "realm",
    status: isFull ? "ready" : "on_cooldown",
    statusLabel: isFull ? "Full" : "Accumulating",
    needsAttention: isFull,
    windowLabel: isFull ? "Claim needed" : `Full in ${formatDuration(nextAvailableAt.getTime() - now.getTime())}`,
    timeLabel: `${ratePerHour}/hr · cap ${capacity.toLocaleString()}`,
    nextAvailableAt: nextAvailableAt?.toISOString(),
    resetsSoon: isSoon(nextAvailableAt, now),
    lastUsedAt: checklist.realmCurrency.lastClaimedAt,
    readyAt: nextAvailableAt?.toISOString(),
    realmLevel,
    trustRank,
    ratePerHour,
    capacity,
    timeToFullHours,
    settingsSummary: `Level ${realmLevel} · Trust ${trustRank}`,
  };
}

function buildTasks(checklist: AccountChecklistState, now: Date): ChecklistTaskView[] {
  const dailyWindow = buildDailyWindow(now);
  const weeklyWindow = buildWeeklyWindow(now);
  const monthlyWindow = buildMonthlyWindow(now);
  const patchCycleWindow = buildPatchCycleWindow(now);

  return [
    buildResetTaskView({
      key: "dailyCommissions",
      label: "Daily Commissions",
      state: checklist.dailyCommissions,
      window: dailyWindow,
      now,
    }),
    buildResetTaskView({
      key: "battlePassDailyClaims",
      label: "Battle Pass Daily Claims",
      state: checklist.battlePassDailyClaims,
      window: dailyWindow,
      now,
    }),
    buildResetTaskView({
      key: "battlePassWeeklyClaims",
      label: "Battle Pass Weekly Claims",
      state: checklist.battlePassWeeklyClaims,
      window: weeklyWindow,
      now,
    }),
    buildWeeklyBossClaimsTask(checklist, now),
    buildResetTaskView({
      key: "stardustExchange",
      label: "Stardust Exchange",
      state: checklist.stardustExchange,
      window: monthlyWindow,
      now,
    }),
    buildResetTaskView({
      key: "artifactTransmuter",
      label: "Artifact Transmuter",
      state: checklist.artifactTransmuter,
      window: patchCycleWindow,
      now,
    }),
    buildResetTaskView({
      key: "realmDepot",
      label: "Realm Depot",
      state: checklist.realmDepot,
      window: weeklyWindow,
      now,
      section: "realm",
      windowLabel: "Weekly reset",
    }),
    buildRealmCurrencyTask(checklist, now),
    buildCooldownTaskView({
      key: "parametricTransformer",
      label: "Parametric Transformer",
      cooldownMs: PARAMETRIC_TRANSFORMER_COOLDOWN_MS,
      lastUsedAt: checklist.parametricTransformer.lastUsedAt,
      windowLabel: "6d 22h cooldown",
      now,
    }),
    buildCooldownTaskView({
      key: "crystalflyTrap",
      label: "Crystalfly Trap",
      cooldownMs: CRYSTALFLY_TRAP_COOLDOWN_MS,
      lastUsedAt: checklist.crystalflyTrap.lastUsedAt,
      windowLabel: "7d cooldown",
      now,
    }),
    buildCooldownTaskView({
      key: "expeditions",
      label: "Expeditions",
      cooldownMs: EXPEDITION_COOLDOWN_MS,
      lastUsedAt: checklist.expeditions.lastClaimedAt,
      windowLabel: "20h claim timer",
      now,
    }),
  ];
}

function buildSections(tasks: ChecklistTaskView[]): ChecklistSectionView[] {
  const sectionLabels: Record<ChecklistSectionKey, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    patch_cycle: "Patch Cycle",
    cooldowns: "Cooldowns",
    realm: "Realm",
  };
  const orderedKeys: ChecklistSectionKey[] = ["daily", "weekly", "monthly", "patch_cycle", "cooldowns", "realm"];

  return orderedKeys
    .map((sectionKey) => ({
      key: sectionKey,
      label: sectionLabels[sectionKey],
      tasks: tasks.filter((task) => task.section === sectionKey),
    }))
    .filter((section) => section.tasks.length > 0);
}

function buildNextResetSummary(now: Date): { label: string; nextResetAt?: string } {
  const candidates = [
    { label: "Daily", at: buildDailyWindow(now).endAt },
    { label: "Weekly", at: buildWeeklyWindow(now).endAt },
    { label: "Monthly", at: buildMonthlyWindow(now).endAt },
    { label: "Patch", at: buildPatchCycleWindow(now).endAt },
  ].sort((left, right) => left.at.getTime() - right.at.getTime());

  const next = candidates[0];
  return next
    ? {
        label: `${next.label} in ${formatDuration(next.at.getTime() - now.getTime())}`,
        nextResetAt: next.at.toISOString(),
      }
    : {
        label: "No upcoming reset",
      };
}

export function buildChecklistModel(checklist: AccountChecklistState, now = new Date()): ChecklistViewModel {
  const tasks = buildTasks(checklist, now);
  const nextReset = buildNextResetSummary(now);

  return {
    tasks,
    sections: buildSections(tasks),
    summary: {
      needsAttentionCount: tasks.filter((task) => task.needsAttention).length,
      completeCount: tasks.filter((task) => task.status === "complete").length,
      onCooldownCount: tasks.filter((task) => task.status === "on_cooldown").length,
      availableCount: tasks.filter((task) => task.status === "ready" || task.status === "available").length,
      nextResetLabel: nextReset.label,
      nextResetAt: nextReset.nextResetAt,
    },
  };
}

export function buildChecklistAccountSummary(
  account: Pick<KrumpanionAccount, "id" | "name" | "checklist">,
  now = new Date(),
): ChecklistAccountSummaryView {
  const model = buildChecklistModel(account.checklist, now);
  return {
    accountId: account.id,
    accountName: account.name,
    needsAttentionCount: model.summary.needsAttentionCount,
    completeCount: model.summary.completeCount,
    onCooldownCount: model.summary.onCooldownCount,
    availableCount: model.summary.availableCount,
  };
}
