import { useState } from "react";
import { GoodImportPanel } from "../import/GoodImportPanel";
import { selectSaveSummary } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

export function ImportExportTab() {
  const exportSaveFile = useAppStore((state) => state.exportSaveFile);
  const importSaveFile = useAppStore((state) => state.importSaveFile);
  const saveSummary = useAppStore(selectSaveSummary);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");

  return (
    <section className="stack">
      <GoodImportPanel />

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Krumpanion Save File</h2>
            <p>Export and import the full internal save model, including account state, goals, settings, and override data.</p>
          </div>
        </div>

        <ul className="warning-list">
          <li>Schema version: {saveSummary.schemaVersion}</li>
          <li>App version: {saveSummary.appVersion}</li>
          <li>Created: {saveSummary.createdAt}</li>
          <li>Updated: {saveSummary.updatedAt}</li>
        </ul>

        <div className="button-row">
          <button
            type="button"
            className="button-secondary"
            onClick={async () => {
              const exported = await exportSaveFile();
              setDraft(exported);
              setStatus("Save file exported into the editor.");
            }}
          >
            Export Save
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={async () => {
              await importSaveFile(draft);
              setStatus("Save file imported.");
            }}
          >
            Import Save
          </button>
        </div>

        <textarea className="code-input" rows={16} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <p className="muted">{status}</p>
      </section>
    </section>
  );
}
