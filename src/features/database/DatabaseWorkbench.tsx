import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  EmptyStateCard,
  FilterToolbar,
  SectionCard,
  SplitWorkspace,
  StatusBadge,
  WarningPanel,
} from "../../app/layoutPrimitives";
import type { ImportedAccountState } from "../../domain/account/types";
import type {
  CharacterCatalogEntry,
  LocalSpecialtyRegion,
  OverrideDataPack,
  StaticGameData,
} from "../../domain/staticData/types";
import type { StaticDataHealthReport } from "../../domain/staticData/validateStaticData";
import {
  type ChangeSetExportBundle,
  type ChangeSetValidationIssue,
  type CharacterMaterialAssignmentDraft,
  type CommonEnemyDropFamilyDraft,
  type DatabaseCanonicalReleaseState,
  type DatabaseCanonicalStatus,
  type DatabaseChangeSet,
  type ArtifactDomainDraft,
  type LocalSpecialtyDraft,
  type NormalBossMaterialDraft,
  type PatchManifestRecordKind,
  type SourceDomainDraft,
  type StandaloneMaterialDraft,
  type TalentBookFamilyDraft,
  type WeaponProfileDraft,
  type WeaponAscensionFamilyDraft,
  type WeeklyBossGroupDraft,
  cloneCanonicalRecordToPatchManifest,
  deletePatchManifestRecord,
  getPatchManifestRecordMetadataKey,
  renamePatchManifestRecord,
} from "../../domain/staticData/databaseChangeSet";
import { buildCharacterProfileEditorState } from "./databaseProfileHelpers";
import { SelectField } from "./databaseShared";
import { AVAILABILITY_OPTIONS, ELEMENT_OPTIONS, MATERIAL_CATEGORIES, REGION_OPTIONS, SOURCE_TYPES, WEAPON_TYPE_OPTIONS } from "./databaseConstants";
import {
  MANIFEST_RECORD_TYPE_OPTIONS,
  MANIFEST_SORT_OPTIONS,
  MANIFEST_STATUS_FILTER_OPTIONS,
  MANIFEST_WORKFLOW_GROUP_OPTIONS,
  buildManifestRecordRows,
  filterAndGroupManifestRecordRows,
  type ManifestRecordSort,
  type ManifestRecordStatusFilter,
  type ManifestWorkflowGroup,
} from "./patchManifestRecordsModel";
import {
  buildKnownKeyLookupIndex,
  generateKeyFromName,
  resolveKnownKey,
  type KnownKeyCandidate,
  type KnownKeyLookupIndex,
  type KnownKeyType,
} from "./patchManifestResolver";

export type DatabaseWorkbenchView = "wizard" | "records" | "validate" | "commit";
type DraftKind = PatchManifestRecordKind;
type Selection = { kind: DraftKind; key: string };

const PATCH_MANIFEST_RECORD_KINDS: PatchManifestRecordKind[] = [
  "weeklyBossGroup",
  "talentBookFamily",
  "weaponAscensionFamily",
  "commonEnemyDropFamily",
  "normalBossMaterial",
  "localSpecialty",
  "standaloneMaterial",
  "characterAssignment",
  "weaponProfile",
  "artifactDomain",
  "sourceDomain",
];

const STATUS_OPTIONS: DatabaseCanonicalStatus[] = ["verified", "beta", "unresolved", "ignored", "deprecated"];
const RELEASE_STATE_OPTIONS: DatabaseCanonicalReleaseState[] = ["live", "beta", "unreleased", "ignored", "deprecated"];
const LOCAL_SPECIALTY_REGIONS: LocalSpecialtyRegion[] = ["Mondstadt", "Liyue", "Inazuma", "Sumeru", "Fontaine", "Natlan", "Nod-Krai", "Snezhnaya"];

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinCommaList(value: string[]): string {
  return value.join(", ");
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function createBlankWeeklyBossGroup(key: string): WeeklyBossGroupDraft {
  return {
    sourceKey: key,
    bossKey: key,
    bossName: "",
    domainName: "",
    status: "beta",
    notes: [],
    drops: [
      { key: `${key}DropA`, displayName: "" },
      { key: `${key}DropB`, displayName: "" },
      { key: `${key}DropC`, displayName: "" },
    ],
  };
}

function createBlankTalentBookFamily(key: string): TalentBookFamilyDraft {
  return {
    key,
    teachingsKey: `TeachingsOf${key}`,
    teachingsName: "",
    guideKey: `GuideTo${key}`,
    guideName: "",
    philosophiesKey: `PhilosophiesOf${key}`,
    philosophiesName: "",
    domainKey: "",
    domainName: "",
    availability: "MON_THU_SUN",
    region: "Fontaine",
    status: "beta",
    notes: [],
  };
}

function createBlankWeaponAscensionFamily(key: string): WeaponAscensionFamilyDraft {
  return {
    key,
    displayName: key,
    twoStarKey: `${key}Tier1`,
    twoStarName: "",
    threeStarKey: `${key}Tier2`,
    threeStarName: "",
    fourStarKey: `${key}Tier3`,
    fourStarName: "",
    fiveStarKey: `${key}Tier4`,
    fiveStarName: "",
    domainKey: "",
    domainName: "",
    availability: "MON_THU_SUN",
    region: "Fontaine",
    status: "beta",
    notes: [],
  };
}

function createBlankCommonEnemyDropFamily(key: string): CommonEnemyDropFamilyDraft {
  return {
    familyId: key,
    displayName: key,
    sourceEnemyFamily: "",
    lowKey: `${key}Tier1`,
    lowName: "",
    midKey: `${key}Tier2`,
    midName: "",
    highKey: `${key}Tier3`,
    highName: "",
    status: "beta",
    notes: [],
  };
}

function createBlankNormalBossMaterial(key: string): NormalBossMaterialDraft {
  return {
    key,
    displayName: "",
    bossKey: key,
    bossDisplayName: "",
    status: "beta",
    notes: [],
  };
}

function createBlankLocalSpecialty(key: string): LocalSpecialtyDraft {
  return {
    key,
    displayName: "",
    region: "Fontaine",
    isPurchasable: false,
    purchaseVendors: [],
    searchHint: "",
    notes: [],
  };
}

function createBlankStandaloneMaterial(key: string): StandaloneMaterialDraft {
  return {
    key,
    displayName: "",
    category: "other",
    recordCategory: "special_progression_material",
    status: "beta",
    usedFor: [],
    craftable: false,
    sourceType: "other",
    sourceKey: key,
    sourceName: "",
    availability: "UNKNOWN",
    notes: [],
  };
}

function createBlankSourceDomain(key: string): SourceDomainDraft {
  return {
    domainKey: key,
    domainType: "mastery",
    name: "",
    region: "Fontaine",
    location: "",
    availability: "MON_THU_SUN",
    linkedFamilyKeys: [],
    listedRewards: [],
    elements: [],
    notes: [],
  };
}

function createBlankWeaponProfile(key: string): WeaponProfileDraft {
  return {
    weaponKey: key,
    displayName: "",
    rarity: 4,
    acquisitionType: "unknown",
    refinementTrackable: true,
    refinementPolicy: "normal",
    limited: false,
    eventExclusive: false,
    weaponAscensionMaterialFamilyKey: "",
    eliteEnemyDropFamilyKey: "",
    commonEnemyDropFamilyKey: "",
    releaseState: "beta",
    status: "beta",
    plannerEligible: false,
    aliases: [],
    notes: [],
  };
}

function createBlankArtifactDomain(key: string): ArtifactDomainDraft {
  return {
    setKey: key,
    setName: "",
    hasStandardDomainSource: true,
    domainKey: "",
    domainName: "",
    domainLocation: "",
    region: "Fontaine",
    availability: "ALWAYS",
    resinCost: 20,
    pairedSetKeys: [],
  };
}

function buildCharacterDraftFromStaticData(
  characterKey: string,
  staticData: StaticGameData,
): CharacterMaterialAssignmentDraft {
  const character = staticData.characters[characterKey] as CharacterCatalogEntry | undefined;
  const profile = staticData.characterMaterialProfiles[characterKey];
  return {
    characterKey,
    displayName: character?.displayName ?? profile?.displayName ?? characterKey,
    element: character?.element ?? profile?.element,
    weaponType: character?.weaponType ?? profile?.weaponType,
    rarity: character?.rarity ?? profile?.rarity,
    region: character?.region,
    releaseState: "beta",
    status: profile?.status === "verified" || profile?.status === "unresolved" || profile?.status === "beta"
      ? profile.status
      : "beta",
    plannerEligible: true,
    aliases: [character?.displayName ?? profile?.displayName ?? characterKey],
    notes: profile?.notes ?? [],
    sourceRefs: [],
    gemFamilyKey: profile?.gemFamilyKey ?? profile?.elementGemFamilyKey ?? "",
    normalBossMaterialKey: profile?.normalBossMaterialKey ?? profile?.normalBossMaterial ?? "",
    commonEnemyDropFamilyKey: profile?.commonEnemyMaterialFamilyId ?? profile?.enemyDropFamilyKey ?? "",
    localSpecialtyKey: profile?.localSpecialtyKey ?? profile?.localSpecialty ?? "",
    talentBookFamilyKey: profile?.talentBookSeriesKey ?? profile?.talentBookFamilyKey ?? "",
    weeklyBossMaterialKey: profile?.weeklyBossMaterialKey ?? profile?.weeklyBossMaterial ?? "",
  };
}

function dedupeList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function resolveKnownKeyAcrossTypes(index: KnownKeyLookupIndex, types: KnownKeyType[], value: string) {
  const resolutions = types.map((type) => resolveKnownKey(index, type, value));
  const candidates = resolutions.flatMap((resolution) => resolution.candidates);
  const exact = resolutions.find((resolution) => resolution.status === "exact");
  if (exact) return exact;
  const normalized = resolutions.filter((resolution) => resolution.status === "normalized");
  if (normalized.length === 1) return normalized[0];
  if (normalized.length > 1) {
    return { status: "ambiguous" as const, candidates: normalized.flatMap((resolution) => resolution.candidates), message: "Several records look like this value." };
  }
  const suggested = candidates.slice(0, 6);
  if (suggested.length) {
    return { status: resolutions.some((resolution) => resolution.status === "ambiguous") ? "ambiguous" as const : "suggested" as const, candidates: suggested, message: "Possible matches found." };
  }
  return resolutions[0] ?? { status: "missing" as const, candidates: [], message: "No known key matches this value yet." };
}

function resolveManifestKind(value: string): PatchManifestRecordKind | null {
  return PATCH_MANIFEST_RECORD_KINDS.includes(value as PatchManifestRecordKind)
    ? value as PatchManifestRecordKind
    : null;
}

function FieldSection({ title, description, children, defaultOpen = true }: { title: string; description?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="database-field-section" open={defaultOpen}>
      <summary>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </summary>
      <div className="database-field-section-body">{children}</div>
    </details>
  );
}

function GeneratedKeyField({
  label,
  value,
  sourceValue,
  onChange,
}: {
  label: string;
  value: string;
  sourceValue: string;
  onChange: (value: string) => void;
}) {
  const generated = generateKeyFromName(sourceValue);
  return (
    <label>
      <span>{label}</span>
      <div className="database-key-input-row">
        <input className="text-input" value={value} onChange={(event) => onChange(event.target.value.trim())} />
        <button type="button" className="button-ghost" disabled={!generated || generated === value} onClick={() => onChange(generated)}>
          Generate from name
        </button>
      </div>
      <small className="muted">Use the main record action when this field should also move the manifest object key.</small>
    </label>
  );
}

function KnownKeyField({
  label,
  value,
  types,
  lookupIndex,
  onChange,
  onQuickCreate,
}: {
  label: string;
  value: string;
  types: KnownKeyType[];
  lookupIndex: KnownKeyLookupIndex;
  onChange: (value: string) => void;
  onQuickCreate?: (seed: string) => void;
}) {
  const resolution = resolveKnownKeyAcrossTypes(lookupIndex, types, value);
  const tone =
    resolution.status === "exact" ? "success" :
    resolution.status === "missing" ? "warning" :
    resolution.status === "empty" ? "default" :
    "accent";
  return (
    <label className="known-key-field">
      <span>{label}</span>
      <input className="text-input" value={value} onChange={(event) => onChange(event.target.value.trim())} />
      <div className="database-resolver-row">
        <StatusBadge tone={tone}>{resolution.status === "empty" ? "Unset" : resolution.status}</StatusBadge>
        <small>{resolution.message}</small>
      </div>
      {resolution.status !== "exact" && resolution.candidates.length ? (
        <div className="database-suggestion-list">
          {resolution.candidates.map((candidate) => (
            <button key={`${candidate.type}-${candidate.key}`} type="button" className="pill-button" onClick={() => onChange(candidate.key)}>
              Use {candidate.key}
            </button>
          ))}
        </div>
      ) : null}
      {resolution.status === "missing" && onQuickCreate ? (
        <button type="button" className="button-ghost" onClick={() => onQuickCreate(value)}>
          Quick-create linked record
        </button>
      ) : null}
    </label>
  );
}

function KnownKeyMultiField({
  label,
  values,
  types,
  lookupIndex,
  onChange,
}: {
  label: string;
  values: string[];
  types: KnownKeyType[];
  lookupIndex: KnownKeyLookupIndex;
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedValues = useMemo(() => new Set(values), [values]);
  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const seen = new Set<string>();
    const matches: KnownKeyCandidate[] = [];
    for (const type of types) {
      for (const candidate of lookupIndex.byType[type] ?? []) {
        const uniqueKey = `${candidate.type}:${candidate.key}`;
        if (selectedValues.has(candidate.key) || seen.has(uniqueKey)) {
          continue;
        }
        const searchable = [candidate.key, candidate.label, candidate.subtitle, candidate.matchReason]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) {
          continue;
        }
        seen.add(uniqueKey);
        matches.push(candidate);
      }
    }
    return matches
      .sort((left, right) => left.label.localeCompare(right.label) || left.key.localeCompare(right.key))
      .slice(0, 12);
  }, [lookupIndex, query, selectedValues, types]);

  const setValues = (nextValues: string[]) => onChange(dedupeList(nextValues));
  const addValue = (value: string) => {
    setValues([...values, value]);
    setQuery("");
  };
  const removeValue = (value: string) => setValues(values.filter((entry) => entry !== value));

  return (
    <div className="known-key-field database-multi-key-field">
      <label>
        <span>{label}</span>
        <input
          aria-label={`${label} comma-separated keys`}
          className="text-input"
          value={joinCommaList(values)}
          onChange={(event) => setValues(parseCommaList(event.target.value))}
        />
      </label>
      <div className="database-key-chip-list">
        {values.map((value) => {
          const resolution = resolveKnownKeyAcrossTypes(lookupIndex, types, value);
          return (
            <button
              key={value}
              type="button"
              className={`database-key-chip database-key-chip-button is-${resolution.status}`}
              onClick={() => removeValue(value)}
              aria-label={`Remove ${value}`}
            >
              {value} · {resolution.status} ×
            </button>
          );
        })}
        {values.length === 0 ? <small className="muted">No keys selected yet.</small> : null}
      </div>
      <div className="database-key-picker">
        <label>
          <span>Search known keys</span>
          <input
            aria-label={`Search ${label}`}
            className="text-input"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="database-key-picker-results">
          {candidates.map((candidate) => (
            <button
              key={`${candidate.type}-${candidate.key}`}
              type="button"
              className="database-key-option"
              onClick={() => addValue(candidate.key)}
            >
              <strong>Add {candidate.label}</strong>
              <span>{candidate.key}{candidate.subtitle ? ` · ${candidate.subtitle}` : ""}</span>
            </button>
          ))}
          {candidates.length === 0 ? <small className="muted">No available keys match this search.</small> : null}
        </div>
      </div>
    </div>
  );
}

