import type { ImportWarning } from "../../domain/good/types";
import type { KrumpanionGoals } from "../../domain/goals/types";
import type { MaterialNeedRow, PlannerOutput, PlannerWarning } from "../../domain/planner/types";
import type { StaticDataIssue } from "../../domain/staticData/validateStaticData";

export type DataHealthSeverity = "blocking" | "warning" | "info" | "beta" | "ignored";

export type DataHealthCategory =
  | "Missing Playable Profile Data"
  | "Missing Material Source"
  | "Estimate Unavailable"
  | "Goal Calculation Risk"
  | "Beta or Unverified Data"
  | "Ignored or Deprecated Entries"
  | "Duplicate or Conflicting Data"
  | "Naming or GOOD Import Mismatch";

export type DataHealthAffectedType =
  | "character"
  | "weapon"
  | "material"
  | "family"
  | "goal"
  | "import"
  | "system"
  | "other";

export type DataHealthRawSourceType = "static_data" | "planner" | "import";

export type DataHealthSourceArea =
  | "characters"
  | "weapons"
  | "materials"
  | "families"
  | "sources"
  | "planner"
  | "GOOD import"
  | "database";

export interface DataHealthEditorTarget {
  workspaceTab?: "legacy" | "rawHealth";
  section?: "coverage" | "profiles" | "families" | "sources" | "advanced";
  entityType?:
    | "characters"
    | "weapons"
    | "materials"
    | "characterProfiles"
    | "weaponProfiles"
    | "elementGems"
    | "talentBooks"
    | "enemyDrops"
    | "weaponAscensions"
    | "localSpecialties"
    | "materialSources";
  recordKey?: string;
  field?: string;
  sourceArea?: DataHealthSourceArea;
  sourceFile?: string;
  rawSearchText?: string;
}

export interface DataHealthIssue {
  id: string;
  severity: DataHealthSeverity;
  category: DataHealthCategory;
  title: string;
  shortMessage: string;
  affectedType?: DataHealthAffectedType;
  affectedKey?: string;
  affectedName?: string;
  sourceArea?: DataHealthSourceArea;
  sourceFile?: string;
  suggestedAction?: string;
  canNavigateToEditor: boolean;
  editorTarget?: DataHealthEditorTarget;
  relatedKeys: string[];
  details?: string;
  affectsActiveGoals: boolean;
  priorityRank: number;
  rawSourceType: DataHealthRawSourceType;
  rawIssueId?: string;
}

export interface DataHealthSummary {
  totalIssues: number;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  betaCount: number;
  ignoredCount: number;
}

export interface DataHealthCleanupItem {
  key:
    | "active_goal_issues"
    | "playable_profiles"
    | "material_sources"
    | "import_aliases"
    | "beta_entries"
    | "ignored_entries";
  label: string;
  count: number;
  severity?: DataHealthSeverity | "all";
  category?: DataHealthCategory | "all";
  activeOnly?: boolean;
}

export interface DataHealthCenterModel {
  issues: DataHealthIssue[];
  summary: DataHealthSummary;
  categories: DataHealthCategory[];
  affectedTypes: DataHealthAffectedType[];
  cleanupItems: DataHealthCleanupItem[];
}

interface ActiveGoalContext {
  characterKeys: Set<string>;
  weaponKeys: Set<string>;
  materialKeys: Set<string>;
  relatedGoalKeys: Set<string>;
}

const CATEGORY_ORDER: DataHealthCategory[] = [
  "Missing Playable Profile Data",
  "Missing Material Source",
  "Estimate Unavailable",
  "Goal Calculation Risk",
  "Beta or Unverified Data",
  "Ignored or Deprecated Entries",
  "Duplicate or Conflicting Data",
  "Naming or GOOD Import Mismatch",
];

const AFFECTED_TYPE_ORDER: DataHealthAffectedType[] = [
  "character",
  "weapon",
  "material",
  "family",
  "goal",
  "import",
  "system",
  "other",
];

