import { useEffect, useMemo, useState } from "react";
import {
  FilterToolbar,
  MetricStrip,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  WarningPanel,
  WorkspaceTabs,
} from "../../app/layoutPrimitives";
import type { CraftingRecipe } from "../../domain/crafting/types";
import type { AvailabilityGroupKey } from "../../domain/planner/types";
import {
  createEditableOverridePack,
  removeOverrideRecord,
  setOverridePackLabel,
  upsertOverrideRecord,
} from "../../domain/staticData/databaseEditor";
import type {
  ArtifactDomainRecord,
  CharacterCatalogEntry,
  CharacterMaterialProfile,
  CharacterProgressionEntry,
  ElementGemFamily,
  EnemyDropFamily,
  LocalSpecialtyMaterial,
  MaterialCategory,
  MaterialDescriptor,
  MaterialSourceRecord,
  MaterialSourceType,
  OverrideDataPack,
  TalentBookFamily,
  UniversalCharacterProgressionCore,
  UniversalTalentProgressionCore,
  UniversalWeaponProgressionCore,
  WeaponAscensionFamily,
  WeaponCatalogEntry,
  WeaponMaterialProfile,
  WeaponProgressionEntry,
} from "../../domain/staticData/types";
import { useAppStore } from "../../store/useAppStore";
import {
  buildDatabaseCoverage,
  buildAccountCoverage,
  buildArtifactRows,
  buildCharacterRows,
  buildDatabaseSearchIndex,
  buildElementGemFamilyRows,
  buildEnemyDropFamilyRows,
  buildLocalSpecialtyRows,
  buildMaterialRows,
  buildTalentBookFamilyRows,
  buildWeaponAscensionFamilyRows,
  buildWeaponRows,
  countFamilyUsage,
  countSectionEntries,
  filterDatabaseSearchIndex,
  type CoverageQueueItem,
  type DatabaseSearchRecord,
  type DatabaseSection,
} from "./databaseModel";
import {
  AVAILABILITY_OPTIONS,
  ELEMENT_OPTIONS,
  MATERIAL_CATEGORIES,
  REGION_OPTIONS,
  SOURCE_TYPES,
  WEAPON_TYPE_OPTIONS,
  formatJson,
  parseJsonValue,
} from "./databaseConstants";
import { QueuePanel, SelectField } from "./databaseShared";
import { DatabaseWorkspaceShell } from "./DatabaseWorkspaceShell";
import { DatabaseHomeCoverage } from "./databaseCoverage";
import {
  buildCharacterProfileEditorState,
  buildCharacterProfileOverride,
  buildWeaponCatalogOverride,
  buildWeaponProfileEditorState,
  buildWeaponProfileOverride,
} from "./databaseProfileHelpers";
import { CharacterProfileEditor, WeaponProfileEditor } from "./databaseGuidedEditors";
import { validateStaticData, type StaticDataIssue } from "../../domain/staticData/validateStaticData";
import { selectActiveAccount, selectActiveGoals, selectInventoryWarnings, selectPlannerOutput } from "../../store/selectors";
import { DatabaseWorkbench, type DatabaseWorkbenchView } from "./DatabaseWorkbench";
import {
  compileChangeSetToOverridePack,
  countChangeSetEntries,
  createEmptyDatabaseChangeSet,
  exportChangeSetToCanonicalBundle,
  mergeOverridePacks,
  validateChangeSet,
} from "../../domain/staticData/databaseChangeSet";
import { createStaticData } from "../../domain/staticData/staticDataFactory";
import { DataHealthCenter } from "./DataHealthCenter";
import {
  buildDataHealthCenterModel,
  getDataHealthOverviewCounts,
  type DataHealthIssue,
} from "./dataHealthModel";

const DATABASE_SECTIONS: Array<{ key: DatabaseSection; label: string }> = [
  { key: "coverage", label: "Coverage" },
  { key: "profiles", label: "Profiles" },
  { key: "families", label: "Families" },
  { key: "sources", label: "Sources" },
  { key: "advanced", label: "Advanced" },
];

type DatabaseWorkspaceTab =
  | "overview"
  | "release"
  | "materialsFamilies"
  | "assignments"
  | "validation"
  | "dataHealth"
  | "rawHealth"
  | "legacy";

type DatabaseEntityType =
  | "coverageDashboard"
  | "characters"
  | "weapons"
  | "materials"
  | "artifacts"
  | "characterProfiles"
  | "weaponProfiles"
  | "elementGems"
  | "talentBooks"
  | "enemyDrops"
  | "weaponAscensions"
  | "localSpecialties"
  | "materialSources"
  | "artifactDomains"
  | "recipes"
  | "characterCore"
  | "talentCore"
  | "weaponCore"
  | "legacyCharacter"
  | "legacyWeapon";

const ENTITY_OPTIONS_BY_SECTION: Record<DatabaseSection, Array<{ key: DatabaseEntityType; label: string }>> = {
  coverage: [
    { key: "coverageDashboard", label: "Coverage Dashboard" },
  ],
  profiles: [
    { key: "characters", label: "Characters" },
    { key: "weapons", label: "Weapons" },
    { key: "characterProfiles", label: "Character Profiles" },
    { key: "weaponProfiles", label: "Weapon Profiles" },
  ],
  families: [
    { key: "elementGems", label: "Gem Families" },
    { key: "talentBooks", label: "Talent Books" },
    { key: "enemyDrops", label: "Enemy Drops" },
    { key: "weaponAscensions", label: "Weapon Families" },
    { key: "localSpecialties", label: "Local Specialties" },
  ],
  sources: [
    { key: "materials", label: "Materials" },
    { key: "artifacts", label: "Artifact Sets" },
    { key: "materialSources", label: "Material Sources" },
    { key: "artifactDomains", label: "Artifact Domains" },
    { key: "recipes", label: "Recipes" },
  ],
  advanced: [
    { key: "characterCore", label: "Character Core" },
    { key: "talentCore", label: "Talent Core" },
    { key: "weaponCore", label: "Weapon Core" },
    { key: "legacyCharacter", label: "Legacy Character" },
    { key: "legacyWeapon", label: "Legacy Weapon" },
  ],
};

function getDefaultEntityType(section: DatabaseSection): DatabaseEntityType {
  return ENTITY_OPTIONS_BY_SECTION[section][0]?.key ?? "characters";
}

function resolveWorkspaceTarget(tab: DatabaseWorkspaceTab): { section: DatabaseSection; entityType: DatabaseEntityType } | null {
  switch (tab) {
    case "overview":
      return { section: "coverage", entityType: "coverageDashboard" };
    case "legacy":
      return { section: "profiles", entityType: "characterProfiles" };
    case "release":
    case "materialsFamilies":
    case "assignments":
    case "validation":
    case "dataHealth":
    case "rawHealth":
      return null;
  }
}

function buildMaterialSourceRows(pack: OverrideDataPack | null, materialKey: string, rows: MaterialSourceRecord[]) {
  const nextPack = createEditableOverridePack(pack);
  return {
    ...nextPack,
    materialSources: {
      ...(nextPack.materialSources ?? {}),
      [materialKey]: rows,
    },
  };
}

function saveFamilySourceRows(
  pack: OverrideDataPack | null,
  records: Array<{ materialKey: string; rows: MaterialSourceRecord[] }>,
): OverrideDataPack {
  const nextPack = createEditableOverridePack(pack);
  const nextSources = { ...(nextPack.materialSources ?? {}) };
  for (const record of records) {
    nextSources[record.materialKey] = record.rows;
  }
  return {
    ...nextPack,
    materialSources: nextSources,
  };
}

function buildHealthFixQueue(issues: StaticDataIssue[]) {
  const actionTitles: Record<string, string> = {
    character_catalog_metadata: "Character metadata issues",
    character_material_profile: "Character material profile issues",
    weapon_profile: "Weapon profile issues",
    material_sources: "Material source issues",
    family_source_metadata: "Family source metadata issues",
    generated_data: "Generated-data unresolved references",
    manual_review: "Manual-review records",
    ignored_records: "Ignored / non-playable records",
  };

  const grouped = new Map<string, StaticDataIssue[]>();
  for (const issue of issues) {
    if (issue.category === "repository_hygiene") {
      continue;
    }
    const groupKey = issue.actionGroup ?? issue.subCategory ?? issue.category;
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), issue]);
  }

  return [...grouped.entries()]
    .map(([key, groupIssues]) => ({
      key,
      title: actionTitles[key] ?? key.replace(/_/g, " "),
      issues: groupIssues,
      plannerImpactingCount: groupIssues.filter((issue) => issue.plannerImpact === "high").length,
    }))
    .sort((left, right) => right.issues.length - left.issues.length || left.title.localeCompare(right.title));
}