interface DatabaseWorkbenchProps {
  view: DatabaseWorkbenchView;
  account: ImportedAccountState | null;
  staticData: StaticGameData;
  previewStaticData: StaticGameData;
  previewOverridePack: OverrideDataPack;
  changeSet: DatabaseChangeSet;
  onChangeSetChange: (next: DatabaseChangeSet) => void;
  validationIssues: ChangeSetValidationIssue[];
  previewHealthReport: StaticDataHealthReport;
  exportBundle: ChangeSetExportBundle;
  onRequestViewChange?: (view: DatabaseWorkbenchView) => void;
  onCommitPatch: () => Promise<void>;
  commitDisabledReason?: string;
  commitStatus?: string;
  commitError?: string;
}

export function DatabaseWorkbench({
  view,
  account,
  staticData,
  previewStaticData,
  previewOverridePack,
  changeSet,
  onChangeSetChange,
  validationIssues,
  previewHealthReport,
  exportBundle,
  onRequestViewChange,
  onCommitPatch,
  commitDisabledReason,
  commitStatus,
  commitError,
}: DatabaseWorkbenchProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [showAssignmentProblemsOnly, setShowAssignmentProblemsOnly] = useState(true);
  const [selectedCharacterKey, setSelectedCharacterKey] = useState("");
  const [manifestText, setManifestText] = useState("");
  const [manifestError, setManifestError] = useState("");
  const [cloneKind, setCloneKind] = useState<PatchManifestRecordKind>("characterAssignment");
  const [cloneSearch, setCloneSearch] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [recordGroupFilter, setRecordGroupFilter] = useState<ManifestWorkflowGroup>("all");
  const [recordKindFilter, setRecordKindFilter] = useState<"all" | PatchManifestRecordKind>("all");
  const [recordStatusFilter, setRecordStatusFilter] = useState<ManifestRecordStatusFilter>("all");
  const [recordSort, setRecordSort] = useState<ManifestRecordSort>("recommended");

  const keyLookupIndex = useMemo(() => buildKnownKeyLookupIndex(previewStaticData), [previewStaticData]);
  const materialRows = useMemo(
    () => buildManifestRecordRows(changeSet, validationIssues),
    [changeSet, validationIssues],
  );
  const manifestRecordGroups = useMemo(
    () =>
      filterAndGroupManifestRecordRows(materialRows, {
        search: recordSearch,
        group: recordGroupFilter,
        kind: recordKindFilter,
        status: recordStatusFilter,
        sort: recordSort,
      }),
    [materialRows, recordGroupFilter, recordKindFilter, recordSearch, recordSort, recordStatusFilter],
  );

  useEffect(() => {
    if (view !== "records" || selection) {
      return;
    }
    const first = materialRows[0];
    if (first) {
      setSelection({ kind: first.kind, key: first.key });
    }
  }, [materialRows, selection, view]);

  useEffect(() => {
    setRenameValue(selection?.key ?? "");
  }, [selection]);

  const assignmentRows = useMemo(() => {
    const combined = new Set<string>([...Object.keys(staticData.characters), ...Object.keys(changeSet.characters)]);
    return [...combined]
      .map((characterKey) => {
        const draft = changeSet.characters[characterKey] ?? buildCharacterDraftFromStaticData(characterKey, previewStaticData);
        const issues = validationIssues.filter((issue) => issue.entityType === "characterAssignment" && issue.entityKey === characterKey);
        return {
          key: characterKey,
          label: draft.displayName || characterKey,
          issueCount: issues.length,
          draft,
        };
      })
      .filter((row) => row.label.toLowerCase().includes(assignmentSearch.trim().toLowerCase()))
      .filter((row) => (showAssignmentProblemsOnly ? row.issueCount > 0 || changeSet.characters[row.key] : true))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [assignmentSearch, changeSet.characters, previewStaticData, showAssignmentProblemsOnly, staticData.characters, validationIssues]);

  useEffect(() => {
    if (!selectedCharacterKey && assignmentRows[0]?.key) {
      setSelectedCharacterKey(assignmentRows[0].key);
      return;
    }
    if (selectedCharacterKey && !assignmentRows.some((row) => row.key === selectedCharacterKey)) {
      setSelectedCharacterKey(assignmentRows[0]?.key ?? "");
    }
  }, [assignmentRows, selectedCharacterKey]);

  const selectedCharacterDraft = selectedCharacterKey
    ? changeSet.characters[selectedCharacterKey] ?? buildCharacterDraftFromStaticData(selectedCharacterKey, previewStaticData)
    : undefined;

  const gemOptions = useMemo(() => Object.keys(previewStaticData.elementGemFamilies).sort(), [previewStaticData.elementGemFamilies]);
  const talentOptions = useMemo(() => Object.keys(previewStaticData.talentBookFamilies).sort(), [previewStaticData.talentBookFamilies]);
  const commonEnemyOptions = useMemo(() => Object.keys(previewStaticData.generalEnemyDropFamilies).sort(), [previewStaticData.generalEnemyDropFamilies]);
  const localSpecialtyOptions = useMemo(() => Object.keys(previewStaticData.localSpecialties).sort(), [previewStaticData.localSpecialties]);
  const normalBossOptions = useMemo(() => Object.keys(previewStaticData.normalBossMaterials).sort(), [previewStaticData.normalBossMaterials]);
  const weeklyBossOptions = useMemo(
    () => [...Object.keys(previewStaticData.weeklyBossMaterials), ...Object.keys(previewStaticData.specialProgressionMaterials)].sort(),
    [previewStaticData.specialProgressionMaterials, previewStaticData.weeklyBossMaterials],
  );
  const cloneRows = useMemo(() => {
    const rows =
      cloneKind === "characterAssignment"
        ? Object.keys(staticData.characters).map((key) => ({ key, label: staticData.characters[key].displayName || key }))
        : cloneKind === "weaponProfile"
          ? Object.keys(staticData.weapons).map((key) => ({ key, label: staticData.weapons[key].displayName || key }))
          : cloneKind === "talentBookFamily"
            ? Object.keys(staticData.talentBookFamilies).map((key) => ({ key, label: key }))
            : cloneKind === "weaponAscensionFamily"
              ? Object.keys(staticData.weaponAscensionMaterialFamilies).map((key) => ({ key, label: staticData.weaponAscensionMaterialFamilies[key].displayName || key }))
              : cloneKind === "commonEnemyDropFamily"
                ? Object.keys(staticData.generalEnemyDropFamilies).map((key) => ({ key, label: staticData.generalEnemyDropFamilies[key].displayName || key }))
                : cloneKind === "normalBossMaterial"
                  ? Object.keys(staticData.normalBossMaterials).map((key) => ({ key, label: staticData.normalBossMaterials[key].displayName || key }))
                  : cloneKind === "localSpecialty"
                    ? Object.keys(staticData.localSpecialties).map((key) => ({ key, label: staticData.localSpecialties[key].displayName || key }))
                    : cloneKind === "standaloneMaterial"
                      ? Object.keys(staticData.materials).map((key) => ({ key, label: staticData.materials[key].displayName || key }))
                      : cloneKind === "artifactDomain"
                        ? Object.keys(staticData.artifactDomains).map((key) => ({ key, label: staticData.artifactDomains[key].setName || key }))
                        : cloneKind === "sourceDomain"
                          ? [
                              ...Object.keys(staticData.domainsOfMastery).map((key) => ({ key, label: staticData.domainsOfMastery[key].name || key })),
                              ...Object.keys(staticData.domainsOfForgery).map((key) => ({ key, label: staticData.domainsOfForgery[key].name || key })),
                              ...Object.keys(staticData.trounceDomains).map((key) => ({ key, label: staticData.trounceDomains[key].name || key })),
                            ]
                          : Object.keys(staticData.weeklyBossMaterials).map((key) => ({ key, label: staticData.weeklyBossMaterials[key].displayName || key }));
    const search = cloneSearch.trim().toLowerCase();
    return rows
      .filter((row) => !search || `${row.key} ${row.label}`.toLowerCase().includes(search))
      .sort((left, right) => left.label.localeCompare(right.label))
      .slice(0, 30);
  }, [cloneKind, cloneSearch, staticData]);

  function setChangeSet(next: DatabaseChangeSet) {
    onChangeSetChange(next);
  }

  function withDraftMetadata(next: DatabaseChangeSet, kind: PatchManifestRecordKind, key: string): DatabaseChangeSet {
    const metadataKey = getPatchManifestRecordMetadataKey(kind, key);
    const existing = changeSet.recordMetadata?.[metadataKey];
    const now = new Date().toISOString();
    return {
      ...next,
      recordMetadata: {
        ...(next.recordMetadata ?? {}),
        [metadataKey]: {
          id: metadataKey,
          kind,
          mode: existing?.mode ?? "new",
          sourceCanonicalKey: existing?.sourceCanonicalKey,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        },
      },
    };
  }

  function upsertWeeklyBossGroup(key: string, draft: WeeklyBossGroupDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, weeklyBossGroups: { ...changeSet.weeklyBossGroups, [key]: draft } }, "weeklyBossGroup", key));
  }
  function upsertTalentBookFamily(key: string, draft: TalentBookFamilyDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, talentBookFamilies: { ...changeSet.talentBookFamilies, [key]: draft } }, "talentBookFamily", key));
  }
  function upsertWeaponAscensionFamily(key: string, draft: WeaponAscensionFamilyDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, weaponAscensionFamilies: { ...changeSet.weaponAscensionFamilies, [key]: draft } }, "weaponAscensionFamily", key));
  }
  function upsertCommonEnemyDropFamily(key: string, draft: CommonEnemyDropFamilyDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, commonEnemyDropFamilies: { ...changeSet.commonEnemyDropFamilies, [key]: draft } }, "commonEnemyDropFamily", key));
  }
  function upsertNormalBossMaterial(key: string, draft: NormalBossMaterialDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, normalBossMaterials: { ...changeSet.normalBossMaterials, [key]: draft } }, "normalBossMaterial", key));
  }
  function upsertLocalSpecialty(key: string, draft: LocalSpecialtyDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, localSpecialties: { ...changeSet.localSpecialties, [key]: draft } }, "localSpecialty", key));
  }
  function upsertStandaloneMaterial(key: string, draft: StandaloneMaterialDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, standaloneMaterials: { ...changeSet.standaloneMaterials, [key]: draft } }, "standaloneMaterial", key));
  }
  function upsertCharacterDraft(key: string, draft: CharacterMaterialAssignmentDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, characters: { ...changeSet.characters, [key]: draft } }, "characterAssignment", key));
  }
  function upsertSourceDomain(key: string, draft: SourceDomainDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, sourceDomains: { ...changeSet.sourceDomains, [key]: draft } }, "sourceDomain", key));
  }
  function upsertWeaponProfile(key: string, draft: WeaponProfileDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, weapons: { ...changeSet.weapons, [key]: draft } }, "weaponProfile", key));
  }
  function upsertArtifactDomain(key: string, draft: ArtifactDomainDraft) {
    setChangeSet(withDraftMetadata({ ...changeSet, artifactDomains: { ...changeSet.artifactDomains, [key]: draft } }, "artifactDomain", key));
  }

  function selectDraft(kind: DraftKind, key: string, navigateToRecords = true) {
    setSelection({ kind, key });
    if (navigateToRecords) {
      onRequestViewChange?.("records");
    }
  }

  function deleteSelectedDraft(selected: Selection) {
    const nextRows = materialRows.filter((row) => !(row.kind === selected.kind && row.key === selected.key));
    const selectedIndex = materialRows.findIndex((row) => row.kind === selected.kind && row.key === selected.key);
    const fallback = nextRows[selectedIndex] ?? nextRows[selectedIndex - 1] ?? nextRows[0];
    setChangeSet(deletePatchManifestRecord(changeSet, selected.kind, selected.key));
    setSelection(fallback ? { kind: fallback.kind, key: fallback.key } : null);
  }

  function renameSelectedDraft(selected: Selection) {
    const nextKey = renameValue.trim();
    if (!nextKey || nextKey === selected.key) {
      return;
    }
    setChangeSet(renamePatchManifestRecord(changeSet, selected.kind, selected.key, nextKey));
    setSelection({ kind: selected.kind, key: nextKey });
  }

  function duplicateSelectedDraft(selected: Selection) {
    const draft = getSelectedDraft(selected);
    if (!draft) {
      return;
    }
    let nextKey = `${selected.key}Copy`;
    let index = 2;
    while (materialRows.some((row) => row.kind === selected.kind && row.key === nextKey)) {
      nextKey = `${selected.key}Copy${index}`;
      index += 1;
    }
    const nextChangeSet = renamePatchManifestRecord(
      {
        ...changeSet,
        recordMetadata: {
          ...(changeSet.recordMetadata ?? {}),
          [getPatchManifestRecordMetadataKey(selected.kind, `${selected.key}__duplicate_seed`)]: {
            id: getPatchManifestRecordMetadataKey(selected.kind, `${selected.key}__duplicate_seed`),
            kind: selected.kind,
            mode: "new",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        weeklyBossGroups: selected.kind === "weeklyBossGroup" ? { ...changeSet.weeklyBossGroups, [`${selected.key}__duplicate_seed`]: draft as WeeklyBossGroupDraft } : changeSet.weeklyBossGroups,
        talentBookFamilies: selected.kind === "talentBookFamily" ? { ...changeSet.talentBookFamilies, [`${selected.key}__duplicate_seed`]: draft as TalentBookFamilyDraft } : changeSet.talentBookFamilies,
        weaponAscensionFamilies: selected.kind === "weaponAscensionFamily" ? { ...changeSet.weaponAscensionFamilies, [`${selected.key}__duplicate_seed`]: draft as WeaponAscensionFamilyDraft } : changeSet.weaponAscensionFamilies,
        commonEnemyDropFamilies: selected.kind === "commonEnemyDropFamily" ? { ...changeSet.commonEnemyDropFamilies, [`${selected.key}__duplicate_seed`]: draft as CommonEnemyDropFamilyDraft } : changeSet.commonEnemyDropFamilies,
        normalBossMaterials: selected.kind === "normalBossMaterial" ? { ...changeSet.normalBossMaterials, [`${selected.key}__duplicate_seed`]: draft as NormalBossMaterialDraft } : changeSet.normalBossMaterials,
        localSpecialties: selected.kind === "localSpecialty" ? { ...changeSet.localSpecialties, [`${selected.key}__duplicate_seed`]: draft as LocalSpecialtyDraft } : changeSet.localSpecialties,
        standaloneMaterials: selected.kind === "standaloneMaterial" ? { ...changeSet.standaloneMaterials, [`${selected.key}__duplicate_seed`]: draft as StandaloneMaterialDraft } : changeSet.standaloneMaterials,
        characters: selected.kind === "characterAssignment" ? { ...changeSet.characters, [`${selected.key}__duplicate_seed`]: draft as CharacterMaterialAssignmentDraft } : changeSet.characters,
        weapons: selected.kind === "weaponProfile" ? { ...changeSet.weapons, [`${selected.key}__duplicate_seed`]: draft as WeaponProfileDraft } : changeSet.weapons,
        artifactDomains: selected.kind === "artifactDomain" ? { ...changeSet.artifactDomains, [`${selected.key}__duplicate_seed`]: draft as ArtifactDomainDraft } : changeSet.artifactDomains,
        sourceDomains: selected.kind === "sourceDomain" ? { ...changeSet.sourceDomains, [`${selected.key}__duplicate_seed`]: draft as SourceDomainDraft } : changeSet.sourceDomains,
      },
      selected.kind,
      `${selected.key}__duplicate_seed`,
      nextKey,
    );
    setChangeSet(nextChangeSet);
    setSelection({ kind: selected.kind, key: nextKey });
  }

  function getSelectedDraft(selected: Selection): unknown {
    if (selected.kind === "weeklyBossGroup") return changeSet.weeklyBossGroups[selected.key];
    if (selected.kind === "talentBookFamily") return changeSet.talentBookFamilies[selected.key];
    if (selected.kind === "weaponAscensionFamily") return changeSet.weaponAscensionFamilies[selected.key];
    if (selected.kind === "commonEnemyDropFamily") return changeSet.commonEnemyDropFamilies[selected.key];
    if (selected.kind === "normalBossMaterial") return changeSet.normalBossMaterials[selected.key];
    if (selected.kind === "localSpecialty") return changeSet.localSpecialties[selected.key];
    if (selected.kind === "standaloneMaterial") return changeSet.standaloneMaterials[selected.key];
    if (selected.kind === "characterAssignment") return changeSet.characters[selected.key];
    if (selected.kind === "weaponProfile") return changeSet.weapons[selected.key];
    if (selected.kind === "artifactDomain") return changeSet.artifactDomains[selected.key];
    return changeSet.sourceDomains[selected.key];
  }

  function cloneCanonical(kind: PatchManifestRecordKind, key: string) {
    const next = cloneCanonicalRecordToPatchManifest(kind, key, staticData, changeSet);
    setChangeSet(next);
    selectDraft(kind, key);
  }

  function uniqueManifestKey(kind: PatchManifestRecordKind, seed: string): string {
    const base = generateKeyFromName(seed) || `${kind}Draft`;
    let nextKey = base;
    let index = 2;
    while (materialRows.some((row) => row.kind === kind && row.key === nextKey)) {
      nextKey = `${base}${index}`;
      index += 1;
    }
    return nextKey;
  }

  function quickCreateLocalSpecialty(seed: string) {
    const key = uniqueManifestKey("localSpecialty", seed || "LocalSpecialty");
    upsertLocalSpecialty(key, { ...createBlankLocalSpecialty(key), displayName: seed || key });
    selectDraft("localSpecialty", key);
  }

  function quickCreateNormalBossMaterial(seed: string) {
    const key = uniqueManifestKey("normalBossMaterial", seed || "NormalBossMaterial");
    upsertNormalBossMaterial(key, { ...createBlankNormalBossMaterial(key), displayName: seed || key });
    selectDraft("normalBossMaterial", key);
  }

  function quickCreateCommonEnemyFamily(seed: string) {
    const key = uniqueManifestKey("commonEnemyDropFamily", seed || "EnemyFamily");
    upsertCommonEnemyDropFamily(key, { ...createBlankCommonEnemyDropFamily(key), displayName: seed || key });
    selectDraft("commonEnemyDropFamily", key);
  }

  function quickCreateTalentFamily(seed: string) {
    const key = uniqueManifestKey("talentBookFamily", seed || "TalentFamily");
    upsertTalentBookFamily(key, createBlankTalentBookFamily(key));
    selectDraft("talentBookFamily", key);
  }

  function quickCreateWeeklyBossGroup(seed: string) {
    const key = uniqueManifestKey("weeklyBossGroup", seed || "WeeklyBoss");
    upsertWeeklyBossGroup(key, { ...createBlankWeeklyBossGroup(key), bossName: seed || "" });
    selectDraft("weeklyBossGroup", key);
  }

  function quickCreateWeaponFamily(seed: string) {
    const key = uniqueManifestKey("weaponAscensionFamily", seed || "WeaponFamily");
    upsertWeaponAscensionFamily(key, { ...createBlankWeaponAscensionFamily(key), displayName: seed || key });
    selectDraft("weaponAscensionFamily", key);
  }

  function renderReleaseUpdate() {
    const manifestFileName = changeSet.releaseTag
      ? `${changeSet.releaseTag.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}.json`
      : "patch_manifest.json";
    const counts = [
      { label: "Weekly bosses", value: Object.keys(changeSet.weeklyBossGroups).length },
      { label: "Families", value: Object.keys(changeSet.talentBookFamilies).length + Object.keys(changeSet.weaponAscensionFamilies).length + Object.keys(changeSet.commonEnemyDropFamilies).length },
      { label: "Characters", value: Object.keys(changeSet.characters).length },
      { label: "Materials", value: Object.keys(changeSet.normalBossMaterials).length + Object.keys(changeSet.localSpecialties).length + Object.keys(changeSet.standaloneMaterials).length },
      { label: "Sources", value: Object.keys(changeSet.sourceDomains).length },
      { label: "Weapons", value: Object.keys(changeSet.weapons).length },
      { label: "Artifacts", value: Object.keys(changeSet.artifactDomains).length },
      { label: "Generated crafting", value: Object.keys(previewOverridePack.recipes ?? {}).length },
    ];
    const wizardSteps = [
      { label: "Patch Setup", done: hasText(changeSet.label) && hasText(changeSet.releaseTag) },
      { label: "New Materials", done: Object.keys(changeSet.talentBookFamilies).length + Object.keys(changeSet.weaponAscensionFamilies).length + Object.keys(changeSet.commonEnemyDropFamilies).length + Object.keys(changeSet.normalBossMaterials).length + Object.keys(changeSet.localSpecialties).length + Object.keys(changeSet.standaloneMaterials).length > 0 },
      { label: "New Sources", done: Object.keys(changeSet.sourceDomains).length > 0 },
      { label: "Characters", done: Object.keys(changeSet.characters).length > 0 },
      { label: "Weapons", done: Object.keys(changeSet.weapons).length > 0 },
      { label: "Artifacts", done: Object.keys(changeSet.artifactDomains).length > 0 },
      { label: "Crafting", done: Object.keys(previewOverridePack.recipes ?? {}).length > 0 },
      { label: "Validate", done: validationIssues.filter((issue) => issue.severity === "error").length === 0 },
      { label: "Preview", done: exportBundle.files.length > 0 },
      { label: "Commit Patch", done: false },
    ];

    return (
      <div className="database-overview-stack">
        <SectionCard title="Patch Update Wizard" description="Walk through patch setup, linked record drafting, validation, preview, and an in-app database commit from one coherent manifest.">
          <div className="two-column-grid">
            <label>
              Draft label
              <input
                className="text-input"
                value={changeSet.label}
                onChange={(event) => setChangeSet({ ...changeSet, label: event.target.value })}
              />
            </label>
            <label>
              Release tag
              <input
                className="text-input"
                value={changeSet.releaseTag}
                onChange={(event) => setChangeSet({ ...changeSet, releaseTag: event.target.value })}
                placeholder="Example: 6.7 beta"
              />
            </label>
          </div>
          <label>
            Draft notes
            <textarea
              className="text-input compact"
              rows={4}
              value={changeSet.notes}
              onChange={(event) => setChangeSet({ ...changeSet, notes: event.target.value })}
            />
          </label>
          <div className="workspace-card-grid">
            {counts.map((item) => (
              <article key={item.label} className="metric-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
          <div className="workspace-card-grid">
            {wizardSteps.map((step, index) => (
              <article key={step.label} className="metric-card">
                <span>{index + 1}. {step.label}</span>
                <StatusBadge tone={step.done ? "success" : "default"}>{step.done ? "Ready" : "Pending"}</StatusBadge>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick-add templates" description="Start from the Genshin-shaped workflow you are actually doing, not from a raw JSON record type.">
          <div className="button-row wrap">
            <button type="button" className="button-primary" onClick={() => {
              const key = `WeeklyBoss${Object.keys(changeSet.weeklyBossGroups).length + 1}`;
              upsertWeeklyBossGroup(key, createBlankWeeklyBossGroup(key));
              selectDraft("weeklyBossGroup", key);
            }}>Add Weekly Boss Group</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `TalentFamily${Object.keys(changeSet.talentBookFamilies).length + 1}`;
              upsertTalentBookFamily(key, createBlankTalentBookFamily(key));
              selectDraft("talentBookFamily", key);
            }}>Add Talent Book Family</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `WeaponFamily${Object.keys(changeSet.weaponAscensionFamilies).length + 1}`;
              upsertWeaponAscensionFamily(key, createBlankWeaponAscensionFamily(key));
              selectDraft("weaponAscensionFamily", key);
            }}>Add Weapon Family</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `EnemyFamily${Object.keys(changeSet.commonEnemyDropFamilies).length + 1}`;
              upsertCommonEnemyDropFamily(key, createBlankCommonEnemyDropFamily(key));
              selectDraft("commonEnemyDropFamily", key);
            }}>Add Enemy Family</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `NormalBossMaterial${Object.keys(changeSet.normalBossMaterials).length + 1}`;
              upsertNormalBossMaterial(key, createBlankNormalBossMaterial(key));
              selectDraft("normalBossMaterial", key);
            }}>Add Normal Boss Material</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `LocalSpecialty${Object.keys(changeSet.localSpecialties).length + 1}`;
              upsertLocalSpecialty(key, createBlankLocalSpecialty(key));
              selectDraft("localSpecialty", key);
            }}>Add Local Specialty</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `StandaloneMaterial${Object.keys(changeSet.standaloneMaterials).length + 1}`;
              upsertStandaloneMaterial(key, createBlankStandaloneMaterial(key));
              selectDraft("standaloneMaterial", key);
            }}>Add Standalone Material</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `SourceDomain${Object.keys(changeSet.sourceDomains).length + 1}`;
              upsertSourceDomain(key, createBlankSourceDomain(key));
              selectDraft("sourceDomain", key);
            }}>Add Source Domain</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `NewWeapon${Object.keys(changeSet.weapons).length + 1}`;
              upsertWeaponProfile(key, createBlankWeaponProfile(key));
              selectDraft("weaponProfile", key);
            }}>Add Weapon Draft</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `ArtifactSet${Object.keys(changeSet.artifactDomains).length + 1}`;
              upsertArtifactDomain(key, createBlankArtifactDomain(key));
              selectDraft("artifactDomain", key);
            }}>Add Artifact Domain Mapping</button>
            <button type="button" className="button-ghost" onClick={() => {
              const key = `NewCharacter${Object.keys(changeSet.characters).length + 1}`;
              upsertCharacterDraft(key, {
                characterKey: key,
                displayName: "",
                releaseState: "beta",
                status: "beta",
                plannerEligible: false,
                aliases: [],
                notes: [],
                sourceRefs: [],
                gemFamilyKey: "",
                normalBossMaterialKey: "",
                commonEnemyDropFamilyKey: "",
                localSpecialtyKey: "",
                talentBookFamilyKey: "",
                weeklyBossMaterialKey: "",
              });
              selectDraft("characterAssignment", key);
            }}>Add New Character Draft</button>
          </div>
        </SectionCard>

        <SectionCard title="Clone Existing Record" description="Copy a canonical record into the patch manifest, edit it safely, then commit the compiled patch into Krumpanion's active database.">
          <FilterToolbar>
            <label>
              Record type
              <select value={cloneKind} onChange={(event) => setCloneKind(event.target.value as PatchManifestRecordKind)}>
                <option value="characterAssignment">Characters</option>
                <option value="weaponProfile">Weapons</option>
                <option value="talentBookFamily">Talent book families</option>
                <option value="weaponAscensionFamily">Weapon ascension families</option>
                <option value="commonEnemyDropFamily">Common enemy families</option>
                <option value="normalBossMaterial">Normal boss materials</option>
                <option value="localSpecialty">Local specialties</option>
                <option value="standaloneMaterial">Standalone materials</option>
                <option value="sourceDomain">Source domains</option>
                <option value="artifactDomain">Artifact mappings</option>
                <option value="weeklyBossGroup">Weekly boss groups</option>
              </select>
            </label>
            <label>
              Search canonical records
              <input
                className="text-input"
                value={cloneSearch}
                onChange={(event) => setCloneSearch(event.target.value)}
                placeholder="Search by key or display name"
              />
            </label>
          </FilterToolbar>
          <div className="catalog-list compact">
            {cloneRows.map((row) => (
              <button
                key={`${cloneKind}-${row.key}`}
                type="button"
                className="catalog-item"
                onClick={() => cloneCanonical(cloneKind, row.key)}
              >
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.key}</small>
                </div>
                <span className="mini-badge">Edit in Patch Manifest</span>
              </button>
            ))}
            {cloneRows.length === 0 ? <p className="muted">No canonical records match this search.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="What this draft will generate" description="The workbench compiles into a preview override pack and grouped database payloads that can be committed directly inside Krumpanion.">
          <ul className="ranked-list">
            <li><strong>Preview static data</strong><span>{previewHealthReport.summary.errorCount} errors / {previewHealthReport.summary.warningCount} warnings</span></li>
            <li><strong>Database payload groups</strong><span>{exportBundle.files.length}</span></li>
            <li><strong>Draft override records</strong><span>{Object.keys(previewOverridePack.materials ?? {}).length + Object.keys(previewOverridePack.characters ?? {}).length}</span></li>
            <li><strong>Imported account context</strong><span>{account ? `${account.characters.length} chars / ${account.weapons.length} weapons` : "No GOOD import yet"}</span></li>
          </ul>
        </SectionCard>

        <SectionCard title="Patch manifest import/export" description="The manifest is still portable for review and backup, but committing the patch now happens directly inside Krumpanion.">
          <div className="button-row wrap">
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setManifestText(JSON.stringify(changeSet, null, 2));
                setManifestError("");
              }}
            >
              Refresh Manifest Export
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                try {
                  const parsed = JSON.parse(manifestText) as DatabaseChangeSet;
                  onChangeSetChange(parsed);
                  setManifestError("");
                } catch (error) {
                  setManifestError(error instanceof Error ? error.message : "Manifest JSON could not be parsed.");
                }
              }}
            >
              Import Manifest JSON
            </button>
          </div>
          <textarea
            className="code-input"
            rows={12}
            value={manifestText || JSON.stringify(changeSet, null, 2)}
            onChange={(event) => setManifestText(event.target.value)}
            aria-label="Patch manifest JSON"
          />
          {manifestError ? <p className="form-error">{manifestError}</p> : null}
          <p className="muted">Suggested path: data_updates/patches/{manifestFileName}</p>
        </SectionCard>
      </div>
    );
  }

  function renderMaterialEditor() {
    const selectionStillExists = selection
      ? materialRows.some((row) => row.kind === selection.kind && row.key === selection.key)
      : false;
    const selected = selectionStillExists
      ? selection
      : materialRows[0] ? { kind: materialRows[0].kind, key: materialRows[0].key } : null;
    const selectedLabel = materialRows.find((row) => row.key === selected?.key && row.kind === selected?.kind)?.label;
    const selectedMetadata = selected ? changeSet.recordMetadata?.[getPatchManifestRecordMetadataKey(selected.kind, selected.key)] : undefined;
    const selectedIssues = selected
      ? validationIssues.filter((issue) => issue.entityType === selected.kind && issue.entityKey === selected.key)
      : [];
    const selectedCharacterRecord = selected?.kind === "characterAssignment" ? changeSet.characters[selected.key] : undefined;
    const selectedProfileState = selectedCharacterRecord
      ? buildCharacterProfileEditorState(
          selectedCharacterRecord.characterKey,
          previewStaticData.characterMaterialProfiles[selectedCharacterRecord.characterKey],
          previewStaticData,
        )
      : null;

    return (
      <SplitWorkspace
        left={
          <SectionCard title="Manifest Records" description="Every patch draft lives here. Select a record to edit, rename, duplicate, delete, validate, or preview.">
            <FilterToolbar>
              <label>
                Search records
                <input className="text-input" value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="Search label, key, or type" />
              </label>
              <label>
                Workflow
                <select value={recordGroupFilter} onChange={(event) => setRecordGroupFilter(event.target.value as ManifestWorkflowGroup)}>
                  {MANIFEST_WORKFLOW_GROUP_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Type
                <select value={recordKindFilter} onChange={(event) => setRecordKindFilter(event.target.value as "all" | PatchManifestRecordKind)}>
                  {MANIFEST_RECORD_TYPE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Record status
                <select value={recordStatusFilter} onChange={(event) => setRecordStatusFilter(event.target.value as ManifestRecordStatusFilter)}>
                  {MANIFEST_STATUS_FILTER_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Sort
                <select value={recordSort} onChange={(event) => setRecordSort(event.target.value as ManifestRecordSort)}>
                  {MANIFEST_SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
            </FilterToolbar>
            <div className="manifest-record-browser">
              {manifestRecordGroups.map((group) => (
                <section key={group.key} className="manifest-record-group">
                  <div className="manifest-record-group-header">
                    <strong>{group.label}</strong>
                    <span>{group.rows.length} records</span>
                    {group.errorCount ? <span className="mini-badge">{group.errorCount} errors</span> : null}
                    {group.warningCount ? <span className="mini-badge">{group.warningCount} warnings</span> : null}
                  </div>
                  <div className="catalog-list compact">
                    {group.rows.map((row) => (
                      <button
                        key={`${row.kind}-${row.key}`}
                        type="button"
                        className={`catalog-item manifest-record-item ${selection?.kind === row.kind && selection?.key === row.key ? "is-active" : ""}`}
                        onClick={() => setSelection({ kind: row.kind, key: row.key })}
                      >
                        <div>
                          <strong>{row.label}</strong>
                          <small>{row.key}</small>
                          <small>{row.generatedOutputHint}</small>
                        </div>
                        <div className="badge-row is-compact">
                          <span className="mini-badge">{row.typeLabel}</span>
                          <span className="mini-badge">{row.mode === "modify" ? "modified" : "new"}</span>
                          {row.errorCount ? <span className="mini-badge">{row.errorCount} errors</span> : null}
                          {row.warningCount ? <span className="mini-badge">{row.warningCount} warnings</span> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {materialRows.length === 0 ? <p className="muted">Use the Wizard tab to add a template or clone a canonical record first.</p> : null}
              {materialRows.length > 0 && manifestRecordGroups.length === 0 ? <p className="muted">No manifest records match these filters.</p> : null}
            </div>
          </SectionCard>
        }
        center={
          !selected ? (
            <EmptyStateCard
              title="No draft selected"
              description="Create a weekly boss group, family, or material from the Release Update tab to begin guided editing."
            />
          ) : (
            <div className="database-overview-stack">
              <SectionCard
                title="Selected manifest record"
                description="Use explicit record actions so object keys and generated canonical destinations stay synchronized."
                actions={
                  <div className="badge-row">
                    <StatusBadge tone={selectedMetadata?.mode === "modify" ? "accent" : "default"}>
                      {selectedMetadata?.mode === "modify" ? "Modify canonical" : "New record"}
                    </StatusBadge>
                    {selectedIssues.length ? <StatusBadge tone="warning">{selectedIssues.length} issue(s)</StatusBadge> : <StatusBadge tone="success">No draft issues</StatusBadge>}
                  </div>
                }
              >
                <div className="two-column-grid">
                  <label>
                    Rename key
                    <input
                      className="text-input"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                    />
                  </label>
                  <div className="button-row wrap align-end">
                    <button type="button" className="button-secondary" onClick={() => renameSelectedDraft(selected)}>
                      Rename key
                    </button>
                    <button type="button" className="button-ghost" onClick={() => duplicateSelectedDraft(selected)}>
                      Duplicate
                    </button>
                    <button type="button" className="button-danger" onClick={() => deleteSelectedDraft(selected)}>
                      Delete from Manifest
                    </button>
                  </div>
                </div>
                {selectedMetadata?.sourceCanonicalKey ? (
                  <p className="muted">Cloned from canonical key: {selectedMetadata.sourceCanonicalKey}</p>
                ) : (
                  <p className="muted">This draft is manifest-only until you commit the patch to Krumpanion's database.</p>
                )}
              </SectionCard>
              <SectionCard
                title={selectedLabel ?? selected.key}
                description="These guided forms synchronize the records that normally live in different database files so patch maintenance stays consistent."
              >
                {selected.kind === "weeklyBossGroup" ? (
                  <WeeklyBossGroupEditor
                    draft={changeSet.weeklyBossGroups[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onChange={(draft) => upsertWeeklyBossGroup(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "talentBookFamily" ? (
                  <TalentBookFamilyEditor
                    draft={changeSet.talentBookFamilies[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onChange={(draft) => upsertTalentBookFamily(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "weaponAscensionFamily" ? (
                  <WeaponAscensionFamilyEditor
                    draft={changeSet.weaponAscensionFamilies[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onChange={(draft) => upsertWeaponAscensionFamily(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "commonEnemyDropFamily" ? (
                  <CommonEnemyDropFamilyEditor
                    draft={changeSet.commonEnemyDropFamilies[selected.key]}
                    onChange={(draft) => upsertCommonEnemyDropFamily(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "normalBossMaterial" ? (
                  <NormalBossMaterialEditor
                    draft={changeSet.normalBossMaterials[selected.key]}
                    onChange={(draft) => upsertNormalBossMaterial(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "localSpecialty" ? (
                  <LocalSpecialtyEditor
                    draft={changeSet.localSpecialties[selected.key]}
                    onChange={(draft) => upsertLocalSpecialty(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "standaloneMaterial" ? (
                  <StandaloneMaterialEditor
                    draft={changeSet.standaloneMaterials[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onChange={(draft) => upsertStandaloneMaterial(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "characterAssignment" ? (
                  <CharacterAssignmentEditor
                    draft={changeSet.characters[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onQuickCreateLocalSpecialty={quickCreateLocalSpecialty}
                    onQuickCreateNormalBossMaterial={quickCreateNormalBossMaterial}
                    onQuickCreateCommonEnemyFamily={quickCreateCommonEnemyFamily}
                    onQuickCreateTalentFamily={quickCreateTalentFamily}
                    onQuickCreateWeeklyBossGroup={quickCreateWeeklyBossGroup}
                    onChange={(draft) => upsertCharacterDraft(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "sourceDomain" ? (
                  <SourceDomainEditor
                    draft={changeSet.sourceDomains[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onChange={(draft) => upsertSourceDomain(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "weaponProfile" ? (
                  <WeaponProfileEditor
                    draft={changeSet.weapons[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onQuickCreateWeaponFamily={quickCreateWeaponFamily}
                    onQuickCreateCommonEnemyFamily={quickCreateCommonEnemyFamily}
                    onChange={(draft) => upsertWeaponProfile(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "artifactDomain" ? (
                  <ArtifactDomainEditor
                    draft={changeSet.artifactDomains[selected.key]}
                    lookupIndex={keyLookupIndex}
                    onChange={(draft) => upsertArtifactDomain(selected.key, draft)}
                  />
                ) : null}
              </SectionCard>
            </div>
          )
        }
        right={
          selected ? (
            <SectionCard title="Preview impact" description="Read-only preview of the records this draft is contributing to effective static data.">
              <ul className="ranked-list">
                {selected.kind === "weeklyBossGroup"
                  ? changeSet.weeklyBossGroups[selected.key].drops.map((drop) => (
                      <li key={drop.key}>
                        <strong>{drop.displayName || drop.key}</strong>
                        <span>{previewStaticData.materialSources[drop.key]?.[0]?.sourceName ?? "No source preview"}</span>
                      </li>
                    ))
                  : null}
                {selected.kind === "talentBookFamily"
                  ? [changeSet.talentBookFamilies[selected.key].teachingsKey, changeSet.talentBookFamilies[selected.key].guideKey, changeSet.talentBookFamilies[selected.key].philosophiesKey].map((key) => (
                      <li key={key}>
                        <strong>{key}</strong>
                        <span>{previewStaticData.materialSources[key]?.[0]?.sourceName ?? "No source preview"}</span>
                      </li>
                    ))
                  : null}
                {selected.kind === "weaponAscensionFamily"
                  ? [changeSet.weaponAscensionFamilies[selected.key].twoStarKey, changeSet.weaponAscensionFamilies[selected.key].threeStarKey, changeSet.weaponAscensionFamilies[selected.key].fourStarKey, changeSet.weaponAscensionFamilies[selected.key].fiveStarKey].map((key) => (
                      <li key={key}>
                        <strong>{key}</strong>
                        <span>{previewStaticData.materialSources[key]?.[0]?.sourceName ?? "No source preview"}</span>
                      </li>
                    ))
                  : null}
                {selected.kind === "sourceDomain" ? (
                  <li>
                    <strong>{changeSet.sourceDomains[selected.key].name || selected.key}</strong>
                    <span>{changeSet.sourceDomains[selected.key].domainType}</span>
                  </li>
                ) : null}
                {selected.kind === "characterAssignment" ? (
                  <>
                    <li>
                      <strong>{changeSet.characters[selected.key].displayName || selected.key}</strong>
                      <span>{previewStaticData.characterMaterialProfiles[selected.key]?.status ?? "No profile preview"}</span>
                    </li>
                    {selectedProfileState ? (
                      <li>
                        <strong>Resolved talent material</strong>
                        <span>{selectedProfileState.preview.talentBooks.philosophies ?? "Unresolved"}</span>
                      </li>
                    ) : null}
                  </>
                ) : null}
                {selected.kind === "weaponProfile" ? (
                  <li>
                    <strong>{changeSet.weapons[selected.key].displayName || selected.key}</strong>
                    <span>{previewStaticData.weaponMaterialProfiles[selected.key]?.status ?? "No profile preview"}</span>
                  </li>
                ) : null}
                {selected.kind === "artifactDomain" ? (
                  <li>
                    <strong>{changeSet.artifactDomains[selected.key].setName || selected.key}</strong>
                    <span>{previewStaticData.artifactDomains[selected.key]?.domainName ?? "No standard Artifact Domain source"}</span>
                  </li>
                ) : null}
              </ul>
            </SectionCard>
          ) : undefined
        }
      />
    );
  }

  function renderAssignments() {
    const selectedProfileState = selectedCharacterDraft
      ? buildCharacterProfileEditorState(
          selectedCharacterDraft.characterKey,
          previewStaticData.characterMaterialProfiles[selectedCharacterDraft.characterKey],
          previewStaticData,
        )
      : null;

    return (
      <SplitWorkspace
        left={
          <SectionCard title="Character assignment queue" description="Move through new or incomplete character profiles without jumping between unrelated database sections.">
            <FilterToolbar>
              <label>
                Search
                <input className="text-input" value={assignmentSearch} onChange={(event) => setAssignmentSearch(event.target.value)} />
              </label>
              <label>
                Show only incomplete
                <input type="checkbox" checked={showAssignmentProblemsOnly} onChange={(event) => setShowAssignmentProblemsOnly(event.target.checked)} />
              </label>
            </FilterToolbar>
            <div className="catalog-list">
              {assignmentRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className={`catalog-item ${selectedCharacterKey === row.key ? "is-active" : ""}`}
                  onClick={() => {
                    if (!changeSet.characters[row.key]) {
                      upsertCharacterDraft(row.key, buildCharacterDraftFromStaticData(row.key, previewStaticData));
                    }
                    setSelectedCharacterKey(row.key);
                  }}
                >
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.key}</small>
                  </div>
                  <div className="badge-row">
                    {row.issueCount ? <span className="mini-badge">{row.issueCount} issues</span> : <span className="mini-badge">ready</span>}
                    {changeSet.characters[row.key] ? <span className="mini-badge">draft</span> : null}
                  </div>
                </button>
              ))}
              {assignmentRows.length === 0 ? <p className="muted">No characters match this queue filter.</p> : null}
            </div>
          </SectionCard>
        }
        center={
          !selectedCharacterDraft ? (
            <EmptyStateCard title="No character selected" description="Create or select a character draft to align materials to the exact progression slots the planner uses." />
          ) : (
            <SectionCard title={selectedCharacterDraft.displayName || selectedCharacterDraft.characterKey} description="Character assignment drafts write canonical-style profile data and preview the exact resolved materials the planner will consume.">
              <div className="two-column-grid">
                <label>
                  Character key
                  <input className="text-input" value={selectedCharacterDraft.characterKey} onChange={(event) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, characterKey: event.target.value.trim() })} />
                </label>
                <label>
                  Display name
                  <input className="text-input" value={selectedCharacterDraft.displayName} onChange={(event) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, displayName: event.target.value })} />
                </label>
                <SelectField label="Element" value={selectedCharacterDraft.element ?? ""} options={ELEMENT_OPTIONS} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, element: value || undefined })} />
                <SelectField label="Weapon Type" value={selectedCharacterDraft.weaponType ?? ""} options={WEAPON_TYPE_OPTIONS} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, weaponType: value || undefined })} />
                <label>
                  Rarity
                  <select value={selectedCharacterDraft.rarity?.toString() ?? ""} onChange={(event) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, rarity: event.target.value ? Number(event.target.value) as 4 | 5 : undefined })}>
                    <option value="">Unset</option>
                    <option value="4">4-star</option>
                    <option value="5">5-star</option>
                  </select>
                </label>
                <SelectField label="Region" value={selectedCharacterDraft.region ?? ""} options={REGION_OPTIONS} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, region: value || undefined })} />
                <SelectField label="Release State" value={selectedCharacterDraft.releaseState} options={RELEASE_STATE_OPTIONS} includeBlank={false} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, releaseState: (value || "beta") as DatabaseCanonicalReleaseState })} />
                <SelectField label="Status" value={selectedCharacterDraft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, status: (value || "beta") as DatabaseCanonicalStatus })} />
              </div>

              <div className="two-column-grid">
                <SelectField label="Gem Family" value={selectedCharacterDraft.gemFamilyKey} options={gemOptions} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, gemFamilyKey: value })} />
                <SelectField label="Normal Boss Material" value={selectedCharacterDraft.normalBossMaterialKey} options={normalBossOptions} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, normalBossMaterialKey: value })} />
                <SelectField label="Common Enemy Family" value={selectedCharacterDraft.commonEnemyDropFamilyKey} options={commonEnemyOptions} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, commonEnemyDropFamilyKey: value })} />
                <SelectField label="Local Specialty" value={selectedCharacterDraft.localSpecialtyKey} options={localSpecialtyOptions} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, localSpecialtyKey: value })} />
                <SelectField label="Talent Book Family" value={selectedCharacterDraft.talentBookFamilyKey} options={talentOptions} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, talentBookFamilyKey: value })} />
                <SelectField label="Weekly Boss Material" value={selectedCharacterDraft.weeklyBossMaterialKey} options={weeklyBossOptions} onChange={(value) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, weeklyBossMaterialKey: value })} />
              </div>

              <div className="two-column-grid">
                <label>
                  Aliases
                  <input className="text-input" value={joinCommaList(selectedCharacterDraft.aliases)} onChange={(event) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, aliases: parseCommaList(event.target.value) })} />
                </label>
                <label>
                  Source refs
                  <input className="text-input" value={joinCommaList(selectedCharacterDraft.sourceRefs)} onChange={(event) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, sourceRefs: parseCommaList(event.target.value) })} />
                </label>
              </div>
              <label>
                Notes
                <textarea className="text-input compact" rows={4} value={selectedCharacterDraft.notes.join("\n")} onChange={(event) => upsertCharacterDraft(selectedCharacterDraft.characterKey, { ...selectedCharacterDraft, notes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} />
              </label>
            </SectionCard>
          )
        }
        right={
          selectedProfileState ? (
            <SectionCard title="Resolved preview" description="Read-only preview of the exact materials the planner will see after this draft is compiled.">
              <ul className="ranked-list">
                <li><strong>Gem family</strong><span>{selectedProfileState.preview.gems.gemstone ?? "Unresolved"}</span></li>
                <li><strong>Talent books</strong><span>{selectedProfileState.preview.talentBooks.philosophies ?? "Unresolved"}</span></li>
                <li><strong>Common enemy</strong><span>{selectedProfileState.preview.commonEnemy[3] ?? "Unresolved"}</span></li>
                <li><strong>Normal boss</strong><span>{selectedCharacterDraft?.normalBossMaterialKey || "Unresolved"}</span></li>
                <li><strong>Weekly boss</strong><span>{selectedCharacterDraft?.weeklyBossMaterialKey || "Unresolved"}</span></li>
              </ul>
              {selectedProfileState.validation.errors.length ? (
                <WarningPanel title="Blocking validation issues" tone="error">
                  <ul className="warning-list">
                    {selectedProfileState.validation.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </WarningPanel>
              ) : null}
            </SectionCard>
          ) : undefined
        }
      />
    );
  }

  function renderValidation() {
    const manifestPath = `data_updates/patches/${changeSet.releaseTag
      ? changeSet.releaseTag.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      : "patch_manifest"}.json`;
    const authoringIssueRows = validationIssues.map((issue) => {
      const kind = resolveManifestKind(issue.entityType);
      const row = kind ? materialRows.find((candidate) => candidate.kind === kind && candidate.key === issue.entityKey) : undefined;
      return { issue, kind, row };
    });
    const previewDataIssues = previewHealthReport.issues.filter((issue) => issue.severity === "error" || issue.severity === "warning");
    if (view === "commit") {
      const authoringErrors = validationIssues.filter((issue) => issue.severity === "error").length;
      return (
        <div className="database-overview-stack">
          <SectionCard
            title="Commit Patch to Database"
            description="Apply the compiled manifest directly to Krumpanion's persisted database override layer. The active static database refreshes immediately after commit."
            actions={
              <div className="badge-row">
                <StatusBadge tone={authoringErrors ? "warning" : "success"}>{authoringErrors} authoring errors</StatusBadge>
                <StatusBadge tone={previewHealthReport.summary.errorCount ? "warning" : "success"}>
                  {previewHealthReport.summary.errorCount} preview errors
                </StatusBadge>
              </div>
            }
          >
            <div className="workspace-card-grid">
              <article className="metric-card">
                <span>Manifest records</span>
                <strong>{Object.keys(changeSet.recordMetadata ?? {}).length}</strong>
              </article>
              <article className="metric-card">
                <span>Generated files</span>
                <strong>{exportBundle.files.length}</strong>
              </article>
              <article className="metric-card">
                <span>Warnings</span>
                <strong>{validationIssues.filter((issue) => issue.severity === "warning").length + previewHealthReport.summary.warningCount}</strong>
              </article>
            </div>
            {commitDisabledReason ? (
              <WarningPanel title="Patch cannot be committed yet" tone="warning">
                <p>{commitDisabledReason}</p>
              </WarningPanel>
            ) : (
              <p className="muted">
                This will merge the preview patch into the active database overrides saved with Krumpanion. It does not require a terminal command.
              </p>
            )}
            <div className="button-row wrap">
              <button
                type="button"
                className="button-primary"
                disabled={Boolean(commitDisabledReason)}
                onClick={() => {
                  void onCommitPatch();
                }}
              >
                Commit Patch to Database
              </button>
              <button type="button" className="button-secondary" onClick={() => onRequestViewChange?.("validate")}>
                Review Validation
              </button>
            </div>
            {commitStatus ? <p className="success-text">{commitStatus}</p> : null}
            {commitError ? <p className="error-text">{commitError}</p> : null}
          </SectionCard>

          <SectionCard title="Manifest backup" description="Optional: keep this JSON as a review artifact or backup of the patch you committed.">
            <textarea
              className="code-input"
              rows={18}
              readOnly
              value={JSON.stringify(changeSet, null, 2)}
              aria-label="Patch manifest export JSON"
            />
            <p className="muted">Suggested backup name: {manifestPath}</p>
          </SectionCard>
          <SectionCard title="Generated database payloads" description="These are the database sections that will be merged into the active override database when committed.">
            <ul className="ranked-list">
              {exportBundle.files.map((file) => (
                <li key={file.path}>
                  <strong>{file.path}</strong>
                  <span>{file.recordCount} records</span>
                </li>
              ))}
              {exportBundle.files.length === 0 ? <li><strong>No generated files yet</strong><span>Add or clone manifest records first.</span></li> : null}
            </ul>
          </SectionCard>
        </div>
      );
    }
    return (
      <div className="database-overview-stack">
        <SectionCard title="Change-set validation" description="Fix the authoring issues here first, then review the preview validator output for downstream static-data effects.">
          <div className="workspace-card-grid">
            <article className="metric-card">
              <span>Authoring errors</span>
              <strong>{validationIssues.filter((issue) => issue.severity === "error").length}</strong>
            </article>
            <article className="metric-card">
              <span>Authoring warnings</span>
              <strong>{validationIssues.filter((issue) => issue.severity === "warning").length}</strong>
            </article>
            <article className="metric-card">
              <span>Preview errors</span>
              <strong>{previewHealthReport.summary.errorCount}</strong>
            </article>
            <article className="metric-card">
              <span>Preview warnings</span>
              <strong>{previewHealthReport.summary.warningCount}</strong>
            </article>
          </div>
          {validationIssues.length ? (
            <ul className="warning-list database-issue-list">
              {authoringIssueRows.map(({ issue, kind, row }) => (
                <li key={issue.id} className={`database-issue-card is-${issue.severity}`}>
                  <div>
                    <div className="database-issue-heading">
                      <StatusBadge tone={issue.severity === "error" ? "warning" : issue.severity === "warning" ? "warning" : "default"}>
                        {issue.severity}
                      </StatusBadge>
                      <strong>{row?.label ?? issue.entityKey}</strong>
                      <span>{row?.typeLabel ?? issue.entityType}</span>
                    </div>
                    <p>{issue.message}</p>
                    <small className="muted">Entry: {issue.entityType} · {issue.entityKey} · Scope: {issue.scope}</small>
                  </div>
                  {row && kind ? (
                    <button type="button" className="button-secondary" onClick={() => selectDraft(kind, issue.entityKey)}>
                      Edit entry
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No workbench-specific validation issues. Review the preview export below.</p>
          )}
        </SectionCard>

        <SectionCard title="Preview data issues" description="These come from validating the compiled preview database. Use the record details to trace the generated entry that needs attention.">
          {previewDataIssues.length ? (
            <ul className="warning-list database-issue-list">
              {previewDataIssues.map((issue) => (
                <li key={issue.id} className={`database-issue-card is-${issue.severity}`}>
                  <div>
                    <div className="database-issue-heading">
                      <StatusBadge tone="warning">{issue.severity}</StatusBadge>
                      <strong>{issue.entityName ?? issue.entityKey ?? issue.id}</strong>
                      <span>{issue.recordType ?? issue.category}</span>
                    </div>
                    <p>{issue.message}</p>
                    <small className="muted">
                      {[
                        `Category: ${issue.category}`,
                        issue.subCategory ? `Subcategory: ${issue.subCategory}` : "",
                        issue.entityKey ? `Key: ${issue.entityKey}` : "",
                        issue.actionGroup ? `Action: ${issue.actionGroup}` : "",
                      ].filter(Boolean).join(" · ")}
                    </small>
                    {issue.relatedKeys?.length ? <small className="muted">Related keys: {issue.relatedKeys.join(", ")}</small> : null}
                    {issue.suggestedFix ? <small className="muted">Suggested fix: {issue.suggestedFix}</small> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No preview data errors or warnings after compiling this manifest.</p>
          )}
        </SectionCard>

        <SectionCard title="Preview override pack" description="This derived override pack is what the workbench uses for local preview without changing canonical repo files.">
          <textarea className="code-input" rows={18} readOnly value={JSON.stringify(previewOverridePack, null, 2)} />
        </SectionCard>

        <SectionCard title="Compiled database payloads" description="Each block is grouped by database destination so you can review exactly what the in-app commit will merge into the active database.">
          <div className="database-overview-stack">
            {exportBundle.files.map((file) => (
              <article key={file.path} className="panel">
                <div className="section-header">
                  <div>
                    <h3>{file.path}</h3>
                    <p className="muted">{file.description}</p>
                  </div>
                  <StatusBadge tone="accent">{file.recordCount} records</StatusBadge>
                </div>
                <textarea className="code-input" rows={Math.max(8, Math.min(18, file.recordCount * 2))} readOnly value={file.json} />
              </article>
            ))}
            {exportBundle.files.length === 0 ? <p className="muted">No export files generated yet. Add a draft entity first.</p> : null}
          </div>
        </SectionCard>

      </div>
    );
  }

  if (view === "wizard") {
    return renderReleaseUpdate();
  }
  if (view === "records") {
    return renderMaterialEditor();
  }
  if ((view as string) === "assignments") {
    return renderAssignments();
  }
  if (view === "commit") {
    return renderValidation();
  }
  return renderValidation();
}

function CharacterAssignmentEditor({
  draft,
  lookupIndex,
  onQuickCreateLocalSpecialty,
  onQuickCreateNormalBossMaterial,
  onQuickCreateCommonEnemyFamily,
  onQuickCreateTalentFamily,
  onQuickCreateWeeklyBossGroup,
  onChange,
}: {
  draft: CharacterMaterialAssignmentDraft;
  lookupIndex: KnownKeyLookupIndex;
  onQuickCreateLocalSpecialty: (seed: string) => void;
  onQuickCreateNormalBossMaterial: (seed: string) => void;
  onQuickCreateCommonEnemyFamily: (seed: string) => void;
  onQuickCreateTalentFamily: (seed: string) => void;
  onQuickCreateWeeklyBossGroup: (seed: string) => void;
  onChange: (draft: CharacterMaterialAssignmentDraft) => void;
}) {
  return (
    <>
      <FieldSection title="Planner Essentials" description="Identity and material keys the planner must resolve.">
        <div className="two-column-grid">
          <GeneratedKeyField label="Character key" value={draft.characterKey} sourceValue={draft.displayName} onChange={(value) => onChange({ ...draft, characterKey: value })} />
          <label>
            Display name
            <input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} />
          </label>
          <SelectField label="Element" value={draft.element ?? ""} options={ELEMENT_OPTIONS} onChange={(value) => onChange({ ...draft, element: value || undefined })} />
          <SelectField label="Weapon Type" value={draft.weaponType ?? ""} options={WEAPON_TYPE_OPTIONS} onChange={(value) => onChange({ ...draft, weaponType: value || undefined })} />
          <label>
            Rarity
            <select value={draft.rarity?.toString() ?? ""} onChange={(event) => onChange({ ...draft, rarity: event.target.value ? Number(event.target.value) as 4 | 5 : undefined })}>
              <option value="">Unset</option>
              <option value="4">4-star</option>
              <option value="5">5-star</option>
            </select>
          </label>
          <SelectField label="Region" value={draft.region ?? ""} options={REGION_OPTIONS} onChange={(value) => onChange({ ...draft, region: value || undefined })} />
          <SelectField label="Release State" value={draft.releaseState} options={RELEASE_STATE_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, releaseState: (value || "beta") as DatabaseCanonicalReleaseState })} />
          <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={draft.plannerEligible} onChange={(event) => onChange({ ...draft, plannerEligible: event.target.checked })} />
          Planner eligible
        </label>
        <div className="two-column-grid">
          <KnownKeyField label="Gem Family" value={draft.gemFamilyKey} types={["elementGemFamily"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, gemFamilyKey: value })} />
          <KnownKeyField label="Normal Boss Material" value={draft.normalBossMaterialKey} types={["normalBossMaterial"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, normalBossMaterialKey: value })} onQuickCreate={onQuickCreateNormalBossMaterial} />
          <KnownKeyField label="Common Enemy Family" value={draft.commonEnemyDropFamilyKey} types={["commonEnemyDropFamily"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, commonEnemyDropFamilyKey: value })} onQuickCreate={onQuickCreateCommonEnemyFamily} />
          <KnownKeyField label="Local Specialty" value={draft.localSpecialtyKey} types={["localSpecialty"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, localSpecialtyKey: value })} onQuickCreate={onQuickCreateLocalSpecialty} />
          <KnownKeyField label="Talent Book Family" value={draft.talentBookFamilyKey} types={["talentBookFamily"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, talentBookFamilyKey: value })} onQuickCreate={onQuickCreateTalentFamily} />
          <KnownKeyField label="Weekly Boss Material" value={draft.weeklyBossMaterialKey} types={["weeklyBossMaterial"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, weeklyBossMaterialKey: value })} onQuickCreate={onQuickCreateWeeklyBossGroup} />
        </div>
      </FieldSection>
      <FieldSection title="Details" description="Search helpers, provenance, and notes." defaultOpen={false}>
        <div className="two-column-grid">
          <label>
            Aliases
            <input className="text-input" value={joinCommaList(draft.aliases)} onChange={(event) => onChange({ ...draft, aliases: parseCommaList(event.target.value) })} />
          </label>
          <label>
            Source refs
            <input className="text-input" value={joinCommaList(draft.sourceRefs)} onChange={(event) => onChange({ ...draft, sourceRefs: parseCommaList(event.target.value) })} />
          </label>
        </div>
        <label>
          Notes
          <textarea className="text-input compact" rows={4} value={draft.notes.join("\n")} onChange={(event) => onChange({ ...draft, notes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} />
        </label>
      </FieldSection>
    </>
  );
}

function WeeklyBossGroupEditor({
  draft,
  lookupIndex,
  onChange,
}: {
  draft: WeeklyBossGroupDraft;
  lookupIndex: KnownKeyLookupIndex;
  onChange: (draft: WeeklyBossGroupDraft) => void;
}) {
  return (
    <>
      <FieldSection title="Planner Essentials" description="Weekly material keys and their boss source.">
        <div className="two-column-grid">
          <GeneratedKeyField label="Source key" value={draft.sourceKey} sourceValue={draft.domainName || draft.bossName} onChange={(value) => onChange({ ...draft, sourceKey: value })} />
          <GeneratedKeyField label="Boss key" value={draft.bossKey} sourceValue={draft.bossName} onChange={(value) => onChange({ ...draft, bossKey: value })} />
          <label>
            Boss name
            <input className="text-input" value={draft.bossName} onChange={(event) => onChange({ ...draft, bossName: event.target.value })} />
          </label>
          <KnownKeyField label="Trounce domain key" value={draft.sourceKey} types={["sourceDomain"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, sourceKey: value })} />
          <label>
            Domain name
            <input className="text-input" value={draft.domainName} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} />
          </label>
          <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
        </div>
        {draft.drops.map((drop, index) => (
          <div key={drop.key || index} className="two-column-grid">
            <GeneratedKeyField
              label={`Drop ${index + 1} key`}
              value={drop.key}
              sourceValue={drop.displayName}
              onChange={(value) => {
                const nextDrops = draft.drops.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, key: value } : candidate) as WeeklyBossGroupDraft["drops"];
                onChange({ ...draft, drops: nextDrops });
              }}
            />
            <label>
              Drop {index + 1} name
              <input
                className="text-input"
                value={drop.displayName}
                onChange={(event) => {
                  const nextDrops = draft.drops.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, displayName: event.target.value } : candidate) as WeeklyBossGroupDraft["drops"];
                  onChange({ ...draft, drops: nextDrops });
                }}
              />
            </label>
          </div>
        ))}
      </FieldSection>
      <FieldSection title="Details" defaultOpen={false}>
        <label>
          Notes
          <textarea className="text-input compact" rows={3} value={draft.notes.join("\n")} onChange={(event) => onChange({ ...draft, notes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} />
        </label>
      </FieldSection>
    </>
  );
}

function TalentBookFamilyEditor({
  draft,
  lookupIndex,
  onChange,
}: {
  draft: TalentBookFamilyDraft;
  lookupIndex: KnownKeyLookupIndex;
  onChange: (draft: TalentBookFamilyDraft) => void;
}) {
  return (
    <FieldSection title="Planner Essentials" description="Talent book tiers, mastery domain, and schedule.">
      <div className="two-column-grid">
        <GeneratedKeyField label="Family key" value={draft.key} sourceValue={draft.philosophiesName || draft.guideName || draft.teachingsName} onChange={(value) => onChange({ ...draft, key: value })} />
        <KnownKeyField label="Domain key" value={draft.domainKey} types={["sourceDomain"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, domainKey: value })} />
        <label><span>Domain name</span><input className="text-input" value={draft.domainName} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} /></label>
        <SelectField label="Availability" value={draft.availability} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, availability: (value || "MON_THU_SUN") as typeof draft.availability })} />
        <SelectField label="Region" value={draft.region} options={REGION_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, region: value || "Fontaine" })} />
        <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
      </div>
      <div className="two-column-grid">
        <GeneratedKeyField label="Teachings key" value={draft.teachingsKey} sourceValue={draft.teachingsName} onChange={(value) => onChange({ ...draft, teachingsKey: value })} />
        <label><span>Teachings name</span><input className="text-input" value={draft.teachingsName} onChange={(event) => onChange({ ...draft, teachingsName: event.target.value })} /></label>
        <GeneratedKeyField label="Guide key" value={draft.guideKey} sourceValue={draft.guideName} onChange={(value) => onChange({ ...draft, guideKey: value })} />
        <label><span>Guide name</span><input className="text-input" value={draft.guideName} onChange={(event) => onChange({ ...draft, guideName: event.target.value })} /></label>
        <GeneratedKeyField label="Philosophies key" value={draft.philosophiesKey} sourceValue={draft.philosophiesName} onChange={(value) => onChange({ ...draft, philosophiesKey: value })} />
        <label><span>Philosophies name</span><input className="text-input" value={draft.philosophiesName} onChange={(event) => onChange({ ...draft, philosophiesName: event.target.value })} /></label>
      </div>
    </FieldSection>
  );
}

function WeaponAscensionFamilyEditor({
  draft,
  lookupIndex,
  onChange,
}: {
  draft: WeaponAscensionFamilyDraft;
  lookupIndex: KnownKeyLookupIndex;
  onChange: (draft: WeaponAscensionFamilyDraft) => void;
}) {
  return (
    <FieldSection title="Planner Essentials" description="Weapon material tiers, forgery domain, and schedule.">
      <div className="two-column-grid">
        <GeneratedKeyField label="Family key" value={draft.key} sourceValue={draft.displayName} onChange={(value) => onChange({ ...draft, key: value })} />
        <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
        <KnownKeyField label="Domain key" value={draft.domainKey} types={["sourceDomain"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, domainKey: value })} />
        <label><span>Domain name</span><input className="text-input" value={draft.domainName} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} /></label>
        <SelectField label="Availability" value={draft.availability} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, availability: (value || "MON_THU_SUN") as typeof draft.availability })} />
        <SelectField label="Region" value={draft.region} options={REGION_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, region: value || "Fontaine" })} />
      </div>
      <div className="two-column-grid">
        <GeneratedKeyField label="2-star key" value={draft.twoStarKey} sourceValue={draft.twoStarName} onChange={(value) => onChange({ ...draft, twoStarKey: value })} />
        <label><span>2-star name</span><input className="text-input" value={draft.twoStarName} onChange={(event) => onChange({ ...draft, twoStarName: event.target.value })} /></label>
        <GeneratedKeyField label="3-star key" value={draft.threeStarKey} sourceValue={draft.threeStarName} onChange={(value) => onChange({ ...draft, threeStarKey: value })} />
        <label><span>3-star name</span><input className="text-input" value={draft.threeStarName} onChange={(event) => onChange({ ...draft, threeStarName: event.target.value })} /></label>
        <GeneratedKeyField label="4-star key" value={draft.fourStarKey} sourceValue={draft.fourStarName} onChange={(value) => onChange({ ...draft, fourStarKey: value })} />
        <label><span>4-star name</span><input className="text-input" value={draft.fourStarName} onChange={(event) => onChange({ ...draft, fourStarName: event.target.value })} /></label>
        <GeneratedKeyField label="5-star key" value={draft.fiveStarKey} sourceValue={draft.fiveStarName} onChange={(value) => onChange({ ...draft, fiveStarKey: value })} />
        <label><span>5-star name</span><input className="text-input" value={draft.fiveStarName} onChange={(event) => onChange({ ...draft, fiveStarName: event.target.value })} /></label>
      </div>
    </FieldSection>
  );
}

