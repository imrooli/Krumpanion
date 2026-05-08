import type { AvailabilityGroupKey, DayOfWeek } from "../domain/planner/types";

export const DAY_LABELS: Record<DayOfWeek, string> = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
};

export function availabilityMatchesDay(availability: AvailabilityGroupKey, day: DayOfWeek): boolean {
  switch (availability) {
    case "ALWAYS":
      return true;
    case "MON_THU_SUN":
      return day === "Monday" || day === "Thursday" || day === "Sunday";
    case "TUE_FRI_SUN":
      return day === "Tuesday" || day === "Friday" || day === "Sunday";
    case "WED_SAT_SUN":
      return day === "Wednesday" || day === "Saturday" || day === "Sunday";
    case "WEEKLY":
      return true;
    case "UNKNOWN":
      return false;
    default:
      return false;
  }
}