export function DatabaseTab() {
  const account = useAppStore(selectActiveAccount);
  const activeGoals = useAppStore(selectActiveGoals);
  const staticData = useAppStore((state) => state.staticData);
  const plannerOutput = useAppStore(selectPlannerOutput);
  const importWarnings = useAppStore(selectInventoryWarnings);
  const overridePack = useAppStore((state) => state.overridePack);
  const importOverrideText = useAppStore((state) => state.importOverrideText);
  const clearOverridePack = useAppStore((state) => state.clearOverridePack);

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<DatabaseWorkspaceTab>("overview");
  const [activeSection, setActiveSection] = useState<DatabaseSection>("coverage");
  const [activeEntityType, setActiveEntityType] = useState<DatabaseEntityType>(getDefaultEntityType("coverage"));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [labelDraft, setLabelDraft] = useState(overridePack?.label ?? "Krumpanion Database Overrides");
  const [changeSet, setChangeSet] = useState(createEmptyDatabaseChangeSet);
  const [globalSearch, setGlobalSearch] = useState("");
  const [rawHealthSearch, setRawHealthSearch] = useState("");
  const [rawHealthSeverityFilter, setRawHealthSeverityFilter] = useState<"all" | "error" | "warning" | "info">("all");
  const [rawHealthCategoryFilter, setRawHealthCategoryFilter] = useState("all");
  const [showProblemsOnly, setShowProblemsOnly] = useState(true);
  const [showPlannerImpactingOnly, setShowPlannerImpactingOnly] = useState(false);
  const [showManualReviewOnly, setShowManualReviewOnly] = useState(false);
  const [showIgnoredOnly, setShowIgnoredOnly] = useState(false);
  const [showGeneratedOnly, setShowGeneratedOnly] = useState(false);
  const [coverageSearch, setCoverageSearch] = useState("");
  const [coverageFilter, setCoverageFilter] = useState("all");

  const [characterSearch, setCharacterSearch] = useState("");
  const [weaponSearch, setWeaponSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [artifactSearch, setArtifactSearch] = useState("");
  const [characterProfileSearch, setCharacterProfileSearch] = useState("");
  const [weaponProfileSearch, setWeaponProfileSearch] = useState("");
  const [elementGemSearch, setElementGemSearch] = useState("");
  const [talentBookSearch, setTalentBookSearch] = useState("");
  const [enemyDropSearch, setEnemyDropSearch] = useState("");
  const [weaponAscensionSearch, setWeaponAscensionSearch] = useState("");
  const [localSpecialtySearch, setLocalSpecialtySearch] = useState("");

  const [characterFilter, setCharacterFilter] = useState("all");
  const [weaponFilter, setWeaponFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [artifactFilter, setArtifactFilter] = useState("all");
  const [characterProfileFilter, setCharacterProfileFilter] = useState("all");
  const [weaponProfileFilter, setWeaponProfileFilter] = useState("all");
  const [elementGemFilter, setElementGemFilter] = useState("all");
  const [talentBookFilter, setTalentBookFilter] = useState("all");
  const [enemyDropFilter, setEnemyDropFilter] = useState("all");
  const [weaponAscensionFilter, setWeaponAscensionFilter] = useState("all");
  const [localSpecialtyFilter, setLocalSpecialtyFilter] = useState("all");

  const [characterKey, setCharacterKey] = useState("");
  const [weaponKey, setWeaponKey] = useState("");
  const [materialKey, setMaterialKey] = useState("");
  const [coverageSelectionKey, setCoverageSelectionKey] = useState("");
  const [sourceMaterialKey, setSourceMaterialKey] = useState("");
  const [artifactSetKey, setArtifactSetKey] = useState("");
  const [recipeKey, setRecipeKey] = useState("");
  const [elementGemFamilyKey, setElementGemFamilyKey] = useState("Geo");
  const [talentBookFamilyKey, setTalentBookFamilyKey] = useState("");
  const [enemyDropFamilyKey, setEnemyDropFamilyKey] = useState("");
  const [weaponAscensionFamilyKey, setWeaponAscensionFamilyKey] = useState("");
  const [localSpecialtyKey, setLocalSpecialtyKey] = useState("");
  const [characterProgressionKey, setCharacterProgressionKey] = useState("");
  const [weaponProgressionKey, setWeaponProgressionKey] = useState("");

  const [characterDraft, setCharacterDraft] = useState<CharacterCatalogEntry>({ key: "", displayName: "" });
  const [weaponDraft, setWeaponDraft] = useState<WeaponCatalogEntry>({ key: "", displayName: "" });
  const [materialDraft, setMaterialDraft] = useState<MaterialDescriptor>({ key: "", displayName: "", category: "other" });
  const [artifactDomainDraft, setArtifactDomainDraft] = useState<ArtifactDomainRecord>({
    setKey: "",
    setName: "",
    hasStandardDomainSource: true,
    domainKey: "",
    domainName: "",
    availability: "ALWAYS",
    resinCost: 20,
  });

  const [characterProfileDraft, setCharacterProfileDraft] = useState<CharacterMaterialProfile>({
    characterKey: "",
    localSpecialty: "",
    normalBossMaterial: "",
    weeklyBossMaterial: "",
  });
  const [weaponProfileDraft, setWeaponProfileDraft] = useState<WeaponMaterialProfile>({
    weaponKey: "",
  });

  const [sourceDraft, setSourceDraft] = useState<MaterialSourceRecord>({
    materialKey: "",
    sourceType: "other",
    sourceKey: "",
    sourceName: "",
    availability: "UNKNOWN",
  });
  const [sourceArrayDraft, setSourceArrayDraft] = useState("[]");
  const [recipeOutputQuantity, setRecipeOutputQuantity] = useState(1);
  const [recipeIngredientsText, setRecipeIngredientsText] = useState("{}");

  const [elementGemFamilyDraft, setElementGemFamilyDraft] = useState<ElementGemFamily>({
    key: "Geo",
    element: "Geo",
    sliver: "",
    fragment: "",
    chunk: "",
    gemstone: "",
  });
  const [talentBookFamilyDraft, setTalentBookFamilyDraft] = useState<TalentBookFamily>({
    key: "",
    teachings: "",
    guide: "",
    philosophies: "",
    availability: "UNKNOWN",
  });
  const [enemyDropFamilyDraft, setEnemyDropFamilyDraft] = useState<EnemyDropFamily>({
    key: "",
    low: "",
    mid: "",
    high: "",
    top: "",
    notes: "",
  });
  const [weaponAscensionFamilyDraft, setWeaponAscensionFamilyDraft] = useState<WeaponAscensionFamily>({
    key: "",
    tier1: "",
    tier2: "",
    tier3: "",
    tier4: "",
    availability: "UNKNOWN",
  });
  const [localSpecialtyDraft, setLocalSpecialtyDraft] = useState<LocalSpecialtyMaterial>({
    key: "",
    displayName: "",
    category: "local_specialty",
    region: "Mondstadt",
    usedFor: ["character_ascension"],
    isPurchasable: false,
    purchaseVendors: [],
    searchHint: "",
    craftable: false,
  });

  const [universalCharacterCoreText, setUniversalCharacterCoreText] = useState("{}");
  const [universalTalentCoreText, setUniversalTalentCoreText] = useState("{}");
  const [universalWeaponCoreText, setUniversalWeaponCoreText] = useState("{}");
  const [characterProgressionLevelText, setCharacterProgressionLevelText] = useState("{}");
  const [characterProgressionAscensionText, setCharacterProgressionAscensionText] = useState("{}");
  const [characterProgressionTalentText, setCharacterProgressionTalentText] = useState("{}");
  const [weaponProgressionLevelText, setWeaponProgressionLevelText] = useState("{}");
  const [weaponProgressionAscensionText, setWeaponProgressionAscensionText] = useState("{}");

  const overrideCounts = countSectionEntries(overridePack);
  const coverage = useMemo(() => buildAccountCoverage(account, staticData), [account, staticData]);
  const coverageModel = useMemo(() => buildDatabaseCoverage(staticData, account), [account, staticData]);
  const staticDataHealthReport = useMemo(() => validateStaticData(staticData), [staticData]);
  const dataHealthModel = useMemo(
    () =>
      buildDataHealthCenterModel({
        staticIssues: staticDataHealthReport.issues,
        importWarnings,
        plannerWarnings: plannerOutput.warnings,
        goals: activeGoals,
        plannerOutput,
      }),
    [activeGoals, importWarnings, plannerOutput, staticDataHealthReport.issues],
  );
  const dataHealthOverviewCounts = useMemo(() => getDataHealthOverviewCounts(dataHealthModel.issues), [dataHealthModel.issues]);
  const healthCategories = useMemo(
    () => ["all", ...new Set(staticDataHealthReport.issues.map((issue) => issue.category))],
    [staticDataHealthReport.issues],
  );
  const healthFixQueue = useMemo(
    () => buildHealthFixQueue(staticDataHealthReport.issues),
    [staticDataHealthReport.issues],
  );
  const filteredHealthIssues = useMemo(
    () =>
      staticDataHealthReport.issues.filter((issue) => {
        const matchesSeverity = rawHealthSeverityFilter === "all" || issue.severity === rawHealthSeverityFilter;
        const matchesCategory = rawHealthCategoryFilter === "all" || issue.category === rawHealthCategoryFilter;
        const matchesProblems = !showProblemsOnly || issue.severity !== "info";
        const matchesPlannerImpact = !showPlannerImpactingOnly || issue.plannerImpact === "high";
        const matchesManualReview = !showManualReviewOnly || issue.actionGroup === "manual_review";
        const matchesIgnored = !showIgnoredOnly || issue.actionGroup === "ignored_records" || issue.subCategory === "ignored_record";
        const matchesGenerated = !showGeneratedOnly || issue.category === "generated_data";
        const searchText = `${issue.entityKey ?? ""} ${issue.entityName ?? ""} ${issue.message} ${issue.suggestedFix ?? ""}`.toLowerCase();
        const matchesSearch = !rawHealthSearch.trim() || searchText.includes(rawHealthSearch.trim().toLowerCase());
        return (
          matchesSeverity &&
          matchesCategory &&
          matchesProblems &&
          matchesPlannerImpact &&
          matchesManualReview &&
          matchesIgnored &&
          matchesGenerated &&
          matchesSearch
        );
      }),
    [
      rawHealthCategoryFilter,
      rawHealthSearch,
      rawHealthSeverityFilter,
      showGeneratedOnly,
      showIgnoredOnly,
      showManualReviewOnly,
      showPlannerImpactingOnly,
      showProblemsOnly,
      staticDataHealthReport.issues,
    ],
  );
  const filteredRepositoryHygieneIssues = useMemo(
    () => filteredHealthIssues.filter((issue) => issue.category === "repository_hygiene"),
    [filteredHealthIssues],
  );
  const filteredDataHealthIssues = useMemo(
    () => filteredHealthIssues.filter((issue) => issue.category !== "repository_hygiene"),
    [filteredHealthIssues],
  );

  const characterRows = useMemo(() => buildCharacterRows(staticData, overridePack), [overridePack, staticData]);
  const weaponRows = useMemo(() => buildWeaponRows(staticData, overridePack), [overridePack, staticData]);
  const materialRows = useMemo(() => buildMaterialRows(staticData, overridePack), [overridePack, staticData]);
  const artifactRows = useMemo(() => buildArtifactRows(staticData, overridePack, account), [account, overridePack, staticData]);
  const elementGemRows = useMemo(() => buildElementGemFamilyRows(staticData), [staticData]);
  const talentBookRows = useMemo(() => buildTalentBookFamilyRows(staticData), [staticData]);
  const enemyDropRows = useMemo(() => buildEnemyDropFamilyRows(staticData), [staticData]);
  const weaponAscensionRows = useMemo(() => buildWeaponAscensionFamilyRows(staticData), [staticData]);
  const localSpecialtyRows = useMemo(() => buildLocalSpecialtyRows(staticData), [staticData]);

  const searchIndex = useMemo(() => buildDatabaseSearchIndex(staticData, overridePack, account), [account, overridePack, staticData]);
  const globalResults = useMemo(() => filterDatabaseSearchIndex(searchIndex, globalSearch), [globalSearch, searchIndex]);
  const characterProfileEditorState = useMemo(
    () => buildCharacterProfileEditorState(characterKey, characterProfileDraft, staticData),
    [characterKey, characterProfileDraft, staticData],
  );
  const weaponProfileEditorState = useMemo(
    () => buildWeaponProfileEditorState(weaponKey, weaponProfileDraft, staticData),
    [weaponKey, weaponProfileDraft, staticData],
  );

  const materialOptions = useMemo(
    () => Object.values(staticData.materials).sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [staticData.materials],
  );
  const previewOverridePack = useMemo(() => compileChangeSetToOverridePack(changeSet), [changeSet]);
  const previewMergedOverridePack = useMemo(
    () => mergeOverridePacks(overridePack, previewOverridePack),
    [overridePack, previewOverridePack],
  );
  const previewStaticData = useMemo(() => createStaticData(previewMergedOverridePack), [previewMergedOverridePack]);
  const changeSetValidationIssues = useMemo(() => validateChangeSet(changeSet, previewStaticData), [changeSet, previewStaticData]);
  const previewStaticDataHealthReport = useMemo(() => validateStaticData(previewStaticData), [previewStaticData]);
  const changeSetExportBundle = useMemo(() => exportChangeSetToCanonicalBundle(changeSet), [changeSet]);
  const changeSetEntryCount = useMemo(() => countChangeSetEntries(changeSet), [changeSet]);

  async function savePack(pack: OverrideDataPack) {
    setError("");
    await importOverrideText(formatJson(pack));
    setStatus("Database overrides saved.");
  }

  function selectCharacter(key: string) {
    setCharacterKey(key);
    setCharacterProgressionKey(key);
  }

  function selectWeapon(key: string) {
    setWeaponKey(key);
    setWeaponProgressionKey(key);
  }

  function selectMaterial(key: string) {
    setMaterialKey(key);
    setSourceMaterialKey(key);
    if (staticData.recipes[key] || overridePack?.recipes?.[key]) {
      setRecipeKey(key);
    }
  }

  function openCoverageItem(item: CoverageQueueItem) {
    setCoverageSelectionKey(item.id);
    setActiveSection(item.section);
    setActiveEntityType(item.entityType as DatabaseEntityType);
    setSelectedRecordKey(item.recordKey, item.entityType as DatabaseEntityType);
  }

  function openHealthIssue(issue: StaticDataIssue) {
    const entityKey = issue.entityKey ?? "";
    if (!entityKey) {
      return;
    }

    if (issue.recordType === "character") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("profiles");
      setActiveEntityType(issue.subCategory === "character_catalog_metadata" ? "characters" : "characterProfiles");
      selectCharacter(entityKey);
      return;
    }

    if (issue.recordType === "weapon") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("profiles");
      setActiveEntityType(issue.subCategory === "weapon_catalog_metadata" ? "weapons" : "weaponProfiles");
      selectWeapon(entityKey);
      return;
    }

    if (issue.recordType === "weapon_ascension_family") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("families");
      setActiveEntityType("weaponAscensions");
      setWeaponAscensionFamilyKey(entityKey);
      return;
    }

    if (issue.recordType === "talent_book_family") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("families");
      setActiveEntityType("talentBooks");
      setTalentBookFamilyKey(entityKey);
      return;
    }

    if (issue.recordType === "enemy_drop_family") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("families");
      setActiveEntityType("enemyDrops");
      setEnemyDropFamilyKey(entityKey);
      return;
    }

    if (issue.recordType === "element_gem_family") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("families");
      setActiveEntityType("elementGems");
      setElementGemFamilyKey(entityKey);
      return;
    }

    if (issue.recordType === "local_specialty") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("families");
      setActiveEntityType("localSpecialties");
      setLocalSpecialtyKey(entityKey);
      return;
    }

    if (issue.recordType === "material") {
      setActiveWorkspaceTab("legacy");
      setActiveSection("sources");
      setActiveEntityType(issue.category === "material_source" ? "materialSources" : "materials");
      if (issue.category === "material_source") {
        setSourceMaterialKey(entityKey);
      } else {
        selectMaterial(entityKey);
      }
    }
  }

  function openDataHealthIssue(issue: DataHealthIssue) {
    const editorTarget = issue.editorTarget;
    if (!editorTarget) {
      return;
    }

    if (editorTarget.workspaceTab === "rawHealth") {
      setActiveWorkspaceTab("rawHealth");
      setRawHealthSearch(editorTarget.rawSearchText ?? issue.affectedKey ?? issue.affectedName ?? issue.shortMessage);
      return;
    }

    if (!editorTarget.entityType || !editorTarget.recordKey || !editorTarget.section) {
      setActiveWorkspaceTab("rawHealth");
      setRawHealthSearch(editorTarget.rawSearchText ?? issue.affectedKey ?? issue.affectedName ?? issue.shortMessage);
      return;
    }

    setActiveWorkspaceTab(editorTarget.workspaceTab ?? "legacy");
    setActiveSection(editorTarget.section);
    setActiveEntityType(editorTarget.entityType);
    setSelectedRecordKey(editorTarget.recordKey, editorTarget.entityType);
  }

  function handleSearchResult(record: DatabaseSearchRecord) {
    setActiveSection(record.section);
    if (record.entityType === "coverage_item") {
      const item = coverageModel.groups.flatMap((group) => group.items).find((candidate) => candidate.id === record.key);
      if (item) {
        openCoverageItem(item);
      } else {
        setActiveEntityType("coverageDashboard");
        setCoverageSelectionKey(record.key);
      }
      return;
    }
    if (record.entityType === "character" || record.entityType === "character_profile") {
      setActiveEntityType(record.entityType === "character" ? "characters" : "characterProfiles");
      selectCharacter(record.key);
      return;
    }
    if (record.entityType === "weapon" || record.entityType === "weapon_profile") {
      setActiveEntityType(record.entityType === "weapon" ? "weapons" : "weaponProfiles");
      selectWeapon(record.key);
      return;
    }
    if (record.entityType === "material") {
      setActiveEntityType("materials");
      selectMaterial(record.key);
      return;
    }
    if (record.entityType === "artifact") {
      setActiveEntityType("artifactDomains");
      setArtifactSetKey(record.key);
      return;
    }
    if (record.entityType === "element_gem_family") {
      setActiveEntityType("elementGems");
      setElementGemFamilyKey(record.key);
      return;
    }
    if (record.entityType === "talent_book_family") {
      setActiveEntityType("talentBooks");
      setTalentBookFamilyKey(record.key);
      return;
    }
    if (record.entityType === "enemy_drop_family") {
      setActiveEntityType("enemyDrops");
      setEnemyDropFamilyKey(record.key);
      return;
    }
    if (record.entityType === "weapon_ascension_family") {
      setActiveEntityType("weaponAscensions");
      setWeaponAscensionFamilyKey(record.key);
      return;
    }
    if (record.entityType === "local_specialty") {
      setActiveEntityType("localSpecialties");
      setLocalSpecialtyKey(record.key);
    }
  }

  useEffect(() => {
    setLabelDraft(overridePack?.label ?? "Krumpanion Database Overrides");
  }, [overridePack]);

  useEffect(() => {
    const target = resolveWorkspaceTarget(activeWorkspaceTab);
    if (!target) {
      return;
    }

    if (activeSection !== target.section) {
      setActiveSection(target.section);
    }

    if (activeEntityType !== target.entityType) {
      setActiveEntityType(target.entityType);
    }
  }, [activeEntityType, activeSection, activeWorkspaceTab]);

  useEffect(() => {
    const validEntityTypes = ENTITY_OPTIONS_BY_SECTION[activeSection].map((option) => option.key);
    if (!validEntityTypes.includes(activeEntityType)) {
      setActiveEntityType(getDefaultEntityType(activeSection));
    }
  }, [activeEntityType, activeSection]);

  useEffect(() => {
    setUniversalCharacterCoreText(formatJson(staticData.universalCharacterProgressionCore));
    setUniversalTalentCoreText(formatJson(staticData.universalTalentProgressionCore));
    setUniversalWeaponCoreText(formatJson(staticData.universalWeaponProgressionCore));
  }, [staticData.universalCharacterProgressionCore, staticData.universalTalentProgressionCore, staticData.universalWeaponProgressionCore]);

  useEffect(() => {
    const existing = (overridePack?.characters?.[characterKey] ?? staticData.characters[characterKey]) as CharacterCatalogEntry | undefined;
    setCharacterDraft(existing ?? { key: characterKey, displayName: characterKey });
  }, [characterKey, overridePack, staticData]);

  useEffect(() => {
    const existing = (overridePack?.characterMaterialProfiles?.[characterKey] ??
      staticData.characterMaterialProfiles[characterKey]) as CharacterMaterialProfile | undefined;
    setCharacterProfileDraft(
      existing ?? {
        characterKey,
        gemFamilyKey: staticData.characters[characterKey]?.element,
        localSpecialtyKey: "",
        normalBossMaterial: "",
        weeklyBossMaterial: "",
      },
    );
  }, [characterKey, overridePack, staticData]);

  useEffect(() => {
    const existing = (overridePack?.weapons?.[weaponKey] ?? staticData.weapons[weaponKey]) as WeaponCatalogEntry | undefined;
    setWeaponDraft(existing ?? { key: weaponKey, displayName: weaponKey });
  }, [overridePack, staticData, weaponKey]);

  useEffect(() => {
    const existing = (overridePack?.weaponMaterialProfiles?.[weaponKey] ??
      staticData.weaponMaterialProfiles[weaponKey]) as WeaponMaterialProfile | undefined;
    setWeaponProfileDraft(
      existing ?? {
        weaponKey,
        rarity: staticData.weapons[weaponKey]?.rarity as 1 | 2 | 3 | 4 | 5 | undefined,
        weaponType: staticData.weapons[weaponKey]?.weaponType,
        eliteEnemyDropFamilyId: "",
        commonEnemyFamilyKey: "",
      },
    );
  }, [overridePack, staticData, weaponKey]);

  useEffect(() => {
    const existing = (overridePack?.materials?.[materialKey] ?? staticData.materials[materialKey]) as MaterialDescriptor | undefined;
    setMaterialDraft(existing ?? { key: materialKey, displayName: materialKey, category: "other" });
  }, [materialKey, overridePack, staticData]);

  useEffect(() => {
    const existing = overridePack?.materialSources?.[sourceMaterialKey] ?? staticData.materialSources[sourceMaterialKey];
    const nextSources = existing?.length ? existing : [];
    setSourceArrayDraft(formatJson(nextSources));
    setSourceDraft(
      nextSources[0] ?? {
        materialKey: sourceMaterialKey,
        sourceType: "other",
        sourceKey: "",
        sourceName: "",
        availability: "UNKNOWN",
      },
    );
  }, [overridePack, sourceMaterialKey, staticData]);

  useEffect(() => {
    const existing = overridePack?.artifactDomains?.[artifactSetKey] ?? staticData.artifactDomains[artifactSetKey];
    setArtifactDomainDraft(
      existing ?? {
        setKey: artifactSetKey,
        domainKey: "",
        domainName: "",
        availability: "ALWAYS",
        resinCost: 20,
      },
    );
  }, [artifactSetKey, overridePack, staticData]);

  useEffect(() => {
    const existing = overridePack?.recipes?.[recipeKey] ?? staticData.recipes[recipeKey];
    setRecipeOutputQuantity(existing?.outputQuantity ?? 1);
    setRecipeIngredientsText(formatJson(existing?.ingredients ?? {}));
  }, [overridePack, recipeKey, staticData]);

  useEffect(() => {
    const existing = overridePack?.elementGemFamilies?.[elementGemFamilyKey] ?? staticData.elementGemFamilies[elementGemFamilyKey];
    setElementGemFamilyDraft(
      existing ?? {
        key: elementGemFamilyKey,
        element: elementGemFamilyKey || undefined,
        sliver: "",
        fragment: "",
        chunk: "",
        gemstone: "",
      },
    );
  }, [elementGemFamilyKey, overridePack, staticData]);

  useEffect(() => {
    const existing = overridePack?.talentBookFamilies?.[talentBookFamilyKey] ?? staticData.talentBookFamilies[talentBookFamilyKey];
    setTalentBookFamilyDraft(
      existing ?? {
        key: talentBookFamilyKey,
        teachings: "",
        guide: "",
        philosophies: "",
        availability: "UNKNOWN",
      },
    );
  }, [overridePack, staticData, talentBookFamilyKey]);

  useEffect(() => {
    const existing = overridePack?.enemyDropFamilies?.[enemyDropFamilyKey] ?? staticData.enemyDropFamilies[enemyDropFamilyKey];
    setEnemyDropFamilyDraft(existing ?? { key: enemyDropFamilyKey, low: "", mid: "", high: "", top: "", notes: "" });
  }, [enemyDropFamilyKey, overridePack, staticData]);

  useEffect(() => {
    const existing =
      overridePack?.weaponAscensionFamilies?.[weaponAscensionFamilyKey] ?? staticData.weaponAscensionFamilies[weaponAscensionFamilyKey];
    setWeaponAscensionFamilyDraft(
      existing ?? {
        key: weaponAscensionFamilyKey,
        tier1: "",
        tier2: "",
        tier3: "",
        tier4: "",
        availability: "UNKNOWN",
      },
    );
  }, [overridePack, staticData, weaponAscensionFamilyKey]);

  useEffect(() => {
    const existing = (overridePack?.localSpecialties?.[localSpecialtyKey] ?? staticData.localSpecialties[localSpecialtyKey]) as
      | LocalSpecialtyMaterial
      | undefined;
    setLocalSpecialtyDraft(
      existing ?? {
        key: localSpecialtyKey,
        displayName: localSpecialtyKey,
        category: "local_specialty",
        region: "Mondstadt",
        usedFor: ["character_ascension"],
        isPurchasable: false,
        purchaseVendors: [],
        searchHint: "",
        craftable: false,
      },
    );
  }, [localSpecialtyKey, overridePack, staticData]);

  useEffect(() => {
    const existing = (overridePack?.legacyExactCharacterProgressions?.[characterProgressionKey] ??
      overridePack?.characterProgressions?.[characterProgressionKey] ??
      staticData.legacyCharacterProgressions[characterProgressionKey]) as CharacterProgressionEntry | undefined;
    setCharacterProgressionLevelText(formatJson(existing?.levelTotals ?? {}));
    setCharacterProgressionAscensionText(formatJson(existing?.ascensionTotals ?? {}));
    setCharacterProgressionTalentText(formatJson(existing?.talentTotals ?? {}));
  }, [characterProgressionKey, overridePack, staticData]);

  useEffect(() => {
    const existing = (overridePack?.legacyExactWeaponProgressions?.[weaponProgressionKey] ??
      overridePack?.weaponProgressions?.[weaponProgressionKey] ??
      staticData.legacyWeaponProgressions[weaponProgressionKey]) as WeaponProgressionEntry | undefined;
    setWeaponProgressionLevelText(formatJson(existing?.levelTotals ?? {}));
    setWeaponProgressionAscensionText(formatJson(existing?.ascensionTotals ?? {}));
  }, [overridePack, staticData, weaponProgressionKey]);

  const activeEntityOptions = ENTITY_OPTIONS_BY_SECTION[activeSection];

  function getSelectedRecordKey(entityType = activeEntityType): string {
    switch (entityType) {
      case "coverageDashboard":
        return coverageSelectionKey;
      case "characters":
      case "characterProfiles":
        return characterKey;
      case "weapons":
      case "weaponProfiles":
        return weaponKey;
      case "materials":
      case "materialSources":
        return materialKey || sourceMaterialKey;
      case "artifacts":
      case "artifactDomains":
        return artifactSetKey;
      case "recipes":
        return recipeKey;
      case "elementGems":
        return elementGemFamilyKey;
      case "talentBooks":
        return talentBookFamilyKey;
      case "enemyDrops":
        return enemyDropFamilyKey;
      case "weaponAscensions":
        return weaponAscensionFamilyKey;
      case "localSpecialties":
        return localSpecialtyKey;
      case "characterCore":
      case "talentCore":
      case "weaponCore":
        return entityType;
      case "legacyCharacter":
        return characterProgressionKey;
      case "legacyWeapon":
        return weaponProgressionKey;
      default:
        return "";
    }
  }

  function setSelectedRecordKey(recordKey: string, entityType = activeEntityType) {
    switch (entityType) {
      case "coverageDashboard":
        setCoverageSelectionKey(recordKey);
        break;
      case "characters":
      case "characterProfiles":
        selectCharacter(recordKey);
        break;
      case "weapons":
      case "weaponProfiles":
        selectWeapon(recordKey);
        break;
      case "materials":
        setMaterialKey(recordKey);
        break;
      case "materialSources":
        setSourceMaterialKey(recordKey);
        break;
      case "artifacts":
      case "artifactDomains":
        setArtifactSetKey(recordKey);
        break;
      case "recipes":
        setRecipeKey(recordKey);
        break;
      case "elementGems":
        setElementGemFamilyKey(recordKey);
        break;
      case "talentBooks":
        setTalentBookFamilyKey(recordKey);
        break;
      case "enemyDrops":
        setEnemyDropFamilyKey(recordKey);
        break;
      case "weaponAscensions":
        setWeaponAscensionFamilyKey(recordKey);
        break;
      case "localSpecialties":
        setLocalSpecialtyKey(recordKey);
        break;
      case "legacyCharacter":
        setCharacterProgressionKey(recordKey);
        break;
      case "legacyWeapon":
        setWeaponProgressionKey(recordKey);
        break;
    }
  }

  function getActiveBrowserConfig() {
    switch (activeEntityType) {
      case "coverageDashboard":
        return {
          title: "Coverage Tasks",
          description: "Jump into the next database cleanup job instead of browsing raw schema first.",
          search: coverageSearch,
          onSearchChange: setCoverageSearch,
          badgeFilter: coverageFilter,
          onBadgeFilterChange: setCoverageFilter,
          rows: coverageModel.rows,
        };
      case "characters":
        return {
          title: "Characters",
          description: "Search character catalog metadata and jump into guided profile work.",
          search: characterSearch,
          onSearchChange: setCharacterSearch,
          badgeFilter: characterFilter,
          onBadgeFilterChange: setCharacterFilter,
          rows: characterRows,
        };
      case "weapons":
        return {
          title: "Weapons",
          description: "Search weapon catalog metadata.",
          search: weaponSearch,
          onSearchChange: setWeaponSearch,
          badgeFilter: weaponFilter,
          onBadgeFilterChange: setWeaponFilter,
          rows: weaponRows,
        };
      case "materials":
        return {
          title: "Materials",
          description: "Search planner-facing material entries.",
          search: materialSearch,
          onSearchChange: setMaterialSearch,
          badgeFilter: materialFilter,
          onBadgeFilterChange: setMaterialFilter,
          rows: materialRows,
        };
      case "artifacts":
      case "artifactDomains":
        return {
          title: "Artifact Sets",
          description: "Search known artifact sets and domain mappings.",
          search: artifactSearch,
          onSearchChange: setArtifactSearch,
          badgeFilter: artifactFilter,
          onBadgeFilterChange: setArtifactFilter,
          rows: artifactRows,
        };
      case "characterProfiles":
        return {
          title: "Character Profiles",
          description: "Search characters by guided profile completeness and validation status.",
          search: characterProfileSearch,
          onSearchChange: setCharacterProfileSearch,
          badgeFilter: characterProfileFilter,
          onBadgeFilterChange: setCharacterProfileFilter,
          rows: characterRows,
        };
      case "weaponProfiles":
        return {
          title: "Weapon Profiles",
          description: "Search weapons by guided profile completeness and validation status.",
          search: weaponProfileSearch,
          onSearchChange: setWeaponProfileSearch,
          badgeFilter: weaponProfileFilter,
          onBadgeFilterChange: setWeaponProfileFilter,
          rows: weaponRows,
        };
      case "elementGems":
        return {
          title: "Element Gem Families",
          description: "Shared elemental ascension gem lines.",
          search: elementGemSearch,
          onSearchChange: setElementGemSearch,
          badgeFilter: elementGemFilter,
          onBadgeFilterChange: setElementGemFilter,
          rows: elementGemRows,
        };
      case "talentBooks":
        return {
          title: "Talent Book Families",
          description: "Shared teachings, guide, and philosophies lines.",
          search: talentBookSearch,
          onSearchChange: setTalentBookSearch,
          badgeFilter: talentBookFilter,
          onBadgeFilterChange: setTalentBookFilter,
          rows: talentBookRows,
        };
      case "enemyDrops":
        return {
          title: "Enemy Drop Families",
          description: "Shared enemy drop tiers used by characters and weapons.",
          search: enemyDropSearch,
          onSearchChange: setEnemyDropSearch,
          badgeFilter: enemyDropFilter,
          onBadgeFilterChange: setEnemyDropFilter,
          rows: enemyDropRows,
        };
      case "weaponAscensions":
        return {
          title: "Weapon Ascension Families",
          description: "Shared weapon-material families and domain metadata.",
          search: weaponAscensionSearch,
          onSearchChange: setWeaponAscensionSearch,
          badgeFilter: weaponAscensionFilter,
          onBadgeFilterChange: setWeaponAscensionFilter,
          rows: weaponAscensionRows,
        };
      case "localSpecialties":
        return {
          title: "Local Specialties",
          description: "Search first-class regional specialty records with vendor and search metadata.",
          search: localSpecialtySearch,
          onSearchChange: setLocalSpecialtySearch,
          badgeFilter: localSpecialtyFilter,
          onBadgeFilterChange: setLocalSpecialtyFilter,
          rows: localSpecialtyRows,
        };
      case "materialSources":
      case "recipes":
        return {
          title: activeEntityType === "recipes" ? "Recipe Materials" : "Material Sources",
          description: activeEntityType === "recipes" ? "Pick a material to edit its crafting recipe." : "Pick a material to edit its source records.",
          search: materialSearch,
          onSearchChange: setMaterialSearch,
          badgeFilter: materialFilter,
          onBadgeFilterChange: setMaterialFilter,
          rows: materialRows,
        };
      case "characterCore":
      case "talentCore":
      case "weaponCore":
        return {
          title: "Advanced Records",
          description: "Shared universal cores and compatibility-only legacy progressions stay hidden here by default.",
          search: "",
          onSearchChange: () => undefined,
          badgeFilter: "all",
          onBadgeFilterChange: () => undefined,
          rows: [
            { key: "characterCore", label: "Character Core", subtitle: "Levels and ascensions", badges: ["core"], searchText: "character core levels ascensions" },
            { key: "talentCore", label: "Talent Core", subtitle: "Single-talent cumulative totals", badges: ["core"], searchText: "talent core" },
            { key: "weaponCore", label: "Weapon Core", subtitle: "Rarity-based weapon progression", badges: ["core"], searchText: "weapon core" },
            { key: "legacyCharacter", label: "Legacy Character", subtitle: "Compatibility-only exact records", badges: ["legacy"], searchText: "legacy character progression" },
            { key: "legacyWeapon", label: "Legacy Weapon", subtitle: "Compatibility-only exact records", badges: ["legacy"], searchText: "legacy weapon progression" },
          ],
        };
      case "legacyCharacter":
        return {
          title: "Legacy Characters",
          description: "Compatibility-only exact progression entries. Prefer guided character profiles whenever possible.",
          search: characterProfileSearch,
          onSearchChange: setCharacterProfileSearch,
          badgeFilter: characterProfileFilter,
          onBadgeFilterChange: setCharacterProfileFilter,
          rows: characterRows,
        };
      case "legacyWeapon":
        return {
          title: "Legacy Weapons",
          description: "Compatibility-only exact weapon progression entries. Prefer guided weapon profiles whenever possible.",
          search: weaponProfileSearch,
          onSearchChange: setWeaponProfileSearch,
          badgeFilter: weaponProfileFilter,
          onBadgeFilterChange: setWeaponProfileFilter,
          rows: weaponRows,
        };
      default:
        return {
          title: "Records",
          description: "Browse records.",
          search: "",
          onSearchChange: () => undefined,
          badgeFilter: "all",
          onBadgeFilterChange: () => undefined,
          rows: [],
        };
    }
  }

  function renderEntityQueue() {
    if (activeEntityType === "coverageDashboard") {
      return null;
    }
    if (activeEntityType === "characterProfiles") {
      return (
        <div className="database-rail-stack">
          <QueuePanel title="Missing Character Profiles" description="Imported characters that still need a profile." keys={coverage.missingCharacterProfiles} onUseKey={selectCharacter} />
          <QueuePanel title="Partial Character Profiles" description="Character profiles that still need shared-family coverage." keys={coverage.incompleteCharacterProfiles} onUseKey={selectCharacter} />
        </div>
      );
    }
    if (activeEntityType === "weaponProfiles") {
      return (
        <div className="database-rail-stack">
          <QueuePanel title="Missing Weapon Profiles" description="Imported weapons that still need a profile." keys={coverage.missingWeaponProfiles} onUseKey={selectWeapon} />
          <QueuePanel title="Partial Weapon Profiles" description="Weapon profiles that still need shared-family coverage." keys={coverage.incompleteWeaponProfiles} onUseKey={selectWeapon} />
        </div>
      );
    }
    if (activeEntityType === "materialSources") {
      return <QueuePanel title="Missing Material Sources" description="Imported materials that still need planner-facing source metadata." keys={coverage.missingMaterialSources} onUseKey={(key) => setSourceMaterialKey(key)} />;
    }
    if (activeEntityType === "artifactDomains") {
      return <QueuePanel title="Missing Artifact Domains" description="Artifact sets that still need a domain mapping." keys={coverage.missingArtifactDomains} onUseKey={setArtifactSetKey} />;
    }
    return null;
  }

  const activeBrowserConfig = getActiveBrowserConfig();
  const selectedRow = activeBrowserConfig.rows.find((row) => row.key === getSelectedRecordKey());

  function renderActiveEditor() {
    switch (activeEntityType) {
      case "coverageDashboard":
        return <DatabaseHomeCoverage coverage={coverageModel} healthReport={staticDataHealthReport} onOpenItem={openCoverageItem} />;
      case "characters":
        return (
          <article className="panel">
            <h3>Character Catalog Entry</h3>
            <label>
              Character Key
              <input className="text-input" value={characterKey} onChange={(event) => setCharacterKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label>
                Display Name
                <input className="text-input" value={characterDraft.displayName} onChange={(event) => setCharacterDraft({ ...characterDraft, key: characterKey, displayName: event.target.value })} />
              </label>
              <SelectField label="Element" value={characterDraft.element ?? ""} options={ELEMENT_OPTIONS} onChange={(value) => setCharacterDraft({ ...characterDraft, key: characterKey, element: value || undefined })} />
              <SelectField label="Weapon Type" value={characterDraft.weaponType ?? ""} options={WEAPON_TYPE_OPTIONS} onChange={(value) => setCharacterDraft({ ...characterDraft, key: characterKey, weaponType: value || undefined })} />
              <SelectField label="Region" value={characterDraft.region ?? ""} options={REGION_OPTIONS} onChange={(value) => setCharacterDraft({ ...characterDraft, key: characterKey, region: value || undefined })} />
            </div>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!characterKey} onClick={async () => {
                await savePack(upsertOverrideRecord(overridePack, "characters", characterKey, { ...characterDraft, key: characterKey, displayName: characterDraft.displayName || characterKey }));
              }}>Save Character Entry</button>
              <button type="button" className="button-ghost" disabled={!characterKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "characters", characterKey));
              }}>Remove Character Override</button>
            </div>
          </article>
        );
      case "weapons":
        return (
          <article className="panel">
            <h3>Weapon Catalog Entry</h3>
            <label>
              Weapon Key
              <input className="text-input" value={weaponKey} onChange={(event) => setWeaponKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label>
                Display Name
                <input className="text-input" value={weaponDraft.displayName} onChange={(event) => setWeaponDraft({ ...weaponDraft, key: weaponKey, displayName: event.target.value })} />
              </label>
              <SelectField label="Weapon Type" value={weaponDraft.weaponType ?? ""} options={WEAPON_TYPE_OPTIONS} onChange={(value) => setWeaponDraft({ ...weaponDraft, key: weaponKey, weaponType: value || undefined })} />
              <label>
                Rarity
                <select value={weaponDraft.rarity?.toString() ?? ""} onChange={(event) => setWeaponDraft({ ...weaponDraft, key: weaponKey, rarity: event.target.value ? Number(event.target.value) as 1 | 2 | 3 | 4 | 5 : undefined })}>
                  <option value="">Unset</option>
                  {[1, 2, 3, 4, 5].map((rarity) => <option key={rarity} value={rarity}>{rarity} star</option>)}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!weaponKey} onClick={async () => {
                await savePack(upsertOverrideRecord(overridePack, "weapons", weaponKey, { ...weaponDraft, key: weaponKey, displayName: weaponDraft.displayName || weaponKey }));
              }}>Save Weapon Entry</button>
              <button type="button" className="button-ghost" disabled={!weaponKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "weapons", weaponKey));
              }}>Remove Weapon Override</button>
            </div>
          </article>
        );
      case "materials":
        return (
          <article className="panel">
            <h3>Material Catalog Entry</h3>
            <label>
              Material Key
              <input className="text-input" value={materialKey} onChange={(event) => setMaterialKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label>
                Display Name
                <input className="text-input" value={materialDraft.displayName} onChange={(event) => setMaterialDraft({ ...materialDraft, key: materialKey, displayName: event.target.value })} />
              </label>
              <SelectField label="Category" value={materialDraft.category} options={MATERIAL_CATEGORIES} includeBlank={false} onChange={(value) => setMaterialDraft({ ...materialDraft, key: materialKey, category: value as MaterialCategory })} />
            </div>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!materialKey} onClick={async () => {
                await savePack(upsertOverrideRecord(overridePack, "materials", materialKey, { ...materialDraft, key: materialKey, displayName: materialDraft.displayName || materialKey }));
              }}>Save Material Entry</button>
              <button type="button" className="button-ghost" disabled={!materialKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "materials", materialKey));
              }}>Remove Material Override</button>
            </div>
          </article>
        );
      case "artifacts":
      case "artifactDomains":
        return (
          <article className="panel">
            <h3>Artifact Domain Mapping</h3>
            <label>
              Artifact Set Key
              <input className="text-input" value={artifactSetKey} onChange={(event) => setArtifactSetKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label>
                Domain Key
                <input className="text-input" value={artifactDomainDraft.domainKey ?? ""} onChange={(event) => setArtifactDomainDraft({ ...artifactDomainDraft, setKey: artifactSetKey, setName: artifactDomainDraft.setName || artifactSetKey, domainKey: event.target.value })} />
              </label>
              <label>
                Domain Name
                <input className="text-input" value={artifactDomainDraft.domainName ?? ""} onChange={(event) => setArtifactDomainDraft({ ...artifactDomainDraft, setKey: artifactSetKey, setName: artifactDomainDraft.setName || artifactSetKey, domainName: event.target.value })} />
              </label>
              <SelectField label="Availability" value={artifactDomainDraft.availability ?? "ALWAYS"} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => setArtifactDomainDraft({ ...artifactDomainDraft, setKey: artifactSetKey, setName: artifactDomainDraft.setName || artifactSetKey, availability: value as AvailabilityGroupKey })} />
              <label>
                Resin Cost
                <input type="number" min={0} value={artifactDomainDraft.resinCost ?? 20} onChange={(event) => setArtifactDomainDraft({ ...artifactDomainDraft, setKey: artifactSetKey, setName: artifactDomainDraft.setName || artifactSetKey, resinCost: Number(event.target.value) || 0 })} />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!artifactSetKey} onClick={async () => {
                await savePack(
                  upsertOverrideRecord(overridePack, "artifactDomains", artifactSetKey, {
                    ...artifactDomainDraft,
                    setKey: artifactSetKey,
                    setName: artifactDomainDraft.setName || artifactSetKey,
                  }),
                );
              }}>Save Artifact Domain</button>
              <button type="button" className="button-ghost" disabled={!artifactSetKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "artifactDomains", artifactSetKey));
              }}>Remove Artifact Domain Override</button>
            </div>
          </article>
        );
      case "characterProfiles":
        return (
            <CharacterProfileEditor
              state={characterProfileEditorState}
              availableGemFamilies={Object.keys(staticData.elementGemFamilies).sort()}
              availableNormalBossMaterials={Object.keys(staticData.normalBossMaterials).sort()}
              availableCommonEnemyFamilies={Object.keys(staticData.generalEnemyDropFamilies).sort()}
              availableLocalSpecialties={Object.keys(staticData.localSpecialties).sort()}
              availableTalentBookSeries={Object.keys(staticData.talentBookFamilies).sort()}
            onChange={(patch) =>
              setCharacterProfileDraft(
                buildCharacterProfileOverride(
                  { ...characterProfileEditorState, ...patch, characterKey },
                  characterProfileDraft,
                ),
              )
            }
            onSave={() => {
              void savePack(
                upsertOverrideRecord(
                  overridePack,
                  "characterMaterialProfiles",
                  characterKey,
                  buildCharacterProfileOverride(characterProfileEditorState, characterProfileDraft),
                ),
              );
            }}
            onRemove={() => {
              void savePack(removeOverrideRecord(overridePack, "characterMaterialProfiles", characterKey));
            }}
          />
        );
      case "weaponProfiles":
        return (
          <WeaponProfileEditor
            state={weaponProfileEditorState}
            availableWeaponAscensionFamilies={Object.keys(staticData.weaponAscensionFamilies).sort()}
            availableEliteEnemyFamilies={Object.keys(staticData.eliteEnemyDropFamilies).sort()}
            availableCommonEnemyFamilies={Object.keys(staticData.generalEnemyDropFamilies).sort()}
            onChange={(patch) =>
              setWeaponProfileDraft(
                buildWeaponProfileOverride(
                  { ...weaponProfileEditorState, ...patch, weaponKey },
                  weaponProfileDraft,
                ),
              )
            }
            onSave={() => {
              const nextProfile = buildWeaponProfileOverride(weaponProfileEditorState, weaponProfileDraft);
              const nextWeapon = buildWeaponCatalogOverride(weaponProfileEditorState, weaponDraft);
              const nextPack = upsertOverrideRecord(
                upsertOverrideRecord(overridePack, "weaponMaterialProfiles", weaponKey, nextProfile),
                "weapons",
                weaponKey,
                nextWeapon,
              );
              void savePack(nextPack);
            }}
            onRemove={() => {
              void savePack(removeOverrideRecord(overridePack, "weaponMaterialProfiles", weaponKey));
            }}
          />
        );
      case "elementGems":
        return (
          <article className="panel">
            <h3>Element Gem Family</h3>
            <p className="muted">Characters can inherit this family automatically from their element.</p>
            <label>
              Family Key
              <input className="text-input" value={elementGemFamilyKey} onChange={(event) => setElementGemFamilyKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <SelectField label="Element" value={elementGemFamilyDraft.element ?? ""} options={ELEMENT_OPTIONS} onChange={(value) => setElementGemFamilyDraft({ ...elementGemFamilyDraft, key: elementGemFamilyKey, element: value || undefined })} />
              <label><span>Sliver</span><input className="text-input" list="database-material-keys" value={elementGemFamilyDraft.sliver} onChange={(event) => setElementGemFamilyDraft({ ...elementGemFamilyDraft, key: elementGemFamilyKey, sliver: event.target.value })} /></label>
              <label><span>Fragment</span><input className="text-input" list="database-material-keys" value={elementGemFamilyDraft.fragment} onChange={(event) => setElementGemFamilyDraft({ ...elementGemFamilyDraft, key: elementGemFamilyKey, fragment: event.target.value })} /></label>
              <label><span>Chunk</span><input className="text-input" list="database-material-keys" value={elementGemFamilyDraft.chunk} onChange={(event) => setElementGemFamilyDraft({ ...elementGemFamilyDraft, key: elementGemFamilyKey, chunk: event.target.value })} /></label>
              <label><span>Gemstone</span><input className="text-input" list="database-material-keys" value={elementGemFamilyDraft.gemstone} onChange={(event) => setElementGemFamilyDraft({ ...elementGemFamilyDraft, key: elementGemFamilyKey, gemstone: event.target.value })} /></label>
            </div>
            <p className="muted">Used by {countFamilyUsage(staticData, elementGemFamilyKey, "element_gem_family")} profiles or auto-derived characters.</p>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!elementGemFamilyKey} onClick={async () => {
                await savePack(upsertOverrideRecord(overridePack, "elementGemFamilies", elementGemFamilyKey, { ...elementGemFamilyDraft, key: elementGemFamilyKey }));
              }}>Save Gem Family</button>
              <button type="button" className="button-ghost" disabled={!elementGemFamilyKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "elementGemFamilies", elementGemFamilyKey));
              }}>Remove Gem Family Override</button>
            </div>
          </article>
        );
      case "talentBooks":
        return (
          <article className="panel">
            <h3>Talent Book Family</h3>
            <p className="muted">One family here powers all three talents on every linked character.</p>
            <label>
              Family Key
              <input className="text-input" value={talentBookFamilyKey} onChange={(event) => setTalentBookFamilyKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label><span>Teachings</span><input className="text-input" list="database-material-keys" value={talentBookFamilyDraft.teachings} onChange={(event) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, teachings: event.target.value })} /></label>
              <label><span>Guide</span><input className="text-input" list="database-material-keys" value={talentBookFamilyDraft.guide} onChange={(event) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, guide: event.target.value })} /></label>
              <label><span>Philosophies</span><input className="text-input" list="database-material-keys" value={talentBookFamilyDraft.philosophies} onChange={(event) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, philosophies: event.target.value })} /></label>
              <label><span>Domain Key</span><input className="text-input" value={talentBookFamilyDraft.domainKey ?? ""} onChange={(event) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, domainKey: event.target.value || undefined })} /></label>
              <label><span>Domain Name</span><input className="text-input" value={talentBookFamilyDraft.domainName ?? ""} onChange={(event) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, domainName: event.target.value || undefined })} /></label>
              <SelectField label="Availability" value={talentBookFamilyDraft.availability ?? ""} options={AVAILABILITY_OPTIONS} onChange={(value) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, availability: (value as AvailabilityGroupKey) || undefined })} />
              <SelectField label="Region" value={talentBookFamilyDraft.region ?? ""} options={REGION_OPTIONS} onChange={(value) => setTalentBookFamilyDraft({ ...talentBookFamilyDraft, key: talentBookFamilyKey, region: value || undefined })} />
            </div>
            <p className="muted">Used by {countFamilyUsage(staticData, talentBookFamilyKey, "talent_book_family")} character profiles.</p>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!talentBookFamilyKey} onClick={async () => {
                const nextPack = saveFamilySourceRows(
                  upsertOverrideRecord(overridePack, "talentBookFamilies", talentBookFamilyKey, { ...talentBookFamilyDraft, key: talentBookFamilyKey }),
                  [
                    talentBookFamilyDraft.teachings ? { materialKey: talentBookFamilyDraft.teachings, rows: [{ materialKey: talentBookFamilyDraft.teachings, sourceType: "domain_of_mastery" as MaterialSourceType, sourceKey: talentBookFamilyDraft.domainKey ?? talentBookFamilyKey, sourceName: talentBookFamilyDraft.domainName ?? talentBookFamilyKey, availability: talentBookFamilyDraft.availability ?? "UNKNOWN", region: talentBookFamilyDraft.region }] } : null,
                    talentBookFamilyDraft.guide ? { materialKey: talentBookFamilyDraft.guide, rows: [{ materialKey: talentBookFamilyDraft.guide, sourceType: "domain_of_mastery" as MaterialSourceType, sourceKey: talentBookFamilyDraft.domainKey ?? talentBookFamilyKey, sourceName: talentBookFamilyDraft.domainName ?? talentBookFamilyKey, availability: talentBookFamilyDraft.availability ?? "UNKNOWN", region: talentBookFamilyDraft.region }] } : null,
                    talentBookFamilyDraft.philosophies ? { materialKey: talentBookFamilyDraft.philosophies, rows: [{ materialKey: talentBookFamilyDraft.philosophies, sourceType: "domain_of_mastery" as MaterialSourceType, sourceKey: talentBookFamilyDraft.domainKey ?? talentBookFamilyKey, sourceName: talentBookFamilyDraft.domainName ?? talentBookFamilyKey, availability: talentBookFamilyDraft.availability ?? "UNKNOWN", region: talentBookFamilyDraft.region }] } : null,
                  ].filter(Boolean) as Array<{ materialKey: string; rows: MaterialSourceRecord[] }>,
                );
                await savePack(nextPack);
              }}>Save Family + Sync Sources</button>
              <button type="button" className="button-ghost" disabled={!talentBookFamilyKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "talentBookFamilies", talentBookFamilyKey));
              }}>Remove Talent Book Family Override</button>
            </div>
          </article>
        );
      case "enemyDrops":
        return (
          <article className="panel">
            <h3>Enemy Drop Family</h3>
            <label>
              Family Key
              <input className="text-input" value={enemyDropFamilyKey} onChange={(event) => setEnemyDropFamilyKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label><span>Low</span><input className="text-input" list="database-material-keys" value={enemyDropFamilyDraft.low} onChange={(event) => setEnemyDropFamilyDraft({ ...enemyDropFamilyDraft, key: enemyDropFamilyKey, low: event.target.value })} /></label>
              <label><span>Mid</span><input className="text-input" list="database-material-keys" value={enemyDropFamilyDraft.mid} onChange={(event) => setEnemyDropFamilyDraft({ ...enemyDropFamilyDraft, key: enemyDropFamilyKey, mid: event.target.value })} /></label>
              <label><span>High</span><input className="text-input" list="database-material-keys" value={enemyDropFamilyDraft.high} onChange={(event) => setEnemyDropFamilyDraft({ ...enemyDropFamilyDraft, key: enemyDropFamilyKey, high: event.target.value })} /></label>
              <label><span>Top Tier</span><input className="text-input" list="database-material-keys" value={enemyDropFamilyDraft.top ?? ""} onChange={(event) => setEnemyDropFamilyDraft({ ...enemyDropFamilyDraft, key: enemyDropFamilyKey, top: event.target.value || undefined })} /></label>
            </div>
            <label>
              Notes
              <textarea className="text-input compact" value={enemyDropFamilyDraft.notes ?? ""} onChange={(event) => setEnemyDropFamilyDraft({ ...enemyDropFamilyDraft, key: enemyDropFamilyKey, notes: event.target.value || undefined })} />
            </label>
            <p className="muted">Used by {countFamilyUsage(staticData, enemyDropFamilyKey, "enemy_drop_family")} character or weapon profiles.</p>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!enemyDropFamilyKey} onClick={async () => {
                await savePack(upsertOverrideRecord(overridePack, "enemyDropFamilies", enemyDropFamilyKey, { ...enemyDropFamilyDraft, key: enemyDropFamilyKey }));
              }}>Save Enemy Drop Family</button>
              <button type="button" className="button-ghost" disabled={!enemyDropFamilyKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "enemyDropFamilies", enemyDropFamilyKey));
              }}>Remove Enemy Drop Family Override</button>
            </div>
          </article>
        );
      case "weaponAscensions":
        return (
          <article className="panel">
            <h3>Weapon Ascension Family</h3>
            <label>
              Family Key
              <input className="text-input" value={weaponAscensionFamilyKey} onChange={(event) => setWeaponAscensionFamilyKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label><span>Tier 1</span><input className="text-input" list="database-material-keys" value={weaponAscensionFamilyDraft.tier1} onChange={(event) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, tier1: event.target.value })} /></label>
              <label><span>Tier 2</span><input className="text-input" list="database-material-keys" value={weaponAscensionFamilyDraft.tier2} onChange={(event) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, tier2: event.target.value })} /></label>
              <label><span>Tier 3</span><input className="text-input" list="database-material-keys" value={weaponAscensionFamilyDraft.tier3} onChange={(event) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, tier3: event.target.value })} /></label>
              <label><span>Tier 4</span><input className="text-input" list="database-material-keys" value={weaponAscensionFamilyDraft.tier4} onChange={(event) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, tier4: event.target.value })} /></label>
              <label><span>Domain Key</span><input className="text-input" value={weaponAscensionFamilyDraft.domainKey ?? ""} onChange={(event) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, domainKey: event.target.value || undefined })} /></label>
              <label><span>Domain Name</span><input className="text-input" value={weaponAscensionFamilyDraft.domainName ?? ""} onChange={(event) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, domainName: event.target.value || undefined })} /></label>
              <SelectField label="Availability" value={weaponAscensionFamilyDraft.availability ?? ""} options={AVAILABILITY_OPTIONS} onChange={(value) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, availability: (value as AvailabilityGroupKey) || undefined })} />
              <SelectField label="Region" value={weaponAscensionFamilyDraft.region ?? ""} options={REGION_OPTIONS} onChange={(value) => setWeaponAscensionFamilyDraft({ ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey, region: value || undefined })} />
            </div>
            <p className="muted">Used by {countFamilyUsage(staticData, weaponAscensionFamilyKey, "weapon_ascension_family")} weapon profiles.</p>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!weaponAscensionFamilyKey} onClick={async () => {
                const nextPack = saveFamilySourceRows(
                  upsertOverrideRecord(overridePack, "weaponAscensionFamilies", weaponAscensionFamilyKey, { ...weaponAscensionFamilyDraft, key: weaponAscensionFamilyKey }),
                  [
                    weaponAscensionFamilyDraft.tier1 ? { materialKey: weaponAscensionFamilyDraft.tier1, rows: [{ materialKey: weaponAscensionFamilyDraft.tier1, sourceType: "domain_of_forgery" as MaterialSourceType, sourceKey: weaponAscensionFamilyDraft.domainKey ?? weaponAscensionFamilyKey, sourceName: weaponAscensionFamilyDraft.domainName ?? weaponAscensionFamilyKey, availability: weaponAscensionFamilyDraft.availability ?? "UNKNOWN", region: weaponAscensionFamilyDraft.region }] } : null,
                    weaponAscensionFamilyDraft.tier2 ? { materialKey: weaponAscensionFamilyDraft.tier2, rows: [{ materialKey: weaponAscensionFamilyDraft.tier2, sourceType: "domain_of_forgery" as MaterialSourceType, sourceKey: weaponAscensionFamilyDraft.domainKey ?? weaponAscensionFamilyKey, sourceName: weaponAscensionFamilyDraft.domainName ?? weaponAscensionFamilyKey, availability: weaponAscensionFamilyDraft.availability ?? "UNKNOWN", region: weaponAscensionFamilyDraft.region }] } : null,
                    weaponAscensionFamilyDraft.tier3 ? { materialKey: weaponAscensionFamilyDraft.tier3, rows: [{ materialKey: weaponAscensionFamilyDraft.tier3, sourceType: "domain_of_forgery" as MaterialSourceType, sourceKey: weaponAscensionFamilyDraft.domainKey ?? weaponAscensionFamilyKey, sourceName: weaponAscensionFamilyDraft.domainName ?? weaponAscensionFamilyKey, availability: weaponAscensionFamilyDraft.availability ?? "UNKNOWN", region: weaponAscensionFamilyDraft.region }] } : null,
                    weaponAscensionFamilyDraft.tier4 ? { materialKey: weaponAscensionFamilyDraft.tier4, rows: [{ materialKey: weaponAscensionFamilyDraft.tier4, sourceType: "domain_of_forgery" as MaterialSourceType, sourceKey: weaponAscensionFamilyDraft.domainKey ?? weaponAscensionFamilyKey, sourceName: weaponAscensionFamilyDraft.domainName ?? weaponAscensionFamilyKey, availability: weaponAscensionFamilyDraft.availability ?? "UNKNOWN", region: weaponAscensionFamilyDraft.region }] } : null,
                  ].filter(Boolean) as Array<{ materialKey: string; rows: MaterialSourceRecord[] }>,
                );
                await savePack(nextPack);
              }}>Save Family + Sync Sources</button>
              <button type="button" className="button-ghost" disabled={!weaponAscensionFamilyKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "weaponAscensionFamilies", weaponAscensionFamilyKey));
              }}>Remove Weapon Family Override</button>
            </div>
          </article>
        );
      case "localSpecialties":
        return (
          <article className="panel">
            <h3>Local Specialty Entry</h3>
            <label>
              Material Key
              <input className="text-input" value={localSpecialtyKey} onChange={(event) => setLocalSpecialtyKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label>
                <span>Display Name</span>
                <input
                  className="text-input"
                  value={localSpecialtyDraft.displayName}
                  onChange={(event) => setLocalSpecialtyDraft({ ...localSpecialtyDraft, key: localSpecialtyKey, displayName: event.target.value })}
                />
              </label>
              <SelectField
                label="Region"
                value={localSpecialtyDraft.region}
                options={REGION_OPTIONS}
                includeBlank={false}
                onChange={(value) =>
                  setLocalSpecialtyDraft({ ...localSpecialtyDraft, key: localSpecialtyKey, region: (value || "Mondstadt") as LocalSpecialtyMaterial["region"] })
                }
              />
              <SelectField
                label="Purchasable"
                value={localSpecialtyDraft.isPurchasable ? "yes" : "no"}
                options={["yes", "no"]}
                includeBlank={false}
                onChange={(value) =>
                  setLocalSpecialtyDraft({
                    ...localSpecialtyDraft,
                    key: localSpecialtyKey,
                    isPurchasable: value === "yes",
                    purchaseVendors: value === "yes" ? localSpecialtyDraft.purchaseVendors : [],
                  })
                }
              />
              <label>
                <span>Purchase Vendors (comma separated)</span>
                <input
                  className="text-input"
                  value={localSpecialtyDraft.purchaseVendors.join(", ")}
                  onChange={(event) =>
                    setLocalSpecialtyDraft({
                      ...localSpecialtyDraft,
                      key: localSpecialtyKey,
                      purchaseVendors: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            </div>
            <label>
              Search Hint
              <textarea
                className="text-input compact"
                value={localSpecialtyDraft.searchHint}
                onChange={(event) => setLocalSpecialtyDraft({ ...localSpecialtyDraft, key: localSpecialtyKey, searchHint: event.target.value })}
              />
            </label>
            <p className="muted">Used by {countFamilyUsage(staticData, localSpecialtyKey, "local_specialty")} character profiles.</p>
            <div className="button-row">
              <button
                type="button"
                className="button-primary"
                disabled={!localSpecialtyKey}
                onClick={async () => {
                  const normalizedDraft: LocalSpecialtyMaterial = {
                    ...localSpecialtyDraft,
                    key: localSpecialtyKey,
                    displayName: localSpecialtyDraft.displayName || localSpecialtyKey,
                    category: "local_specialty",
                    usedFor: ["character_ascension"],
                    craftable: false,
                    purchaseVendors: localSpecialtyDraft.isPurchasable ? localSpecialtyDraft.purchaseVendors : [],
                  };
                  const packWithLocalSpecialty = upsertOverrideRecord(overridePack, "localSpecialties", localSpecialtyKey, normalizedDraft);
                  const packWithMaterial = upsertOverrideRecord(packWithLocalSpecialty, "materials", localSpecialtyKey, {
                    key: localSpecialtyKey,
                    displayName: normalizedDraft.displayName,
                    category: "local_specialty",
                  });
                  const nextPack = saveFamilySourceRows(packWithMaterial, [
                    {
                      materialKey: localSpecialtyKey,
                      rows: [
                        {
                          materialKey: localSpecialtyKey,
                          sourceType: "local_specialty" as MaterialSourceType,
                          sourceKey: localSpecialtyKey,
                          sourceName: normalizedDraft.displayName,
                          availability: "ALWAYS",
                          region: normalizedDraft.region,
                          notes: normalizedDraft.searchHint,
                        },
                      ],
                    },
                  ]);
                  await savePack(nextPack);
                }}
              >
                Save Local Specialty
              </button>
              <button
                type="button"
                className="button-ghost"
                disabled={!localSpecialtyKey}
                onClick={async () => {
                  const withoutLocalSpecialty = removeOverrideRecord(overridePack, "localSpecialties", localSpecialtyKey);
                  const withoutMaterial = removeOverrideRecord(withoutLocalSpecialty, "materials", localSpecialtyKey);
                  await savePack(removeOverrideRecord(withoutMaterial, "materialSources", localSpecialtyKey));
                }}
              >
                Remove Local Specialty Override
              </button>
            </div>
          </article>
        );
      case "materialSources":
        return (
          <article className="panel">
            <h3>Material Source Entries</h3>
            <label>
              Material Key
              <input className="text-input" value={sourceMaterialKey} onChange={(event) => setSourceMaterialKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <SelectField label="Source Type" value={sourceDraft.sourceType} options={SOURCE_TYPES} includeBlank={false} onChange={(value) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, sourceType: value as MaterialSourceType })} />
              <SelectField label="Availability" value={sourceDraft.availability} options={AVAILABILITY_OPTIONS} includeBlank={false} onChange={(value) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, availability: value as AvailabilityGroupKey })} />
              <label><span>Source Key</span><input className="text-input" value={sourceDraft.sourceKey} onChange={(event) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, sourceKey: event.target.value })} /></label>
              <label><span>Source Name</span><input className="text-input" value={sourceDraft.sourceName} onChange={(event) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, sourceName: event.target.value })} /></label>
              <label><span>Resin Cost</span><input type="number" min={0} value={sourceDraft.resinCost ?? ""} onChange={(event) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, resinCost: event.target.value ? Number(event.target.value) : undefined })} /></label>
              <SelectField label="Region" value={sourceDraft.region ?? ""} options={REGION_OPTIONS} onChange={(value) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, region: value || undefined })} />
            </div>
            <label>
              Notes
              <textarea className="text-input compact" value={sourceDraft.notes ?? ""} onChange={(event) => setSourceDraft({ ...sourceDraft, materialKey: sourceMaterialKey, notes: event.target.value || undefined })} />
            </label>
            <label>
              Source Records JSON Array
              <textarea className="code-input" rows={8} value={sourceArrayDraft} onChange={(event) => setSourceArrayDraft(event.target.value)} />
            </label>
            <div className="button-row">
              <button type="button" className="button-secondary" disabled={!sourceMaterialKey} onClick={() => {
                try {
                  const record: MaterialSourceRecord = { ...sourceDraft, materialKey: sourceMaterialKey };
                  const existing = parseJsonValue<MaterialSourceRecord[]>("Source records", sourceArrayDraft);
                  setSourceArrayDraft(formatJson([...existing, record]));
                  setStatus("Draft source row appended. Save to persist.");
                  setError("");
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Append Structured Row</button>
              <button type="button" className="button-primary" disabled={!sourceMaterialKey} onClick={async () => {
                try {
                  const parsed = parseJsonValue<MaterialSourceRecord[]>("Source records", sourceArrayDraft);
                  await savePack(buildMaterialSourceRows(overridePack, sourceMaterialKey, parsed.map((row) => ({ ...row, materialKey: sourceMaterialKey }))));
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Material Sources</button>
              <button type="button" className="button-ghost" disabled={!sourceMaterialKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "materialSources", sourceMaterialKey));
              }}>Remove Material Sources</button>
            </div>
          </article>
        );
      case "recipes":
        return (
          <article className="panel">
            <h3>Crafting Recipe</h3>
            <label>
              Output Material Key
              <input className="text-input" value={recipeKey} onChange={(event) => setRecipeKey(event.target.value.trim())} />
            </label>
            <div className="two-column-grid">
              <label><span>Output Quantity</span><input type="number" min={1} value={recipeOutputQuantity} onChange={(event) => setRecipeOutputQuantity(Number(event.target.value) || 1)} /></label>
            </div>
            <label>
              Ingredients JSON
              <textarea className="code-input" rows={6} value={recipeIngredientsText} onChange={(event) => setRecipeIngredientsText(event.target.value)} />
            </label>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!recipeKey} onClick={async () => {
                try {
                  const value: CraftingRecipe = { outputMaterialKey: recipeKey, outputQuantity: recipeOutputQuantity, ingredients: parseJsonValue("Recipe ingredients", recipeIngredientsText) };
                  await savePack(upsertOverrideRecord(overridePack, "recipes", recipeKey, value));
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Recipe</button>
              <button type="button" className="button-ghost" disabled={!recipeKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "recipes", recipeKey));
              }}>Remove Recipe Override</button>
            </div>
          </article>
        );
      case "characterCore":
        return (
          <article className="panel">
            <h3>Universal Character Progression Core</h3>
            <p className="muted">Shared cumulative character level and ascension progression.</p>
            <textarea className="code-input" rows={18} value={universalCharacterCoreText} onChange={(event) => setUniversalCharacterCoreText(event.target.value)} />
            <div className="button-row">
              <button type="button" className="button-primary" onClick={async () => {
                try {
                  const parsed = parseJsonValue<UniversalCharacterProgressionCore>("Universal character progression core", universalCharacterCoreText);
                  const nextPack = createEditableOverridePack(overridePack);
                  await savePack({ ...nextPack, universalCharacterProgressionCore: parsed });
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Character Core Override</button>
            </div>
          </article>
        );
      case "talentCore":
        return (
          <article className="panel">
            <h3>Universal Talent Progression Core</h3>
            <p className="muted">One cumulative talent table applied per skill slot.</p>
            <textarea className="code-input" rows={18} value={universalTalentCoreText} onChange={(event) => setUniversalTalentCoreText(event.target.value)} />
            <div className="button-row">
              <button type="button" className="button-primary" onClick={async () => {
                try {
                  const parsed = parseJsonValue<UniversalTalentProgressionCore>("Universal talent progression core", universalTalentCoreText);
                  const nextPack = createEditableOverridePack(overridePack);
                  await savePack({ ...nextPack, universalTalentProgressionCore: parsed });
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Talent Core Override</button>
            </div>
          </article>
        );
      case "weaponCore":
        return (
          <article className="panel">
            <h3>Universal Weapon Progression Core</h3>
            <p className="muted">Rarity-based cumulative weapon progression totals.</p>
            <textarea className="code-input" rows={18} value={universalWeaponCoreText} onChange={(event) => setUniversalWeaponCoreText(event.target.value)} />
            <div className="button-row">
              <button type="button" className="button-primary" onClick={async () => {
                try {
                  const parsed = parseJsonValue<UniversalWeaponProgressionCore>("Universal weapon progression core", universalWeaponCoreText);
                  const nextPack = createEditableOverridePack(overridePack);
                  await savePack({ ...nextPack, universalWeaponProgressionCore: parsed });
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Weapon Core Override</button>
            </div>
          </article>
        );
      case "legacyCharacter":
        return (
          <article className="panel">
            <h3>Legacy Exact Character Progression</h3>
            <p className="muted">Compatibility-only exact progression fallback.</p>
            <label><span>Character Key</span><input className="text-input" value={characterProgressionKey} onChange={(event) => setCharacterProgressionKey(event.target.value.trim())} /></label>
            <label><span>Level Totals JSON</span><textarea className="code-input" rows={6} value={characterProgressionLevelText} onChange={(event) => setCharacterProgressionLevelText(event.target.value)} /></label>
            <label><span>Ascension Totals JSON</span><textarea className="code-input" rows={6} value={characterProgressionAscensionText} onChange={(event) => setCharacterProgressionAscensionText(event.target.value)} /></label>
            <label><span>Talent Totals JSON</span><textarea className="code-input" rows={6} value={characterProgressionTalentText} onChange={(event) => setCharacterProgressionTalentText(event.target.value)} /></label>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!characterProgressionKey} onClick={async () => {
                try {
                  const value: CharacterProgressionEntry = { key: characterProgressionKey, levelTotals: parseJsonValue("Character level totals", characterProgressionLevelText), ascensionTotals: parseJsonValue("Character ascension totals", characterProgressionAscensionText), talentTotals: parseJsonValue("Character talent totals", characterProgressionTalentText) };
                  await savePack(upsertOverrideRecord(overridePack, "legacyExactCharacterProgressions", characterProgressionKey, value));
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Legacy Character Progression</button>
              <button type="button" className="button-ghost" disabled={!characterProgressionKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "legacyExactCharacterProgressions", characterProgressionKey));
              }}>Remove Legacy Character Progression</button>
            </div>
          </article>
        );
      case "legacyWeapon":
        return (
          <article className="panel">
            <h3>Legacy Exact Weapon Progression</h3>
            <p className="muted">Compatibility-only exact weapon progression fallback.</p>
            <label><span>Weapon Key</span><input className="text-input" value={weaponProgressionKey} onChange={(event) => setWeaponProgressionKey(event.target.value.trim())} /></label>
            <label><span>Level Totals JSON</span><textarea className="code-input" rows={6} value={weaponProgressionLevelText} onChange={(event) => setWeaponProgressionLevelText(event.target.value)} /></label>
            <label><span>Ascension Totals JSON</span><textarea className="code-input" rows={6} value={weaponProgressionAscensionText} onChange={(event) => setWeaponProgressionAscensionText(event.target.value)} /></label>
            <div className="button-row">
              <button type="button" className="button-primary" disabled={!weaponProgressionKey} onClick={async () => {
                try {
                  const value: WeaponProgressionEntry = { key: weaponProgressionKey, levelTotals: parseJsonValue("Weapon level totals", weaponProgressionLevelText), ascensionTotals: parseJsonValue("Weapon ascension totals", weaponProgressionAscensionText) };
                  await savePack(upsertOverrideRecord(overridePack, "legacyExactWeaponProgressions", weaponProgressionKey, value));
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : String(nextError));
                }
              }}>Save Legacy Weapon Progression</button>
              <button type="button" className="button-ghost" disabled={!weaponProgressionKey} onClick={async () => {
                await savePack(removeOverrideRecord(overridePack, "legacyExactWeaponProgressions", weaponProgressionKey));
              }}>Remove Legacy Weapon Progression</button>
            </div>
          </article>
        );
      default:
        return <article className="panel"><p className="muted">Select a record to begin editing.</p></article>;
    }
  }

  const familyCount =
    Object.keys(staticData.elementGemFamilies).length +
    Object.keys(staticData.talentBookFamilies).length +
    Object.keys(staticData.generalEnemyDropFamilies).length +
    Object.keys(staticData.eliteEnemyDropFamilies).length +
    Object.keys(staticData.weaponAscensionFamilies).length +
    Object.keys(staticData.localSpecialties).length;
  const effectiveDatabaseRecordCount =
    Object.keys(staticData.characters).length + Object.keys(staticData.weapons).length + Object.keys(staticData.materials).length;

  return (
    <PageShell
      header={
        <PageHeader
          eyebrow="Database"
          title="Inspect and maintain static game data"
          description="Overview cards, focused browsers, health issues, and override tools are split into guided tabs so database work stays navigable instead of becoming one long mixed editor."
        />
      }
      metrics={
        <MetricStrip
          items={[
            { label: "Blocking", value: String(dataHealthModel.summary.blockingCount), tone: dataHealthModel.summary.blockingCount ? "warning" : "success" },
            { label: "Warnings", value: String(dataHealthModel.summary.warningCount), tone: dataHealthModel.summary.warningCount ? "warning" : "success" },
            { label: "Beta", value: String(dataHealthModel.summary.betaCount), tone: dataHealthModel.summary.betaCount ? "accent" : "default" },
            { label: "Materials", value: String(Object.keys(staticData.materials).length) },
            { label: "Characters", value: String(Object.keys(staticData.characters).length) },
            { label: "Weapons", value: String(Object.keys(staticData.weapons).length) },
            { label: "Recipes", value: String(Object.keys(staticData.recipes).length) },
          ]}
        />
      }
    >
      <WorkspaceTabs
        label="Database sections"
        activeTab={activeWorkspaceTab}
        onChange={setActiveWorkspaceTab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "release", label: "Release Update" },
          { key: "materialsFamilies", label: "Materials & Families" },
          { key: "assignments", label: "Character Assignments" },
          { key: "validation", label: "Validation & Export", count: changeSetValidationIssues.length + previewStaticDataHealthReport.summary.errorCount },
          { key: "dataHealth", label: "Data Health", count: dataHealthModel.summary.totalIssues },
          { key: "rawHealth", label: "Raw Issues", count: staticDataHealthReport.issues.length },
          { key: "legacy", label: "Legacy Overrides", count: overrideCounts },
        ]}
      />

      {activeWorkspaceTab === "overview" ? (
        <div className="database-overview-stack">
          {staticDataHealthReport.summary.errorCount ? (
            <WarningPanel title="Blocking static-data issues exist" tone="error">
              <p className="muted">
                {staticDataHealthReport.summary.errorCount} blocking error(s) are currently present. Open Data Health for compact guidance or Raw Issues for full validator details.
              </p>
            </WarningPanel>
          ) : null}
          <SectionCard title="Canonical update workbench" description="Use the new workflow-first path for patch maintenance, then fall back to Legacy Overrides only when you truly need raw record editing.">
            <div className="workspace-card-grid">
              <article className="metric-card">
                <span>Draft entries</span>
                <strong>{changeSetEntryCount}</strong>
              </article>
              <article className="metric-card">
                <span>Export files</span>
                <strong>{changeSetExportBundle.files.length}</strong>
              </article>
              <article className="metric-card">
                <span>Preview errors</span>
                <strong>{previewStaticDataHealthReport.summary.errorCount}</strong>
              </article>
              <article className="metric-card">
                <span>Preview warnings</span>
                <strong>{previewStaticDataHealthReport.summary.warningCount}</strong>
              </article>
            </div>
            <p className="muted">
              The workbench compiles structured drafts into a preview override pack and canonical-ready export bundle so new weekly bosses,
              materials, and character assignments can be maintained without hopping across unrelated raw editors.
            </p>
          </SectionCard>
          <SectionCard title="Needs review by area" description="Start with the sections carrying the most active warning load instead of browsing the whole database.">
            <div className="workspace-card-grid">
              <article className="metric-card">
                <span>Characters</span>
                <strong>{dataHealthOverviewCounts.characters.warnings}</strong>
                <small>{dataHealthOverviewCounts.characters.beta} beta / {dataHealthOverviewCounts.characters.ignored} ignored</small>
              </article>
              <article className="metric-card">
                <span>Weapons</span>
                <strong>{dataHealthOverviewCounts.weapons.warnings}</strong>
                <small>{dataHealthOverviewCounts.weapons.beta} beta / {dataHealthOverviewCounts.weapons.ignored} ignored</small>
              </article>
              <article className="metric-card">
                <span>Materials</span>
                <strong>{dataHealthOverviewCounts.materials.warnings}</strong>
                <small>{dataHealthOverviewCounts.materials.beta} beta / {dataHealthOverviewCounts.materials.ignored} ignored</small>
              </article>
            </div>
          </SectionCard>
          <DatabaseHomeCoverage
            coverage={coverageModel}
            healthReport={staticDataHealthReport}
            onOpenItem={(item) => {
              if (item.section === "profiles") {
                setActiveWorkspaceTab("assignments");
              } else if (item.section === "families") {
                setActiveWorkspaceTab("materialsFamilies");
              } else if (item.section === "sources") {
                setActiveWorkspaceTab("materialsFamilies");
              }
              openCoverageItem(item);
            }}
          />
        </div>
      ) : null}

      {(["release", "materialsFamilies", "assignments", "validation"] as DatabaseWorkbenchView[]).includes(activeWorkspaceTab as DatabaseWorkbenchView) ? (
        <DatabaseWorkbench
          view={activeWorkspaceTab as DatabaseWorkbenchView}
          account={account}
          staticData={staticData}
          previewStaticData={previewStaticData}
          previewOverridePack={previewOverridePack}
          changeSet={changeSet}
          onChangeSetChange={setChangeSet}
          validationIssues={changeSetValidationIssues}
          previewHealthReport={previewStaticDataHealthReport}
          exportBundle={changeSetExportBundle}
        />
      ) : null}

      {activeWorkspaceTab === "dataHealth" ? (
        <DataHealthCenter model={dataHealthModel} onOpenIssue={openDataHealthIssue} />
      ) : null}

      {activeWorkspaceTab === "rawHealth" ? (
        <div className="database-overview-stack">
          <SectionCard title="Health fix queue" description="The raw validator table stays available here for developer-style cleanup and exact category tracing.">
            <div className="workspace-card-grid">
              {healthFixQueue.map((group) => (
                <article key={group.key} className="metric-card">
                  <span>{group.title}</span>
                  <strong>{group.issues.length}</strong>
                  <small>{group.plannerImpactingCount} planner-impacting</small>
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Static data health issues" description="Filter the validator output by severity, category, planner impact, and review state before jumping into the relevant database editor tab.">
            <FilterToolbar
              actions={
                <div className="badge-row">
                  <StatusBadge tone={staticDataHealthReport.summary.errorCount ? "warning" : "success"}>
                    {staticDataHealthReport.summary.errorCount} errors
                  </StatusBadge>
                  <StatusBadge tone={staticDataHealthReport.summary.warningCount ? "warning" : "success"}>
                    {staticDataHealthReport.summary.warningCount} warnings
                  </StatusBadge>
                </div>
              }
            >
              <label>
                Search
                <input
                  className="text-input"
                  value={rawHealthSearch}
                  onChange={(event) => setRawHealthSearch(event.target.value)}
                  placeholder="Search entity, message, or suggested fix"
                />
              </label>
              <label>
                Severity
                <select
                  value={rawHealthSeverityFilter}
                  onChange={(event) => setRawHealthSeverityFilter(event.target.value as typeof rawHealthSeverityFilter)}
                >
                  <option value="all">All severities</option>
                  <option value="error">Errors</option>
                  <option value="warning">Warnings</option>
                  <option value="info">Info</option>
                </select>
              </label>
              <label>
                Category
                <select value={rawHealthCategoryFilter} onChange={(event) => setRawHealthCategoryFilter(event.target.value)}>
                  {healthCategories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All categories" : category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={showProblemsOnly} onChange={(event) => setShowProblemsOnly(event.target.checked)} />
                Show errors and warnings only
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={showPlannerImpactingOnly} onChange={(event) => setShowPlannerImpactingOnly(event.target.checked)} />
                Planner-impacting only
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={showManualReviewOnly} onChange={(event) => setShowManualReviewOnly(event.target.checked)} />
                Manual-review only
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={showIgnoredOnly} onChange={(event) => setShowIgnoredOnly(event.target.checked)} />
                Ignored only
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={showGeneratedOnly} onChange={(event) => setShowGeneratedOnly(event.target.checked)} />
                Generated-data only
              </label>
            </FilterToolbar>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Category</th>
                    <th>Planner impact</th>
                    <th>Entity</th>
                    <th>Message</th>
                    <th>Suggested fix</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDataHealthIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td>{issue.severity}</td>
                      <td>{issue.subCategory ?? issue.category}</td>
                      <td>{issue.plannerImpact ?? "low"}</td>
                      <td>{issue.entityName ?? issue.entityKey ?? "Unknown"}</td>
                      <td>{issue.message}</td>
                      <td>{issue.suggestedFix ?? "—"}</td>
                      <td>
                        {issue.entityKey ? (
                          <button
                            type="button"
                            className="button-ghost"
                            aria-label={`Open ${issue.entityName ?? issue.entityKey} in database editor`}
                            onClick={() => openHealthIssue(issue)}
                          >
                            Open
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                  {!filteredDataHealthIssues.length ? (
                    <tr>
                      <td colSpan={7}>No data issues match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <SectionCard title="Repository hygiene" description="Environment and working-tree findings stay visible here without crowding the main data fix queue.">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Entity</th>
                    <th>Message</th>
                    <th>Suggested fix</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepositoryHygieneIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td>{issue.severity}</td>
                      <td>{issue.entityName ?? issue.entityKey ?? "Unknown"}</td>
                      <td>{issue.message}</td>
                      <td>{issue.suggestedFix ?? "—"}</td>
                    </tr>
                  ))}
                  {!filteredRepositoryHygieneIssues.length ? (
                    <tr>
                      <td colSpan={4}>No repository hygiene issues match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeWorkspaceTab === "legacy" ? (
        <div className="workspace-card-grid settings-overview-grid">
          <SectionCard title="Override pack controls" description="Override packs remain the safe place to patch database records without changing bundled runtime data.">
            <label>
              Override pack label
              <input className="text-input" value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} />
            </label>
            <div className="button-row wrap">
              <button
                type="button"
                className="button-primary"
                onClick={async () => {
                  await savePack(setOverridePackLabel(overridePack, labelDraft));
                }}
              >
                Save Label
              </button>
              <button
                type="button"
                className="button-ghost button-destructive"
                onClick={async () => {
                  await clearOverridePack();
                  setStatus("Override database cleared.");
                  setError("");
                }}
              >
                Clear Database Overrides
              </button>
            </div>
            {status ? <p className="muted">{status}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </SectionCard>
          <SectionCard title="Coverage snapshot" description="Use Database detail tabs for focused editing once you know which record family needs attention.">
            <ul className="ranked-list">
              <li>
                <strong>Effective database records</strong>
                <span>{effectiveDatabaseRecordCount}</span>
              </li>
              <li>
                <strong>Shared families</strong>
                <span>{familyCount}</span>
              </li>
              <li>
                <strong>Override entries</strong>
                <span>{overrideCounts}</span>
              </li>
              <li>
                <strong>Imported account coverage</strong>
                <span>{account ? `${account.characters.length} chars / ${account.weapons.length} weapons` : "No GOOD import yet"}</span>
              </li>
            </ul>
          </SectionCard>
        </div>
      ) : null}

      {activeWorkspaceTab === "legacy" ? (
        <DatabaseWorkspaceShell
          account={account}
          effectiveDatabaseRecordCount={effectiveDatabaseRecordCount}
          familyCount={familyCount}
          overrideCounts={overrideCounts}
          sections={DATABASE_SECTIONS}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          labelDraft={labelDraft}
          onLabelDraftChange={setLabelDraft}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          onSaveLabel={async () => {
            await savePack(setOverridePackLabel(overridePack, labelDraft));
          }}
          onClearOverrides={async () => {
            await clearOverridePack();
            setStatus("Override database cleared.");
            setError("");
          }}
          activeEntityOptions={activeEntityOptions}
          activeEntityType={activeEntityType}
          onSelectEntityType={(entityType) => setActiveEntityType(entityType as DatabaseEntityType)}
          globalResults={globalResults}
          onUseSearchResult={handleSearchResult}
          entityQueue={renderEntityQueue()}
          browser={activeBrowserConfig}
          selectedKey={getSelectedRecordKey()}
          onSelectRecord={(key) => {
            if (
              activeSection === "advanced" &&
              ["characterCore", "talentCore", "weaponCore", "legacyCharacter", "legacyWeapon"].includes(key)
            ) {
              setActiveEntityType(key as DatabaseEntityType);
              return;
            }
            setSelectedRecordKey(key);
          }}
          selectedRow={selectedRow}
          status={status}
          error={error}
          showSectionTabs={false}
          workspaceNotice={
            activeSection === "advanced" ? (
              <article className="panel database-advanced-warning">
                <h3>Advanced Mode</h3>
                <p className="muted">
                  These records are shared universal cores or compatibility-only legacy fallbacks. Guided profile editors should stay the default path
                  for day-to-day maintenance.
                </p>
              </article>
            ) : undefined
          }
          editor={renderActiveEditor()}
        />
      ) : null}

      <datalist id="database-material-keys">
        {materialOptions.map((material) => (
          <option key={material.key} value={material.key}>
            {material.displayName}
          </option>
        ))}
      </datalist>
    </PageShell>
  );
}