function CommonEnemyDropFamilyEditor({
  draft,
  onChange,
}: {
  draft: CommonEnemyDropFamilyDraft;
  onChange: (draft: CommonEnemyDropFamilyDraft) => void;
}) {
  return (
    <>
      <div className="two-column-grid">
        <label><span>Family id</span><input className="text-input" value={draft.familyId} onChange={(event) => onChange({ ...draft, familyId: event.target.value.trim() })} /></label>
        <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
        <label><span>Enemy family</span><input className="text-input" value={draft.sourceEnemyFamily} onChange={(event) => onChange({ ...draft, sourceEnemyFamily: event.target.value })} /></label>
        <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
      </div>
      <div className="two-column-grid">
        <label><span>Low key</span><input className="text-input" value={draft.lowKey} onChange={(event) => onChange({ ...draft, lowKey: event.target.value.trim() })} /></label>
        <label><span>Low name</span><input className="text-input" value={draft.lowName} onChange={(event) => onChange({ ...draft, lowName: event.target.value })} /></label>
        <label><span>Mid key</span><input className="text-input" value={draft.midKey} onChange={(event) => onChange({ ...draft, midKey: event.target.value.trim() })} /></label>
        <label><span>Mid name</span><input className="text-input" value={draft.midName} onChange={(event) => onChange({ ...draft, midName: event.target.value })} /></label>
        <label><span>High key</span><input className="text-input" value={draft.highKey} onChange={(event) => onChange({ ...draft, highKey: event.target.value.trim() })} /></label>
        <label><span>High name</span><input className="text-input" value={draft.highName} onChange={(event) => onChange({ ...draft, highName: event.target.value })} /></label>
      </div>
    </>
  );
}

