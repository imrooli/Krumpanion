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

const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const DAILY_RESET_HOUR_PACIFIC = 2;
const DAY_SEQUENCE: DayOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getPreviousDay(day: DayOfWeek): DayOfWeek {
  const index = DAY_SEQUENCE.indexOf(day);
  if (index <= 0) {
    return "Saturday";
  }
  return DAY_SEQUENCE[index - 1] ?? "Saturday";
}

function getPacificDatePart(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    hour12: false,
  });

  const value = formatter.formatToParts(date).find((part) => part.type === type)?.value;
  return value ?? "";
}

export function getGenshinResetDay(date = new Date()): DayOfWeek {
  const pacificWeekday = getPacificDatePart(date, "weekday") as DayOfWeek;
  const pacificHour = Number.parseInt(getPacificDatePart(date, "hour"), 10);

  if (!DAY_SEQUENCE.includes(pacificWeekday)) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date) as DayOfWeek;
  }

  if (Number.isFinite(pacificHour) && pacificHour < DAILY_RESET_HOUR_PACIFIC) {
    return getPreviousDay(pacificWeekday);
  }

  return pacificWeekday;
}
