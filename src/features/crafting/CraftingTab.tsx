import { useEffect, useMemo, useState } from "react";
import {
  EmptyStateCard,
  InspectorPanel,
  MetricStrip,
  PageHeader,
  SplitWorkspace,
  StatusBadge,
  WarningPanel,
} from "../../app/layoutPrimitives";
import type { PlannerOutput } from "../../domain/planner/types";
import { selectActiveAccount, selectActiveGoals } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import {
  buildCraftingPreview,
  buildCraftingWorkbenchModel,
  createCraftingRecordDraft,
  getCraftingBenchStepsForInventory,
  type CraftingWorkbenchAction,
  type CraftingRecordDraft,
} from "./craftingWorkbenchModel";

interface CraftingTabProps {
  plannerOutput: PlannerOutput;
}

function formatQuantity(value: number) {
  return value.toLocaleString();
}

function parseIntegerInput(value: string, fallback = 0) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return fallback;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return parsed;
}

function limitDraftToStep(draft: CraftingRecordDraft, stepId: string): CraftingRecordDraft {
  let targetReached = false;
  return {
    stepRecords: draft.stepRecords.map((record) => {
      if (targetReached) {
        return {
          ...record,
          completedCrafts: 0,
          bonusOutputs: 0,
          refundedInputs: 0,
          yaeExtraMaterialKey: "",
          yaeExtraQuantity: 0,
        };
      }

      if (record.stepId === stepId) {
        targetReached = true;
      }

      return { ...record };
    }),
    correctionDeltas: {},
  };
}

function getStepHeading(
  stepIndex: number,
  action: CraftingWorkbenchAction,
  outputName: string,
  inputName: string,
) {
  if (action.mode === "dust_conversion") {
    return `Step ${stepIndex}: Convert ${inputName} into ${outputName}`;
  }
  return `Step ${stepIndex}: Craft ${outputName}`;
}