function NormalBossMaterialEditor({
  draft,
  onChange,
}: {
  draft: NormalBossMaterialDraft;
  onChange: (draft: NormalBossMaterialDraft) => void;
}) {
  return (
    <div className="two-column-grid">
      <label><span>Material key</span><input className="text-input" value={draft.key} onChange={(event) => onChange({ ...draft, key: event.target.value.trim() })} /></label>
      <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
      <label><span>Boss key</span><input className="text-input" value={draft.bossKey} onChange={(event) => onChange({ ...draft, bossKey: event.target.value.trim() })} /></label>
      <label><span>Boss display name</span><input className="text-input" value={draft.bossDisplayName} onChange={(event) => onChange({ ...draft, bossDisplayName: event.target.value })} /></label>
      <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
    </div>
  );
}

function LocalSpecialtyEditor({
  draft,
  onChange,
}: {
  draft: LocalSpecialtyDraft;
  onChange: (draft: LocalSpecialtyDraft) => void;
}) {
  return (
    <>
      <div className="two-column-grid">
        <label><span>Material key</span><input className="text-input" value={draft.key} onChange={(event) => onChange({ ...draft, key: event.target.value.trim() })} /></label>
        <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
        <SelectField label="Region" value={draft.region} options={LOCAL_SPECIALTY_REGIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, region: (value || "Fontaine") as LocalSpecialtyRegion })} />
        <SelectField label="Purchasable" value={draft.isPurchasable ? "yes" : "no"} options={["yes", "no"]} includeBlank={false} onChange={(value) => onChange({ ...draft, isPurchasable: value === "yes" })} />
      </div>
      <label>
        Purchase vendors
        <input className="text-input" value={joinCommaList(draft.purchaseVendors)} onChange={(event) => onChange({ ...draft, purchaseVendors: parseCommaList(event.target.value) })} />
      </label>
      <label>
        Search hint
        <textarea className="text-input compact" rows={3} value={draft.searchHint} onChange={(event) => onChange({ ...draft, searchHint: event.target.value })} />
      </label>
    </>
  );
}

