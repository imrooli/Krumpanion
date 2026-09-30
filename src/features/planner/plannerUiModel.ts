import { availabilityDays as configuredAvailabilityDays } from "../../utils/days";
import type { KrumpanionAccount } from "../../domain/account/types";
import { getGoalDisplayName } from "../../domain/goals/goalDisplay";
import type { KrumpanionGoals, PlannerSettings } from "../../domain/goals/types";
import type {
  AvailabilityGroupKey,
  DayOfWeek,
  PlannerOutput,
  PlannerRecommendation,
  PlannerRecommendationSection,
  PlannerWarning,
} from "../../domain/planner/types";
import type { StaticGameData } from "../../domain/staticData/types";
import { availabilityMatchesDay } from "../../utils/days";
import { formatAvailabilityLabel, formatDayCount } from "./plannerFormatting";

export interface PlannerUiRow extends PlannerRecommendation {
  relatedGoalLabels: string[];
  warnings: string[];
  primaryMaterials: PlannerRecommendation["requiredMaterials"];
  incidentalMaterials: PlannerRecommendation["requiredMaterials"];
  estimatedDaysLabel: string | null;
  earliestCompletionLabel: string | null;
  dayEstimateNote: string | null;
  timeGatedCompletionDays: number | null;
  excludedFromDayTotals: boolean;
}

export interface PlannerUiSection {
  key:
    | "ley_lines"
    | "today_domains_mastery"
    | "today_domains_forgery"
    | "bosses"
    | "weekly_resin"
    | "other_resin"
    | "ley_line_enemy_drops"
    | "crafting"
    | "forging"
    | "open_world_common"
    | "open_world_elite"
    | "local_specialty"
    | "passive_incidental"
    | "unknown_estimates";
  label: string;
  description: string;
  rows: PlannerUiRow[];
  rowCount: number;
  totalResin: number | null;
  emptyMessage?: string;
}

export interface PlannerWeekDomainGroup {
  key: AvailabilityGroupKey;
  label: string;
  masteryRows: PlannerUiRow[];
  forgeryRows: PlannerUiRow[];
  rowCount: number;
  totalResin: number | null;
}

export interface PlannerUiModel {
  summary: {
    accountName: string;
    worldLevel: number | null;
    domainLevel: string | null;
    totalEstimatedResin: number;
    totalEstimatedResinDays: number | null;
    expectedAdvisoryResin: number;
    expectedAdvisoryDays: number | null;
    chanceBasedCount: number;
    timeGatedEstimateDays: number | null;
    excludedTaskCount: number;
    resinActivityCount: number;
    todayResinActivityCount: number;
    weeklyLimitedCount: number;
    noResinCount: number;
    unknownEstimateCount: number;
    warningCount: number;
    requirementCraftingMode: string;
    resinCraftingMode: string;
  };
  warnings: PlannerWarning[];
  weaponExpNotes: string[];
  assumptions: string[];
  todayOverview: {
    totalResin: number;
    rowCount: number;
    leyLineCount: number;
    domainCount: number;
    bossCount: number;
  };
  todaySections: PlannerUiSection[];
  weekDomainGroups: PlannerWeekDomainGroup[];
  weeklyBossSection: PlannerUiSection;
  otherResinSection: PlannerUiSection | null;
  standaloneSections: PlannerUiSection[];
}

const DAY_SEQUENCE: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK_DOMAIN_ORDER: AvailabilityGroupKey[] = ["MON_THU_SUN", "TUE_FRI_SUN", "WED_SAT_SUN"];