const CHARACTER_SOURCE_FILE = "src/data/database/characters/characterProfiles.json";
const WEAPON_SOURCE_FILE = "src/data/database/weapons/weaponProfiles.json";
const MATERIAL_SOURCE_FILE = "src/data/database/materials/materials.json";
const MATERIAL_SOURCES_FILE = "src/data/database/sources/materialSources.json";

function humanizeToken(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function includesAny(value: string, fragments: string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment));
}

function uniqueSorted<T extends string>(values: Iterable<T>, preferredOrder: T[]): T[] {
  const uniqueValues = [...new Set(values)];
  return uniqueValues.sort((left, right) => {
    const leftRank = preferredOrder.indexOf(left);
    const rightRank = preferredOrder.indexOf(right);
    if (leftRank !== -1 || rightRank !== -1) {
      return (leftRank === -1 ? preferredOrder.length : leftRank) - (rightRank === -1 ? preferredOrder.length : rightRank);
    }
    return left.localeCompare(right);
  });
}

function buildActiveGoalContext(goals: KrumpanionGoals, plannerOutput: PlannerOutput): ActiveGoalContext {
  const characterKeys = new Set(
    Object.values(goals.characterGoals)
      .filter((goal) => goal.enabled)
      .map((goal) => goal.characterKey),
  );
  const weaponKeys = new Set(
    Object.values(goals.weaponGoals)
      .filter((goal) => goal.enabled)
      .map((goal) => goal.weaponKey),
  );
  const materialKeys = new Set(plannerOutput.totalMissingByMaterial.filter((row) => row.needed > 0).map((row) => row.materialKey));
  const relatedGoalKeys = new Set<string>();

  for (const row of plannerOutput.totalMissingByMaterial) {
    for (const usage of row.usedBy) {
      relatedGoalKeys.add(usage.key);
    }
  }

  return {
    characterKeys,
    weaponKeys,
    materialKeys,
    relatedGoalKeys,
  };
}

function isBetaStaticIssue(issue: StaticDataIssue): boolean {
  const issueText = normalizeText(`${issue.message} ${issue.suggestedFix ?? ""} ${issue.subCategory ?? ""} ${issue.actionGroup ?? ""}`);
  return includesAny(issueText, ["beta", "unverified", "manual review", "unreleased", "needs day-schedule review"]);
}

function isIgnoredStaticIssue(issue: StaticDataIssue): boolean {
  return issue.actionGroup === "ignored_records" || issue.subCategory === "ignored_record" || issue.category === "legacy_compatibility";
}

function mapStaticSeverity(issue: StaticDataIssue): DataHealthSeverity {
  if (isIgnoredStaticIssue(issue)) {
    return "ignored";
  }
  if (isBetaStaticIssue(issue)) {
    return "beta";
  }
  if (issue.severity === "error") {
    return "blocking";
  }
  if (issue.severity === "warning") {
    return "warning";
  }
  return "info";
}

function mapStaticCategory(issue: StaticDataIssue): DataHealthCategory {
  const issueText = normalizeText(`${issue.category} ${issue.subCategory ?? ""} ${issue.message} ${issue.suggestedFix ?? ""}`);

  if (isIgnoredStaticIssue(issue)) {
    return "Ignored or Deprecated Entries";
  }
  if (isBetaStaticIssue(issue)) {
    return "Beta or Unverified Data";
  }
  if (includesAny(issueText, ["duplicate", "conflict", "override", "alias"])) {
    return "Duplicate or Conflicting Data";
  }
  if (includesAny(issueText, ["source", "resin activity", "open-world source", "source metadata"])) {
    return "Missing Material Source";
  }
  if (includesAny(issueText, ["estimate", "drop data", "world level", "weekly boss estimate", "weapon exp"])) {
    return "Estimate Unavailable";
  }
  if (
    issue.category === "character_profile" ||
    issue.category === "weapon_profile" ||
    includesAny(issueText, ["missing rarity", "missing element", "missing weapon type", "missing ascension"])
  ) {
    return "Missing Playable Profile Data";
  }
  if (includesAny(issueText, ["goal", "planner", "talent goal", "crafting report", "reference did not resolve"])) {
    return "Goal Calculation Risk";
  }
  if (includesAny(issueText, ["good", "import", "unmatched"])) {
    return "Naming or GOOD Import Mismatch";
  }
  return "Goal Calculation Risk";
}

