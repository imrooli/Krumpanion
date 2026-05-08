import type { PlannerInput } from "./types";
import type { GoalResolutionItem, PlannerWarning } from "./types";
import { aggregateNeededMaterials } from "./calculateMissingMaterials";

export function expandGoals(input: PlannerInput): {
  goalResolutions: GoalResolutionItem[];
  warnings: PlannerWarning[];
} {
  const { characterPlans, weaponPlans, warnings } = aggregateNeededMaterials(input);

  return {
    goalResolutions: [...characterPlans, ...weaponPlans],
    warnings,
  };
}