const SECTION_METADATA: Record<PlannerUiSection["key"], { label: string; description: string; emptyMessage?: string }> = {
  ley_lines: {
    label: "Ley Lines",
    description: "Grouped Mora and Character EXP claims that you can spend resin on immediately.",
  },
  today_domains_mastery: {
    label: "Domains of Mastery",
    description: "Talent-book domains available today for active character talent goals.",
  },
  today_domains_forgery: {
    label: "Domains of Forgery",
    description: "Weapon-ascension domains available today for active weapon goals.",
  },
  bosses: {
    label: "Normal bosses",
    description: "Boss runs driven by unique boss material deficits. Ascension gems remain incidental detail only.",
  },
  weekly_resin: {
    label: "Weekly bosses",
    description: "Weekly-limited target material claims with discount and reset assumptions called out explicitly.",
  },
  other_resin: {
    label: "Other Resin Activities",
    description: "Additional resin-gated work that does not fit ley lines, daily domains, or boss farming.",
  },
  ley_line_enemy_drops: {
    label: "Ley Line Enemy Drop Recommendations",
    description: "No-resin Ley Line areas where spawned enemies can incidentally drop the missing enemy material families you still need.",
  },
  crafting: {
    label: "Crafting / Conversion",
    description: "Guaranteed crafting and upconversion actions you can do now without spending resin.",
  },
  forging: {
    label: "Forging",
    description: "Weapon EXP ore planning and daily forge-cap reminders.",
  },
  open_world_common: {
    label: "Common enemy drops",
    description: "Non-resin farming for common enemy material families.",
  },
  open_world_elite: {
    label: "Elite enemy drops",
    description: "Non-resin farming for elite enemy material families.",
  },
  local_specialty: {
    label: "Local specialties",
    description: "Regional collection routes and respawn-based specialty gathering.",
  },
  passive_incidental: {
    label: "Passive / incidental sources",
    description: "Long-term or opportunistic sources that help over time without driving daily resin spend.",
  },
  unknown_estimates: {
    label: "Unknown / Missing Estimate Data",
    description: "Rows that still need source or estimate metadata before the planner can project completion time.",
    emptyMessage: "No missing estimate data for the current plan.",
  },
};

function sumKnownResin(rows: Array<Pick<PlannerUiRow, "totalEstimatedResin">>): number | null {
  const knownRows = rows.filter((row) => row.totalEstimatedResin != null);
  if (knownRows.length === 0) {
    return null;
  }
  return knownRows.reduce((sum, row) => sum + (row.totalEstimatedResin ?? 0), 0);
}

function dedupeMessages(messages: string[]): string[] {
  return [...new Set(messages.filter(Boolean))];
}

function dedupeWarnings(warnings: PlannerWarning[]): PlannerWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.type}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function availabilityDays(availability: AvailabilityGroupKey): DayOfWeek[] {
  if (availability.startsWith("DAYS_")) return configuredAvailabilityDays(availability);
  switch (availability) {
    case "MON_THU_SUN":
      return ["Monday", "Thursday", "Sunday"];
    case "TUE_FRI_SUN":
      return ["Tuesday", "Friday", "Sunday"];
    case "WED_SAT_SUN":
      return ["Wednesday", "Saturday", "Sunday"];
    case "ALWAYS":
    case "WEEKLY":
    case "UNKNOWN":
    default:
      return [];
  }
}

function dayIndex(day: DayOfWeek): number {
  return DAY_SEQUENCE.indexOf(day);
}

function dayAfterOffset(today: DayOfWeek, offset: number): DayOfWeek {
  const start = dayIndex(today);
  return DAY_SEQUENCE[(start + Math.max(0, offset)) % DAY_SEQUENCE.length] ?? today;
}

function daysUntilNthAvailableDay(today: DayOfWeek, availability: AvailabilityGroupKey, sessionsNeeded: number): number | null {
  const days = availabilityDays(availability);
  if (days.length === 0 || sessionsNeeded <= 0) {
    return null;
  }

  let matches = 0;
  for (let offset = 0; offset < 28; offset += 1) {
    const candidate = dayAfterOffset(today, offset);
    if (days.includes(candidate)) {
      matches += 1;
      if (matches >= sessionsNeeded) {
        return offset;
      }
    }
  }

  return null;
}

function normalizeDisplayDays(days: number | null): number | null {
  if (days == null || !Number.isFinite(days)) {
    return null;
  }
  return Math.max(0, days);
}

function isDomainRow(row: PlannerRecommendation): boolean {
  return row.actionSubgroup === "domains" && (row.category === "talent_domain" || row.category === "weapon_domain");
}

function isMasteryRow(row: PlannerRecommendation): boolean {
  return row.category === "talent_domain";
}

function isForgeryRow(row: PlannerRecommendation): boolean {
  return row.category === "weapon_domain";
}

