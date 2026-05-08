import { useEffect, useMemo, useState } from "react";
import { EmptyStateCard, InspectorPanel, PageHeader, SplitWorkspace, StatusBadge } from "../../app/layoutPrimitives";
import type { PlannerOutput } from "../../domain/planner/types";

interface CraftingTabProps {
  plannerOutput: PlannerOutput;
}

function getDirectShortage(report: PlannerOutput["craftingPlan"]["reports"][number]) {
  return Math.max(report.requiredAmount - report.ownedAmount, 0);
}

function getRecommendedCrafterName(report: PlannerOutput["craftingPlan"]["reports"][number]) {
  return report.recommendedPassive?.characterName ?? "No special crafter";
}

function getGuaranteedReduction(report: PlannerOutput["craftingPlan"]["reports"][number]) {
  return Math.min(report.guaranteedCrafting.outputAmount, getDirectShortage(report));
}

function getDustReduction(report: PlannerOutput["craftingPlan"]["reports"][number]) {
  return Math.min(report.dustOfAzothOption?.outputAmount ?? 0, report.dustOfAzothOption?.remainingMissing != null ? getDirectShortage(report) : 0);
}

function getIngredientSummary(report: PlannerOutput["craftingPlan"]["reports"][number]) {
  const ingredientTotals = report.guaranteedCrafting.steps.reduce<Record<string, { name: string; quantity: number }>>(
    (accumulator, step) => {
      const current = accumulator[step.inputKey] ?? { name: step.inputName, quantity: 0 };
      accumulator[step.inputKey] = {
        name: current.name,
        quantity: current.quantity + step.inputQuantity * step.crafts,
      };
      return accumulator;
    },
    {},
  );

  const entries = Object.values(ingredientTotals)
    .filter((entry) => entry.quantity > 0)
    .slice(0, 3)
    .map((entry) => `${entry.name} x${entry.quantity}`);

  return entries.length ? entries.join(", ") : "No ingredient spend required";
}

function getReportFamilyLabel(
  report: PlannerOutput["craftingPlan"]["reports"][number],
  plannerOutput: PlannerOutput,
) {
  const linkedRow = plannerOutput.totalMissingByMaterial.find((row) => row.materialKey === report.targetMaterialKey);
  return linkedRow?.familyDisplayName ?? linkedRow?.category?.replace(/_/g, " ") ?? "Other crafts";
}