export function CraftingTab({ plannerOutput }: CraftingTabProps) {
  const activeAccount = useAppStore(selectActiveAccount);
  const goals = useAppStore(selectActiveGoals);
  const staticData = useAppStore((state) => state.staticData);
  const today = useAppStore((state) => state.today);
  const bulkSetActiveMaterialQuantities = useAppStore((state) => state.bulkSetActiveMaterialQuantities);

  const workbench = useMemo(() => buildCraftingWorkbenchModel(plannerOutput, staticData), [plannerOutput, staticData]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(workbench.actions[0]?.id ?? null);
  const [draft, setDraft] = useState(
    workbench.actions[0] && activeAccount
      ? createCraftingRecordDraft(workbench.actions[0], activeAccount.inventory, staticData)
      : null,
  );
  const [applyMessage, setApplyMessage] = useState("");
  const [applyError, setApplyError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!workbench.actions.length) {
      setSelectedActionId(null);
      setDraft(null);
      return;
    }
    if (!workbench.actions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(workbench.actions[0].id);
    }
  }, [selectedActionId, workbench.actions]);

  const selectedAction = useMemo(
    () => workbench.actions.find((action) => action.id === selectedActionId) ?? workbench.actions[0] ?? null,
    [selectedActionId, workbench.actions],
  );

  const displaySteps = useMemo(() => {
    if (!selectedAction || !activeAccount) {
      return [];
    }
    return getCraftingBenchStepsForInventory(selectedAction, activeAccount.inventory, staticData);
  }, [activeAccount, selectedAction, staticData]);

  useEffect(() => {
    if (!selectedAction) {
      setDraft(null);
      return;
    }
    setDraft(createCraftingRecordDraft(selectedAction, activeAccount?.inventory, staticData));
    setApplyMessage("");
    setApplyError("");
  }, [selectedAction, activeAccount?.id, activeAccount?.inventory, staticData]);

  const preview = useMemo(() => {
    if (!selectedAction || !draft || !activeAccount) {
      return null;
    }

    return buildCraftingPreview({
      action: selectedAction,
      draft,
      inventory: activeAccount.inventory,
      plannerOutput,
      account: activeAccount,
      goals,
      staticData,
      today,
    });
  }, [activeAccount, draft, goals, plannerOutput, selectedAction, staticData, today]);

  const previewByStepId = useMemo(() => {
    const previews = new Map<string, NonNullable<typeof preview>>();
    if (!selectedAction || !draft || !activeAccount) {
      return previews;
    }

    for (const step of displaySteps) {
      previews.set(
        step.id,
        buildCraftingPreview({
          action: selectedAction,
          draft: limitDraftToStep(draft, step.id),
          inventory: activeAccount.inventory,
          plannerOutput,
          account: activeAccount,
          goals,
          staticData,
          today,
        }),
      );
    }

    return previews;
  }, [activeAccount, displaySteps, draft, goals, plannerOutput, selectedAction, staticData, today]);

  const stepRecordById = useMemo(
    () => new Map(draft?.stepRecords.map((record) => [record.stepId, record]) ?? []),
    [draft?.stepRecords],
  );

  function updateStepRecord(
    stepId: string,
    updater: (current: NonNullable<NonNullable<typeof draft>["stepRecords"][number]>) => NonNullable<NonNullable<typeof draft>["stepRecords"][number]>,
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        stepRecords: current.stepRecords.map((record) => (record.stepId === stepId ? updater(record) : record)),
      };
    });
    setApplyMessage("");
    setApplyError("");
  }

  function updateCorrection(materialKey: string, nextValue: number) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        correctionDeltas: {
          ...current.correctionDeltas,
          [materialKey]: nextValue,
        },
      };
    });
    setApplyMessage("");
    setApplyError("");
  }

  async function applyPreview(nextPreview: NonNullable<typeof preview>, successMessage: string) {
    if (!activeAccount || nextPreview.errors.length > 0) {
      return;
    }

    setIsApplying(true);
    setApplyMessage("");
    setApplyError("");
    try {
      const updates = Object.fromEntries(
        nextPreview.changedMaterialKeys.map((materialKey) => [materialKey, nextPreview.nextInventory[materialKey] ?? 0]),
      );
      await bulkSetActiveMaterialQuantities(updates, { source: "bulk" });
      setApplyMessage(successMessage);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsApplying(false);
    }
  }

  async function handleApplyStep(stepId: string, stepHeading: string) {
    const stepPreview = previewByStepId.get(stepId);
    if (!stepPreview || stepPreview.errors.length > 0 || stepPreview.changedMaterialKeys.length === 0 || !activeAccount) {
      return;
    }

    await applyPreview(stepPreview, `${stepHeading} applied to ${activeAccount.name}.`);
  }

  if (!activeAccount) {
    return (
      <section className="workspace-page crafting-workspace">
        <PageHeader
          eyebrow="Crafting"
          title="Crafting bench companion"
          description="Track shortage-reducing crafts, record the actual result, and keep the active account inventory aligned with what happened in game."
        />
        <EmptyStateCard
          title="No active account"
          description="Select or create an account before recording crafting results."
        />
      </section>
    );
  }

  if (!workbench.actions.length) {
    return (
      <section className="workspace-page crafting-workspace">
        <PageHeader
          eyebrow="Crafting"
          title="Crafting bench companion"
          description="Use this workflow next to the in-game bench to convert lower-tier materials into progression shortages and record the actual outcome."
        />
        <EmptyStateCard
          title="No useful crafting actions right now"
          description="When the active account can immediately reduce a live shortage through crafting or Dust of Azoth conversion, it will appear here."
        />
      </section>
    );
  }

  return (
    <section className="workspace-page crafting-workspace">
      <PageHeader
        eyebrow="Crafting"
        title="Crafting bench companion"
        description="Follow the bench sequence from lowest tier upward, record the real result on each step, and keep the active account inventory aligned with what happened in game."
      />

      <MetricStrip
        compact
        items={[
          { label: "Craft actions", value: formatQuantity(workbench.summary.actionCount), tone: "accent" },
          { label: "Guaranteed output", value: formatQuantity(workbench.summary.guaranteedOutput) },
          { label: "Dust conversions", value: formatQuantity(workbench.summary.dustConversionCount) },
          { label: "Crafting Mora", value: formatQuantity(workbench.summary.craftingMora), tone: "warning" },
          { label: "Goals helped", value: formatQuantity(workbench.summary.uniqueGoalsHelped), tone: "success" },
        ]}
      />

      <SplitWorkspace
        left={
          <article className="panel crafting-queue-panel">
            <div className="section-header">
              <div>
                <h2>What to craft next</h2>
                <p className="muted">Grouped by progression system so the bench queue stays compact and easy to scan.</p>
              </div>
            </div>
            <div className="crafting-queue-groups">
              {workbench.groups.map((group) => (
                <section key={group.key} className="crafting-queue-group">
                  <div className="crafting-group-header">
                    <div>
                      <h3>{group.label}</h3>
                      <p className="muted">
                        {group.actions.length} action{group.actions.length === 1 ? "" : "s"} | {formatQuantity(group.totalShortageReduction)} shortage reduced
                      </p>
                    </div>
                  </div>
                  <div className="crafting-action-list">
                    {group.actions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className={`crafting-action-button ${selectedAction?.id === action.id ? "is-active" : ""}`.trim()}
                        onClick={() => setSelectedActionId(action.id)}
                      >
                        <div className="crafting-action-header">
                          <strong>{action.targetMaterialName}</strong>
                          <div className="crafting-action-badges">
                            {action.mode === "dust_conversion" ? <StatusBadge tone="success" compact>Dust</StatusBadge> : null}
                            {action.isMultiStep ? <StatusBadge tone="muted" compact>{action.stepCount} steps</StatusBadge> : null}
                          </div>
                        </div>
                        <div className="crafting-action-meta">
                          <span>{formatQuantity(action.guaranteedOutput)} output</span>
                          <span>{formatQuantity(action.moraCost)} Mora</span>
                          <span>
                            {formatQuantity(action.shortageBefore)}
                            {" -> "}
                            {formatQuantity(action.shortageAfter)}
                          </span>
                        </div>
                        <small>{action.stepSummary}</small>
                        <small className="muted">{action.ingredientSummary}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        }
        center={
          selectedAction && draft ? (
            <article className="panel crafting-main-panel">
              <div className="section-header">
                <div>
                  <h2>{selectedAction.targetMaterialName}</h2>
                  <p className="muted">
                    {selectedAction.mode === "dust_conversion"
                      ? "Convert the source gems in order, then record each completed conversion."
                      : "Craft each tier in order, record any bonus outputs or refunds on that step, and keep the inventory exact."}
                  </p>
                </div>
                <div className="badge-row is-compact">
                  <StatusBadge tone="accent" compact>{selectedAction.groupLabel}</StatusBadge>
                  <StatusBadge tone="warning" compact>{formatQuantity(selectedAction.moraCost)} Mora</StatusBadge>
                  <StatusBadge tone="success" compact>{formatQuantity(selectedAction.guaranteedOutput)} guaranteed</StatusBadge>
                </div>
              </div>

              <section className="crafting-instruction-card crafting-guide-card">
                <div className="section-header">
                  <div>
                    <h3>Craft in this order</h3>
                    <p className="muted">
                      {selectedAction.mode === "dust_conversion"
                        ? "Follow the conversion sequence below and record each finished conversion."
                        : "Start from the lowest visible tier, then continue upward until the final target step is complete."}
                    </p>
                  </div>
                </div>

                <div className="crafting-bench-step-list">
                  {displaySteps.map((step, index) => {
                    const record = stepRecordById.get(step.id);
                    if (!record) {
                      return null;
                    }

                    const stepHeading = getStepHeading(
                      index + 1,
                      selectedAction,
                      step.outputMaterialName,
                      step.inputMaterialName,
                    );
                    const stepPreview = previewByStepId.get(step.id);
                    return (
                      <article key={step.id} className="crafting-bench-step">
                        <div className="crafting-bench-step-top">
                          <div>
                            <strong>{stepHeading}</strong>
                            <p className="muted">
                              {selectedAction.mode === "dust_conversion"
                                ? `${formatQuantity(step.recommendedCrafts)} conversion${step.recommendedCrafts === 1 ? "" : "s"}`
                                : `${formatQuantity(step.recommendedCrafts)} craft${step.recommendedCrafts === 1 ? "" : "s"}`}
                            </p>
                          </div>
                          <div className="crafting-action-badges">
                            {step.isFinalTargetStep ? <StatusBadge tone="success" compact>Final step</StatusBadge> : null}
                            {step.dustCostTotal > 0 ? <StatusBadge tone="accent" compact>Dust</StatusBadge> : null}
                          </div>
                        </div>

                        <div className="crafting-step-metrics">
                          <span>
                            Uses {step.inputMaterialName} x{formatQuantity(step.totalInputQuantity)}
                          </span>
                          <span>
                            Output {step.outputMaterialName} x{formatQuantity(step.recommendedOutputQuantity)}
                          </span>
                          <span>{formatQuantity(step.totalMoraCost)} Mora</span>
                          {step.dustCostTotal > 0 ? (
                            <span>Dust of Azoth x{formatQuantity(step.dustCostTotal)}</span>
                          ) : null}
                        </div>

                        <div className="goal-grid-row three-up crafting-step-record-grid">
                          <label>
                            Completed crafts
                            <input
                              type="number"
                              min={0}
                              max={step.recommendedCrafts}
                              aria-label={`Completed crafts for ${stepHeading}`}
                              className="text-input"
                              value={record.completedCrafts}
                              onChange={(event) =>
                                updateStepRecord(step.id, (current) => ({
                                  ...current,
                                  completedCrafts: Math.max(
                                    0,
                                    Math.min(step.recommendedCrafts, parseIntegerInput(event.target.value, 0)),
                                  ),
                                }))
                              }
                            />
                          </label>
                          <label>
                            Bonus outputs
                            <input
                              type="number"
                              min={0}
                              aria-label={`Bonus outputs for ${stepHeading}`}
                              className={`text-input ${selectedAction.recommendedPassiveEffectType === "double_product" ? "crafting-highlight-input" : ""}`.trim()}
                              value={record.bonusOutputs}
                              onChange={(event) =>
                                updateStepRecord(step.id, (current) => ({
                                  ...current,
                                  bonusOutputs: Math.max(0, parseIntegerInput(event.target.value, 0)),
                                }))
                              }
                            />
                          </label>
                          {selectedAction.mode === "standard" ? (
                            <label>
                              Refunded inputs
                              <input
                                type="number"
                                min={0}
                                aria-label={`Refunded inputs for ${stepHeading}`}
                                className={`text-input ${selectedAction.recommendedPassiveEffectType === "refund_one_input" ? "crafting-highlight-input" : ""}`.trim()}
                                value={record.refundedInputs}
                                onChange={(event) =>
                                  updateStepRecord(step.id, (current) => ({
                                    ...current,
                                    refundedInputs: Math.max(0, parseIntegerInput(event.target.value, 0)),
                                  }))
                                }
                              />
                            </label>
                          ) : null}
                        </div>

                        <div className="crafting-step-support">
                          {selectedAction.mode === "standard" ? (
                            <p className="muted">
                              Possible refund: {step.inputMaterialName}
                            </p>
                          ) : null}
                          {selectedAction.recommendedPassiveName !== "No special passive" ? (
                            <p className="muted">
                              Passive: {selectedAction.recommendedPassiveName}
                              {selectedAction.recommendedPassiveTalent ? ` | ${selectedAction.recommendedPassiveTalent}` : ""}
                            </p>
                          ) : null}
                        </div>

                        {step.yaeExtraCandidates.length > 0 ? (
                          <details className="planner-section-disclosure">
                            <summary>Yae Miko extra material</summary>
                            <div className="goal-grid-row three-up crafting-inline-detail-grid">
                              <label>
                                Extra material
                                <select
                                  aria-label={`Yae extra material for ${stepHeading}`}
                                  value={record.yaeExtraMaterialKey}
                                  onChange={(event) =>
                                    updateStepRecord(step.id, (current) => ({
                                      ...current,
                                      yaeExtraMaterialKey: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">None</option>
                                  {step.yaeExtraCandidates.map((candidate) => (
                                    <option key={candidate.materialKey} value={candidate.materialKey}>
                                      {candidate.materialName}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Extra quantity
                                <input
                                  type="number"
                                  min={0}
                                  aria-label={`Yae extra quantity for ${stepHeading}`}
                                  className="text-input"
                                  value={record.yaeExtraQuantity}
                                  onChange={(event) =>
                                    updateStepRecord(step.id, (current) => ({
                                      ...current,
                                      yaeExtraQuantity: Math.max(0, parseIntegerInput(event.target.value, 0)),
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          </details>
                        ) : null}

                        <div className="button-row">
                          <button
                            type="button"
                            className="button-primary"
                            aria-label={`Apply craft result for ${stepHeading}`}
                            disabled={
                              isApplying ||
                              !stepPreview ||
                              stepPreview.errors.length > 0 ||
                              stepPreview.changedMaterialKeys.length === 0
                            }
                            onClick={() => void handleApplyStep(step.id, stepHeading)}
                          >
                            {isApplying ? "Applying..." : "Apply Craft Result"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="crafting-support-strip">
                <div className="mini-badge">Passive: {selectedAction.recommendedPassiveName}</div>
                <div className="mini-badge">{selectedAction.passiveEffectLabel}</div>
                <div className="mini-badge">
                  Goals linked: {formatQuantity(selectedAction.affectedGoals.length)}
                </div>
              </section>

              <details className="planner-section-disclosure crafting-secondary-disclosure">
                <summary>Preview inventory changes</summary>
                {preview ? (
                  <div className="crafting-preview-stack">
                    <div>
                      <strong>Inventory before / after</strong>
                      <ul className="ranked-list compact-list">
                        {preview.deltaLines.map((line) => (
                          <li key={line.materialKey}>
                            <strong>{line.materialName}</strong>
                            <span>
                              {formatQuantity(line.before)}
                              {" -> "}
                              {formatQuantity(line.after)} ({line.delta >= 0 ? "+" : ""}
                              {formatQuantity(line.delta)})
                            </span>
                          </li>
                        ))}
                        {!preview.deltaLines.length ? <li>No inventory changes yet.</li> : null}
                      </ul>
                    </div>
                    <div className="crafting-preview-grid">
                      <div>
                        <strong>Mora</strong>
                        <p className="muted">
                          {formatQuantity(activeAccount.inventory.Mora ?? 0)}
                          {" -> "}
                          {formatQuantity(preview.nextInventory.Mora ?? 0)}
                        </p>
                      </div>
                      <div>
                        <strong>Shortage</strong>
                        <p className="muted">
                          {formatQuantity(preview.targetShortageBefore)}
                          {" -> "}
                          {formatQuantity(preview.targetShortageAfter)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </details>

              <details className="planner-section-disclosure crafting-secondary-disclosure">
                <summary>Advanced adjustment</summary>
                <div className="crafting-correction-list">
                  {(preview?.deltaLines ?? []).map((line) => (
                    <label key={line.materialKey} className="crafting-correction-row">
                      <span>
                        <strong>{line.materialName}</strong>
                        <small className="muted">
                          Base {line.delta >= 0 ? "+" : ""}
                          {formatQuantity(line.delta)}
                        </small>
                      </span>
                      <input
                        type="number"
                        className="text-input"
                        value={draft.correctionDeltas[line.materialKey] ?? 0}
                        onChange={(event) => updateCorrection(line.materialKey, parseIntegerInput(event.target.value, 0))}
                      />
                    </label>
                  ))}
                  {!preview?.deltaLines.length ? <p className="muted">No material lines are available for adjustment yet.</p> : null}
                </div>
              </details>

              {preview?.errors.length ? (
                <WarningPanel title="Fix this draft" tone="error">
                  <ul className="warning-list">
                    {preview.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </WarningPanel>
              ) : null}
              {applyError ? (
                <WarningPanel title="Could not apply craft result" tone="error">
                  <p>{applyError}</p>
                </WarningPanel>
              ) : null}
              {applyMessage ? (
                <WarningPanel title="Craft result applied" tone="info">
                  <p>{applyMessage}</p>
                </WarningPanel>
              ) : null}

            </article>
          ) : (
            <EmptyStateCard title="No craft selected" description="Choose a craft from the left to inspect it." />
          )
        }
        right={
          selectedAction && preview ? (
            <InspectorPanel title="Craft impact">
              <div>
                <strong>Shortage after craft</strong>
                <p className="muted">
                  {formatQuantity(preview.targetShortageBefore)}
                  {" -> "}
                  {formatQuantity(preview.targetShortageAfter)}
                </p>
              </div>
              <div>
                <strong>Goals improved</strong>
                <ul className="warning-list">
                  {preview.affectedGoalsImproved.map((goal) => (
                    <li key={goal.goalKey}>
                      {goal.displayName} | {formatQuantity(goal.amount)} linked
                    </li>
                  ))}
                  {!preview.affectedGoalsImproved.length ? <li>No linked goal details available.</li> : null}
                </ul>
              </div>
              {preview.worsenedShortages.length ? (
                <div>
                  <strong>Other shortages worsened</strong>
                  <ul className="warning-list">
                    {preview.worsenedShortages.map((row) => (
                      <li key={row.materialKey}>
                        {row.displayName} | {formatQuantity(row.before)}
                        {" -> "}
                        {formatQuantity(row.after)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="muted">No other shortages worsen from the current draft.</p>
              )}
            </InspectorPanel>
          ) : undefined
        }
      />
    </section>
  );
}
