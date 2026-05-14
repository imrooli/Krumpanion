import { useEffect, useState } from "react";
import { APP_SECTIONS } from "./navigationRegistry";
import { AccountSwitcher } from "../features/accounts/AccountSwitcher";
import { selectActiveAccount, selectActiveGoals } from "../store/selectors";
import { selectInventoryWarnings, selectOverrideWarnings, selectPlannerOutput } from "../store/selectors";
import { useAppStore } from "../store/useAppStore";

export function AppShell() {
  const account = useAppStore(selectActiveAccount);
  const settings = useAppStore((state) => state.settings);
  const goals = useAppStore(selectActiveGoals);
  const today = useAppStore((state) => state.today);
  const refreshToday = useAppStore((state) => state.refreshToday);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const plannerOutput = useAppStore(selectPlannerOutput);
  const importWarnings = useAppStore(selectInventoryWarnings);
  const overrideWarnings = useAppStore(selectOverrideWarnings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeSection = APP_SECTIONS.find((section) => section.key === settings.activeTab) ?? APP_SECTIONS[0];
  const warningCount = importWarnings.length + overrideWarnings.length + plannerOutput.warnings.length;
  const activeGoalCount =
    Object.keys(goals.characterGoals).length + Object.keys(goals.weaponGoals).length + goals.artifactGoals.length;
  const importStatus = account?.importState.lastGoodImportAt
    ? `Imported ${new Date(account.importState.lastGoodImportAt).toLocaleDateString()}`
    : "No GOOD import";

  useEffect(() => {
    refreshToday();
    const intervalId = window.setInterval(() => {
      refreshToday();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshToday]);

  return (
    <div className={`app-shell app-shell-sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setMobileSidebarOpen((value) => !value)}
        aria-label="Toggle navigation"
      >
        Menu
      </button>

      <aside className={`app-sidebar ${mobileSidebarOpen ? "is-mobile-open" : ""}`}>
        <div className="app-sidebar-brand">
          <div>
            <p className="page-eyebrow">Genshin Planning Utility</p>
            <h1>Krumpanion</h1>
          </div>
          <button
            type="button"
            className="button-ghost sidebar-collapse-button"
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary sections">
          <div className="sidebar-nav-group">
            <p className="sidebar-group-label">Workflow</p>
            {APP_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`sidebar-nav-item ${activeSection.key === section.key ? "is-active" : ""}`}
                onClick={() => {
                  setMobileSidebarOpen(false);
                  void setActiveTab(section.key);
                }}
              >
                <span className="sidebar-nav-label">{section.label}</span>
                <small>{section.description}</small>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <div className="app-content">
        <header className="top-utility-bar">
          <div className="top-utility-summary">
            <AccountSwitcher />
            <div className="top-utility-pill">
              <span>Active section</span>
              <strong>{activeSection.label}</strong>
            </div>
            <div className="top-utility-pill">
              <span>Import</span>
              <strong>
                {account
                  ? `${account.characters.length} chars / ${account.weapons.length} weapons`
                  : "No GOOD snapshot"}
              </strong>
              <small>{importStatus}</small>
            </div>
            <div className="top-utility-pill">
              <span>Goals</span>
              <strong>{activeGoalCount}</strong>
            </div>
          </div>

          <div className="top-utility-summary">
            <div className="top-utility-pill">
              <span>Health</span>
              <strong>{warningCount ? `${warningCount} warning(s)` : "Clear"}</strong>
            </div>
            <div className="top-utility-pill">
              <span>Today</span>
              <strong>{today}</strong>
            </div>
            <div className="top-utility-pill top-utility-pill-wide">
              <span>Planner snapshot</span>
              <strong>{plannerOutput.summary.totalEstimatedResin} resin</strong>
            </div>
          </div>
        </header>

        <main className="app-main">
          {activeSection.render({
            plannerOutput,
            importWarnings,
            overrideWarnings,
          })}
        </main>
      </div>
    </div>
  );
}
