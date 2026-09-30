import { addMaterialAmounts, type MaterialTotals } from "../../utils/collections";
import type { ProgressionStep } from "../staticData/upstreamTypes";

export function cumulativeRequirements(steps: Record<string, ProgressionStep>, baseline: number): Record<string, MaterialTotals> {
  let running: MaterialTotals = {};
  const totals: Record<string, MaterialTotals> = { [baseline]: {} };
  for (const [level, step] of Object.entries(steps).sort(([a], [b]) => Number(a) - Number(b))) {
    running = addMaterialAmounts(running, step.costs);
    totals[level] = running;
  }
  return totals;
}
