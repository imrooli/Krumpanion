import type { AvailabilityGroup, AvailabilityGroupKey, PlannerRecommendation } from "./types";

const AVAILABILITY_LABELS: Record<AvailabilityGroupKey, string> = {
  MON_THU_SUN: "Monday / Thursday / Sunday",
  TUE_FRI_SUN: "Tuesday / Friday / Sunday",
  WED_SAT_SUN: "Wednesday / Saturday / Sunday",
  ALWAYS: "Always available",
  WEEKLY: "Weekly reset-limited",
  UNKNOWN: "Unknown / manual source",
};

export function groupByAvailability(rows: PlannerRecommendation[]): AvailabilityGroup[] {
  const groups = new Map<AvailabilityGroupKey, PlannerRecommendation[]>();

  for (const row of rows) {
    groups.set(row.availability, [...(groups.get(row.availability) ?? []), row]);
  }

  return (Object.keys(AVAILABILITY_LABELS) as AvailabilityGroupKey[]).map((key) => ({
    key,
    label: AVAILABILITY_LABELS[key],
    rows: (groups.get(key) ?? []).sort((left, right) => right.priority - left.priority),
  }));
}
