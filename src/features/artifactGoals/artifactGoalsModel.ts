import type { KrumpanionAccount } from "../../domain/account/types";
import { getArtifactGoalDisplayName, getCharacterGoalDisplayName } from "../../domain/goals/goalDisplay";
import type {
  ArtifactCircletMainStat,
  ArtifactDesiredSubstat,
  ArtifactGoal,
  ArtifactGoalProgress,
  ArtifactGoalSlotKey,
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
export type ArtifactGuideRowStatus = "missing" | "partial" | "complete";

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
  pieceProgress: ArtifactGoalProgress;
  domains: ArtifactGoalDomainAssignment[];
  domainSummary: string;
  warnings: string[];
  warningSummary?: string;
  notes?: string;
}

export interface ArtifactDomainKeepGuideContributor {
  goalId: string;
  characterKey?: string;
  characterLabel: string;
  completed: boolean;
}

export interface ArtifactDomainKeepGuideRowViewModel {
  key: string;
  slotKey: ArtifactGoalSlotKey;
  slotLabel: string;
  setKey: string;
  setLabel: string;
  mainStatLabel: string;
  desiredSubstats: ArtifactDesiredSubstat[];
  desiredSubstatsSummary: string;
  usefulForCharacters: string[];
  completedCharacters: string[];
  status: ArtifactGuideRowStatus;
  statusLabel: string;
  representativeGoalId: string;
  goalIds: string[];
  contributors: ArtifactDomainKeepGuideContributor[];
}

export interface ArtifactDomainSetGroupViewModel {
  setKey: string;
  setLabel: string;
  rows: ArtifactDomainKeepGuideRowViewModel[];
}

export interface ArtifactDomainUsefulnessViewModel {
  usefulSetCount: number;
  incompleteGoalCount: number;
  missingSlotTargetCount: number;
  bothDomainSetsUseful: boolean;
  summaryLabel: string;
}