function isNormalBossRow(row: PlannerRecommendation): boolean {
  return row.actionSubgroup === "bosses" && row.category === "boss";
}

function isUnknownLikeRow(row: PlannerRecommendation): boolean {
  return row.actionSubgroup === "unknown_estimates";
}

function isCommonEnemyDropCategory(category: StaticGameData["materials"][string]["category"] | undefined): boolean {
  return category === "general_enemy_drop" || category === "enemy_drop";
}

function isEliteEnemyDropCategory(category: StaticGameData["materials"][string]["category"] | undefined): boolean {
  return category === "elite_enemy_drop";
}

function classifyOpenWorldEnemySection(
  row: PlannerRecommendation,
  staticData: StaticGameData,
): Extract<PlannerUiSection["key"], "open_world_common" | "open_world_elite"> {
  const materialCategories = row.requiredMaterials.map((material) => staticData.materials[material.materialId]?.category);
  const hasElite = materialCategories.some((category) => isEliteEnemyDropCategory(category));
  const hasCommon = materialCategories.some((category) => isCommonEnemyDropCategory(category));

  if (hasElite && !hasCommon) {
    return "open_world_elite";
  }

  return "open_world_common";
}

function getPrimaryMaterials(
  row: PlannerRecommendation,
  staticData: StaticGameData,
): {
  primaryMaterials: PlannerRecommendation["requiredMaterials"];
  incidentalMaterials: PlannerRecommendation["requiredMaterials"];
} {
  if (!isNormalBossRow(row)) {
    return {
      primaryMaterials: row.requiredMaterials,
      incidentalMaterials: [],
    };
  }

  const primaryMaterials = row.requiredMaterials.filter(
    (material) => staticData.materials[material.materialId]?.category === "normal_boss_material",
  );
  const incidentalMaterials = row.requiredMaterials.filter(
    (material) => staticData.materials[material.materialId]?.category === "gemstone",
  );

  return {
    primaryMaterials: primaryMaterials.length > 0 ? primaryMaterials : row.requiredMaterials,
    incidentalMaterials,
  };
}

function computeDayEstimate(row: PlannerRecommendation, dailyResinBudget: number, today: DayOfWeek) {
  if (isUnknownLikeRow(row)) {
    return {
      estimatedDaysLabel: null,
      earliestCompletionLabel: null,
      dayEstimateNote: "Days unavailable: missing estimate data",
      timeGatedCompletionDays: null,
      excludedFromDayTotals: true,
    };
  }

  if (row.actionGroup === "crafting") {
    return {
      estimatedDaysLabel: "Available now",
      earliestCompletionLabel: "Earliest completion: Today",
      dayEstimateNote: "Immediate crafting action; not included in resin-day totals.",
      timeGatedCompletionDays: 0,
      excludedFromDayTotals: true,
    };
  }

  if (row.actionSubgroup === "forging" && row.actionableRuns != null) {
    const days = normalizeDisplayDays(row.actionableRuns);
    const earliestOffset = Math.max(0, Math.ceil(days ?? 0) - 1);
    return {
      estimatedDaysLabel: formatDayCount(days, "daily reset"),
      earliestCompletionLabel: `Earliest completion: ${dayAfterOffset(today, earliestOffset)}, if started today`,
      dayEstimateNote: "Daily forge cap limits how quickly Mystic Enhancement Ore can be finished.",
      timeGatedCompletionDays: days,
      excludedFromDayTotals: false,
    };
  }

  const displayResin = row.expectedAdvisoryResin ?? row.totalEstimatedResin;
  if (displayResin == null) {
    return {
      estimatedDaysLabel: null,
      earliestCompletionLabel: null,
      dayEstimateNote: "No-resin task not included in resin-day totals.",
      timeGatedCompletionDays: null,
      excludedFromDayTotals: true,
    };
  }

  const dailyBudget = Math.max(1, dailyResinBudget);
  const resinDays = normalizeDisplayDays(row.expectedAdvisoryDays ?? displayResin / dailyBudget);
  const resinSessionsNeeded = Math.max(1, Math.ceil(displayResin / dailyBudget));
  const baseDaysLabel = formatDayCount(resinDays, "resin day");

  if (row.weeklyGate?.estimatedWeeks != null) {
    const weeklyDays = normalizeDisplayDays(row.weeklyGate.estimatedWeeks * 7);
    const completionDays = Math.max(resinDays ?? 0, weeklyDays ?? 0);
    const earliestOffset = Math.max(0, Math.ceil(completionDays) - 1);
    return {
      estimatedDaysLabel: baseDaysLabel,
      earliestCompletionLabel: `Earliest completion: ${dayAfterOffset(today, earliestOffset)}, assuming weekly claim limits`,
      dayEstimateNote: "Weekly boss completion is gated by the weekly reward schedule.",
      timeGatedCompletionDays: completionDays,
      excludedFromDayTotals: false,
    };
  }

  if (row.actionSubgroup === "domains" && row.availability !== "ALWAYS" && row.availability !== "UNKNOWN" && row.availability !== "WEEKLY") {
    const scheduleDays = daysUntilNthAvailableDay(today, row.availability, resinSessionsNeeded);
    const completionDays = Math.max(resinDays ?? 0, scheduleDays ?? 0);
    return {
      estimatedDaysLabel: baseDaysLabel,
      earliestCompletionLabel:
        scheduleDays != null
          ? `Earliest completion: ${dayAfterOffset(today, scheduleDays)}, if started today`
          : null,
      dayEstimateNote: "Domain availability follows the canonical weekly schedule.",
      timeGatedCompletionDays: completionDays,
      excludedFromDayTotals: false,
    };
  }

  const completionDays = Math.max(resinDays ?? 0, resinSessionsNeeded - 1);
  return {
    estimatedDaysLabel: baseDaysLabel,
    earliestCompletionLabel: `Earliest completion: ${dayAfterOffset(today, Math.max(0, resinSessionsNeeded - 1))}, if started today`,
    dayEstimateNote: null,
    timeGatedCompletionDays: completionDays,
    excludedFromDayTotals: false,
  };
}

