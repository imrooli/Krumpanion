import { StatusBadge } from "../../app/layoutPrimitives";
import type { CraftingRecipeCategory } from "../../domain/crafting/types";
import type { StaticGameData } from "../../domain/staticData/types";
import { selectActivePlannerSettings } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import {
  formatActionableRuns,
  formatActivityType,
  formatAvailabilityLabel,
  formatDayCount,
  formatEstimatedRuns,
  formatInteger,
  formatMaterialQuantity,
  formatRecommendationAction,
  formatUnknownEstimateLabel,
} from "./plannerFormatting";
import type { PlannerUiRow } from "./plannerUiModel";
import { InlineMaterialQuantityEditor } from "../inventory/InlineMaterialQuantityEditor";

interface PlannerRecommendationCardProps {
  row: PlannerUiRow;
  staticData: StaticGameData;
  compact?: boolean;
  enableInlineQuantityEditing?: boolean;
}

interface PlannerEditableTierRow {
  materialKey: string;
  materialName: string;
  ownedQuantity: number;
  importedQuantity?: number;
  shortageQuantity: number;
}

interface PlannerEditableCraftStep {
  key: string;
  inputMaterialKey: string;
  inputMaterialName: string;
  outputMaterialKey: string;
  outputMaterialName: string;
  inputQuantity: number;
  outputQuantity: number;
  maxCraftable: number;
  maxUseful: number;
  recipeCategory?: CraftingRecipeCategory;
}

interface PlannerEditableFamilyBlock {
  key: string;
  label: string;
  helperNote?: string;
  shortageSummary: string | null;
  tierRows: PlannerEditableTierRow[];
  craftSteps: PlannerEditableCraftStep[];
}

interface PlannerEditableStandaloneMaterial {
  materialKey: string;
  materialName: string;
  ownedQuantity: number;
  importedQuantity?: number;
  shortageQuantity: number;
}

function RecommendationChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <span className="muted">General planning context</span>;
  }

  const visibleLabels = labels.slice(0, 3);
  const hiddenCount = Math.max(0, labels.length - visibleLabels.length);

  return (
    <div className="planner-chip-row" aria-label="Related goals">
      {visibleLabels.map((label) => (
        <span key={label} className="planner-chip">
          {label}
        </span>
      ))}
      {hiddenCount > 0 ? <span className="badge-overflow">+{hiddenCount} more</span> : null}
    </div>
  );
}