export interface ArtifactDomainGroupViewModel {
  key: string;
  label: string;
  location?: string;
  region?: string;
  setLabels: string[];
  characterLabels: string[];
  goals: ArtifactGoalViewModel[];
  goalCount: number;
  incompleteGoalCount: number;
  completedGoalCount: number;
  hasStandardDomainSource: boolean;
  keepGuideRows: ArtifactDomainKeepGuideRowViewModel[];
  setGroups: ArtifactDomainSetGroupViewModel[];
  usefulness: ArtifactDomainUsefulnessViewModel;
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

const ARTIFACT_SLOT_ORDER: ArtifactGoalSlotKey[] = ["flower", "plume", "sands", "goblet", "circlet"];
const ARTIFACT_SLOT_LABELS: Record<ArtifactGoalSlotKey, string> = {
  flower: "Flower",
  plume: "Plume",
  sands: "Sands",
  goblet: "Goblet",
  circlet: "Circlet",
};
const ARTIFACT_SLOT_COMPLETION_KEYS: Record<ArtifactGoalSlotKey, keyof ArtifactGoalProgress> = {
  flower: "flowerObtained",
  plume: "plumeObtained",
  sands: "sandsObtained",
  goblet: "gobletObtained",
  circlet: "circletObtained",
};

interface ArtifactGoalEntry {
  goal: ArtifactGoal;
  view: ArtifactGoalViewModel;
}

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

function countObtainedPieces(goal: ArtifactGoal): number {
  return ARTIFACT_SLOT_ORDER.filter((slotKey) => goal.progress[ARTIFACT_SLOT_COMPLETION_KEYS[slotKey]]).length;
}

function getGoalStatus(goal: ArtifactGoal): ArtifactGoalStatus {
  const obtainedCount = countObtainedPieces(goal);
  if (obtainedCount >= ARTIFACT_SLOT_ORDER.length) {
    return "complete";
  }
  if (obtainedCount > 0) {
    return "in_progress";
  }
  return "missing";
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
  if (obtainedCount >= ARTIFACT_SLOT_ORDER.length) {
    return "5/5 pieces obtained";
  }
  if (obtainedCount <= 0) {
    return "Missing";
  }
  return `${obtainedCount}/5 pieces obtained`;
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

function slotSortIndex(slotKey: ArtifactGoalSlotKey): number {
  return ARTIFACT_SLOT_ORDER.indexOf(slotKey);
}

function buildSlotMainStatLabel(goal: ArtifactGoal, slotKey: ArtifactGoalSlotKey): string {
  switch (slotKey) {
    case "flower":
      return "Fixed HP";
    case "plume":
      return "Fixed ATK";
    case "sands":
      return goal.mainStatTargets.sands.length > 0 ? goal.mainStatTargets.sands.join(" / ") : "Any Sands main stat";
    case "goblet":
      return goal.mainStatTargets.goblet.length > 0 ? goal.mainStatTargets.goblet.join(" / ") : "Any Goblet main stat";
    case "circlet":
      return goal.mainStatTargets.circlet.length > 0 ? goal.mainStatTargets.circlet.join(" / ") : "Any Circlet main stat";
  }
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

function buildRowStatus(incompleteGoalCount: number, goalCount: number): ArtifactGuideRowStatus {
  if (incompleteGoalCount <= 0) {
    return "complete";
  }
  if (incompleteGoalCount < goalCount) {
    return "partial";
  }
  return "missing";
}

function buildRowStatusLabel(status: ArtifactGuideRowStatus, incompleteGoalCount: number, goalCount: number): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return `${incompleteGoalCount}/${goalCount} still needed`;
    default:
      return goalCount > 1 ? `${goalCount} missing` : "Missing";
  }
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

function buildDomainGroups(
  entries: ArtifactGoalEntry[],
  showCompleted: boolean,
): ArtifactDomainGroupViewModel[] {
  const domainGroupMap = new Map<
    string,
    {
      key: string;
      label: string;
      location?: string;
      region?: string;
      setLabels: string[];
      characterLabels: string[];
      goals: ArtifactGoalViewModel[];
      hasStandardDomainSource: boolean;
      rowMap: Map<
        string,
        {
          slotKey: ArtifactGoalSlotKey;
          setKey: string;
          setLabel: string;
          mainStatLabel: string;
          desiredSubstats: ArtifactDesiredSubstat[];
          desiredSubstatsSummary: string;
          contributors: ArtifactDomainKeepGuideContributor[];
        }
      >;
    }
  >();

  for (const entry of entries) {
    const domains =
      entry.view.domains.length > 0
        ? entry.view.domains
        : [
            {
              key: "no-standard-source",
              label: "No standard Artifact Domain source",
              setKeys: [],
              setLabels: [],
              hasStandardDomainSource: false,
            },
          ];

    for (const domain of domains) {
      let current = domainGroupMap.get(domain.key);
      if (!current) {
        current = {
          key: domain.key,
          label: domain.label,
          location: domain.location,
          region: domain.region,
          setLabels: [],
          characterLabels: [],
          goals: [],
          hasStandardDomainSource: domain.hasStandardDomainSource,
          rowMap: new Map(),
        };
        domainGroupMap.set(domain.key, current);
      }

      current.setLabels.push(...domain.setLabels);
      current.characterLabels.push(entry.view.characterLabel);
      current.goals.push(entry.view);

      for (const setKey of domain.setKeys) {
        const setLabel = entry.view.setLabels[entry.goal.targetSetKeys.indexOf(setKey)] ?? prettifySetKey(setKey);
        for (const slotKey of ARTIFACT_SLOT_ORDER) {
          const completed = Boolean(entry.goal.progress[ARTIFACT_SLOT_COMPLETION_KEYS[slotKey]]);
          if (!showCompleted && completed) {
            continue;
          }

          const mainStatLabel = buildSlotMainStatLabel(entry.goal, slotKey);
          const desiredSubstats = [...entry.goal.desiredSubstats];
          const desiredSubstatsSummary = buildSubstatsSummary(desiredSubstats);
          const rowKey = [
            setKey,
            slotKey,
            mainStatLabel,
            desiredSubstats.join("|"),
          ].join("::");
          const existing = current.rowMap.get(rowKey);
          const contributor: ArtifactDomainKeepGuideContributor = {
            goalId: entry.goal.id,
            characterKey: entry.goal.characterKey,
            characterLabel: entry.view.characterLabel,
            completed,
          };

          if (existing) {
            existing.contributors.push(contributor);
            continue;
          }

          current.rowMap.set(rowKey, {
            slotKey,
            setKey,
            setLabel,
            mainStatLabel,
            desiredSubstats,
            desiredSubstatsSummary,
            contributors: [contributor],
          });
        }
      }
    }
  }

  return [...domainGroupMap.values()]
    .map((group) => {
      const keepGuideRows = [...group.rowMap.entries()]
        .map(([key, row]) => {
          const uniqueContributors = uniqueBy(row.contributors, (contributor) => contributor.goalId);
          const incompleteContributors = uniqueContributors.filter((contributor) => !contributor.completed);
          const completedContributors = uniqueContributors.filter((contributor) => contributor.completed);
          const status = buildRowStatus(incompleteContributors.length, uniqueContributors.length);
          return {
            key,
            slotKey: row.slotKey,
            slotLabel: ARTIFACT_SLOT_LABELS[row.slotKey],
            setKey: row.setKey,
            setLabel: row.setLabel,
            mainStatLabel: row.mainStatLabel,
            desiredSubstats: row.desiredSubstats,
            desiredSubstatsSummary: row.desiredSubstatsSummary,
            usefulForCharacters:
              incompleteContributors.length > 0
                ? uniqueBy(incompleteContributors.map((contributor) => contributor.characterLabel), (value) => value).sort((left, right) => left.localeCompare(right))
                : uniqueBy(uniqueContributors.map((contributor) => contributor.characterLabel), (value) => value).sort((left, right) => left.localeCompare(right)),
            completedCharacters: uniqueBy(completedContributors.map((contributor) => contributor.characterLabel), (value) => value).sort((left, right) => left.localeCompare(right)),
            status,
            statusLabel: buildRowStatusLabel(status, incompleteContributors.length, uniqueContributors.length),
            representativeGoalId: incompleteContributors[0]?.goalId ?? uniqueContributors[0]?.goalId ?? "",
            goalIds: uniqueContributors.map((contributor) => contributor.goalId).sort((left, right) => left.localeCompare(right)),
            contributors: uniqueContributors.sort(
              (left, right) => left.characterLabel.localeCompare(right.characterLabel) || left.goalId.localeCompare(right.goalId),
            ),
          } satisfies ArtifactDomainKeepGuideRowViewModel;
        })
        .sort((left, right) => {
          return (
            left.setLabel.localeCompare(right.setLabel) ||
            slotSortIndex(left.slotKey) - slotSortIndex(right.slotKey) ||
            left.mainStatLabel.localeCompare(right.mainStatLabel) ||
            left.desiredSubstatsSummary.localeCompare(right.desiredSubstatsSummary)
          );
        });

      const setGroups = uniqueBy(
        keepGuideRows.map((row) => row.setKey),
        (value) => value,
      )
        .map((setKey) => {
          const setRows = keepGuideRows.filter((row) => row.setKey === setKey);
          return {
            setKey,
            setLabel: setRows[0]?.setLabel ?? prettifySetKey(setKey),
            rows: setRows,
          } satisfies ArtifactDomainSetGroupViewModel;
        })
        .sort((left, right) => left.setLabel.localeCompare(right.setLabel));

      const incompleteGoals = uniqueBy(group.goals.filter((goal) => goal.status !== "complete"), (goal) => goal.id);
      const completedGoals = uniqueBy(group.goals.filter((goal) => goal.status === "complete"), (goal) => goal.id);
      const usefulSetCount = new Set(keepGuideRows.filter((row) => row.status !== "complete").map((row) => row.setKey)).size;
      const missingSlotTargetCount = keepGuideRows.reduce(
        (count, row) => count + row.contributors.filter((contributor) => !contributor.completed).length,
        0,
      );
      const usefulness = {
        usefulSetCount,
        incompleteGoalCount: incompleteGoals.length,
        missingSlotTargetCount,
        bothDomainSetsUseful: usefulSetCount >= 2,
        summaryLabel: `${usefulSetCount} useful sets · ${incompleteGoals.length} goals · ${missingSlotTargetCount} missing slots`,
      } satisfies ArtifactDomainUsefulnessViewModel;

      return {
        key: group.key,
        label: group.label,
        location: group.location,
        region: group.region,
        setLabels: uniqueBy(group.setLabels, (value) => value).sort((left, right) => left.localeCompare(right)),
        characterLabels: uniqueBy(
          keepGuideRows.flatMap((row) => row.usefulForCharacters),
          (value) => value,
        ).sort((left, right) => left.localeCompare(right)),
        goals: uniqueBy(
          group.goals.filter((goal) => showCompleted || goal.status !== "complete"),
          (goal) => goal.id,
        ).sort(sortGoalRows),
        goalCount: uniqueBy(
          group.goals.filter((goal) => showCompleted || goal.status !== "complete"),
          (goal) => goal.id,
        ).length,
        incompleteGoalCount: incompleteGoals.length,
        completedGoalCount: completedGoals.length,
        hasStandardDomainSource: group.hasStandardDomainSource,
        keepGuideRows,
        setGroups,
        usefulness,
      } satisfies ArtifactDomainGroupViewModel;
    })
    .filter((group) => showCompleted || group.keepGuideRows.length > 0 || group.incompleteGoalCount > 0)
    .sort((left, right) => {
      return (
        Number(right.usefulness.bothDomainSetsUseful) - Number(left.usefulness.bothDomainSetsUseful) ||
        right.usefulness.missingSlotTargetCount - left.usefulness.missingSlotTargetCount ||
        right.usefulness.incompleteGoalCount - left.usefulness.incompleteGoalCount ||
        left.label.localeCompare(right.label)
      );
    });
}

export function buildArtifactGoalsViewModel(params: {
  account: KrumpanionAccount | null;
  staticData: StaticGameData;
  goals: ArtifactGoal[];
  showCompleted: boolean;
}): ArtifactGoalsTabViewModel {
  const entries = params.goals
    .filter((goal) => goal.enabled)
    .map((goal) => ({
      goal,
      view: buildGoalView(goal, params.account, params.staticData),
    }))
    .sort((left, right) => sortGoalRows(left.view, right.view));

  const goalRows = entries.map((entry) => entry.view);
  const filteredGoalRows = params.showCompleted ? goalRows : goalRows.filter((goal) => goal.status !== "complete");

  const characterGroupMap = new Map<string, ArtifactCharacterGroupViewModel>();
  for (const goal of filteredGoalRows) {
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

  const characterGroups = [...characterGroupMap.values()]
    .map((group) => ({
      ...group,
      goals: [...group.goals].sort(sortGoalRows),
    }))
    .sort((left, right) => left.characterLabel.localeCompare(right.characterLabel));

  const domainGroups = buildDomainGroups(entries, params.showCompleted);

  const visibleGoalIdsByView: Record<ArtifactViewKey, string[]> = {
    character: characterGroups.flatMap((group) => group.goals.map((goal) => goal.id)),
    domain: uniqueBy(
      domainGroups.flatMap((group) => group.keepGuideRows.map((row) => row.representativeGoalId).filter(Boolean)),
      (value) => value,
    ),
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