function mapStaticAffectedType(issue: StaticDataIssue): DataHealthAffectedType {
  switch (issue.recordType) {
    case "character":
      return "character";
    case "weapon":
      return "weapon";
    case "material":
      return "material";
    case "talent_book_family":
    case "enemy_drop_family":
    case "weapon_ascension_family":
    case "element_gem_family":
    case "local_specialty":
      return "family";
    default:
      if (issue.category === "family") {
        return "family";
      }
      if (issue.category === "material" || issue.category === "material_source" || issue.category === "material_record") {
        return "material";
      }
      return "system";
  }
}

function mapStaticSourceArea(issue: StaticDataIssue): { sourceArea: DataHealthSourceArea; sourceFile?: string } {
  if (issue.recordType === "character") {
    return { sourceArea: "characters", sourceFile: CHARACTER_SOURCE_FILE };
  }
  if (issue.recordType === "weapon") {
    return { sourceArea: "weapons", sourceFile: WEAPON_SOURCE_FILE };
  }
  if (issue.recordType === "material") {
    return {
      sourceArea: issue.category === "material_source" ? "sources" : "materials",
      sourceFile: issue.category === "material_source" ? MATERIAL_SOURCES_FILE : MATERIAL_SOURCE_FILE,
    };
  }
  if (issue.category === "family") {
    return { sourceArea: "families" };
  }
  if (issue.category === "material_source") {
    return { sourceArea: "sources", sourceFile: MATERIAL_SOURCES_FILE };
  }
  return { sourceArea: "database" };
}

function buildStaticEditorTarget(issue: StaticDataIssue): DataHealthEditorTarget | undefined {
  const entityKey = issue.entityKey ?? "";
  if (!entityKey) {
    return undefined;
  }

  if (issue.recordType === "character") {
    return {
      workspaceTab: "legacy",
      section: "profiles",
      entityType: issue.subCategory === "character_catalog_metadata" ? "characters" : "characterProfiles",
      recordKey: entityKey,
      sourceArea: "characters",
      sourceFile: CHARACTER_SOURCE_FILE,
    };
  }

  if (issue.recordType === "weapon") {
    return {
      workspaceTab: "legacy",
      section: "profiles",
      entityType: issue.subCategory === "weapon_catalog_metadata" ? "weapons" : "weaponProfiles",
      recordKey: entityKey,
      sourceArea: "weapons",
      sourceFile: WEAPON_SOURCE_FILE,
    };
  }

  if (issue.recordType === "material") {
    return {
      workspaceTab: "legacy",
      section: "sources",
      entityType: issue.category === "material_source" ? "materialSources" : "materials",
      recordKey: entityKey,
      sourceArea: issue.category === "material_source" ? "sources" : "materials",
      sourceFile: issue.category === "material_source" ? MATERIAL_SOURCES_FILE : MATERIAL_SOURCE_FILE,
    };
  }

  if (issue.recordType === "weapon_ascension_family") {
    return {
      workspaceTab: "legacy",
      section: "families",
      entityType: "weaponAscensions",
      recordKey: entityKey,
      sourceArea: "families",
    };
  }

  if (issue.recordType === "talent_book_family") {
    return {
      workspaceTab: "legacy",
      section: "families",
      entityType: "talentBooks",
      recordKey: entityKey,
      sourceArea: "families",
    };
  }

  if (issue.recordType === "enemy_drop_family") {
    return {
      workspaceTab: "legacy",
      section: "families",
      entityType: "enemyDrops",
      recordKey: entityKey,
      sourceArea: "families",
    };
  }

  if (issue.recordType === "element_gem_family") {
    return {
      workspaceTab: "legacy",
      section: "families",
      entityType: "elementGems",
      recordKey: entityKey,
      sourceArea: "families",
    };
  }

  if (issue.recordType === "local_specialty") {
    return {
      workspaceTab: "legacy",
      section: "families",
      entityType: "localSpecialties",
      recordKey: entityKey,
      sourceArea: "families",
    };
  }

  return undefined;
}