function StandaloneMaterialEditor({
  draft,
  lookupIndex,
  onChange,
}: {
  draft: StandaloneMaterialDraft;
  lookupIndex: KnownKeyLookupIndex;
  onChange: (draft: StandaloneMaterialDraft) => void;
}) {
  return (
    <>
      <FieldSection title="Planner Essentials" description="Material identity, category, and source.">
        <div className="two-column-grid">
          <GeneratedKeyField label="Material key" value={draft.key} sourceValue={draft.displayName} onChange={(value) => onChange({ ...draft, key: value })} />
          <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
          <SelectField label="Category" value={draft.category} options={MATERIAL_CATEGORIES} includeBlank={false} onChange={(value) => onChange({ ...draft, category: (value || "other") as StandaloneMaterialDraft["category"] })} />
          <label>
            Record category
            <select value={draft.recordCategory} onChange={(event) => onChange({ ...draft, recordCategory: event.target.value as StandaloneMaterialDraft["recordCategory"] })}>
              {["ascension_gem", "general_enemy_drop", "elite_enemy_drop", "weapon_ascension_material", "weapon_exp_material", "weapon_fodder_exp", "local_specialty", "normal_boss_material", "character_talent_material", "weekly_boss_material", "special_progression_material"].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <SelectField label="Source type" value={draft.sourceType} options={SOURCE_TYPES} includeBlank={false} onChange={(value) => onChange({ ...draft, sourceType: (value || "other") as StandaloneMaterialDraft["sourceType"] })} />
          <SelectField label="Availability" value={draft.availability} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, availability: (value || "UNKNOWN") as StandaloneMaterialDraft["availability"] })} />
        </div>
        <div className="two-column-grid">
          <KnownKeyField label="Source key" value={draft.sourceKey} types={["sourceDomain", "normalBossMaterial", "weeklyBossMaterial"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, sourceKey: value })} />
          <label><span>Source name</span><input className="text-input" value={draft.sourceName} onChange={(event) => onChange({ ...draft, sourceName: event.target.value })} /></label>
        </div>
      </FieldSection>
      <FieldSection title="Details" description="Usage tags, crafting flags, and notes." defaultOpen={false}>
        <div className="two-column-grid">
          <label><span>Used for</span><input className="text-input" value={joinCommaList(draft.usedFor)} onChange={(event) => onChange({ ...draft, usedFor: parseCommaList(event.target.value) })} /></label>
          <label><span>Conversion ratio</span><input type="number" min={0} value={draft.conversionRatio ?? ""} onChange={(event) => onChange({ ...draft, conversionRatio: event.target.value ? Number(event.target.value) : undefined })} /></label>
        </div>
      </FieldSection>
    </>
  );
}

