import { type ChangeEvent, useRef, useState } from "react";
import exampleGood from "../../../examples/good.minimal.example.json";
import { selectActiveAccount } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

export function GoodImportPanel() {
  const importGoodText = useAppStore((state) => state.importGoodText);
  const importErrors = useAppStore((state) => state.importErrors);
  const importWarnings = useAppStore((state) => state.importWarnings);
  const account = useAppStore(selectActiveAccount);
  const updates = useAppStore(state => state.gameDataUpdates);
  const unknowns = Object.values(updates.discoveries).filter(row => row.accountIds.includes(account?.id ?? "") && row.status !== "ignored" && Date.parse(row.lastSeen) >= Date.parse(account?.importState.lastGoodImportAt ?? account?.importMeta.importedAt ?? "1970-01-01"));
  const [draft, setDraft] = useState("");
  const [importAsNewAccount, setImportAsNewAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setDraft(text);
    await importGoodText(text, {
      asNewAccount: importAsNewAccount,
      fileName: file.name,
      source: "file",
    });
  }

  return (
    <section className="panel import-panel">
      <div className="section-header">
        <div>
          <h2>Import GOOD Inventory</h2>
          <p>
            Import into <strong>{account?.name ?? "the active account"}</strong>, or create a new account from the snapshot.
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setImportAsNewAccount(false);
              fileInputRef.current?.click();
            }}
          >
            Choose GOOD File
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setImportAsNewAccount(true);
              fileInputRef.current?.click();
            }}
          >
            Import as New Account
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              const text = JSON.stringify(exampleGood, null, 2);
              setDraft(text);
              void importGoodText(text, {
                asNewAccount: importAsNewAccount,
                source: "manual",
              });
            }}
          >
            Load Example
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              void importGoodText(draft, {
                asNewAccount: importAsNewAccount,
                source: "paste",
              });
            }}
          >
            {importAsNewAccount ? "Parse Text as New Account" : "Parse Text"}
          </button>
        </div>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={importAsNewAccount}
          onChange={(event) => setImportAsNewAccount(event.target.checked)}
        />
        Create a new account from this import
      </label>
      <input ref={fileInputRef} hidden type="file" accept=".json,application/json" onChange={handleFileChange} />
      <textarea
        className="code-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Paste a GOOD JSON export here."
        rows={10}
      />
      {unknowns.length > 0 && <div className="panel" role="status">
        <strong>{updates.status === "updated" ? "Game database updated" : "New game data detected"}</strong>
        <p>{updates.status === "checking" || updates.status === "downloading" ? "Checking the live game database..." : `${unknowns.filter(row => row.status !== "resolved").length} unresolved entities preserved for review.`}</p>
        {updates.error && <p>{updates.error}</p>}
        {updates.lastDelta && <p>Game records: {updates.lastDelta.added} added, {updates.lastDelta.changed} updated.</p>}
        <button type="button" className="button-secondary" onClick={() => { useAppStore.setState({ databaseFocus: "farmingSetup" }); void useAppStore.getState().setActiveTab("database"); }}>Configure Farming Data</button>
      </div>}
      <div className="import-status">
        <div>
          <strong>Active account snapshot:</strong>{" "}
          {account ? `${account.characters.length} characters, ${account.weapons.length} weapons, ${Object.keys(account.inventory).length} material keys` : "No import loaded yet."}
        </div>
        <div className="muted">
          Re-importing GOOD into <strong>{account?.name ?? "the active account"}</strong> replaces that account&apos;s imported inventory and may overwrite manual quantity edits.
        </div>
        {importErrors.length ? (
          <ul className="warning-list">
            {importErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        {importWarnings.length ? (
          <ul className="warning-list">
            {importWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
