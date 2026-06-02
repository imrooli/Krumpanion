import { useEffect, useMemo, useState } from "react";
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
  type LocalSpecialtyDraft,
  type NormalBossMaterialDraft,
  type StandaloneMaterialDraft,
  type TalentBookFamilyDraft,
  type WeaponAscensionFamilyDraft,
  type WeeklyBossGroupDraft,
} from "../../domain/staticData/databaseChangeSet";
import { buildCharacterProfileEditorState } from "./databaseProfileHelpers";
import { SelectField } from "./databaseShared";
import { AVAILABILITY_OPTIONS, ELEMENT_OPTIONS, MATERIAL_CATEGORIES, REGION_OPTIONS, SOURCE_TYPES, WEAPON_TYPE_OPTIONS } from "./databaseConstants";

export type DatabaseWorkbenchView = "release" | "materialsFamilies" | "assignments" | "validation";
type DraftKind =
  | "weeklyBossGroup"
  | "talentBookFamily"
  | "weaponAscensionFamily"
  | "commonEnemyDropFamily"
  | "normalBossMaterial"
  | "localSpecialty"
  | "standaloneMaterial";
type Selection = { kind: DraftKind; key: string };

const STATUS_OPTIONS: DatabaseCanonicalStatus[] = ["verified", "beta", "unresolved", "ignored", "deprecated"];
const RELEASE_STATE_OPTIONS: DatabaseCanonicalReleaseState[] = ["live", "beta", "unreleased", "ignored", "deprecated"];
const LOCAL_SPECIALTY_REGIONS: LocalSpecialtyRegion[] = ["Mondstadt", "Liyue", "Inazuma", "Sumeru", "Fontaine", "Natlan", "Nod-Krai"];

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinCommaList(value: string[]): string {
  return value.join(", ");
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
}: DatabaseWorkbenchProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [showAssignmentProblemsOnly, setShowAssignmentProblemsOnly] = useState(true);
  const [selectedCharacterKey, setSelectedCharacterKey] = useState("");

  const materialRows = useMemo(
    () =>
      [
        ...Object.keys(changeSet.weeklyBossGroups).map((key) => ({ kind: "weeklyBossGroup" as const, key, label: changeSet.weeklyBossGroups[key].bossName || key })),
        ...Object.keys(changeSet.talentBookFamilies).map((key) => ({ kind: "talentBookFamily" as const, key, label: changeSet.talentBookFamilies[key].key })),
        ...Object.keys(changeSet.weaponAscensionFamilies).map((key) => ({ kind: "weaponAscensionFamily" as const, key, label: changeSet.weaponAscensionFamilies[key].displayName || key })),
        ...Object.keys(changeSet.commonEnemyDropFamilies).map((key) => ({ kind: "commonEnemyDropFamily" as const, key, label: changeSet.commonEnemyDropFamilies[key].displayName || key })),
        ...Object.keys(changeSet.normalBossMaterials).map((key) => ({ kind: "normalBossMaterial" as const, key, label: changeSet.normalBossMaterials[key].displayName || key })),
        ...Object.keys(changeSet.localSpecialties).map((key) => ({ kind: "localSpecialty" as const, key, label: changeSet.localSpecialties[key].displayName || key })),
        ...Object.keys(changeSet.standaloneMaterials).map((key) => ({ kind: "standaloneMaterial" as const, key, label: changeSet.standaloneMaterials[key].displayName || key })),
      ].sort((left, right) => left.label.localeCompare(right.label)),
    [changeSet],
  );

  useEffect(() => {
    if (view !== "materialsFamilies" || selection) {
      return;
    }
    const first = materialRows[0];
    if (first) {
      setSelection({ kind: first.kind, key: first.key });
    }
  }, [materialRows, selection, view]);

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

  function setChangeSet(next: DatabaseChangeSet) {
    onChangeSetChange(next);
  }

  function upsertWeeklyBossGroup(key: string, draft: WeeklyBossGroupDraft) {
    setChangeSet({ ...changeSet, weeklyBossGroups: { ...changeSet.weeklyBossGroups, [key]: draft } });
  }
  function upsertTalentBookFamily(key: string, draft: TalentBookFamilyDraft) {
    setChangeSet({ ...changeSet, talentBookFamilies: { ...changeSet.talentBookFamilies, [key]: draft } });
  }
  function upsertWeaponAscensionFamily(key: string, draft: WeaponAscensionFamilyDraft) {
    setChangeSet({ ...changeSet, weaponAscensionFamilies: { ...changeSet.weaponAscensionFamilies, [key]: draft } });
  }
  function upsertCommonEnemyDropFamily(key: string, draft: CommonEnemyDropFamilyDraft) {
    setChangeSet({ ...changeSet, commonEnemyDropFamilies: { ...changeSet.commonEnemyDropFamilies, [key]: draft } });
  }
  function upsertNormalBossMaterial(key: string, draft: NormalBossMaterialDraft) {
    setChangeSet({ ...changeSet, normalBossMaterials: { ...changeSet.normalBossMaterials, [key]: draft } });
  }
  function upsertLocalSpecialty(key: string, draft: LocalSpecialtyDraft) {
    setChangeSet({ ...changeSet, localSpecialties: { ...changeSet.localSpecialties, [key]: draft } });
  }
  function upsertStandaloneMaterial(key: string, draft: StandaloneMaterialDraft) {
    setChangeSet({ ...changeSet, standaloneMaterials: { ...changeSet.standaloneMaterials, [key]: draft } });
  }
  function upsertCharacterDraft(key: string, draft: CharacterMaterialAssignmentDraft) {
    setChangeSet({ ...changeSet, characters: { ...changeSet.characters, [key]: draft } });
  }

  function renderReleaseUpdate() {
    const counts = [
      { label: "Weekly bosses", value: Object.keys(changeSet.weeklyBossGroups).length },
      { label: "Families", value: Object.keys(changeSet.talentBookFamilies).length + Object.keys(changeSet.weaponAscensionFamilies).length + Object.keys(changeSet.commonEnemyDropFamilies).length },
      { label: "Characters", value: Object.keys(changeSet.characters).length },
      { label: "Materials", value: Object.keys(changeSet.normalBossMaterials).length + Object.keys(changeSet.localSpecialties).length + Object.keys(changeSet.standaloneMaterials).length },
    ];

    return (
      <div className="database-overview-stack">
        <SectionCard title="Release update draft" description="Define the patch update, then use templates to add the new materials, source groups, and character assignments that belong together.">
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
        </SectionCard>

        <SectionCard title="Quick-add templates" description="Start from the Genshin-shaped workflow you are actually doing, not from a raw JSON record type.">
          <div className="button-row wrap">
            <button type="button" className="button-primary" onClick={() => {
              const key = `WeeklyBoss${Object.keys(changeSet.weeklyBossGroups).length + 1}`;
              upsertWeeklyBossGroup(key, createBlankWeeklyBossGroup(key));
              setSelection({ kind: "weeklyBossGroup", key });
            }}>Add Weekly Boss Group</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `TalentFamily${Object.keys(changeSet.talentBookFamilies).length + 1}`;
              upsertTalentBookFamily(key, createBlankTalentBookFamily(key));
              setSelection({ kind: "talentBookFamily", key });
            }}>Add Talent Book Family</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `WeaponFamily${Object.keys(changeSet.weaponAscensionFamilies).length + 1}`;
              upsertWeaponAscensionFamily(key, createBlankWeaponAscensionFamily(key));
              setSelection({ kind: "weaponAscensionFamily", key });
            }}>Add Weapon Family</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `EnemyFamily${Object.keys(changeSet.commonEnemyDropFamilies).length + 1}`;
              upsertCommonEnemyDropFamily(key, createBlankCommonEnemyDropFamily(key));
              setSelection({ kind: "commonEnemyDropFamily", key });
            }}>Add Enemy Family</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `NormalBossMaterial${Object.keys(changeSet.normalBossMaterials).length + 1}`;
              upsertNormalBossMaterial(key, createBlankNormalBossMaterial(key));
              setSelection({ kind: "normalBossMaterial", key });
            }}>Add Normal Boss Material</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `LocalSpecialty${Object.keys(changeSet.localSpecialties).length + 1}`;
              upsertLocalSpecialty(key, createBlankLocalSpecialty(key));
              setSelection({ kind: "localSpecialty", key });
            }}>Add Local Specialty</button>
            <button type="button" className="button-secondary" onClick={() => {
              const key = `StandaloneMaterial${Object.keys(changeSet.standaloneMaterials).length + 1}`;
              upsertStandaloneMaterial(key, createBlankStandaloneMaterial(key));
              setSelection({ kind: "standaloneMaterial", key });
            }}>Add Standalone Material</button>
            <button type="button" className="button-ghost" onClick={() => {
              const key = `NewCharacter${Object.keys(changeSet.characters).length + 1}`;
              upsertCharacterDraft(key, {
                characterKey: key,
                displayName: "",
                releaseState: "beta",
                status: "beta",
                plannerEligible: true,
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
            }}>Add New Character Draft</button>
          </div>
        </SectionCard>

        <SectionCard title="What this draft will generate" description="The workbench compiles into a preview override pack and a canonical-ready export bundle grouped by the database files you actually maintain.">
          <ul className="ranked-list">
            <li><strong>Preview static data</strong><span>{previewHealthReport.summary.errorCount} errors / {previewHealthReport.summary.warningCount} warnings</span></li>
            <li><strong>Export files</strong><span>{exportBundle.files.length}</span></li>
            <li><strong>Draft override records</strong><span>{Object.keys(previewOverridePack.materials ?? {}).length + Object.keys(previewOverridePack.characters ?? {}).length}</span></li>
            <li><strong>Imported account context</strong><span>{account ? `${account.characters.length} chars / ${account.weapons.length} weapons` : "No GOOD import yet"}</span></li>
          </ul>
        </SectionCard>
      </div>
    );
  }

  function renderMaterialEditor() {
    const selected = selection ?? (materialRows[0] ? { kind: materialRows[0].kind, key: materialRows[0].key } : null);
    const selectedLabel = materialRows.find((row) => row.key === selected?.key && row.kind === selected?.kind)?.label;

    return (
      <SplitWorkspace
        left={
          <SectionCard title="Draft entities" description="Pick the material, family, or source group you want to edit.">
            <div className="catalog-list">
              {materialRows.map((row) => (
                <button
                  key={`${row.kind}-${row.key}`}
                  type="button"
                  className={`catalog-item ${selection?.kind === row.kind && selection?.key === row.key ? "is-active" : ""}`}
                  onClick={() => setSelection({ kind: row.kind, key: row.key })}
                >
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.kind}</small>
                    <small>{row.key}</small>
                  </div>
                </button>
              ))}
              {materialRows.length === 0 ? <p className="muted">Use Release Update to add a template first.</p> : null}
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
                title={selectedLabel ?? selected.key}
                description="These guided forms synchronize the records that normally live in different database files so patch maintenance stays consistent."
              >
                {selected.kind === "weeklyBossGroup" ? (
                  <WeeklyBossGroupEditor
                    draft={changeSet.weeklyBossGroups[selected.key]}
                    onChange={(draft) => upsertWeeklyBossGroup(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "talentBookFamily" ? (
                  <TalentBookFamilyEditor
                    draft={changeSet.talentBookFamilies[selected.key]}
                    onChange={(draft) => upsertTalentBookFamily(selected.key, draft)}
                  />
                ) : null}
                {selected.kind === "weaponAscensionFamily" ? (
                  <WeaponAscensionFamilyEditor
                    draft={changeSet.weaponAscensionFamilies[selected.key]}
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
                    onChange={(draft) => upsertStandaloneMaterial(selected.key, draft)}
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
            <ul className="warning-list">
              {validationIssues.map((issue) => (
                <li key={issue.id}>
                  <strong>{issue.entityKey}</strong>: {issue.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No workbench-specific validation issues. Review the preview export below.</p>
          )}
        </SectionCard>

        <SectionCard title="Preview override pack" description="This derived override pack is what the workbench uses for local preview without changing canonical repo files.">
          <textarea className="code-input" rows={18} readOnly value={JSON.stringify(previewOverridePack, null, 2)} />
        </SectionCard>

        <SectionCard title="Canonical export bundle" description="Each block is grouped by the canonical database file it should patch. Copy these payloads into the repo files during maintenance work.">
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

  if (view === "release") {
    return renderReleaseUpdate();
  }
  if (view === "materialsFamilies") {
    return renderMaterialEditor();
  }
  if (view === "assignments") {
    return renderAssignments();
  }
  return renderValidation();
}

function WeeklyBossGroupEditor({
  draft,
  onChange,
}: {
  draft: WeeklyBossGroupDraft;
  onChange: (draft: WeeklyBossGroupDraft) => void;
}) {
  return (
    <>
      <div className="two-column-grid">
        <label>
          Source key
          <input className="text-input" value={draft.sourceKey} onChange={(event) => onChange({ ...draft, sourceKey: event.target.value.trim() })} />
        </label>
        <label>
          Boss key
          <input className="text-input" value={draft.bossKey} onChange={(event) => onChange({ ...draft, bossKey: event.target.value.trim() })} />
        </label>
        <label>
          Boss name
          <input className="text-input" value={draft.bossName} onChange={(event) => onChange({ ...draft, bossName: event.target.value })} />
        </label>
        <label>
          Domain name
          <input className="text-input" value={draft.domainName} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} />
        </label>
        <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
      </div>
      {draft.drops.map((drop, index) => (
        <div key={drop.key || index} className="two-column-grid">
          <label>
            Drop {index + 1} key
            <input
              className="text-input"
              value={drop.key}
              onChange={(event) => {
                const nextDrops = draft.drops.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, key: event.target.value.trim() } : candidate) as WeeklyBossGroupDraft["drops"];
                onChange({ ...draft, drops: nextDrops });
              }}
            />
          </label>
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
      <label>
        Notes
        <textarea className="text-input compact" rows={3} value={draft.notes.join("\n")} onChange={(event) => onChange({ ...draft, notes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} />
      </label>
    </>
  );
}

function TalentBookFamilyEditor({
  draft,
  onChange,
}: {
  draft: TalentBookFamilyDraft;
  onChange: (draft: TalentBookFamilyDraft) => void;
}) {
  return (
    <>
      <div className="two-column-grid">
        <label><span>Family key</span><input className="text-input" value={draft.key} onChange={(event) => onChange({ ...draft, key: event.target.value.trim() })} /></label>
        <label><span>Domain key</span><input className="text-input" value={draft.domainKey} onChange={(event) => onChange({ ...draft, domainKey: event.target.value.trim() })} /></label>
        <label><span>Domain name</span><input className="text-input" value={draft.domainName} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} /></label>
        <SelectField label="Availability" value={draft.availability} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, availability: (value || "MON_THU_SUN") as typeof draft.availability })} />
        <SelectField label="Region" value={draft.region} options={REGION_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, region: value || "Fontaine" })} />
        <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, status: (value || "beta") as DatabaseCanonicalStatus })} />
      </div>
      <div className="two-column-grid">
        <label><span>Teachings key</span><input className="text-input" value={draft.teachingsKey} onChange={(event) => onChange({ ...draft, teachingsKey: event.target.value.trim() })} /></label>
        <label><span>Teachings name</span><input className="text-input" value={draft.teachingsName} onChange={(event) => onChange({ ...draft, teachingsName: event.target.value })} /></label>
        <label><span>Guide key</span><input className="text-input" value={draft.guideKey} onChange={(event) => onChange({ ...draft, guideKey: event.target.value.trim() })} /></label>
        <label><span>Guide name</span><input className="text-input" value={draft.guideName} onChange={(event) => onChange({ ...draft, guideName: event.target.value })} /></label>
        <label><span>Philosophies key</span><input className="text-input" value={draft.philosophiesKey} onChange={(event) => onChange({ ...draft, philosophiesKey: event.target.value.trim() })} /></label>
        <label><span>Philosophies name</span><input className="text-input" value={draft.philosophiesName} onChange={(event) => onChange({ ...draft, philosophiesName: event.target.value })} /></label>
      </div>
    </>
  );
}

function WeaponAscensionFamilyEditor({
  draft,
  onChange,
}: {
  draft: WeaponAscensionFamilyDraft;
  onChange: (draft: WeaponAscensionFamilyDraft) => void;
}) {
  return (
    <>
      <div className="two-column-grid">
        <label><span>Family key</span><input className="text-input" value={draft.key} onChange={(event) => onChange({ ...draft, key: event.target.value.trim() })} /></label>
        <label><span>Display name</span><input className="text-input" value={draft.displayName} onChange={(event) => onChange({ ...draft, displayName: event.target.value })} /></label>
        <label><span>Domain key</span><input className="text-input" value={draft.domainKey} onChange={(event) => onChange({ ...draft, domainKey: event.target.value.trim() })} /></label>
        <label><span>Domain name</span><input className="text-input" value={draft.domainName} onChange={(event) => onChange({ ...draft, domainName: event.target.value })} /></label>
        <SelectField label="Availability" value={draft.availability} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, availability: (value || "MON_THU_SUN") as typeof draft.availability })} />
        <SelectField label="Region" value={draft.region} options={REGION_OPTIONS} includeBlank={false} onChange={(value) => onChange({ ...draft, region: value || "Fontaine" })} />
      </div>
      <div className="two-column-grid">
        <label><span>2-star key</span><input className="text-input" value={draft.twoStarKey} onChange={(event) => onChange({ ...draft, twoStarKey: event.target.value.trim() })} /></label>
        <label><span>2-star name</span><input className="text-input" value={draft.twoStarName} onChange={(event) => onChange({ ...draft, twoStarName: event.target.value })} /></label>
        <label><span>3-star key</span><input className="text-input" value={draft.threeStarKey} onChange={(event) => onChange({ ...draft, threeStarKey: event.target.value.trim() })} /></label>
        <label><span>3-star name</span><input className="text-input" value={draft.threeStarName} onChange={(event) => onChange({ ...draft, threeStarName: event.target.value })} /></label>
        <label><span>4-star key</span><input className="text-input" value={draft.fourStarKey} onChange={(event) => onChange({ ...draft, fourStarKey: event.target.value.trim() })} /></label>
        <label><span>4-star name</span><input className="text-input" value={draft.fourStarName} onChange={(event) => onChange({ ...draft, fourStarName: event.target.value })} /></label>
        <label><span>5-star key</span><input className="text-input" value={draft.fiveStarKey} onChange={(event) => onChange({ ...draft, fiveStarKey: event.target.value.trim() })} /></label>
        <label><span>5-star name</span><input className="text-input" value={draft.fiveStarName} onChange={(event) => onChange({ ...draft, fiveStarName: event.target.value })} /></label>
      </div>
    </>
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
  onChange,
}: {
  draft: StandaloneMaterialDraft;
  onChange: (draft: StandaloneMaterialDraft) => void;
}) {
  return (
    <>
      <div className="two-column-grid">
        <label><span>Material key</span><input className="text-input" value={draft.key} onChange={(event) => onChange({ ...draft, key: event.target.value.trim() })} /></label>
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
        <label><span>Source key</span><input className="text-input" value={draft.sourceKey} onChange={(event) => onChange({ ...draft, sourceKey: event.target.value.trim() })} /></label>
        <label><span>Source name</span><input className="text-input" value={draft.sourceName} onChange={(event) => onChange({ ...draft, sourceName: event.target.value })} /></label>
        <label><span>Used for</span><input className="text-input" value={joinCommaList(draft.usedFor)} onChange={(event) => onChange({ ...draft, usedFor: parseCommaList(event.target.value) })} /></label>
        <label><span>Conversion ratio</span><input type="number" min={0} value={draft.conversionRatio ?? ""} onChange={(event) => onChange({ ...draft, conversionRatio: event.target.value ? Number(event.target.value) : undefined })} /></label>
      </div>
    </>
  );
}