function SourceDomainEditor({
  draft,
  lookupIndex,
  onChange,
}: {
  draft: SourceDomainDraft;
  lookupIndex: KnownKeyLookupIndex;
  onChange: (draft: SourceDomainDraft) => void;
}) {
  const linkedFamilyTypes: KnownKeyType[] =
    draft.domainType === "mastery" ? ["talentBookFamily"] :
    draft.domainType === "forgery" ? ["weaponAscensionFamily"] :
    ["weeklyBossMaterial"];
  return (
    <>
      <FieldSection title="Planner Essentials" description="Domain identity, availability, and linked reward families.">
        <div className="two-column-grid">
          <GeneratedKeyField label="Domain key" value={draft.domainKey} sourceValue={draft.name} onChange={(value) => onChange({ ...draft, domainKey: value })} />
          <label>
            Domain type
            <select value={draft.domainType} onChange={(event) => onChange({ ...draft, domainType: event.target.value as SourceDomainDraft["domainType"] })}>
              <option value="mastery">domain_of_mastery</option>
              <option value="forgery">domain_of_forgery</option>
              <option value="trounce">trounce_domain</option>
            </select>
          </label>
          <label><span>Name</span><input className="text-input" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></label>
          <label><span>Location</span><input className="text-input" value={draft.location} onChange={(event) => onChange({ ...draft, location: event.target.value })} /></label>
          <SelectField label="Region" value={draft.region} options={REGION_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, region: value || "Fontaine" })} />
          <SelectField label="Availability" value={draft.availability ?? "MON_THU_SUN"} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, availability: (value || "MON_THU_SUN") as SourceDomainDraft["availability"] })} />
        </div>
        <div className="two-column-grid">
          <KnownKeyMultiField label="Linked family keys" values={draft.linkedFamilyKeys} types={linkedFamilyTypes} lookupIndex={lookupIndex} onChange={(values) => onChange({ ...draft, linkedFamilyKeys: values })} />
          <KnownKeyMultiField label="Listed rewards" values={draft.listedRewards} types={["material", "weeklyBossMaterial"]} lookupIndex={lookupIndex} onChange={(values) => onChange({ ...draft, listedRewards: values })} />
        </div>
      </FieldSection>
      <FieldSection title="Details" description="Element tips and source notes." defaultOpen={false}>
        <div className="two-column-grid">
          <label><span>Recommended elements</span><input className="text-input" value={joinCommaList(draft.elements)} onChange={(event) => onChange({ ...draft, elements: parseCommaList(event.target.value) })} /></label>
        </div>
        <label>
          Notes
          <textarea className="text-input compact" rows={3} value={draft.notes.join("\n")} onChange={(event) => onChange({ ...draft, notes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} />
        </label>
      </FieldSection>
    </>
  );
}

