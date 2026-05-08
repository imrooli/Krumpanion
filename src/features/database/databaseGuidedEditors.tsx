import type { ReactNode } from "react";
import {
  type CharacterProfileEditorState,
  type CharacterProfileResolvedPreview,
  type WeaponProfileEditorState,
  type WeaponProfileResolvedPreview,
} from "./databaseProfileHelpers";
import { SelectField } from "./databaseShared";

function PreviewGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value?: string }>;
}) {
  return (
    <div className="database-preview-card">
      <strong>{title}</strong>
      <ul className="database-preview-list">
        {rows.map((row) => (
          <li key={`${title}-${row.label}`}>
            <span>{row.label}</span>
            <code>{row.value || "Unresolved"}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResolvedMaterialPreview({
  title,
  groups,
}: {
  title: string;
  groups: Array<{ title: string; rows: Array<{ label: string; value?: string }> }>;
}) {
  return (
    <article className="panel">
      <h3>{title}</h3>
      <p className="muted">Universal progression quantities stay read-only here. This editor only controls material identity.</p>
      <div className="database-preview-grid">
        {groups.map((group) => (
          <PreviewGroup key={group.title} title={group.title} rows={group.rows} />
        ))}
      </div>
    </article>
  );
}

export function ProfileValidationPanel({
  title,
  statusBadge,
  missingFields,
  errors,
  warnings,
  unresolvedReferences,
  extra,
}: {
  title: string;
  statusBadge: string;
  missingFields: string[];
  errors: string[];
  warnings: string[];
  unresolvedReferences?: Array<{ materialSlot: string; rawName: string; reason: string }>;
  extra?: ReactNode;
}) {
  return (
    <article className="panel">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">Guided editors block saves on invalid identity fields and keep unresolved references visible.</p>
        </div>
        <span className="mini-badge">{statusBadge}</span>
      </div>
      <div className="database-validation-grid">
        <div>
          <strong>Missing required fields</strong>
          {missingFields.length ? (
            <ul className="warning-list">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No required identity fields are missing.</p>
          )}
        </div>
        <div>
          <strong>Blocking issues</strong>
          {errors.length ? (
            <ul className="warning-list">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No blocking validation errors.</p>
          )}
        </div>
        <div>
          <strong>Warnings</strong>
          {warnings.length ? (
            <ul className="warning-list">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No warnings.</p>
          )}
        </div>
      </div>
      {unresolvedReferences?.length ? (
        <div className="database-validation-detail">
          <strong>Unresolved source references</strong>
          <ul className="warning-list">
            {unresolvedReferences.map((reference) => (
              <li key={`${reference.materialSlot}-${reference.rawName}`}>
                {reference.materialSlot}: {reference.rawName} ({reference.reason})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {extra}
    </article>
  );
}

function characterPreviewGroups(preview: CharacterProfileResolvedPreview) {
  return [
    {
      title: "Gem Family",
      rows: [
        { label: "Sliver", value: preview.gems.sliver },
        { label: "Fragment", value: preview.gems.fragment },
        { label: "Chunk", value: preview.gems.chunk },
        { label: "Gemstone", value: preview.gems.gemstone },
      ],
    },
    {
      title: "Common Enemy Family",
      rows: [
        { label: "Tier 1", value: preview.commonEnemy[1] },
        { label: "Tier 2", value: preview.commonEnemy[2] },
        { label: "Tier 3", value: preview.commonEnemy[3] },
      ],
    },
    {
      title: "Talent Book Series",
      rows: [
        { label: "Teachings", value: preview.talentBooks.teachings },
        { label: "Guide", value: preview.talentBooks.guide },
        { label: "Philosophies", value: preview.talentBooks.philosophies },
      ],
    },
  ];
}

function weaponPreviewGroups(preview: WeaponProfileResolvedPreview) {
  return [
    {
      title: "Weapon Ascension Family",
      rows: [
        { label: "Tier 1", value: preview.weaponAscension.tier1 },
        { label: "Tier 2", value: preview.weaponAscension.tier2 },
        { label: "Tier 3", value: preview.weaponAscension.tier3 },
        { label: "Tier 4", value: preview.weaponAscension.tier4 },
      ],
    },
    {
      title: "Elite Enemy Family",
      rows: [
        { label: "Low", value: preview.eliteEnemy.low },
        { label: "Mid", value: preview.eliteEnemy.mid },
        { label: "High", value: preview.eliteEnemy.high },
      ],
    },
    {
      title: "Common Enemy Family",
      rows: [
        { label: "Low", value: preview.commonEnemy.low },
        { label: "Mid", value: preview.commonEnemy.mid },
        { label: "High", value: preview.commonEnemy.high },
      ],
    },
  ];
}

export function CharacterProfileEditor({
  state,
  availableGemFamilies,
  availableNormalBossMaterials,
  availableCommonEnemyFamilies,
  availableLocalSpecialties,
  availableTalentBookSeries,
  onChange,
  onSave,
  onRemove,
}: {
  state: CharacterProfileEditorState;
  availableGemFamilies: readonly string[];
  availableNormalBossMaterials: readonly string[];
  availableCommonEnemyFamilies: readonly string[];
  availableLocalSpecialties: readonly string[];
  availableTalentBookSeries: readonly string[];
  onChange: (patch: Partial<CharacterProfileEditorState>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const saveBlocked = state.validation.errors.length > 0 || (state.profileStatus !== "manual_review" && state.validation.missingFields.length > 0);

  return (
    <div className="database-editor-stack">
      <article className="panel">
        <div className="section-header">
          <div>
            <h3>{state.displayName}</h3>
            <p className="muted">Character material identity card. Quantities come from the universal character and talent progression cores.</p>
          </div>
          <span className="mini-badge">{state.profileStatus.replace("_", " ")}</span>
        </div>
        <div className="badge-row">
          {state.element ? <span className="mini-badge">{state.element}</span> : null}
          {state.weaponType ? <span className="mini-badge">{state.weaponType}</span> : null}
          {state.rarity ? <span className="mini-badge">{state.rarity} star</span> : null}
          {state.region ? <span className="mini-badge">{state.region}</span> : null}
          <span className="mini-badge">{state.characterKey}</span>
        </div>
      </article>

      <article className="panel">
        <h3>Ascension Identity</h3>
        <div className="two-column-grid">
          <SelectField
            label="Gem Family"
            value={state.gemFamilyKey}
            options={availableGemFamilies}
            onChange={(value) => onChange({ gemFamilyKey: value })}
          />
          <SelectField
            label="Normal Boss Material"
            value={state.normalBossMaterialKey}
            options={availableNormalBossMaterials}
            onChange={(value) => onChange({ normalBossMaterialKey: value })}
          />
          <SelectField
            label="Common Enemy Family"
            value={state.commonEnemyMaterialFamilyId}
            options={availableCommonEnemyFamilies}
            onChange={(value) => onChange({ commonEnemyMaterialFamilyId: value })}
          />
          <SelectField
            label="Local Specialty"
            value={state.localSpecialtyKey}
            options={availableLocalSpecialties}
            onChange={(value) => onChange({ localSpecialtyKey: value })}
          />
        </div>
      </article>

      <article className="panel">
        <h3>Talent Identity</h3>
        <div className="two-column-grid">
          <SelectField
            label="Talent Book Series"
            value={state.talentBookSeriesKey}
            options={availableTalentBookSeries}
            onChange={(value) => onChange({ talentBookSeriesKey: value })}
          />
          <label>
            Weekly Boss Material
            <input
              className="text-input"
              list="database-material-keys"
              value={state.weeklyBossMaterialKey}
              onChange={(event) => onChange({ weeklyBossMaterialKey: event.target.value.trim() })}
            />
          </label>
        </div>
      </article>

      <ProfileValidationPanel
        title="Validation"
        statusBadge={state.profileStatus.replace("_", " ")}
        missingFields={state.validation.missingFields}
        errors={state.validation.errors}
        warnings={state.validation.warnings}
        unresolvedReferences={state.validation.unresolvedReferences}
      />

      <ResolvedMaterialPreview title="Resolved Material Preview" groups={characterPreviewGroups(state.preview)} />

      <div className="button-row">
        <button type="button" className="button-primary" disabled={saveBlocked || !state.characterKey} onClick={onSave}>
          Save Character Profile
        </button>
        <button type="button" className="button-ghost" disabled={!state.characterKey} onClick={onRemove}>
          Remove Character Profile Override
        </button>
      </div>
    </div>
  );
}

export function WeaponProfileEditor({
  state,
  availableWeaponAscensionFamilies,
  availableEliteEnemyFamilies,
  availableCommonEnemyFamilies,
  onChange,
  onSave,
  onRemove,
}: {
  state: WeaponProfileEditorState;
  availableWeaponAscensionFamilies: readonly string[];
  availableEliteEnemyFamilies: readonly string[];
  availableCommonEnemyFamilies: readonly string[];
  onChange: (patch: Partial<WeaponProfileEditorState>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const saveBlocked = state.validation.errors.length > 0 || state.validation.missingFields.length > 0;

  return (
    <div className="database-editor-stack">
      <article className="panel">
        <div className="section-header">
          <div>
            <h3>{state.displayName}</h3>
            <p className="muted">Weapon identity editor. Universal weapon progression cores still own the quantity tables.</p>
          </div>
          <span className="mini-badge">{state.profileStatus.replace("_", " ")}</span>
        </div>
        <div className="two-column-grid">
          <SelectField
            label="Weapon Type"
            value={state.weaponType ?? ""}
            options={["Sword", "Claymore", "Polearm", "Bow", "Catalyst"] as const}
            onChange={(value) => onChange({ weaponType: value || undefined })}
          />
          <label>
            Rarity
            <select value={state.rarity?.toString() ?? ""} onChange={(event) => onChange({ rarity: event.target.value ? Number(event.target.value) as 1 | 2 | 3 | 4 | 5 : undefined })}>
              <option value="">Unset</option>
              {[1, 2, 3, 4, 5].map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity} star
                </option>
              ))}
            </select>
          </label>
        </div>
      </article>

      <article className="panel">
        <h3>Ascension Identity</h3>
        <div className="two-column-grid">
          <SelectField
            label="Weapon Ascension Family"
            value={state.weaponAscensionFamilyKey}
            options={availableWeaponAscensionFamilies}
            onChange={(value) => onChange({ weaponAscensionFamilyKey: value })}
          />
          <SelectField
            label="Elite Enemy Family"
            value={state.eliteEnemyDropFamilyId}
            options={availableEliteEnemyFamilies}
            onChange={(value) => onChange({ eliteEnemyDropFamilyId: value })}
          />
          <SelectField
            label="Common Enemy Family"
            value={state.commonEnemyMaterialFamilyId}
            options={availableCommonEnemyFamilies}
            onChange={(value) => onChange({ commonEnemyMaterialFamilyId: value })}
          />
        </div>
      </article>

      <ProfileValidationPanel
        title="Validation"
        statusBadge={state.profileStatus.replace("_", " ")}
        missingFields={state.validation.missingFields}
        errors={state.validation.errors}
        warnings={state.validation.warnings}
      />

      <ResolvedMaterialPreview title="Resolved Material Preview" groups={weaponPreviewGroups(state.preview)} />

      <div className="button-row">
        <button type="button" className="button-primary" disabled={saveBlocked || !state.weaponKey} onClick={onSave}>
          Save Weapon Profile
        </button>
        <button type="button" className="button-ghost" disabled={!state.weaponKey} onClick={onRemove}>
          Remove Weapon Profile Override
        </button>
      </div>
    </div>
  );
}