function buildStaticIssueTitle(issue: StaticDataIssue): string {
  if (issue.subCategory) {
    return humanizeToken(issue.subCategory);
  }
  if (issue.recordType) {
    return `${humanizeToken(issue.recordType)} needs review`;
  }
  return humanizeToken(issue.category);
}

function mapPlannerSeverity(warning: PlannerWarning): DataHealthSeverity {
  switch (warning.type) {
    case "unknown_character":
    case "unknown_material":
    case "missing_character_profile":
    case "missing_weapon_profile":
    case "invalid_weapon_goal":
      return "blocking";
    case "migration_notice":
    case "planner_advisory":
      return "info";
    default:
      return "warning";
  }
}

function mapPlannerCategory(warning: PlannerWarning): DataHealthCategory {
  switch (warning.type) {
    case "missing_source_metadata":
      return "Missing Material Source";
    case "missing_cost_table":
    case "estimate_source_unresolved":
    case "weapon_partial_level_range_requires_curve":
      return "Estimate Unavailable";
    case "missing_character_profile":
    case "missing_weapon_profile":
    case "missing_element_gem_family":
    case "missing_talent_book_family":
    case "missing_enemy_drop_family":
    case "missing_weapon_ascension_family":
      return "Missing Playable Profile Data";
    case "unknown_character":
    case "unknown_material":
    case "invalid_weapon_goal":
    case "insufficient_ascension_for_talent_goal":
    case "post_90_profile_incomplete":
    case "unsupported_weapon_rarity":
      return "Goal Calculation Risk";
    case "migration_notice":
      return "Ignored or Deprecated Entries";
    default:
      return "Goal Calculation Risk";
  }
}

function mapPlannerAffectedType(warning: PlannerWarning): DataHealthAffectedType {
  switch (warning.type) {
    case "missing_character_profile":
    case "unknown_character":
      return "character";
    case "missing_weapon_profile":
    case "invalid_weapon_goal":
    case "weapon_requires_manual_review":
    case "unsupported_weapon_rarity":
    case "weapon_partial_level_range_requires_curve":
      return "weapon";
    case "missing_source_metadata":
    case "unknown_material":
    case "missing_cost_table":
      return "material";
    case "missing_element_gem_family":
    case "missing_talent_book_family":
    case "missing_enemy_drop_family":
    case "missing_weapon_ascension_family":
      return "family";
    default:
      return "goal";
  }
}

