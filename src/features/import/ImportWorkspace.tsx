import type { ImportWarning } from "../../domain/good/types";
import { PageHeader, StatusBadge } from "../../app/layoutPrimitives";
import { selectActiveAccount } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { GoodImportPanel } from "./GoodImportPanel";

interface ImportWorkspaceProps {
  importWarnings: ImportWarning[];
}

export function ImportWorkspace({ importWarnings }: ImportWorkspaceProps) {
  const account = useAppStore(selectActiveAccount);

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Utilities"
        title="Import Inventory"
        description="Load a GOOD snapshot, review parsing status, and keep onboarding separate from daily planning surfaces."
      />
      <div className="utility-grid">
        <GoodImportPanel />
        <article className="panel">
          <h2>Import Status</h2>
          <div className="stack">
            <div className="badge-row">
              <StatusBadge tone={account ? "success" : "warning"}>{account ? "Snapshot loaded" : "No snapshot"}</StatusBadge>
              <StatusBadge tone={importWarnings.length ? "warning" : "success"}>
                {importWarnings.length ? `${importWarnings.length} warning(s)` : "No warnings"}
              </StatusBadge>
            </div>
            <div className="muted">
              Active account: <strong>{account?.name ?? "No account"}</strong>
            </div>
            <ul className="ranked-list">
              <li>
                <strong>Characters</strong>
                <span>{account?.characters.length ?? 0}</span>
              </li>
              <li>
                <strong>Weapons</strong>
                <span>{account?.weapons.length ?? 0}</span>
              </li>
              <li>
                <strong>Artifacts</strong>
                <span>{account?.artifacts.length ?? 0}</span>
              </li>
              <li>
                <strong>Material keys</strong>
                <span>{Object.keys(account?.inventory ?? {}).length}</span>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