function WeaponProfileEditor({
  draft,
  lookupIndex,
  onQuickCreateWeaponFamily,
  onQuickCreateCommonEnemyFamily,
  onChange,
}: {
  draft: WeaponProfileDraft;
  lookupIndex: KnownKeyLookupIndex;
  onQuickCreateWeaponFamily: (seed: string) => void;
  onQuickCreateCommonEnemyFamily: (seed: string) => void;
  onChange: (draft: WeaponProfileDraft) => void;
}) {
  return (
    <>
      <FieldSection title="Planner Essentials" description="Weapon identity and material families used by planner goals.">
        <div className="two-column-grid">
          <GeneratedKeyField label="Weapon key" value={draft.weaponKey} sourceValue={draft.displayName} onChange={(value) => onChange({ ...draft, weaponKey: value })} />
          <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
          <SelectField label="Weapon type" value={draft.weaponType ?? ""} options={WEAPON_TYPE_OPTIONS} includeBlank onChange={(value) => onChange({ ...draft, weaponType: value ? value as WeaponProfileDraft["weaponType"] : undefined })} />
          <label>
            Rarity
            <select value={draft.rarity} onChange={(event) => onChange({ ...draft, rarity: Number(event.target.value) as WeaponProfileDraft["rarity"] })}>
              {[1, 2, 3, 4, 5].map((rarity) => <option key={rarity} value={rarity}>{rarity}-star</option>)}
            </select>
          </label>
          <SelectField label="Release state" value={draft.releaseState} options={RELEASE_STATE_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, releaseState: (value || "beta") as DatabaseCanonicalReleaseState })} />
          <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
          <SelectField label="Planner eligible" value={draft.plannerEligible ? "yes" : "no"} options={["no", "yes"]} includeBlank={false} onChange={(value) => onChange({ ...draft, plannerEligible: value === "yes" })} />
        </div>
        <div className="two-column-grid">
          <KnownKeyField label="Weapon ascension family" value={draft.weaponAscensionMaterialFamilyKey} types={["weaponAscensionFamily"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, weaponAscensionMaterialFamilyKey: value })} onQuickCreate={onQuickCreateWeaponFamily} />
          <KnownKeyField label="Elite enemy family" value={draft.eliteEnemyDropFamilyKey} types={["eliteEnemyDropFamily"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, eliteEnemyDropFamilyKey: value })} onQuickCreate={onQuickCreateCommonEnemyFamily} />
          <KnownKeyField label="Common enemy family" value={draft.commonEnemyDropFamilyKey} types={["commonEnemyDropFamily"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, commonEnemyDropFamilyKey: value })} onQuickCreate={onQuickCreateCommonEnemyFamily} />
        </div>
      </FieldSection>
      <FieldSection title="Details" description="Acquisition, aliases, and notes." defaultOpen={false}>
        <div className="two-column-grid">
          <label>
            Acquisition
            <select value={draft.acquisitionType ?? "unknown"} onChange={(event) => onChange({ ...draft, acquisitionType: event.target.value as WeaponProfileDraft["acquisitionType"] })}>
              {["unknown", "standard_wish", "limited_wish", "event", "craftable", "battle_pass", "starglitter", "fishing", "quest", "chest"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label><span>Aliases</span><input className="text-input" value={joinCommaList(draft.aliases)} onChange={(event) => onChange({ ...draft, aliases: parseCommaList(event.target.value) })} /></label>
        </div>
        <label>
          Notes
          <textarea className="text-input compact" rows={3} value={draft.notes.join("\n")} onChange={(event) => onChange({ ...draft, notes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} />
        </label>
      </FieldSection>
    </>
  );
}

function ArtifactDomainEditor({
  draft,
  lookupIndex,
  onChange,
}: {
  draft: ArtifactDomainDraft;
  lookupIndex: KnownKeyLookupIndex;
  onChange: (draft: ArtifactDomainDraft) => void;
}) {
  return (
    <FieldSection title="Planner Essentials" description="Artifact set-to-domain mapping used by Artifact Goals.">
      <div className="two-column-grid">
        <GeneratedKeyField label="Set key" value={draft.setKey} sourceValue={draft.setName} onChange={(value) => onChange({ ...draft, setKey: value })} />
        <label><span>Set name</span><input className="text-input" value={draft.setName} onChange={(event) => onChange({ ...draft, setName: event.target.value })} /></label>
        <SelectField label="Standard domain source" value={draft.hasStandardDomainSource ? "yes" : "no"} options={["yes", "no"]} includeBlank={false} onChange={(value) => onChange({ ...draft, hasStandardDomainSource: value !== "no" })} />
        <KnownKeyField label="Domain key" value={draft.domainKey ?? ""} types={["sourceDomain"]} lookupIndex={lookupIndex} onChange={(value) => onChange({ ...draft, domainKey: value })} />
        <label><span>Domain name</span><input className="text-input" value={draft.domainName ?? ""} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} /></label>
        <label><span>Domain location</span><input className="text-input" value={draft.domainLocation ?? ""} onChange={(event) => onChange({ ...draft, domainLocation: event.target.value })} /></label>
        <SelectField label="Region" value={draft.region ?? "Fontaine"} options={REGION_OPTIONS} includeBlank onChange={(value) => onChange({ ...draft, region: value || undefined })} />
        <KnownKeyMultiField label="Paired set keys" values={draft.pairedSetKeys ?? []} types={["artifactSet"]} lookupIndex={lookupIndex} onChange={(values) => onChange({ ...draft, pairedSetKeys: values })} />
      </div>
    </FieldSection>
  );
}