function enrichRecommendationRow(
  row: PlannerRecommendation,
  goals: KrumpanionGoals,
  staticData: StaticGameData,
  dailyResinBudget: number,
  today: DayOfWeek,
): PlannerUiRow {
  const materialDisplay = getPrimaryMaterials(row, staticData);
  const dayEstimate = computeDayEstimate(row, dailyResinBudget, today);

  return {
    ...row,
    relatedGoalLabels:
      row.relatedGoalLabels?.length
        ? dedupeMessages(row.relatedGoalLabels)
        : dedupeMessages(row.relatedGoalKeys.map((goalKey) => getGoalDisplayName(goalKey, goals, staticData))),
    warnings: dedupeMessages(row.warnings ?? []),
    primaryMaterials: materialDisplay.primaryMaterials,
    incidentalMaterials: materialDisplay.incidentalMaterials,
    estimatedDaysLabel: dayEstimate.estimatedDaysLabel,
    earliestCompletionLabel: dayEstimate.earliestCompletionLabel,
    dayEstimateNote: dayEstimate.dayEstimateNote,
    timeGatedCompletionDays: dayEstimate.timeGatedCompletionDays,
    excludedFromDayTotals: dayEstimate.excludedFromDayTotals,
  };
}

function buildSection(key: PlannerUiSection["key"], rows: PlannerUiRow[]): PlannerUiSection {
  const metadata = SECTION_METADATA[key];
  return {
    key,
    label: metadata.label,
    description: metadata.description,
    rows,
    rowCount: rows.length,
    totalResin: sumKnownResin(rows),
    emptyMessage: metadata.emptyMessage,
  };
}

function mapSectionRows(
  sectionKey: PlannerRecommendationSection["key"],
  sectionMap: Map<PlannerRecommendationSection["key"], PlannerUiRow[]>,
): PlannerUiRow[] {
  return sectionMap.get(sectionKey) ?? [];
}

function flattenUniqueRows(sections: PlannerUiSection[]): PlannerUiRow[] {
  const rows = new Map<string, PlannerUiRow>();
  for (const section of sections) {
    for (const row of section.rows) {
      rows.set(row.id, row);
    }
  }
  return [...rows.values()];
}