function LeyLineLocationList({
  row,
}: {
  row: PlannerUiRow;
}) {
  const details = row.leyLineEnemyDropDetails;
  if (!details) {
    return null;
  }

  if (details.locationRecommendations.length === 0) {
    return <div className="muted">{details.emptyStateMessage ?? "No Ley Line enemy-spawn recommendation is currently available for this material family."}</div>;
  }

  return (
    <ol className="planner-detail-list">
      {details.locationRecommendations.map((location) => (
        <li key={location.locationKey}>
          <strong>
            {location.region} - {location.areaName} Location {location.locationNumber}
          </strong>
          <div>
            Spawns:{" "}
            {location.guaranteedEnemySpawns.length > 0
              ? location.guaranteedEnemySpawns.map((spawn) => `${spawn.enemyName} x${formatInteger(spawn.count)}`).join(", ")
              : "Optional nearby coverage only"}
          </div>
          {location.optionalNearbyEnemySpawns.length > 0 ? (
            <div className="muted">
              Optional nearby: {location.optionalNearbyEnemySpawns.map((spawn) => `${spawn.enemyName} x${formatInteger(spawn.count)}`).join(", ")}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function LeyLineRegionList({
  row,
}: {
  row: PlannerUiRow;
}) {
  const details = row.leyLineEnemyDropDetails;
  if (!details || details.regionRecommendations.length === 0) {
    return null;
  }

  return (
    <ol className="planner-detail-list">
      {details.regionRecommendations.map((region) => (
        <li key={region.region}>
          <strong>{region.region}</strong>
          <div>
            Useful Ley Lines: {formatInteger(region.locationCount)}
            {region.optionalOnlyLocationCount > 0 ? ` (${formatInteger(region.optionalOnlyLocationCount)} optional-only)` : ""}
          </div>
          <div>Guaranteed matching spawns: {formatInteger(region.totalGuaranteedEnemyCount)}</div>
          <div>
            Best areas: {region.locations.slice(0, 3).map((location) => `${location.areaName} Location ${location.locationNumber}`).join(", ")}
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatLeyLineMatchedFamilyLabels(row: PlannerUiRow): string[] {
  const details = row.leyLineEnemyDropDetails;
  if (!details) {
    return [];
  }

  return details.matchedFamilies.map((family) => `${family.familyDisplayName} x${formatInteger(family.quantity)}`);
}

function getFamilyLabel(
  staticData: StaticGameData,
  familyEntry: StaticGameData["tieredMaterialIndex"][string],
): string {
  switch (familyEntry.familyType) {
    case "talent_book_family":
      return staticData.talentBookFamilies[familyEntry.familyKey]?.key ?? familyEntry.familyKey;
    case "weapon_ascension_material_family":
      return staticData.weaponAscensionMaterialFamilies[familyEntry.familyKey]?.displayName ?? familyEntry.familyKey;
    case "general_enemy_drop_family":
      return staticData.generalEnemyDropFamilies[familyEntry.familyKey]?.displayName ?? familyEntry.familyKey;
    case "elite_enemy_drop_family":
      return staticData.eliteEnemyDropFamilies[familyEntry.familyKey]?.displayName ?? familyEntry.familyKey;
    case "element_gem_family":
      return staticData.elementGemFamilies[familyEntry.familyKey]?.key ?? familyEntry.familyKey;
    default:
      return familyEntry.familyKey;
  }
}

function formatShortageSummary(materials: Array<{ materialName: string; quantity: number }>): string | null {
  const visible = materials.filter((material) => material.quantity > 0);
  if (visible.length === 0) {
    return null;
  }

  return visible.map((material) => `${material.materialName} x${formatInteger(material.quantity)}`).join(", ");
}

function getPassiveOverrideLabel(
  recipeCategory: string | undefined,
  plannerSettings: ReturnType<typeof selectActivePlannerSettings>,
  staticData: StaticGameData,
): string | null {
  if (!recipeCategory) {
    return null;
  }

  const overrideKey =
    recipeCategory === "talent_level_up_material"
      ? plannerSettings.craftingPassiveOverrides?.talentMaterials
      : recipeCategory === "weapon_ascension_material"
        ? plannerSettings.craftingPassiveOverrides?.weaponAscensionMaterials
        : recipeCategory === "character_weapon_enhancement_material"
          ? plannerSettings.craftingPassiveOverrides?.characterWeaponEnhancementMaterials
          : recipeCategory === "potion"
            ? plannerSettings.craftingPassiveOverrides?.potions
            : null;

  if (!overrideKey) {
    return null;
  }

  const passive = staticData.craftingUtilityPassives[overrideKey];
  return passive ? `Passive override: ${passive.characterName}` : null;
}

function buildFamilyHelperNote(
  recipeCategory: string | undefined,
  plannerSettings: ReturnType<typeof selectActivePlannerSettings>,
  staticData: StaticGameData,
): string | undefined {
  const notes: string[] = [];

  if (plannerSettings.craftingModeForRequirementSatisfaction === "expected_value") {
    notes.push("Expected-value crafting enabled");
  }

  const passiveOverrideLabel = getPassiveOverrideLabel(recipeCategory, plannerSettings, staticData);
  if (passiveOverrideLabel) {
    notes.push(passiveOverrideLabel);
  }

  return notes.length > 0 ? notes.join(" • ") : undefined;
}

function computeUsefulCraftOutputs(
  tierKeys: string[],
  shortagesByKey: Map<string, number>,
  inventory: Record<string, number>,
  staticData: StaticGameData,
): Record<string, number> {
  const neededOutputs = tierKeys.map((materialKey) => shortagesByKey.get(materialKey) ?? 0);
  const usefulByKey: Record<string, number> = {};

  for (let tierIndex = tierKeys.length - 1; tierIndex > 0; tierIndex -= 1) {
    const materialKey = tierKeys[tierIndex];
    const remainingNeed = Math.max(0, neededOutputs[tierIndex] - (inventory[materialKey] ?? 0));
    usefulByKey[materialKey] = remainingNeed;

    if (remainingNeed === 0) {
      continue;
    }

    const recipe = staticData.craftingRecipes[materialKey] ?? staticData.recipes[materialKey];
    const inputQuantity = recipe?.inputMaterials?.[0]?.quantity ?? 0;
    if (inputQuantity > 0) {
      neededOutputs[tierIndex - 1] += remainingNeed * inputQuantity;
    }
  }

  return usefulByKey;
}

function buildCraftUpdates(
  inventory: Record<string, number>,
  step: PlannerEditableCraftStep,
  craftCount: number,
): Record<string, number> | null {
  if (!Number.isInteger(craftCount) || craftCount <= 0) {
    return null;
  }

  const currentInput = inventory[step.inputMaterialKey] ?? 0;
  const currentOutput = inventory[step.outputMaterialKey] ?? 0;
  const maxCraftable = Math.floor(currentInput / step.inputQuantity);
  const safeCraftCount = Math.min(craftCount, maxCraftable);

  if (safeCraftCount <= 0) {
    return null;
  }

  return {
    [step.inputMaterialKey]: currentInput - safeCraftCount * step.inputQuantity,
    [step.outputMaterialKey]: currentOutput + safeCraftCount * step.outputQuantity,
  };
}

function buildEditableMaterialState(
  row: PlannerUiRow,
  staticData: StaticGameData,
  inventory: Record<string, number>,
  importedInventory: Record<string, number>,
  plannerSettings: ReturnType<typeof selectActivePlannerSettings>,
): {
  familyBlocks: PlannerEditableFamilyBlock[];
  standaloneMaterials: PlannerEditableStandaloneMaterial[];
} {
  const shortagesByKey = new Map(row.primaryMaterials.map((material) => [material.materialId, material.quantity]));
  const familyMap = new Map<
    string,
    {
      familyEntry: StaticGameData["tieredMaterialIndex"][string];
      order: number;
    }
  >();
  const standaloneMaterials: PlannerEditableStandaloneMaterial[] = [];

  row.primaryMaterials.forEach((material, index) => {
    const familyEntry = staticData.tieredMaterialIndex[material.materialId];
    if (!familyEntry) {
      standaloneMaterials.push({
        materialKey: material.materialId,
        materialName: staticData.materials[material.materialId]?.displayName ?? material.materialId,
        ownedQuantity: inventory[material.materialId] ?? 0,
        importedQuantity: importedInventory[material.materialId],
        shortageQuantity: material.quantity,
      });
      return;
    }

    const familyKey = `${familyEntry.familyType}:${familyEntry.familyKey}`;
    if (!familyMap.has(familyKey)) {
      familyMap.set(familyKey, {
        familyEntry,
        order: index,
      });
    }
  });

  const familyBlocks = [...familyMap.entries()]
    .sort((left, right) => left[1].order - right[1].order)
    .map(([familyKey, value]) => {
      const tierRows = value.familyEntry.tierKeys.map((materialKey) => ({
        materialKey,
        materialName: staticData.materials[materialKey]?.displayName ?? materialKey,
        ownedQuantity: inventory[materialKey] ?? 0,
        importedQuantity: importedInventory[materialKey],
        shortageQuantity: shortagesByKey.get(materialKey) ?? 0,
      }));
      const usefulCraftByOutput = computeUsefulCraftOutputs(value.familyEntry.tierKeys, shortagesByKey, inventory, staticData);
      const craftSteps: PlannerEditableCraftStep[] = value.familyEntry.tierKeys
        .slice(0, -1)
        .reduce<PlannerEditableCraftStep[]>((steps, inputMaterialKey, index) => {
          const outputMaterialKey = value.familyEntry.tierKeys[index + 1];
          const recipe = staticData.craftingRecipes[outputMaterialKey] ?? staticData.recipes[outputMaterialKey];
          const inputQuantity = recipe?.inputMaterials?.[0]?.quantity ?? 0;
          const outputQuantity = recipe?.outputQuantity ?? 1;
          if (!recipe || inputQuantity <= 0) {
            return steps;
          }

          const maxCraftable = Math.floor((inventory[inputMaterialKey] ?? 0) / inputQuantity);
          const maxUseful = Math.min(maxCraftable, usefulCraftByOutput[outputMaterialKey] ?? 0);

          steps.push({
            key: `${familyKey}:${inputMaterialKey}->${outputMaterialKey}`,
            inputMaterialKey,
            inputMaterialName: staticData.materials[inputMaterialKey]?.displayName ?? inputMaterialKey,
            outputMaterialKey,
            outputMaterialName: staticData.materials[outputMaterialKey]?.displayName ?? outputMaterialKey,
            inputQuantity,
            outputQuantity,
            maxCraftable,
            maxUseful,
            recipeCategory: recipe.category,
          });
          return steps;
        }, []);

      return {
        key: familyKey,
        label: getFamilyLabel(staticData, value.familyEntry),
        helperNote: buildFamilyHelperNote(craftSteps[0]?.recipeCategory, plannerSettings, staticData),
        shortageSummary: formatShortageSummary(
          tierRows.map((tierRow) => ({
            materialName: tierRow.materialName,
            quantity: tierRow.shortageQuantity,
          })),
        ),
        tierRows,
        craftSteps,
      } satisfies PlannerEditableFamilyBlock;
    });

  return {
    familyBlocks,
    standaloneMaterials,
  };
}

function EditableMaterialBreakdown({
  row,
  staticData,
}: {
  row: PlannerUiRow;
  staticData: StaticGameData;
}) {
  const activeAccount = useAppStore((state) => state.user.accountsById[state.user.activeAccountId] ?? null);
  const plannerSettings = useAppStore(selectActivePlannerSettings);
  const setActiveMaterialQuantity = useAppStore((state) => state.setActiveMaterialQuantity);
  const bulkSetActiveMaterialQuantities = useAppStore((state) => state.bulkSetActiveMaterialQuantities);
  const resetActiveMaterialToImported = useAppStore((state) => state.resetActiveMaterialToImported);

  if (!activeAccount || row.primaryMaterials.length === 0) {
    return null;
  }

  const { familyBlocks, standaloneMaterials } = buildEditableMaterialState(
    row,
    staticData,
    activeAccount.inventory,
    activeAccount.importedInventory,
    plannerSettings,
  );

  async function applyCraftStep(step: PlannerEditableCraftStep, craftCount: number) {
    const updates = buildCraftUpdates(activeAccount.inventory, step, craftCount);
    if (!updates) {
      return;
    }
    await bulkSetActiveMaterialQuantities(updates, { source: "bulk" });
  }

  return (
    <div className="planner-editable-material-list">
      {familyBlocks.map((familyBlock) => (
        <section key={`${row.id}-${familyBlock.key}`} className="planner-editable-family-block">
          <div className="planner-editable-family-header">
            <div>
              <strong>{familyBlock.label}</strong>
              {familyBlock.shortageSummary ? <div className="muted">Useful shortages: {familyBlock.shortageSummary}</div> : null}
              {familyBlock.helperNote ? <div className="muted">{familyBlock.helperNote}</div> : null}
            </div>
          </div>
          <div className="planner-editable-family-tier-list">
            {familyBlock.tierRows.map((tierRow) => (
              <div key={`${familyBlock.key}-${tierRow.materialKey}`} className="planner-editable-family-tier-row">
                <div>
                  <strong>{tierRow.materialName}</strong>
                  <div className="muted">
                    {tierRow.shortageQuantity > 0 ? `Shortage: ${formatInteger(tierRow.shortageQuantity)}` : "No current shortage"}
                  </div>
                </div>
                <InlineMaterialQuantityEditor
                  materialKey={tierRow.materialKey}
                  materialName={tierRow.materialName}
                  quantity={tierRow.ownedQuantity}
                  importedQuantity={tierRow.importedQuantity}
                  onCommit={(quantity) => void setActiveMaterialQuantity(tierRow.materialKey, quantity)}
                  onResetToImported={
                    typeof tierRow.importedQuantity === "number"
                      ? () => void resetActiveMaterialToImported(tierRow.materialKey)
                      : undefined
                  }
                  stepDeltas={[-1, 1]}
                  showCustomAdd
                />
              </div>
            ))}
          </div>
          {familyBlock.craftSteps.length > 0 ? (
            <div className="planner-editable-family-craft-list">
              {familyBlock.craftSteps.map((step) => (
                <div key={step.key} className="planner-editable-family-craft-row">
                  <div>
                    <strong>
                      {step.inputMaterialName} {"->"} {step.outputMaterialName}
                    </strong>
                    <div className="muted">
                      {formatInteger(step.inputQuantity)} for {formatInteger(step.outputQuantity)} • {formatInteger(step.maxCraftable)} craftable
                      {step.maxUseful > 0 ? ` • ${formatInteger(step.maxUseful)} useful now` : ""}
                    </div>
                  </div>
                  <div className="button-row wrap">
                    <button
                      type="button"
                      className="button-ghost inline-quantity-button"
                      onClick={() => void applyCraftStep(step, 1)}
                      disabled={step.maxCraftable < 1}
                    >
                      Craft 1
                    </button>
                    <button
                      type="button"
                      className="button-ghost inline-quantity-button"
                      onClick={() => void applyCraftStep(step, step.maxUseful)}
                      disabled={step.maxUseful < 1}
                    >
                      Craft max useful
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ))}
      {standaloneMaterials.map((material) => {
        return (
          <div key={`${row.id}-${material.materialKey}`} className="planner-editable-material-row">
            <div>
              <strong>{material.materialName}</strong>
              <div className="muted">Shortage: {formatInteger(material.shortageQuantity)}</div>
            </div>
            <InlineMaterialQuantityEditor
              materialKey={material.materialKey}
              materialName={material.materialName}
              quantity={material.ownedQuantity}
              importedQuantity={material.importedQuantity}
              onCommit={(quantity) => void setActiveMaterialQuantity(material.materialKey, quantity)}
              onResetToImported={
                typeof material.importedQuantity === "number"
                  ? () => void resetActiveMaterialToImported(material.materialKey)
                  : undefined
              }
              stepDeltas={[-1, 1]}
              showCustomAdd
            />
          </div>
        );
      })}
    </div>
  );
}

export function PlannerRecommendationCard({
  row,
  staticData,
  compact = false,
  enableInlineQuantityEditing = false,
}: PlannerRecommendationCardProps) {
  const activityName = row.sourceName ?? row.title;
  const actionSentence = formatRecommendationAction(row);
  const estimatedRunsLabel = formatEstimatedRuns(row);
  const relatedGoalLabels = row.relatedGoalLabels ?? [];
  const warningLabels = row.warnings ?? [];
  const materials = row.primaryMaterials.map((material) => formatMaterialQuantity(material.materialId, material.quantity, staticData));
  const incidentalMaterials = row.incidentalMaterials.map((material) =>
    formatMaterialQuantity(material.materialId, material.quantity, staticData),
  );
  const expectedRewards = row.expectedRewards?.map((material) => formatMaterialQuantity(material.materialId, material.quantity, staticData)) ?? [];
  const leyLineModeLabel = row.leyLineEnemyDropDetails?.modeLabel ?? null;
  const leyLineMatchedFamilies = formatLeyLineMatchedFamilyLabels(row);
  const materialChain = row.leyLineEnemyDropDetails?.materialChain.map((materialId) => staticData.materials[materialId]?.displayName ?? materialId) ?? [];
  const bestRegion = row.leyLineEnemyDropDetails?.bestRegion ?? null;
  const displayedMaterials = row.leyLineEnemyDropDetails?.mode === "stockpile" ? leyLineMatchedFamilies : materials;
  const visibleMaterials = compact ? displayedMaterials.slice(0, 4) : displayedMaterials;
  const hiddenMaterialCount = Math.max(0, displayedMaterials.length - visibleMaterials.length);
  const visibleWarnings = warningLabels.slice(0, compact ? 1 : 3);
  const materialsLabel =
    row.actionSubgroup === "ley_line_enemy_drops"
      ? row.leyLineEnemyDropDetails?.mode === "stockpile"
        ? "Lowest inventory families"
        : "Current deficits"
      : row.category === "boss"
        ? "Unique boss materials"
        : row.category === "weekly_boss"
          ? "Target materials"
          : "Materials covered";

  return (
    <article className={`planner-recommendation-card ${compact ? "is-compact" : ""}`.trim()}>
      <div className="planner-recommendation-header">
        <div className="stack planner-recommendation-heading">
          <div className="planner-recommendation-title-row">
            <h4>{activityName}</h4>
            <StatusBadge
              compact={compact}
              tone={row.actionSubgroup === "unknown_estimates" ? "warning" : row.totalEstimatedResin != null ? "accent" : "muted"}
            >
              {formatActivityType(row)}
            </StatusBadge>
          </div>
          {row.title !== activityName ? <p className="muted">{row.title}</p> : null}
          <p className="planner-action-sentence">{row.actionSubgroup === "unknown_estimates" ? formatUnknownEstimateLabel(row) : actionSentence}</p>
        </div>
        {row.priorityLabel ? (
          <StatusBadge compact={compact} tone={row.priorityLabel === "High" ? "warning" : row.priorityLabel === "Blocked" ? "muted" : "default"}>
            {row.priorityLabel}
          </StatusBadge>
        ) : null}
      </div>

      <div className="planner-recommendation-grid">
        <div>
          <div className="planner-field-label">{materialsLabel}</div>
          <div className="planner-material-list">
            {materials.length > 0 ? (
              <>
                {visibleMaterials.map((material) => (
                  <span key={material} className="planner-chip">
                    {material}
                  </span>
                ))}
                {hiddenMaterialCount > 0 ? <span className="badge-overflow">+{hiddenMaterialCount} more</span> : null}
              </>
            ) : (
              <span className="muted">No material breakdown provided.</span>
            )}
          </div>
          {materialChain.length > 0 ? (
            <>
              <div className="planner-field-label">Material chain</div>
              <div className="planner-material-list">
                {materialChain.map((material) => (
                  <span key={material} className="planner-chip">
                    {material}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {leyLineModeLabel ? (
            <>
              <div className="planner-field-label">Recommendation mode</div>
              <div>{leyLineModeLabel}</div>
            </>
          ) : null}
          {bestRegion ? (
            <>
              <div className="planner-field-label">Best nation</div>
              <div>{bestRegion}</div>
            </>
          ) : null}
        </div>
        <div>
          <div className="planner-field-label">Related goals</div>
          <RecommendationChips labels={relatedGoalLabels} />
        </div>
      </div>

      <div className="planner-metadata-row">
        {row.expectedAdvisoryResin != null ? <span>{`${formatInteger(row.expectedAdvisoryResin)} expected resin`}</span> : null}
        {row.expectedAdvisoryActionableRuns != null ? (
          <span>{`${formatInteger(row.expectedAdvisoryActionableRuns)} expected runs`}</span>
        ) : null}
        {row.expectedAdvisoryDays != null ? <span>{formatDayCount(row.expectedAdvisoryDays, "resin day")}</span> : null}
        {row.totalEstimatedResin != null
          ? <span>{`${formatInteger(row.totalEstimatedResin)} worst-case guaranteed resin`}</span>
          : row.estimateClassification === "chance_based"
            ? <span>Chance-based · excluded</span>
            : <span>No resin</span>}
        {row.resinPerRun != null ? <span>{`${formatInteger(row.resinPerRun)} resin/run`}</span> : null}
        {row.actionableRuns != null ? <span>{`${formatActionableRuns(row)} worst-case`}</span> : null}
        {estimatedRunsLabel && row.estimatedRuns !== row.actionableRuns ? <span>{`${estimatedRunsLabel} worst-case`}</span> : null}
        <span>{formatAvailabilityLabel(row.availability)}</span>
        {row.estimatedDaysLabel && row.expectedAdvisoryDays == null ? <span>{row.estimatedDaysLabel}</span> : null}
        {row.dayEstimateNote ? <span>{row.dayEstimateNote}</span> : null}
      </div>

      {warningLabels.length > 0 ? (
        <div className="planner-warning-chip-row" aria-label="Planner warnings">
          {visibleWarnings.map((warning) => (
            <span key={warning} className="planner-warning-chip">
              {warning}
            </span>
          ))}
          {warningLabels.length > visibleWarnings.length ? <span className="badge-overflow">+{warningLabels.length - visibleWarnings.length} more</span> : null}
        </div>
      ) : null}

      <details className="planner-recommendation-details">
        <summary>{enableInlineQuantityEditing ? "Details and edit quantities" : "Show details"}</summary>
        <div className="planner-detail-list">
          {enableInlineQuantityEditing ? (
            <div>
              <strong>Update owned quantities</strong>
              <EditableMaterialBreakdown row={row} staticData={staticData} />
            </div>
          ) : null}
          <div>
            <strong>Recommendation</strong>
            <div>{row.reason}</div>
          </div>
          {row.estimateBasis ? (
            <div>
              <strong>Estimate basis</strong>
              <div>{row.estimateBasis}</div>
            </div>
          ) : null}
          {row.leyLineEnemyDropDetails ? (
            <div>
              <strong>{row.leyLineEnemyDropDetails.mode === "stockpile" ? "Top stockpile nations" : "Best nations"}</strong>
              <LeyLineRegionList row={row} />
            </div>
          ) : null}
          {row.leyLineEnemyDropDetails?.matchedFamilies.length ? (
            <div>
              <strong>
                {row.leyLineEnemyDropDetails.quantityContext === "owned" ? "Matched low-stock families" : "Matched deficit families"}
              </strong>
              <div className="planner-material-list">
                {row.leyLineEnemyDropDetails.matchedFamilies.map((family) => (
                  <span
                    key={`${row.id}-${family.familyKey}`}
                    className="planner-chip"
                  >
                    {family.familyDisplayName} x{formatInteger(family.quantity)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {row.leyLineEnemyDropDetails?.uncoveredFamilies?.length ? (
            <div>
              <strong>Uncovered low-stock families</strong>
              <div className="planner-material-list">
                {row.leyLineEnemyDropDetails.uncoveredFamilies.map((family) => (
                  <span
                    key={`${row.id}-uncovered-${family.familyKey}`}
                    className="planner-warning-chip"
                  >
                    {family.familyDisplayName} x{formatInteger(family.quantity)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {row.leyLineEnemyDropDetails ? (
            <div>
              <strong>Best Ley Line areas</strong>
              <LeyLineLocationList row={row} />
            </div>
          ) : null}
          {row.earliestCompletionLabel ? (
            <div>
              <strong>Estimated completion</strong>
              <div>{row.earliestCompletionLabel}</div>
            </div>
          ) : null}
          {incidentalMaterials.length > 0 ? (
            <div>
              <strong>Incidental drops</strong>
              <div className="planner-material-list">
                {incidentalMaterials.map((material) => (
                  <span key={material} className="planner-chip">
                    {material}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {expectedRewards.length > 0 ? (
            <div>
              <strong>Expected rewards</strong>
              <div className="planner-material-list">
                {expectedRewards.map((reward) => (
                  <span key={reward} className="planner-chip">
                    {reward}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {warningLabels.length > 0 ? (
            <div>
              <strong>Warnings</strong>
              <ul className="warning-list">
                {warningLabels.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {row.leyLineEnemyDropDetails ? (
            <div>
              <strong>Incidental drop note</strong>
              <div>{row.leyLineEnemyDropDetails.incidentalDropNote}</div>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}
