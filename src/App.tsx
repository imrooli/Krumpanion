import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./app/AppShell";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const hydrate = useAppStore((state) => state.hydrate);
  const isHydrated = useAppStore((state) => state.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <ErrorBoundary>
      {isHydrated ? <AppShell /> : <div className="loading-screen">Loading Krumpanion…</div>}
    </ErrorBoundary>
  );
}
