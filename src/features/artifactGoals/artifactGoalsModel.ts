import type { KrumpanionAccount } from "../../domain/account/types";
import { getArtifactGoalDisplayName, getCharacterGoalDisplayName } from "../../domain/goals/goalDisplay";
import type {
  ArtifactCircletMainStat,
  ArtifactDesiredSubstat,
  ArtifactGoal,
  ArtifactGobletMainStat,
  ArtifactSandsMainStat,
} from "../../domain/goals/types";
import type { ArtifactDomainRecord, StaticGameData } from "../../domain/staticData/types";

export const ARTIFACT_VIEW_OPTIONS = [
  { key: "domain", label: "By Domain" },
  { key: "character", label: "By Character" },
] as const;

export type ArtifactViewKey = (typeof ARTIFACT_VIEW_OPTIONS)[number]["key"];
export type ArtifactGoalStatus = "missing" | "in_progress" | "complete";

export interface ArtifactSetOption {
  key: string;
  label: string;
}

export interface ArtifactCharacterOption {
  key: string;
  label: string;
}

export interface ArtifactGoalDomainAssignment {
  key: string;
  label: string;
  location?: string;
  region?: string;
  setKeys: string[];
  setLabels: string[];
  hasStandardDomainSource: boolean;
}

export interface ArtifactGoalViewModel {
  id: string;
  goalName: string;
  characterKey?: string;
  characterLabel: string;
  setLabels: string[];
  setSummary: string;
  mainStatSummary: string;
  desiredSubstats: ArtifactDesiredSubstat[];
  desiredSubstatsSummary: string;
  status: ArtifactGoalStatus;
  statusLabel: string;
  obtainedCount: number;
  progressLabel: string;
  pieceProgress: ArtifactGoal["progress"];
  domains: ArtifactGoalDomainAssignment[];
  domainSummary: string;
  warnings: string[];
  warningSummary?: string;
  notes?: string;
}

export interface ArtifactDomainGroupViewModel {
  key: string;
  label: string;
  location?: string;
  region?: string;
  setLabels: string[];
  goals: ArtifactGoalViewModel[];
  goalCount: number;
  incompleteGoalCount: number;
  completedGoalCount: number;
  hasStandardDomainSource: boolean;
}

export interface ArtifactCharacterGroupViewModel {
  characterKey?: string;
  characterLabel: string;
  goals: ArtifactGoalViewModel[];
  goalCount: number;
  incompleteGoalCount: number;
  completedGoalCount: number;
}

export interface ArtifactGoalsSummaryViewModel {
  totalGoals: number;
  incompleteGoals: number;
  completedGoals: number;
  domainsNeeded: number;
}

export interface ArtifactSelectedGoalSummaryViewModel {
  id: string;
  characterLabel: string;
  goalName: string;
  setSummary: string;
  progressLabel: string;
  domainCount: number;
  domainSummary: string;
  warningSummary?: string;
}

export interface ArtifactGoalsTabViewModel {
  summary: ArtifactGoalsSummaryViewModel;
  domainGroups: ArtifactDomainGroupViewModel[];
  characterGroups: ArtifactCharacterGroupViewModel[];
  goalRows: ArtifactGoalViewModel[];
  goalRowsById: Record<string, ArtifactGoalViewModel>;
  selectedGoalSummariesById: Record<string, ArtifactSelectedGoalSummaryViewModel>;
  visibleGoalIdsByView: Record<ArtifactViewKey, string[]>;
}

export const ARTIFACT_SANDS_OPTIONS: ArtifactSandsMainStat[] = [
  "HP%",
  "ATK%",
  "DEF%",
  "Elemental Mastery",
  "Energy Recharge%",
];

export const ARTIFACT_GOBLET_OPTIONS: ArtifactGobletMainStat[] = [
  "HP%",
  "ATK%",
  "DEF%",
  "Elemental Mastery",
  "Anemo DMG Bonus%",
  "Cryo DMG Bonus%",
  "Dendro DMG Bonus%",
  "Electro DMG Bonus%",
  "Geo DMG Bonus%",
  "Hydro DMG Bonus%",
  "Pyro DMG Bonus%",
  "Physical DMG Bonus%",
];

