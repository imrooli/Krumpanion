/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import type { ImportWarning } from "../domain/good/types";
import type { AppSection } from "../domain/goals/types";
import type { PlannerOutput, PlannerWarning } from "../domain/planner/types";
import { CraftingTab } from "../features/crafting/CraftingTab";
import { DatabaseTab } from "../features/database/DatabaseTab";
import { GoalsWorkspace } from "../features/goals/GoalsWorkspace";
import { HomeWorkspace } from "../features/home/HomeWorkspace";
import { InventoryWorkspace } from "../features/inventory/InventoryWorkspace";
import { PlannerTab } from "../features/planner/PlannerTab";
import { SettingsWorkspace } from "../features/settings/SettingsWorkspace";

export interface AppSectionContext {
  plannerOutput: PlannerOutput;
  importWarnings: ImportWarning[];
  overrideWarnings: PlannerWarning[];
}

export interface AppSectionDefinition {
  key: AppSection;
  label: string;
  shortLabel: string;
  description: string;
  render: (context: AppSectionContext) => ReactNode;
}

export const APP_SECTIONS: AppSectionDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    shortLabel: "Dash",
    description: "Current account summary, top blockers, and the best next action.",
    render: ({ plannerOutput, importWarnings, overrideWarnings }) => (
      <HomeWorkspace plannerOutput={plannerOutput} importWarnings={importWarnings} overrideWarnings={overrideWarnings} />
    ),
  },
  {
    key: "planner",
    label: "Planner",
    shortLabel: "Plan",
    description: "Resin outlook, grouped deficits, crafting impact, and farm recommendations.",
    render: ({ plannerOutput }) => <PlannerTab plannerOutput={plannerOutput} />,
  },
  {
    key: "crafting",
    label: "Crafting",
    shortLabel: "Craft",
    description: "Doable no-resin crafting actions, shortage reduction, and the best crafter to use.",
    render: ({ plannerOutput }) => <CraftingTab plannerOutput={plannerOutput} />,
  },
  {
    key: "goals",
    label: "Goals",
    shortLabel: "Goals",
    description: "Edit character, weapon, and artifact targets for the active account.",
    render: ({ plannerOutput }) => <GoalsWorkspace plannerOutput={plannerOutput} />,
  },
  {
    key: "inventory",
    label: "Inventory",
    shortLabel: "Stock",
    description: "Import GOOD, inspect materials, and review owned characters and weapons.",
    render: ({ plannerOutput }) => <InventoryWorkspace plannerOutput={plannerOutput} />,
  },
  {
    key: "database",
    label: "Database",
    shortLabel: "Data",
    description: "Static data explorer, source coverage, overrides, and health issues.",
    render: () => <DatabaseTab />,
  },
  {
    key: "settings",
    label: "Settings",
    shortLabel: "Prefs",
    description: "Backup, diagnostics, override packs, and account/app context.",
    render: ({ importWarnings, overrideWarnings, plannerOutput }) => (
      <SettingsWorkspace
        importWarnings={importWarnings}
        overrideWarnings={overrideWarnings}
        plannerWarnings={plannerOutput.warnings}
      />
    ),
  },
];
