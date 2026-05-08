import { useState } from "react";
import type { ImportWarning } from "../../domain/good/types";
import type { PlannerWarning } from "../../domain/planner/types";
import { selectSaveSummary } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

interface SettingsDataTabProps {
  importWarnings: ImportWarning[];
  overrideWarnings: PlannerWarning[];
  plannerWarnings: PlannerWarning[];
}

export function SettingsDataTab({ importWarnings, overrideWarnings, plannerWarnings }: SettingsDataTabProps) {
  const overrideText = useAppStore((state) => state.overrideText);
  const staticData = useAppStore((state) => state.staticData);
  const importOverrideText = useAppStore((state) => state.importOverrideText);
  const clearOverridePack = useAppStore((state) => state.clearOverridePack);
  const saveSummary = useAppStore(selectSaveSummary);
  const [draft, setDraft] = useState(overrideText);
  const [status, setStatus] = useState("");

  return (
    <section className="settings-grid">
      <div className="panel">
        <h2>Override Pack</h2>
        <p>Use override packs to add future characters or materials without waiting for a bundled data update.</p>
        <textarea className="code-input" rows={12} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <div className="button-row">
          <button
            type="button"
            className="button-primary"
            onClick={async () => {
              await importOverrideText(draft);
              setStatus("Override pack imported.");
            }}
          >
            Save Override Pack
          </button>
          <button
            type="button"
            className="button-ghost"
            onClick={async () => {
              await clearOverridePack();
              setDraft("");
              setStatus("Override pack cleared.");
            }}
          >
            Clear Override Pack
          </button>
        </div>
        <p className="muted">{status}</p>
      </div>
      <div className="panel">
        <h2>Data Coverage</h2>
        <ul className="warning-list">
          <li>{Object.keys(staticData.characters).length} bundled characters</li>
          <li>{Object.keys(staticData.materials).length} bundled materials</li>
          <li>{Object.keys(staticData.characterMaterialProfiles).length} character profiles</li>
          <li>{Object.keys(staticData.weaponMaterialProfiles).length} weapon profiles</li>
          <li>
            {Object.keys(staticData.elementGemFamilies).length +
              Object.keys(staticData.talentBookFamilies).length +
              Object.keys(staticData.enemyDropFamilies).length +
              Object.keys(staticData.weaponAscensionFamilies).length}{" "}
            shared progression families
          </li>
          <li>Save schema v{saveSummary.schemaVersion}</li>
          <li>App version {saveSummary.appVersion}</li>
          <li>{staticData.appliedOverrideKeys.length} override keys applied</li>
        </ul>
      </div>

      <div className="panel">
        <h2>Warnings</h2>
        <ul className="warning-list">
          {importWarnings.map((warning) => (
            <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
          ))}
          {overrideWarnings.map((warning) => (
            <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
          ))}
          {plannerWarnings.map((warning) => (
            <li key={`${warning.type}-${warning.key ?? warning.message}`}>{warning.message}</li>
          ))}
          {importWarnings.length + overrideWarnings.length + plannerWarnings.length === 0 ? <li>No warnings.</li> : null}
        </ul>
      </div>
    </section>
  );
}
