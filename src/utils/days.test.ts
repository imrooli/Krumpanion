import { describe, expect, it } from "vitest";
import { availabilityMatchesDay, getGenshinResetDay } from "./days";

describe("getGenshinResetDay", () => {
  it("uses the previous Pacific weekday before the 2:00 AM reset", () => {
    expect(getGenshinResetDay(new Date("2026-05-09T08:30:00.000Z"))).toBe("Friday");
  });

  it("switches to the new Pacific weekday at or after the 2:00 AM reset", () => {
    expect(getGenshinResetDay(new Date("2026-05-09T09:00:00.000Z"))).toBe("Saturday");
    expect(getGenshinResetDay(new Date("2026-05-09T09:30:00.000Z"))).toBe("Saturday");
  });
});

describe("availabilityMatchesDay", () => {
  it("keeps Friday domains available before the Saturday reset boundary", () => {
    const resetDay = getGenshinResetDay(new Date("2026-05-09T08:30:00.000Z"));
    expect(resetDay).toBe("Friday");
    expect(availabilityMatchesDay("TUE_FRI_SUN", resetDay)).toBe(true);
    expect(availabilityMatchesDay("WED_SAT_SUN", resetDay)).toBe(false);
  });
});