function buildPlannerEditorTarget(warning: PlannerWarning): DataHealthEditorTarget | undefined {
  const key = warning.key ?? "";
  if (!key) {
    return undefined;
  }

  switch (warning.type) {
    case "missing_character_profile":
    case "unknown_character":
      return {
        workspaceTab: "legacy",
        section: "profiles",
        entityType: "characterProfiles",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    case "missing_weapon_profile":
    case "invalid_weapon_goal":
    case "weapon_requires_manual_review":
    case "unsupported_weapon_rarity":
      return {
        workspaceTab: "legacy",
        section: "profiles",
        entityType: "weaponProfiles",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    case "missing_source_metadata":
    case "missing_cost_table":
    case "unknown_material":
      return {
        workspaceTab: "legacy",
        section: "sources",
        entityType: "materials",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    case "missing_element_gem_family":
      return {
        workspaceTab: "legacy",
        section: "families",
        entityType: "elementGems",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    case "missing_talent_book_family":
      return {
        workspaceTab: "legacy",
        section: "families",
        entityType: "talentBooks",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    case "missing_enemy_drop_family":
      return {
        workspaceTab: "legacy",
        section: "families",
        entityType: "enemyDrops",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    case "missing_weapon_ascension_family":
      return {
        workspaceTab: "legacy",
        section: "families",
        entityType: "weaponAscensions",
        recordKey: key,
        sourceArea: "planner",
        rawSearchText: key,
      };
    default:
      return undefined;
  }
}

function buildPlannerIssueTitle(warning: PlannerWarning): string {
  return humanizeToken(warning.type);
}

function mapImportSeverity(warning: ImportWarning): DataHealthSeverity {
  switch (warning.type) {
    case "duplicate_character":
    case "duplicate_weapon_id":
    case "duplicate_artifact_id":
      return "blocking";
    default:
      return "warning";
  }
}

function mapImportCategory(warning: ImportWarning): DataHealthCategory {
  switch (warning.type) {
    case "duplicate_character":
    case "duplicate_weapon_id":
    case "duplicate_artifact_id":
      return "Duplicate or Conflicting Data";
    default:
      return "Naming or GOOD Import Mismatch";
  }
}

function buildImportIssueTitle(warning: ImportWarning): string {
  switch (warning.type) {
    case "unknown_weapon":
      return "GOOD weapon mapping missing";
    case "unknown_character":
      return "GOOD character mapping missing";
    case "unknown_material":
      return "GOOD material mapping missing";
    default:
      return humanizeToken(warning.type);
  }
}

function buildImportIssue(warning: ImportWarning): DataHealthIssue {
  return {
    id: `import:${warning.type}:${warning.key ?? warning.message}`,
    severity: mapImportSeverity(warning),
    category: mapImportCategory(warning),
    title: buildImportIssueTitle(warning),
    shortMessage: warning.message,
    affectedType:
      warning.type === "unknown_character"
        ? "character"
        : warning.type === "unknown_weapon"
          ? "weapon"
          : warning.type === "unknown_material"
            ? "material"
            : "import",
    affectedKey: warning.key,
    affectedName: warning.key,
    sourceArea: "GOOD import",
    suggestedAction:
      warning.type === "unknown_material" || warning.type === "unknown_weapon" || warning.type === "unknown_character"
        ? "Review canonical aliases or import naming."
        : "Review the latest GOOD import for duplicate records.",
    canNavigateToEditor: false,
    editorTarget: {
      workspaceTab: "rawHealth",
      sourceArea: "GOOD import",
      rawSearchText: warning.key ?? warning.message,
    },
    relatedKeys: warning.key ? [warning.key] : [],
    details: warning.message,
    affectsActiveGoals: false,
    priorityRank: 0,
    rawSourceType: "import",
  };
}

function buildPlannerIssue(warning: PlannerWarning): DataHealthIssue {
  const editorTarget = buildPlannerEditorTarget(warning);
  const affectedKey = warning.key;
  return {
    id: `planner:${warning.type}:${affectedKey ?? warning.message}`,
    severity: mapPlannerSeverity(warning),
    category: mapPlannerCategory(warning),
    title: buildPlannerIssueTitle(warning),
    shortMessage: warning.message,
    affectedType: mapPlannerAffectedType(warning),
    affectedKey,
    affectedName: affectedKey,
    sourceArea: "planner",
    suggestedAction: editorTarget ? "Review the linked database entry." : "Review the planner warning details.",
    canNavigateToEditor: Boolean(editorTarget?.entityType),
    editorTarget,
    relatedKeys: affectedKey ? [affectedKey] : [],
    details: warning.message,
    affectsActiveGoals: false,
    priorityRank: 0,
    rawSourceType: "planner",
  };
}

function buildStaticIssue(issue: StaticDataIssue): DataHealthIssue {
  const severity = mapStaticSeverity(issue);
  const source = mapStaticSourceArea(issue);
  const editorTarget = buildStaticEditorTarget(issue);
  const affectedType = mapStaticAffectedType(issue);
  return {
    id: `static:${issue.id}`,
    severity,
    category: mapStaticCategory(issue),
    title: buildStaticIssueTitle(issue),
    shortMessage: issue.message,
    affectedType,
    affectedKey: issue.entityKey,
    affectedName: issue.entityName ?? issue.entityKey,
    sourceArea: source.sourceArea,
    sourceFile: source.sourceFile,
    suggestedAction: issue.suggestedFix,
    canNavigateToEditor: Boolean(editorTarget?.entityType),
    editorTarget:
      editorTarget ??
      (issue.entityKey || issue.entityName
        ? {
            workspaceTab: "rawHealth",
            sourceArea: source.sourceArea,
            sourceFile: source.sourceFile,
            rawSearchText: issue.entityKey ?? issue.entityName ?? issue.message,
          }
        : undefined),
    relatedKeys: [...(issue.relatedKeys ?? []), issue.entityKey].filter((value): value is string => Boolean(value)),
    details: issue.suggestedFix,
    affectsActiveGoals: false,
    priorityRank: 0,
    rawSourceType: "static_data",
    rawIssueId: issue.id,
  };
}

function issueAffectsActiveGoals(issue: DataHealthIssue, context: ActiveGoalContext): boolean {
  if (issue.affectedType === "character" && issue.affectedKey) {
    return context.characterKeys.has(issue.affectedKey);
  }
  if (issue.affectedType === "weapon" && issue.affectedKey) {
    return context.weaponKeys.has(issue.affectedKey);
  }
  if (issue.affectedType === "material" && issue.affectedKey) {
    return context.materialKeys.has(issue.affectedKey);
  }
  if (issue.affectedType === "goal" && issue.affectedKey) {
    return context.relatedGoalKeys.has(issue.affectedKey);
  }
  return issue.relatedKeys.some(
    (key) => context.materialKeys.has(key) || context.characterKeys.has(key) || context.weaponKeys.has(key) || context.relatedGoalKeys.has(key),
  );
}

function getPriorityRank(issue: DataHealthIssue): number {
  if (issue.affectsActiveGoals && issue.severity === "blocking") {
    return 0;
  }
  if (issue.affectsActiveGoals && issue.severity === "warning") {
    return 1;
  }
  if (issue.severity === "blocking") {
    return 2;
  }
  if (issue.category === "Missing Playable Profile Data") {
    return 3;
  }
  if (issue.category === "Missing Material Source") {
    return 4;
  }
  if (issue.category === "Naming or GOOD Import Mismatch") {
    return 5;
  }
  if (issue.severity === "beta") {
    return 6;
  }
  if (issue.severity === "ignored") {
    return 7;
  }
  return 8;
}

function sortIssues(issues: DataHealthIssue[]): DataHealthIssue[] {
  const severityOrder: Record<DataHealthSeverity, number> = {
    blocking: 0,
    warning: 1,
    beta: 2,
    info: 3,
    ignored: 4,
  };

  return [...issues].sort((left, right) => {
    return (
      left.priorityRank - right.priorityRank ||
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.category.localeCompare(right.category) ||
      (left.affectedName ?? left.affectedKey ?? left.title).localeCompare(right.affectedName ?? right.affectedKey ?? right.title)
    );
  });
}

export function buildDataHealthCenterModel(params: {
  staticIssues: StaticDataIssue[];
  importWarnings: ImportWarning[];
  plannerWarnings: PlannerWarning[];
  goals: KrumpanionGoals;
  plannerOutput: PlannerOutput;
}): DataHealthCenterModel {
  const activeGoalContext = buildActiveGoalContext(params.goals, params.plannerOutput);
  const staticIssues = params.staticIssues
    .filter((issue) => issue.category !== "repository_hygiene")
    .map((issue) => buildStaticIssue(issue));
  const plannerIssues = params.plannerWarnings.map((warning) => buildPlannerIssue(warning));
  const importIssues = params.importWarnings.map((warning) => buildImportIssue(warning));

  const issues = sortIssues(
    [...staticIssues, ...plannerIssues, ...importIssues].map((issue) => {
      const affectsActiveGoals = issueAffectsActiveGoals(issue, activeGoalContext);
      return {
        ...issue,
        affectsActiveGoals,
        priorityRank: getPriorityRank({ ...issue, affectsActiveGoals }),
      };
    }),
  );

  const summary = issues.reduce<DataHealthSummary>(
    (result, issue) => {
      result.totalIssues += 1;
      if (issue.severity === "blocking") {
        result.blockingCount += 1;
      } else if (issue.severity === "warning") {
        result.warningCount += 1;
      } else if (issue.severity === "info") {
        result.infoCount += 1;
      } else if (issue.severity === "beta") {
        result.betaCount += 1;
      } else if (issue.severity === "ignored") {
        result.ignoredCount += 1;
      }
      return result;
    },
    {
      totalIssues: 0,
      blockingCount: 0,
      warningCount: 0,
      infoCount: 0,
      betaCount: 0,
      ignoredCount: 0,
    },
  );

  const cleanupItems: DataHealthCleanupItem[] = [
    {
      key: "active_goal_issues",
      label: "Fix active goal issues",
      count: issues.filter((issue) => issue.affectsActiveGoals && issue.severity !== "ignored").length,
      severity: "all",
      activeOnly: true,
    },
    {
      key: "playable_profiles",
      label: "Complete character and weapon profiles",
      count: issues.filter((issue) => issue.category === "Missing Playable Profile Data").length,
      category: "Missing Playable Profile Data",
    },
    {
      key: "material_sources",
      label: "Resolve material sources",
      count: issues.filter((issue) => issue.category === "Missing Material Source").length,
      category: "Missing Material Source",
    },
    {
      key: "import_aliases",
      label: "Review GOOD import aliases",
      count: issues.filter((issue) => issue.category === "Naming or GOOD Import Mismatch").length,
      category: "Naming or GOOD Import Mismatch",
    },
    {
      key: "beta_entries",
      label: "Review beta or unverified entries",
      count: issues.filter((issue) => issue.severity === "beta").length,
      severity: "beta",
    },
    {
      key: "ignored_entries",
      label: "Review ignored or deprecated records",
      count: issues.filter((issue) => issue.severity === "ignored").length,
      severity: "ignored",
    },
  ];

  return {
    issues,
    summary,
    categories: uniqueSorted(issues.map((issue) => issue.category), CATEGORY_ORDER),
    affectedTypes: uniqueSorted(
      issues.map((issue) => issue.affectedType).filter((value): value is DataHealthAffectedType => Boolean(value)),
      AFFECTED_TYPE_ORDER,
    ),
    cleanupItems: cleanupItems.filter((item) => item.count > 0),
  };
}

export interface DataHealthFilters {
  search: string;
  severity: DataHealthSeverity | "all";
  category: DataHealthCategory | "all";
  affectedType: DataHealthAffectedType | "all";
  activeGoalImpactOnly: boolean;
}

export function filterDataHealthIssues(issues: DataHealthIssue[], filters: DataHealthFilters): DataHealthIssue[] {
  const searchNeedle = normalizeText(filters.search);
  return issues.filter((issue) => {
    const matchesSeverity = filters.severity === "all" || issue.severity === filters.severity;
    const matchesCategory = filters.category === "all" || issue.category === filters.category;
    const matchesAffectedType = filters.affectedType === "all" || issue.affectedType === filters.affectedType;
    const matchesActiveOnly = !filters.activeGoalImpactOnly || issue.affectsActiveGoals;
    const searchText = normalizeText(
      [
        issue.title,
        issue.shortMessage,
        issue.affectedName,
        issue.affectedKey,
        issue.category,
        issue.suggestedAction,
        issue.sourceArea,
        issue.sourceFile,
        ...issue.relatedKeys,
      ].join(" "),
    );
    const matchesSearch = !searchNeedle || searchText.includes(searchNeedle);
    return matchesSeverity && matchesCategory && matchesAffectedType && matchesActiveOnly && matchesSearch;
  });
}

export type DataHealthGroupBy = "category" | "source" | "affectedType";

export interface DataHealthIssueGroup {
  key: string;
  label: string;
  issues: DataHealthIssue[];
}

export function groupDataHealthIssues(issues: DataHealthIssue[], groupBy: DataHealthGroupBy): DataHealthIssueGroup[] {
  const grouped = new Map<string, DataHealthIssue[]>();

  for (const issue of issues) {
    const key =
      groupBy === "category"
        ? issue.category
        : groupBy === "source"
          ? issue.sourceArea ?? "Other"
          : issue.affectedType ?? "other";
    grouped.set(key, [...(grouped.get(key) ?? []), issue]);
  }

  return [...grouped.entries()]
    .map(([key, groupedIssues]) => ({
      key,
      label: groupBy === "affectedType" ? humanizeToken(key) : key,
      issues: sortIssues(groupedIssues),
    }))
    .sort((left, right) => right.issues.length - left.issues.length || left.label.localeCompare(right.label));
}

export function getDataHealthStatus(summary: DataHealthSummary): "Healthy" | "Needs review" | "Blocking issues" {
  if (summary.blockingCount > 0) {
    return "Blocking issues";
  }
  if (summary.warningCount > 0 || summary.betaCount > 0 || summary.ignoredCount > 0) {
    return "Needs review";
  }
  return "Healthy";
}

export function getDataHealthPrimaryActionLabel(issue: DataHealthIssue): string {
  if (!issue.canNavigateToEditor) {
    return "View source";
  }
  switch (issue.affectedType) {
    case "character":
      return "Edit character";
    case "weapon":
      return "Edit weapon";
    case "material":
      return issue.category === "Missing Material Source" ? "Edit material source" : "Edit material";
    case "family":
      return "Edit family";
    default:
      return "Review";
  }
}

export function getDataHealthEmptyState(
  summary: DataHealthSummary,
  filters: DataHealthFilters,
  filteredIssues: DataHealthIssue[],
): { title: string; description: string } {
  if (!summary.totalIssues) {
    return {
      title: "Database looks healthy.",
      description: "No current database, planner, or import issues need attention.",
    };
  }
  if (filters.activeGoalImpactOnly && !filteredIssues.length) {
    return {
      title: "No active goals are affected by current database warnings.",
      description: "Turn off the active-goal filter to review lower-priority items.",
    };
  }
  if (!filteredIssues.length) {
    return {
      title: "No issues match these filters.",
      description: "Clear or relax the current filters to see more database health items.",
    };
  }
  if (!summary.blockingCount) {
    return {
      title: "No blocking issues. Some entries need review.",
      description: "Warnings, beta records, or ignored entries still need light cleanup.",
    };
  }
  return {
    title: "Database health needs review.",
    description: "Use the cleanup groups and filters to work through the highest-impact issues first.",
  };
}

export function getDataHealthOverviewCounts(issues: DataHealthIssue[]) {
  const countByType = (affectedType: DataHealthAffectedType) => issues.filter((issue) => issue.affectedType === affectedType);
  const issueCount = (rows: DataHealthIssue[]) => rows.filter((issue) => issue.severity !== "ignored" && issue.severity !== "info").length;
  const betaCount = (rows: DataHealthIssue[]) => rows.filter((issue) => issue.severity === "beta").length;
  const ignoredCount = (rows: DataHealthIssue[]) => rows.filter((issue) => issue.severity === "ignored").length;

  const characterRows = countByType("character");
  const weaponRows = countByType("weapon");
  const materialRows = countByType("material");

  return {
    characters: {
      warnings: issueCount(characterRows),
      beta: betaCount(characterRows),
      ignored: ignoredCount(characterRows),
    },
    weapons: {
      warnings: issueCount(weaponRows),
      beta: betaCount(weaponRows),
      ignored: ignoredCount(weaponRows),
    },
    materials: {
      warnings: issueCount(materialRows),
      beta: betaCount(materialRows),
      ignored: ignoredCount(materialRows),
    },
  };
}

export function getIssueMaterialKeys(rows: MaterialNeedRow[]): string[] {
  return rows.map((row) => row.materialKey);
}
