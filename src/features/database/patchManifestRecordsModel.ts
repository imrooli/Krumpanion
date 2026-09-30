import {
  type ChangeSetValidationIssue,
  type DatabaseChangeSet,
  type PatchManifestRecordKind,
  getPatchManifestRecordMetadataKey,
} from "../../domain/staticData/databaseChangeSet";

export type ManifestWorkflowGroup =
  | "all"
  | "characters"
  | "weapons"
  | "material_families"
  | "standalone_materials"
  | "sources_domains"
  | "artifacts"
  | "weekly_bosses";

export type ManifestRecordStatusFilter = "all" | "blocking" | "warnings" | "new" | "modified" | "ready";
export type ManifestRecordSort = "recommended" | "name" | "recent" | "type";

export interface ManifestRecordRow {
  kind: PatchManifestRecordKind;
  key: string;
  label: string;
  searchText: string;
  group: Exclude<ManifestWorkflowGroup, "all">;
  groupLabel: string;
  typeLabel: string;
  mode: "new" | "modify";
  sourceCanonicalKey?: string;
  updatedAt?: string;
  errorCount: number;
  warningCount: number;
  generatedOutputHint: string;
}

export interface ManifestRecordGroup {
  key: Exclude<ManifestWorkflowGroup, "all">;
  label: string;
  rows: ManifestRecordRow[];
  errorCount: number;
  warningCount: number;
}

const GROUP_ORDER: Array<Exclude<ManifestWorkflowGroup, "all">> = [
  "characters",
  "weapons",
  "material_families",
  "standalone_materials",
  "sources_domains",
  "artifacts",
  "weekly_bosses",
];

const GROUP_LABELS: Record<Exclude<ManifestWorkflowGroup, "all">, string> = {
  artifacts: "Artifacts",
  characters: "Characters",
  material_families: "Material Families",
  sources_domains: "Sources & Domains",
  standalone_materials: "Standalone Materials",
  weapons: "Weapons",
  weekly_bosses: "Weekly Bosses",
};

export const MANIFEST_WORKFLOW_GROUP_OPTIONS: Array<{ key: ManifestWorkflowGroup; label: string }> = [
  { key: "all", label: "All workflows" },
  ...GROUP_ORDER.map((key) => ({ key, label: GROUP_LABELS[key] })),
];

export const MANIFEST_STATUS_FILTER_OPTIONS: Array<{ key: ManifestRecordStatusFilter; label: string }> = [
  { key: "all", label: "All statuses" },
  { key: "blocking", label: "Blocking issues" },
  { key: "warnings", label: "Warnings" },
  { key: "new", label: "New" },
  { key: "modified", label: "Modified" },
  { key: "ready", label: "Ready" },
];

export const MANIFEST_SORT_OPTIONS: Array<{ key: ManifestRecordSort; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "name", label: "Name" },
  { key: "recent", label: "Recently edited" },
  { key: "type", label: "Record type" },
];

export const MANIFEST_RECORD_TYPE_OPTIONS: Array<{ key: "all" | PatchManifestRecordKind; label: string }> = [
  { key: "all", label: "All record types" },
  { key: "characterAssignment", label: "Characters" },
  { key: "weaponProfile", label: "Weapons" },
  { key: "talentBookFamily", label: "Talent books" },
  { key: "weaponAscensionFamily", label: "Weapon materials" },
  { key: "commonEnemyDropFamily", label: "Enemy families" },
  { key: "normalBossMaterial", label: "Normal boss materials" },
  { key: "localSpecialty", label: "Local specialties" },
  { key: "standaloneMaterial", label: "Standalone materials" },
  { key: "sourceDomain", label: "Source domains" },
  { key: "artifactDomain", label: "Artifact mappings" },
  { key: "weeklyBossGroup", label: "Weekly boss groups" },
];

function getGroup(kind: PatchManifestRecordKind): Exclude<ManifestWorkflowGroup, "all"> {
  if (kind === "characterAssignment") return "characters";
  if (kind === "weaponProfile") return "weapons";
  if (kind === "standaloneMaterial") return "standalone_materials";
  if (kind === "sourceDomain") return "sources_domains";
  if (kind === "artifactDomain") return "artifacts";
  if (kind === "weeklyBossGroup") return "weekly_bosses";
  return "material_families";
}

export function getManifestRecordTypeLabel(kind: PatchManifestRecordKind): string {
  const option = MANIFEST_RECORD_TYPE_OPTIONS.find((candidate) => candidate.key === kind);
  return option?.label ?? kind;
}

function getGeneratedOutputHint(changeSet: DatabaseChangeSet, kind: PatchManifestRecordKind, key: string): string {
  if (kind === "weeklyBossGroup") return "3 weekly drops + sources";
  if (kind === "talentBookFamily") return "3 books + recipes + source rows";
  if (kind === "weaponAscensionFamily") return "4 weapon mats + recipes + source rows";
  if (kind === "commonEnemyDropFamily") return "3 enemy drops + tier index";
  if (kind === "normalBossMaterial") return "Boss material + source row";
  if (kind === "localSpecialty") return "Local specialty + source metadata";
  if (kind === "standaloneMaterial") return "Material + source row";
  if (kind === "characterAssignment") return "Character catalog + planner profile";
  if (kind === "weaponProfile") return "Weapon catalog + planner profile";
  if (kind === "sourceDomain") {
    const domain = changeSet.sourceDomains[key];
    return domain ? `${domain.domainType} domain + ${domain.linkedFamilyKeys.length} links` : "Source domain";
  }
  return "Artifact set-domain mapping";
}

function getIssuesForRow(issues: ChangeSetValidationIssue[], kind: PatchManifestRecordKind, key: string) {
  return issues.filter((issue) => issue.entityType === kind && issue.entityKey === key);
}

