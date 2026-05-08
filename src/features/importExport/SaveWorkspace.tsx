import { useMemo, useState } from "react";
import { PageHeader } from "../../app/layoutPrimitives";
import { getAccountOrder, selectActiveAccount, selectSaveSummary } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

export function SaveWorkspace({ embedded = false }: { embedded?: boolean }) {
  const exportSaveFile = useAppStore((state) => state.exportSaveFile);
  const importSaveFile = useAppStore((state) => state.importSaveFile);
  const exportAccount = useAppStore((state) => state.exportAccount);
  const importAccount = useAppStore((state) => state.importAccount);
  const activeAccount = useAppStore(selectActiveAccount);
  const user = useAppStore((state) => state.user);
  const saveSummary = useAppStore(selectSaveSummary);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [accountDraft, setAccountDraft] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const accounts = useMemo(() => getAccountOrder(user), [user]);
  const selectedId = selectedAccountId || activeAccount?.id || accounts[0]?.id || "";

  return (
    <section className="workspace-page">
      {!embedded ? (
        <PageHeader
          eyebrow="Settings"
          title="Backup and restore"
          description="Inspect the save snapshot, export the full internal state, or import a previously exported Krumpanion save."
        />
      ) : null}
      <div className="utility-grid">
        <article className="panel">
          <h2>Save metadata</h2>
          <ul className="ranked-list">
            <li>
              <strong>Schema version</strong>
              <span>{saveSummary.schemaVersion}</span>
            </li>
            <li>
              <strong>App version</strong>
              <span>{saveSummary.appVersion}</span>
            </li>
            <li>
              <strong>Created</strong>
              <span>{saveSummary.createdAt}</span>
            </li>
            <li>
              <strong>Updated</strong>
              <span>{saveSummary.updatedAt}</span>
            </li>
            <li>
              <strong>Accounts</strong>
              <span>{saveSummary.accountCount}</span>
            </li>
            <li>
              <strong>Active account</strong>
              <span>{saveSummary.activeAccountName}</span>
            </li>
          </ul>
          <div className="button-row wrap">
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
          <p className="muted">{status}</p>
        </article>

        <article className="panel">
          <h2>Full backup editor</h2>
          <textarea className="code-input" rows={20} value={draft} onChange={(event) => setDraft(event.target.value)} />
        </article>

        <article className="panel">
          <h2>Single account backup</h2>
          <label>
            Account
            <select value={selectedId} onChange={(event) => setSelectedAccountId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row wrap">
            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                const exported = await exportAccount(selectedId);
                setAccountDraft(JSON.stringify(exported, null, 2));
                setStatus("Account export loaded into the editor.");
              }}
            >
              Export Account
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={async () => {
                const imported = JSON.parse(accountDraft) as unknown;
                await importAccount(imported);
                setStatus("Account imported as a new account.");
              }}
            >
              Import Account
            </button>
          </div>
          <textarea
            className="code-input"
            rows={14}
            value={accountDraft}
            onChange={(event) => setAccountDraft(event.target.value)}
          />
        </article>
      </div>
    </section>
  );
}