export function buildPlannerUiModel(params: {
  plannerOutput: PlannerOutput;
  account: KrumpanionAccount | null;
  goals: KrumpanionGoals;
  staticData: StaticGameData;
  plannerSettings: PlannerSettings;
  today: DayOfWeek;
}): PlannerUiModel {
  const allRows = params.plannerOutput.recommendations.map((row) =>
    enrichRecommendationRow(row, params.goals, params.staticData, params.plannerSettings.dailyResinBudget, params.today),
  );
  const rowById = new Map(allRows.map((row) => [row.id, row]));

  const sectionMap = new Map<PlannerRecommendationSection["key"], PlannerUiRow[]>(
    params.plannerOutput.plannerReport.sections.map((section) => [
      section.key,
      section.rows.map((row) => rowById.get(row.id) ?? enrichRecommendationRow(row, params.goals, params.staticData, params.plannerSettings.dailyResinBudget, params.today)),
    ]),
  );

  const resinRows = mapSectionRows("resin_gated", sectionMap);
  const weeklyBossRows = mapSectionRows("weekly_resin", sectionMap);
  const leyLineRows = mapSectionRows("ley_lines", sectionMap);
  const domainRows = mapSectionRows("domains", sectionMap).filter(isDomainRow);
  const bossRows = mapSectionRows("bosses", sectionMap).filter(isNormalBossRow);

  const accountedResinIds = new Set([
    ...weeklyBossRows.map((row) => row.id),
    ...leyLineRows.map((row) => row.id),
    ...domainRows.map((row) => row.id),
    ...bossRows.map((row) => row.id),
  ]);

  const otherResinRows = resinRows.filter((row) => !accountedResinIds.has(row.id));
  const todayDomainRows = domainRows.filter((row) => row.isAvailableToday || availabilityMatchesDay(row.availability, params.today));
  const todayDomainMasteryRows = todayDomainRows.filter(isMasteryRow);
  const todayDomainForgeryRows = todayDomainRows.filter(isForgeryRow);

  const weekDomainGroups = [...new Set([...WEEK_DOMAIN_ORDER, ...domainRows.map(row => row.availability).filter(key => key.startsWith("DAYS_"))])].map((availability) => {
    const groupRows = domainRows.filter((row) => row.availability === availability);
    return {
      key: availability,
      label: formatAvailabilityLabel(availability),
      masteryRows: groupRows.filter(isMasteryRow),
      forgeryRows: groupRows.filter(isForgeryRow),
      rowCount: groupRows.length,
      totalResin: sumKnownResin(groupRows),
    } satisfies PlannerWeekDomainGroup;
  }).filter((group) => group.rowCount > 0);

  const todaySections = [
    buildSection("ley_lines", leyLineRows),
    buildSection("today_domains_mastery", todayDomainMasteryRows),
    buildSection("today_domains_forgery", todayDomainForgeryRows),
    buildSection("bosses", bossRows),
  ].filter((section) => section.rows.length > 0);

  const weeklyBossSection = buildSection("weekly_resin", weeklyBossRows);
  const otherResinSection = otherResinRows.length > 0 ? buildSection("other_resin", otherResinRows) : null;
  const openWorldRows = mapSectionRows("open_world", sectionMap).filter((row) => row.actionSubgroup !== "local_specialty");
  const openWorldCommonRows = openWorldRows.filter(
    (row) => classifyOpenWorldEnemySection(row, params.staticData) === "open_world_common",
  );
  const openWorldEliteRows = openWorldRows.filter(
    (row) => classifyOpenWorldEnemySection(row, params.staticData) === "open_world_elite",
  );

  const standaloneSections = [
    buildSection("crafting", mapSectionRows("crafting", sectionMap)),
    buildSection("forging", mapSectionRows("forging", sectionMap)),
    buildSection("ley_line_enemy_drops", mapSectionRows("ley_line_enemy_drops", sectionMap)),
    buildSection("open_world_common", openWorldCommonRows),
    buildSection("open_world_elite", openWorldEliteRows),
    buildSection("local_specialty", mapSectionRows("local_specialty", sectionMap)),
    buildSection("passive_incidental", mapSectionRows("passive_incidental", sectionMap)),
    buildSection("unknown_estimates", mapSectionRows("unknown_estimates", sectionMap)),
  ].filter((section) => section.rows.length > 0 || section.key === "unknown_estimates");

  const uniqueRows = allRows;
  const rowWarnings = dedupeMessages(uniqueRows.flatMap((row) => row.warnings ?? [])).map((message) => ({
    type: "planner_advisory" as const,
    message,
  }));
  const warnings = dedupeWarnings([...params.plannerOutput.plannerReport.warnings, ...rowWarnings]);

  const todayRowsForSummary = flattenUniqueRows([
    buildSection("ley_lines", leyLineRows),
    buildSection("today_domains_mastery", todayDomainMasteryRows),
    buildSection("today_domains_forgery", todayDomainForgeryRows),
    buildSection("bosses", bossRows),
    ...(otherResinSection ? [otherResinSection] : []),
  ]);

  const includedRows = uniqueRows.filter((row) => !row.excludedFromDayTotals && row.timeGatedCompletionDays != null);
  const totalEstimatedResinDays = params.plannerOutput.plannerReport.summary.totalEstimatedResin / Math.max(1, params.plannerSettings.dailyResinBudget);
  const timeGatedEstimateDays =
    includedRows.length > 0
      ? Math.max(totalEstimatedResinDays, ...includedRows.map((row) => row.timeGatedCompletionDays ?? 0))
      : totalEstimatedResinDays;
  const excludedTaskCount = uniqueRows.filter(
    (row) => row.excludedFromDayTotals && row.actionGroup !== "crafting" && row.actionSubgroup !== "forging",
  ).length;

  const assumptions = dedupeMessages([
    `Natural resin budget: ${params.plannerSettings.dailyResinBudget} resin/day.`,
    "Domain availability follows the canonical weekly schedule.",
    weeklyBossRows.length > 0 ? "Weekly boss estimates may be weekly-gated by reset timing." : "",
    uniqueRows.some((row) => row.warnings.some((warning) => warning.includes("World Level 9")))
      ? "World Level 9 estimates may use conservative planner assumptions."
      : "",
    uniqueRows.some((row) => row.actionGroup === "open_world" || row.actionGroup === "passive_incidental")
      ? "No-resin open-world tasks are not included in resin-day totals unless a dedicated time estimate exists."
      : "",
  ]);

  return {
    summary: {
      accountName: params.account?.name ?? "No active account",
      worldLevel: params.plannerSettings.worldLevel ?? params.account?.worldState.selectedWorldLevel ?? null,
      domainLevel: params.plannerSettings.domainLevel ?? null,
      totalEstimatedResin: params.plannerOutput.plannerReport.summary.totalEstimatedResin,
      totalEstimatedResinDays,
      expectedAdvisoryResin: params.plannerOutput.plannerReport.summary.expectedAdvisoryResin,
      expectedAdvisoryDays: params.plannerOutput.plannerReport.summary.expectedAdvisoryDays,
      chanceBasedCount: params.plannerOutput.plannerReport.summary.chanceBasedTaskCount,
      timeGatedEstimateDays,
      excludedTaskCount,
      resinActivityCount: resinRows.length,
      todayResinActivityCount: todayRowsForSummary.length,
      weeklyLimitedCount: params.plannerOutput.plannerReport.summary.weeklyGatedEstimateCount,
      noResinCount: params.plannerOutput.plannerReport.summary.noResinTaskCount,
      unknownEstimateCount: params.plannerOutput.plannerReport.summary.unknownEstimateCount,
      warningCount: warnings.length,
      requirementCraftingMode: params.plannerSettings.craftingModeForRequirementSatisfaction ?? "guaranteed",
      resinCraftingMode: "guaranteed",
    },
    warnings,
    weaponExpNotes: params.plannerOutput.weaponExpSummary.notes,
    assumptions,
    todayOverview: {
      totalResin: sumKnownResin(todayRowsForSummary) ?? 0,
      rowCount: todayRowsForSummary.length,
      leyLineCount: leyLineRows.length,
      domainCount: todayDomainRows.length,
      bossCount: bossRows.length,
    },
    todaySections,
    weekDomainGroups,
    weeklyBossSection,
    otherResinSection,
    standaloneSections,
  };
}