export const ARTIFACT_CIRCLET_OPTIONS: ArtifactCircletMainStat[] = [
  "HP%",
  "ATK%",
  "DEF%",
  "Elemental Mastery",
  "CRIT Rate%",
  "CRIT DMG%",
  "Healing Bonus%",
];

export const ARTIFACT_SUBSTAT_OPTIONS: ArtifactDesiredSubstat[] = [
  "HP",
  "ATK",
  "DEF",
  "HP%",
  "ATK%",
  "DEF%",
  "Elemental Mastery",
  "Energy Recharge%",
  "CRIT Rate%",
  "CRIT DMG%",
];

function uniqueBy<T>(items: T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function buildNoSourceRecord(setKey: string): ArtifactDomainRecord {
  return {
    setKey,
    setName: prettifySetKey(setKey),
    hasStandardDomainSource: false,
  };
}

function prettifySetKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
}

function getGoalStatus(goal: ArtifactGoal): ArtifactGoalStatus {
  const obtainedCount = countObtainedPieces(goal);
  if (obtainedCount >= 3) {
    return "complete";
  }
  if (obtainedCount > 0) {
    return "in_progress";
  }
  return "missing";
}

function countObtainedPieces(goal: ArtifactGoal): number {
  return [goal.progress.sandsObtained, goal.progress.gobletObtained, goal.progress.circletObtained].filter(Boolean).length;
}

function buildStatusLabel(status: ArtifactGoalStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "in_progress":
      return "In Progress";
    default:
      return "Missing";
  }
}

function buildProgressLabel(goal: ArtifactGoal): string {
  const obtainedCount = countObtainedPieces(goal);
  if (obtainedCount >= 3) {
    return "3/3 key pieces obtained";
  }
  if (obtainedCount <= 0) {
    return "Missing";
  }
  return `${obtainedCount}/3 key pieces obtained`;
}

function buildAffixSummary(values: string[]): string {
  return values.length > 0 ? values.join(" / ") : "Any";
}

function buildMainStatSummary(goal: ArtifactGoal): string {
  return [
    `Sands ${buildAffixSummary(goal.mainStatTargets.sands)}`,
    `Goblet ${buildAffixSummary(goal.mainStatTargets.goblet)}`,
    `Circlet ${buildAffixSummary(goal.mainStatTargets.circlet)}`,
  ].join(" · ");
}

function buildSubstatsSummary(substats: ArtifactDesiredSubstat[]): string {
  return substats.length > 0 ? substats.join(", ") : "Any useful substats";
}

function buildDomainSummary(domains: ArtifactGoalDomainAssignment[]): string {
  if (domains.length <= 0) {
    return "No domain source yet";
  }
  if (domains.length === 1) {
    return domains[0].label;
  }
  return `${domains.length} domains: ${domains.map((domain) => domain.label).join(", ")}`;
}

function sortGoalRows(left: ArtifactGoalViewModel, right: ArtifactGoalViewModel): number {
  return (
    left.characterLabel.localeCompare(right.characterLabel) ||
    left.goalName.localeCompare(right.goalName) ||
    left.setSummary.localeCompare(right.setSummary) ||
    left.id.localeCompare(right.id)
  );
}

