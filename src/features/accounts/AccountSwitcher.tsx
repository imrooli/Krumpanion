import { useMemo } from "react";
import { getAccountOrder, selectActiveAccount } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

export function AccountSwitcher() {
  const activeAccount = useAppStore(selectActiveAccount);
  const user = useAppStore((state) => state.user);
  const switchAccount = useAppStore((state) => state.switchAccount);
  const createAccount = useAppStore((state) => state.createAccount);
  const renameAccount = useAppStore((state) => state.renameAccount);
  const duplicateAccount = useAppStore((state) => state.duplicateAccount);
  const deleteAccount = useAppStore((state) => state.deleteAccount);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const accounts = useMemo(() => getAccountOrder(user), [user]);

  if (!activeAccount) {
    return null;
  }

  return (
    <article className="top-utility-pill top-utility-pill-wide">
      <span>Account</span>
      <div className="account-switcher">
        <select
          aria-label="Active account"
          value={activeAccount.id}
          onChange={(event) => {
            void switchAccount(event.target.value);
          }}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <small>
          {activeAccount.metadata.serverRegion ?? "unknown"}
          {activeAccount.importState.lastGoodImportAt
            ? ` - imported ${new Date(activeAccount.importState.lastGoodImportAt).toLocaleDateString()}`
            : " - no GOOD import"}
        </small>
        <div className="button-row wrap">
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              const name = window.prompt("New account name", `Account ${accounts.length + 1}`);
              if (!name) {
                return;
              }
              void createAccount({ name });
            }}
          >
            New
          </button>
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              const name = window.prompt("Rename account", activeAccount.name);
              if (!name) {
                return;
              }
              void renameAccount(activeAccount.id, name);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              const name = window.prompt("Duplicate account as", `${activeAccount.name} copy`);
              void duplicateAccount(activeAccount.id, name ?? undefined);
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="button-ghost"
            onClick={() => {
              const confirmed = window.confirm(`Delete account "${activeAccount.name}"?`);
              if (!confirmed) {
                return;
              }
              void deleteAccount(activeAccount.id);
            }}
          >
            Delete
          </button>
          <button type="button" className="button-secondary" onClick={() => void setActiveTab("inventory")}>
            Import GOOD
          </button>
        </div>
      </div>
    </article>
  );
}