function makeRow(
  changeSet: DatabaseChangeSet,
  issues: ChangeSetValidationIssue[],
  kind: PatchManifestRecordKind,
  key: string,
  label: string,
): ManifestRecordRow {
  const rowIssues = getIssuesForRow(issues, kind, key);
  const metadata = changeSet.recordMetadata?.[getPatchManifestRecordMetadataKey(kind, key)];
  const group = getGroup(kind);
  return {
    kind,
    key,
    label: label || key,
    searchText: `${key} ${label} ${kind} ${GROUP_LABELS[group]}`.toLowerCase(),
    group,
    groupLabel: GROUP_LABELS[group],
    typeLabel: getManifestRecordTypeLabel(kind),
    mode: metadata?.mode ?? "new",
    sourceCanonicalKey: metadata?.sourceCanonicalKey,
    updatedAt: metadata?.updatedAt,
    errorCount: rowIssues.filter((issue) => issue.severity === "error").length,
    warningCount: rowIssues.filter((issue) => issue.severity === "warning").length,
    generatedOutputHint: getGeneratedOutputHint(changeSet, kind, key),
  };
}

export function buildManifestRecordRows(changeSet: DatabaseChangeSet, issues: ChangeSetValidationIssue[]): ManifestRecordRow[] {
  return [
    ...Object.keys(changeSet.characters).map((key) => makeRow(changeSet, issues, "characterAssignment", key, changeSet.characters[key].displayName || key)),
    ...Object.keys(changeSet.weapons).map((key) => makeRow(changeSet, issues, "weaponProfile", key, changeSet.weapons[key].displayName || key)),
    ...Object.keys(changeSet.talentBookFamilies).map((key) => makeRow(changeSet, issues, "talentBookFamily", key, changeSet.talentBookFamilies[key].key || key)),
    ...Object.keys(changeSet.weaponAscensionFamilies).map((key) => makeRow(changeSet, issues, "weaponAscensionFamily", key, changeSet.weaponAscensionFamilies[key].displayName || key)),
    ...Object.keys(changeSet.commonEnemyDropFamilies).map((key) => makeRow(changeSet, issues, "commonEnemyDropFamily", key, changeSet.commonEnemyDropFamilies[key].displayName || key)),
    ...Object.keys(changeSet.normalBossMaterials).map((key) => makeRow(changeSet, issues, "normalBossMaterial", key, changeSet.normalBossMaterials[key].displayName || key)),
    ...Object.keys(changeSet.localSpecialties).map((key) => makeRow(changeSet, issues, "localSpecialty", key, changeSet.localSpecialties[key].displayName || key)),
    ...Object.keys(changeSet.standaloneMaterials).map((key) => makeRow(changeSet, issues, "standaloneMaterial", key, changeSet.standaloneMaterials[key].displayName || key)),
    ...Object.keys(changeSet.sourceDomains).map((key) => makeRow(changeSet, issues, "sourceDomain", key, changeSet.sourceDomains[key].name || key)),
    ...Object.keys(changeSet.artifactDomains).map((key) => makeRow(changeSet, issues, "artifactDomain", key, changeSet.artifactDomains[key].setName || key)),
    ...Object.keys(changeSet.weeklyBossGroups).map((key) => makeRow(changeSet, issues, "weeklyBossGroup", key, changeSet.weeklyBossGroups[key].bossName || key)),
  ];
}

function compareRecommended(left: ManifestRecordRow, right: ManifestRecordRow): number {
  return (
    right.errorCount - left.errorCount ||
    right.warningCount - left.warningCount ||
    (left.mode === right.mode ? 0 : left.mode === "modify" ? -1 : 1) ||
    GROUP_ORDER.indexOf(left.group) - GROUP_ORDER.indexOf(right.group) ||
    left.label.localeCompare(right.label)
  );
}

export function filterAndGroupManifestRecordRows(
  rows: ManifestRecordRow[],
  filters: {
    search: string;
    group: ManifestWorkflowGroup;
    kind: "all" | PatchManifestRecordKind;
    status: ManifestRecordStatusFilter;
    sort: ManifestRecordSort;
  },
): ManifestRecordGroup[] {
  const search = filters.search.trim().toLowerCase();
  const filtered = rows
    .filter((row) => (filters.group === "all" ? true : row.group === filters.group))
    .filter((row) => (filters.kind === "all" ? true : row.kind === filters.kind))
    .filter((row) => (search ? row.searchText.includes(search) : true))
    .filter((row) => {
      if (filters.status === "all") return true;
      if (filters.status === "blocking") return row.errorCount > 0;
      if (filters.status === "warnings") return row.warningCount > 0;
      if (filters.status === "new") return row.mode === "new";
      if (filters.status === "modified") return row.mode === "modify";
      return row.errorCount === 0 && row.warningCount === 0;
    })
    .sort((left, right) => {
      if (filters.sort === "recommended") return compareRecommended(left, right);
      if (filters.sort === "recent") return (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "") || left.label.localeCompare(right.label);
      if (filters.sort === "type") return left.typeLabel.localeCompare(right.typeLabel) || left.label.localeCompare(right.label);
      return left.label.localeCompare(right.label);
    });

  return GROUP_ORDER.map((groupKey) => {
    const groupRows = filtered.filter((row) => row.group === groupKey);
    return {
      key: groupKey,
      label: GROUP_LABELS[groupKey],
      rows: groupRows,
      errorCount: groupRows.reduce((sum, row) => sum + row.errorCount, 0),
      warningCount: groupRows.reduce((sum, row) => sum + row.warningCount, 0),
    };
  }).filter((group) => group.rows.length > 0);
}