function resolveGoalDomains(goal: ArtifactGoal, staticData: StaticGameData): ArtifactGoalDomainAssignment[] {
  const grouped = new Map<string, ArtifactGoalDomainAssignment>();
  for (const setKey of goal.targetSetKeys) {
    const record = staticData.artifactDomains[setKey] ?? buildNoSourceRecord(setKey);
    const key = record.hasStandardDomainSource && record.domainKey ? record.domainKey : "no-standard-source";
    const current = grouped.get(key);
    const setLabel = record.setName;
    if (current) {
      current.setKeys.push(setKey);
      current.setLabels.push(setLabel);
      continue;
    }
    grouped.set(key, {
      key,
      label: record.hasStandardDomainSource ? record.domainName ?? record.setName : "No standard Artifact Domain source",
      location: record.domainLocation,
      region: record.region,
      setKeys: [setKey],
      setLabels: [setLabel],
      hasStandardDomainSource: record.hasStandardDomainSource,
    });
  }

  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      setKeys: uniqueBy(entry.setKeys, (value) => value),
      setLabels: uniqueBy(entry.setLabels, (value) => value),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function buildGoalWarnings(goal: ArtifactGoal, account: KrumpanionAccount | null, staticData: StaticGameData): string[] {
  const warnings: string[] = [];
  if (!goal.characterKey) {
    warnings.push("Select a character.");
  } else if (!account?.characters.some((character) => character.characterId === goal.characterKey)) {
    warnings.push("Character is not on this account.");
  }

  for (const setKey of goal.targetSetKeys) {
    if (!staticData.artifactDomains[setKey]) {
      warnings.push(`Unknown artifact set ${setKey}.`);
    }
  }

  return warnings;
}

function buildGoalView(goal: ArtifactGoal, account: KrumpanionAccount | null, staticData: StaticGameData): ArtifactGoalViewModel {
  const domains = resolveGoalDomains(goal, staticData);
  const status = getGoalStatus(goal);
  const setLabels = goal.targetSetKeys.map((setKey) => staticData.artifactDomains[setKey]?.setName ?? prettifySetKey(setKey));
  const characterLabel = goal.characterKey
    ? getCharacterGoalDisplayName(goal.characterKey, staticData)
    : "Unassigned character";
  const warnings = buildGoalWarnings(goal, account, staticData);
  return {
    id: goal.id,
    goalName: getArtifactGoalDisplayName(goal, staticData),
    characterKey: goal.characterKey,
    characterLabel,
    setLabels,
    setSummary: setLabels.length > 0 ? setLabels.join(", ") : "No sets selected yet",
    mainStatSummary: buildMainStatSummary(goal),
    desiredSubstats: goal.desiredSubstats,
    desiredSubstatsSummary: buildSubstatsSummary(goal.desiredSubstats),
    status,
    statusLabel: buildStatusLabel(status),
    obtainedCount: countObtainedPieces(goal),
    progressLabel: buildProgressLabel(goal),
    pieceProgress: goal.progress,
    domains,
    domainSummary: buildDomainSummary(domains),
    warnings,
    warningSummary: warnings.length > 0 ? warnings.join(" | ") : undefined,
    notes: goal.notes,
  };
}

function buildSelectedGoalSummary(goal: ArtifactGoalViewModel): ArtifactSelectedGoalSummaryViewModel {
  return {
    id: goal.id,
    characterLabel: goal.characterLabel,
    goalName: goal.goalName,
    setSummary: goal.setSummary,
    progressLabel: goal.progressLabel,
    domainCount: goal.domains.length,
    domainSummary: goal.domainSummary,
    warningSummary: goal.warningSummary,
  };
}

export function buildArtifactSetOptions(staticData: StaticGameData): ArtifactSetOption[] {
  return Object.values(staticData.artifactDomains)
    .map((record) => ({
      key: record.setKey,
      label: record.setName,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildArtifactCharacterOptions(account: KrumpanionAccount | null, staticData: StaticGameData): ArtifactCharacterOption[] {
  return (account?.characters ?? [])
    .map((character) => ({
      key: character.characterId,
      label: getCharacterGoalDisplayName(character.characterId, staticData),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildArtifactGoalsViewModel(params: {
  account: KrumpanionAccount | null;
  staticData: StaticGameData;
  goals: ArtifactGoal[];
  incompleteOnly: boolean;
}): ArtifactGoalsTabViewModel {
  const goalRows = params.goals
    .filter((goal) => goal.enabled)
    .map((goal) => buildGoalView(goal, params.account, params.staticData))
    .sort(sortGoalRows);
  const filteredGoals = params.incompleteOnly ? goalRows.filter((goal) => goal.status !== "complete") : goalRows;

  const domainGroupMap = new Map<string, ArtifactDomainGroupViewModel>();
  for (const goal of filteredGoals) {
    const domains = goal.domains.length > 0 ? goal.domains : [{
      key: "no-standard-source",
      label: "No standard Artifact Domain source",
      setKeys: [],
      setLabels: [],
      hasStandardDomainSource: false,
    }];
    for (const domain of domains) {
      const current = domainGroupMap.get(domain.key);
      if (current) {
        current.goals.push(goal);
        current.goalCount += 1;
        current.incompleteGoalCount += goal.status === "complete" ? 0 : 1;
        current.completedGoalCount += goal.status === "complete" ? 1 : 0;
        current.setLabels = uniqueBy([...current.setLabels, ...domain.setLabels], (value) => value);
        continue;
      }
      domainGroupMap.set(domain.key, {
        key: domain.key,
        label: domain.label,
        location: domain.location,
        region: domain.region,
        setLabels: uniqueBy([...domain.setLabels], (value) => value),
        goals: [goal],
        goalCount: 1,
        incompleteGoalCount: goal.status === "complete" ? 0 : 1,
        completedGoalCount: goal.status === "complete" ? 1 : 0,
        hasStandardDomainSource: domain.hasStandardDomainSource,
      });
    }
  }

  const characterGroupMap = new Map<string, ArtifactCharacterGroupViewModel>();
  for (const goal of filteredGoals) {
    const key = goal.characterKey ?? "unassigned";
    const current = characterGroupMap.get(key);
    if (current) {
      current.goals.push(goal);
      current.goalCount += 1;
      current.incompleteGoalCount += goal.status === "complete" ? 0 : 1;
      current.completedGoalCount += goal.status === "complete" ? 1 : 0;
      continue;
    }
    characterGroupMap.set(key, {
      characterKey: goal.characterKey,
      characterLabel: goal.characterLabel,
      goals: [goal],
      goalCount: 1,
      incompleteGoalCount: goal.status === "complete" ? 0 : 1,
      completedGoalCount: goal.status === "complete" ? 1 : 0,
    });
  }

  const domainGroups = [...domainGroupMap.values()]
    .map((group) => ({
      ...group,
      goals: [...group.goals].sort(sortGoalRows),
      setLabels: [...group.setLabels].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const characterGroups = [...characterGroupMap.values()]
    .map((group) => ({
      ...group,
      goals: [...group.goals].sort(sortGoalRows),
    }))
    .sort((left, right) => left.characterLabel.localeCompare(right.characterLabel));

  const visibleGoalIdsByView: Record<ArtifactViewKey, string[]> = {
    character: characterGroups.flatMap((group) => group.goals.map((goal) => goal.id)),
    domain: uniqueBy(domainGroups.flatMap((group) => group.goals.map((goal) => goal.id)), (value) => value),
  };

  return {
    summary: {
      totalGoals: goalRows.length,
      incompleteGoals: goalRows.filter((goal) => goal.status !== "complete").length,
      completedGoals: goalRows.filter((goal) => goal.status === "complete").length,
      domainsNeeded: new Set(
        goalRows
          .filter((goal) => goal.status !== "complete")
          .flatMap((goal) => goal.domains.filter((domain) => domain.hasStandardDomainSource).map((domain) => domain.key)),
      ).size,
    },
    goalRows,
    goalRowsById: Object.fromEntries(goalRows.map((goal) => [goal.id, goal])),
    selectedGoalSummariesById: Object.fromEntries(goalRows.map((goal) => [goal.id, buildSelectedGoalSummary(goal)])),
    visibleGoalIdsByView,
    domainGroups,
    characterGroups,
  };
}
