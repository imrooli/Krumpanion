import { describe, expect, it } from "vitest";
import {
  buildChecklistModel,
  getEffectiveWeeklyBossClaimsUsed,
  getRealmCurrencyCapacity,
  getRealmCurrencyRatePerHour,
  getRealmCurrencyTimeToFullHours,
} from "./model";
import { createDefaultChecklistState } from "./types";

describe("checklist timing model", () => {
  it("treats daily tasks as incomplete after the 2 AM Los Angeles reset", () => {
    const checklist = createDefaultChecklistState();
    checklist.dailyCommissions.completedAt = "2026-06-02T08:30:00.000Z";
    checklist.dailyForging.completedAt = "2026-06-02T08:30:00.000Z";

    const beforeReset = buildChecklistModel(checklist, new Date("2026-06-02T08:59:00.000Z"));
    const afterReset = buildChecklistModel(checklist, new Date("2026-06-02T09:01:00.000Z"));

    expect(beforeReset.tasks.find((task) => task.key === "dailyCommissions")?.status).toBe("complete");
    expect(afterReset.tasks.find((task) => task.key === "dailyCommissions")?.status).toBe("incomplete");
    expect(beforeReset.tasks.find((task) => task.key === "dailyForging")?.status).toBe("complete");
    expect(afterReset.tasks.find((task) => task.key === "dailyForging")?.status).toBe("incomplete");
  });

  it("resets weekly bounties and requests on the Monday 2 AM Los Angeles weekly boundary", () => {
    const checklist = createDefaultChecklistState();
    checklist.weeklyBountiesRequests.completedAt = "2026-06-07T18:00:00.000Z";

    const beforeReset = buildChecklistModel(checklist, new Date("2026-06-08T08:59:00.000Z"));
    const afterReset = buildChecklistModel(checklist, new Date("2026-06-08T09:01:00.000Z"));

    expect(beforeReset.tasks.find((task) => task.key === "weeklyBountiesRequests")?.status).toBe("complete");
    expect(afterReset.tasks.find((task) => task.key === "weeklyBountiesRequests")?.status).toBe("incomplete");
    expect(afterReset.tasks.find((task) => task.key === "weeklyBountiesRequests")?.section).toBe("weekly");
  });

  it("resets weekly boss claim usage when the stored timestamp is outside the current weekly window", () => {
    const checklist = createDefaultChecklistState(2, "2026-06-01T09:00:00.000Z");

    expect(getEffectiveWeeklyBossClaimsUsed(checklist, new Date("2026-06-07T18:00:00.000Z"))).toBe(2);
    expect(getEffectiveWeeklyBossClaimsUsed(checklist, new Date("2026-06-08T09:30:00.000Z"))).toBe(0);
  });

  it("keeps cooldown tasks off the attention count until they are ready again", () => {
    const checklist = createDefaultChecklistState();
    checklist.parametricTransformer.lastUsedAt = "2026-06-01T12:00:00.000Z";

    const coolingDown = buildChecklistModel(checklist, new Date("2026-06-07T08:00:00.000Z"));
    const readyAgain = buildChecklistModel(checklist, new Date("2026-06-08T11:00:00.000Z"));

    expect(coolingDown.tasks.find((task) => task.key === "parametricTransformer")?.status).toBe("on_cooldown");
    expect(coolingDown.tasks.find((task) => task.key === "parametricTransformer")?.needsAttention).toBe(false);
    expect(readyAgain.tasks.find((task) => task.key === "parametricTransformer")?.status).toBe("ready");
    expect(readyAgain.tasks.find((task) => task.key === "parametricTransformer")?.needsAttention).toBe(true);
  });

  it("anchors patch-cycle tasks to the configured 42-day cadence", () => {
    const checklist = createDefaultChecklistState();
    checklist.artifactTransmuter.completedAt = "2026-05-20T09:00:00.000Z";

    const currentCycle = buildChecklistModel(checklist, new Date("2026-06-15T18:00:00.000Z"));
    const nextCycle = buildChecklistModel(checklist, new Date("2026-07-01T18:00:00.000Z"));

    expect(currentCycle.tasks.find((task) => task.key === "artifactTransmuter")?.status).toBe("complete");
    expect(nextCycle.tasks.find((task) => task.key === "artifactTransmuter")?.status).toBe("incomplete");
  });

  it("defaults realm currency to max settings and an 80 hour timer", () => {
    const checklist = createDefaultChecklistState();
    const model = buildChecklistModel(checklist, new Date("2026-06-02T12:00:00.000Z"));
    const realmCurrency = model.tasks.find((task) => task.key === "realmCurrency");

    expect(realmCurrency?.realmLevel).toBe(10);
    expect(realmCurrency?.trustRank).toBe(10);
    expect(realmCurrency?.ratePerHour).toBe(30);
    expect(realmCurrency?.capacity).toBe(2400);
    expect(realmCurrency?.timeToFullHours).toBe(80);
    expect(realmCurrency?.status).toBe("ready");
    expect(realmCurrency?.needsAttention).toBe(true);
  });

  it("maps realm level and trust rank tables correctly", () => {
    expect(getRealmCurrencyRatePerHour(1)).toBe(4);
    expect(getRealmCurrencyRatePerHour(10)).toBe(30);
    expect(getRealmCurrencyCapacity(1)).toBe(300);
    expect(getRealmCurrencyCapacity(10)).toBe(2400);
    expect(getRealmCurrencyTimeToFullHours(10, 10)).toBe(80);
  });

  it("tracks realm currency as an accumulating timer until full", () => {
    const checklist = createDefaultChecklistState();
    checklist.realmCurrency.lastClaimedAt = "2026-06-02T12:00:00.000Z";

    const accumulating = buildChecklistModel(checklist, new Date("2026-06-04T12:00:00.000Z"));
    const full = buildChecklistModel(checklist, new Date("2026-06-06T20:00:00.000Z"));

    expect(accumulating.tasks.find((task) => task.key === "realmCurrency")?.status).toBe("on_cooldown");
    expect(accumulating.tasks.find((task) => task.key === "realmCurrency")?.needsAttention).toBe(false);
    expect(full.tasks.find((task) => task.key === "realmCurrency")?.status).toBe("ready");
    expect(full.tasks.find((task) => task.key === "realmCurrency")?.needsAttention).toBe(true);
  });

  it("puts full realm currency and ready cooldowns into the do now queue ahead of weekly tasks", () => {
    const checklist = createDefaultChecklistState();
    checklist.expeditions.lastClaimedAt = "2026-06-01T12:00:00.000Z";
    checklist.parametricTransformer.lastUsedAt = "2026-05-26T12:00:00.000Z";

    const model = buildChecklistModel(checklist, new Date("2026-06-03T12:00:00.000Z"));

    expect(model.dashboard.doNow.tasks.map((task) => task.key)).toEqual([
      "realmCurrency",
      "expeditions",
      "parametricTransformer",
      "crystalflyTrap",
      "dailyCommissions",
      "dailyForging",
      "battlePassDailyClaims",
    ]);
    expect(model.dashboard.thisWeek.tasks[0]?.key).toBe("weeklyBossClaims");
  });

  it("promotes reset-soon incomplete tasks into do now", () => {
    const checklist = createDefaultChecklistState();

    const model = buildChecklistModel(checklist, new Date("2026-06-02T06:30:00.000Z"));

    const doNowKeys = model.dashboard.doNow.tasks.map((task) => task.key);
    expect(doNowKeys).toContain("dailyCommissions");
    expect(model.dashboard.doNow.tasks.find((task) => task.key === "dailyCommissions")?.expiresSoon).toBe(true);
  });

  it("keeps completed tasks out of do now while retaining them in daily and weekly sections", () => {
    const checklist = createDefaultChecklistState();
    checklist.dailyCommissions.completedAt = "2026-06-02T12:00:00.000Z";
    checklist.dailyForging.completedAt = "2026-06-02T12:00:00.000Z";
    checklist.battlePassDailyClaims.completedAt = "2026-06-02T12:00:00.000Z";

    const model = buildChecklistModel(checklist, new Date("2026-06-02T12:30:00.000Z"));

    expect(model.dashboard.doNow.tasks.some((task) => task.key === "dailyCommissions")).toBe(false);
    expect(model.dashboard.today.tasks.find((task) => task.key === "dailyCommissions")?.status).toBe("complete");
    expect(model.summary.todayRemainingCount).toBe(0);
  });

  it("places realm depot in the realm section and resets it on Monday weekly reset", () => {
    const checklist = createDefaultChecklistState();
    checklist.realmDepot.completedAt = "2026-06-07T18:00:00.000Z";

    const beforeReset = buildChecklistModel(checklist, new Date("2026-06-08T08:59:00.000Z"));
    const afterReset = buildChecklistModel(checklist, new Date("2026-06-08T09:01:00.000Z"));

    expect(beforeReset.tasks.find((task) => task.key === "realmDepot")?.section).toBe("realm");
    expect(beforeReset.tasks.find((task) => task.key === "realmDepot")?.status).toBe("complete");
    expect(afterReset.tasks.find((task) => task.key === "realmDepot")?.status).toBe("incomplete");
  });
});
