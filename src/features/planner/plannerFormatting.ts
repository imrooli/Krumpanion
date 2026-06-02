import type { PlannerRecommendation } from "../../domain/planner/types";
import type { StaticGameData } from "../../domain/staticData/types";

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const DECIMAL_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function clampDisplayInteger(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value ?? 0));
}

export function formatInteger(value: number | null | undefined): string {
  return INTEGER_FORMATTER.format(clampDisplayInteger(value));
}

export function formatDecimal(value: number | null | undefined): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return DECIMAL_FORMATTER.format(Math.max(0, value ?? 0));
}

export function formatQuantity(value: number | null | undefined, label?: string): string {
  const quantity = formatInteger(value);
  return label ? `${quantity} ${label}` : quantity;
}

export function formatMaterialQuantity(
  materialId: string,
  quantity: number,
  staticData: StaticGameData,
): string {
  const materialName = staticData.materials[materialId]?.displayName ?? materialId;
  return `${materialName} x${formatInteger(quantity)}`;
}

export function formatResinTotal(totalEstimatedResin: number | null | undefined): string {
  if (totalEstimatedResin == null) {
    return "No resin";
  }
  return `${formatInteger(totalEstimatedResin)} total resin`;
}

export function formatResinPerRun(resinPerRun: number | null | undefined): string {
  if (resinPerRun == null) {
    return "No resin";
  }
  return `${formatInteger(resinPerRun)} resin/run`;
}

export function formatActionableRuns(row: Pick<PlannerRecommendation, "actionableRuns" | "actionSubgroup">): string {
  const runs = clampDisplayInteger(row.actionableRuns);
  if (row.actionSubgroup === "weekly_resin") {
    return `${formatInteger(runs)} claim${runs === 1 ? "" : "s"}`;
  }
  if (row.actionSubgroup === "forging") {
    return `${formatInteger(runs)} daily reset${runs === 1 ? "" : "s"}`;
  }
  return `${formatInteger(runs)} run${runs === 1 ? "" : "s"}`;
}

export function formatEstimatedRuns(row: Pick<PlannerRecommendation, "estimatedRuns">): string | null {
  if (row.estimatedRuns == null) {
    return null;
  }
  return `Estimated ${formatDecimal(row.estimatedRuns)}`;
}

export function formatDayCount(value: number | null | undefined, unit = "day"): string {
  if (value == null || !Number.isFinite(value)) {
    return "Days unavailable";
  }

  const rounded = Math.max(0, value);
  const label = DECIMAL_FORMATTER.format(rounded);
  const suffix = rounded === 1 ? unit : `${unit}s`;
  return `About ${label} ${suffix}`;
}

export function formatRecommendationAction(row: PlannerRecommendation): string {
  if (row.totalEstimatedResin != null) {
    const segments = [
      row.actionableRuns != null ? formatActionableRuns(row) : null,
      row.resinPerRun != null ? formatResinPerRun(row.resinPerRun) : null,
      formatResinTotal(row.totalEstimatedResin),
    ].filter((segment): segment is string => Boolean(segment));
    return segments.join(" | ");
  }

  if (row.actionGroup === "crafting") {
    return "Craft now | No resin";
  }

  if (row.actionSubgroup === "forging" && row.actionableRuns != null) {
    return `${formatActionableRuns(row)} | No resin`;
  }

  if (row.actionSubgroup === "unknown_estimates") {
    return "Estimate unavailable";
  }

  if (row.actionSubgroup === "ley_line_enemy_drops") {
    return "Incidental combat drops | No resin";
  }

  return "No resin";
}

export function formatUnknownEstimateLabel(row: PlannerRecommendation): string {
  return row.actionSubgroup === "unknown_estimates" ? "Missing estimate data" : "Estimate unavailable";
}

export function formatAvailabilityLabel(availability: PlannerRecommendation["availability"]): string {
  switch (availability) {
    case "ALWAYS":
      return "Always available";
    case "WEEKLY":
      return "Weekly";
    case "MON_THU_SUN":
      return "Monday / Thursday / Sunday";
    case "TUE_FRI_SUN":
      return "Tuesday / Friday / Sunday";
    case "WED_SAT_SUN":
      return "Wednesday / Saturday / Sunday";
    default:
      return "Availability unknown";
  }
}

export function formatActivityType(row: PlannerRecommendation): string {
  switch (row.actionSubgroup) {
    case "weekly_resin":
      return "Weekly Boss";
    case "domains":
      if (row.category === "talent_domain") {
        return "Domain of Mastery";
      }
      if (row.category === "weapon_domain") {
        return "Domain of Forgery";
      }
      if (row.category === "artifact_domain") {
        return "Artifact Domain";
      }
      return "Domain";
    case "bosses":
      return "Normal Boss";
    case "ley_lines":
      return "Ley Line";
    case "ley_line_enemy_drops":
      return "Ley Line Enemy Drops";
    case "local_specialty":
      return "Local Specialty";
    case "forging":
      return "Forging";
    case "unknown_estimates":
      return "Unknown";
    default:
      break;
  }

  switch (row.actionGroup) {
    case "crafting":
      return "Crafting";
    case "open_world":
      return "Open World";
    case "passive_incidental":
      return "Passive";
    case "time_gated_non_resin":
      return "No Resin";
    case "resin_gated":
    default:
      return "Activity";
  }
}