export function CraftingTab({ plannerOutput }: CraftingTabProps) {
  const reports = useMemo(
    () =>
      plannerOutput.craftingPlan.reports.filter((report) => {
        const directShortage = getDirectShortage(report);
        if (directShortage <= 0) {
          return false;
        }

        const guaranteedUseful = getGuaranteedReduction(report) > 0;
        const dustUseful = (report.dustOfAzothOption?.outputAmount ?? 0) > 0;
        return guaranteedUseful || dustUseful;
      }),
    [plannerOutput.craftingPlan.reports],
  );
  const [selectedMaterialKey, setSelectedMaterialKey] = useState(reports[0]?.targetMaterialKey ?? "");
  const groupedReports = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        reports: typeof reports;
      }
    >();

    for (const report of reports) {
      const label = getReportFamilyLabel(report, plannerOutput);
      const key = label.toLowerCase();
      const group = groups.get(key);
      if (group) {
        group.reports.push(report);
        continue;
      }
      groups.set(key, {
        label,
        reports: [report],
      });
    }

    return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [plannerOutput, reports]);

  useEffect(() => {
    if (!reports.some((report) => report.targetMaterialKey === selectedMaterialKey)) {
      setSelectedMaterialKey(reports[0]?.targetMaterialKey ?? "");
    }
  }, [reports, selectedMaterialKey]);

  const selectedReport = reports.find((report) => report.targetMaterialKey === selectedMaterialKey) ?? reports[0];
  const linkedShortage = useMemo(
    () =>
      selectedReport
        ? plannerOutput.totalMissingByMaterial.find((row) => row.materialKey === selectedReport.targetMaterialKey)
        : undefined,
    [plannerOutput.totalMissingByMaterial, selectedReport],
  );

  if (!reports.length) {
    return (
      <section className="workspace-page">
        <PageHeader
          eyebrow="Crafting"
          title="Crafting actions"
          description="This workflow shows no-resin conversions you can do now to reduce active planner shortages."
        />
        <EmptyStateCard
          title="No doable crafting actions"
          description="When your current inventory can immediately reduce an active shortage through crafting or Dust of Azoth conversion, it will appear here."
        />
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Crafting"
        title="Doable crafting actions"
        description="Review shortage-reducing conversions you can do right now, including the best crafter to use before spending materials."
      />

      <div className="workspace-card-grid crafting-summary-grid">
        <article className="metric-card">
          <span>Recommendations</span>
          <strong>{reports.length}</strong>
        </article>
        <article className="metric-card">
          <span>Guaranteed reduction</span>
          <strong>{reports.reduce((sum, report) => sum + getGuaranteedReduction(report), 0)}</strong>
        </article>
        <article className="metric-card">
          <span>Dust conversions</span>
          <strong>{reports.reduce((sum, report) => sum + getDustReduction(report), 0)}</strong>
        </article>
        <article className="metric-card">
          <span>Crafting Mora</span>
          <strong>{plannerOutput.craftingPlan.totalCraftingMora}</strong>
        </article>
      </div>

      <SplitWorkspace
        left={
          <article className="panel">
            <div className="section-header">
              <div>
                <h2>Doable now</h2>
                <p className="muted">Choose an output material to inspect how much shortage it covers, what it costs, and who should craft it. Crafts are grouped by family so you can review the whole chain before spending materials.</p>
              </div>
            </div>
            <div className="catalog-list">
              {groupedReports.map((group) => (
                <section key={group.label} className="stack">
                  <div className="section-header">
                    <div>
                      <h3>{group.label}</h3>
                      <p className="muted">
                        {group.reports.length} shortage-reducing craft{group.reports.length === 1 ? "" : "s"} in this family.
                      </p>
                    </div>
                  </div>
                  {group.reports.map((report) => (
                    <button
                      key={report.targetMaterialKey}
                      type="button"
                      className={`catalog-item ${selectedReport?.targetMaterialKey === report.targetMaterialKey ? "is-active" : ""}`}
                      onClick={() => setSelectedMaterialKey(report.targetMaterialKey)}
                    >
                      <div>
                        <strong>{report.targetMaterialName}</strong>
                        <small>Use {getRecommendedCrafterName(report)}</small>
                        <div className="muted">Ingredients: {getIngredientSummary(report)}</div>
                      </div>
                      <div className="badge-row">
                        <StatusBadge tone="accent">{getGuaranteedReduction(report)} guaranteed</StatusBadge>
                        {(report.dustOfAzothOption?.outputAmount ?? 0) > 0 ? (
                          <StatusBadge tone="success">{report.dustOfAzothOption?.outputAmount ?? 0} Dust</StatusBadge>
                        ) : null}
                        <StatusBadge tone="warning">{report.guaranteedCrafting.moraCost} Mora</StatusBadge>
                      </div>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </article>
        }
        center={
          selectedReport ? (
            <article className="panel">
              <div className="section-header">
                <div>
                  <h2>{selectedReport.targetMaterialName}</h2>
                  <p className="muted">These are immediately doable, no-resin crafting actions that reduce a live planner shortage.</p>
                </div>
              </div>

              <div className="workspace-card-grid">
                <article className="metric-card">
                  <span>Guaranteed now</span>
                  <strong>{getGuaranteedReduction(selectedReport)}</strong>
                </article>
                <article className="metric-card">
                  <span>Crafting Mora</span>
                  <strong>{selectedReport.guaranteedCrafting.moraCost}</strong>
                </article>
                <article className="metric-card">
                  <span>Linked deficit</span>
                  <strong>{getDirectShortage(selectedReport)}</strong>
                </article>
                <article className="metric-card">
                  <span>Recommended crafter</span>
                  <strong>{getRecommendedCrafterName(selectedReport)}</strong>
                </article>
              </div>

              <div className="stack">
                <div>
                  <h3>Why this craft matters</h3>
                  <p className="muted">
                    Guaranteed crafting can cover {getGuaranteedReduction(selectedReport)} of the missing {selectedReport.targetMaterialName}.
                  </p>
                </div>
                <div>
                  <h3>Ingredient summary</h3>
                  <p className="muted">{getIngredientSummary(selectedReport)}</p>
                </div>
                <div>
                  <h3>Guaranteed crafting steps</h3>
                  <ul className="warning-list">
                    {selectedReport.guaranteedCrafting.steps.map((step, index) => (
                      <li key={`${step.outputMaterialKey}-${index}`}>
                        <strong>{step.inputName}</strong>
                        <span>
                          x{step.inputQuantity * step.crafts} → {step.outputName} x{step.crafts}
                        </span>
                      </li>
                    ))}
                    {!selectedReport.guaranteedCrafting.steps.length ? <li>No guaranteed craft path recorded.</li> : null}
                  </ul>
                </div>
                {selectedReport.dustOfAzothOption ? (
                  <div>
                    <h3>Dust of Azoth option</h3>
                    <p className="muted">
                      Convert up to {selectedReport.dustOfAzothOption.outputAmount} same-tier gems using {selectedReport.dustOfAzothOption.dustRequired} Dust of Azoth.
                    </p>
                  </div>
                ) : null}
                {selectedReport.recommendedPassive?.warning ? (
                  <div>
                    <h3>Crafter note</h3>
                    <p className="muted">{selectedReport.recommendedPassive.warning}</p>
                  </div>
                ) : null}
                {selectedReport.warnings.length ? (
                  <div>
                    <h3>Warnings</h3>
                    <ul className="warning-list">
                      {selectedReport.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </article>
          ) : (
            <EmptyStateCard title="No craft selected" description="Pick a recommendation from the left to inspect it." />
          )
        }
        right={
          selectedReport ? (
            <InspectorPanel title="Downstream impact">
              <div>
                <strong>Before and after</strong>
                <ul className="ranked-list compact-list">
                  <li>
                    <strong>Current shortage</strong>
                    <span>{getDirectShortage(selectedReport)}</span>
                  </li>
                  <li>
                    <strong>Guaranteed reduction</strong>
                    <span>{getGuaranteedReduction(selectedReport)}</span>
                  </li>
                  <li>
                    <strong>Dust option</strong>
                    <span>{selectedReport.dustOfAzothOption?.outputAmount ?? "—"}</span>
                  </li>
                  <li>
                    <strong>Remaining deficit</strong>
                    <span>{selectedReport.guaranteedCrafting.remainingMissing}</span>
                  </li>
                  <li>
                    <strong>Expected passive savings</strong>
                    <span>{selectedReport.expectedValue ? `${(selectedReport.expectedValue.expectedSavingsPercent * 100).toFixed(2)}%` : "—"}</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong>Affected goals</strong>
                <ul className="warning-list">
                  {linkedShortage?.usedBy.map((goal) => (
                    <li key={`${goal.goalType}-${goal.key}`}>
                      {goal.goalType}: {goal.key}
                    </li>
                  ))}
                  {!linkedShortage?.usedBy.length ? <li>No linked goal details available.</li> : null}
                </ul>
              </div>
            </InspectorPanel>
          ) : undefined
        }
      />
    </section>
  );
}
