import { useEffect } from "react";
import { AppShell } from "../components/AppShell";
import { api, ApiError } from "../lib/api";
import { AuditPage } from "../pages/AuditPage";
import { AuthPage } from "../pages/AuthPage";
import { GaragesPage } from "../pages/GaragesPage";
import { OperationsPage } from "../pages/OperationsPage";
import { OverviewPage } from "../pages/OverviewPage";
import { ReportsPage } from "../pages/ReportsPage";
import { VehiclesPage } from "../pages/VehiclesPage";
import { useAppStore } from "../stores/useAppStore";

function App() {
  const {
    user,
    garages,
    selectedGarageId,
    page,
    error,
    refreshKey,
    setUser,
    setGarages,
    setSelectedGarageId,
    setPage,
    setError,
    refresh,
    resetSession,
  } = useAppStore();

  const loadGarages = async () => {
    try {
      const result = await api.garages();
      setGarages(result.garages);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load garages.",
      );
    }
  };

  useEffect(() => {
    if (user) void loadGarages();
  }, [user, refreshKey]);
  if (!user) return <AuthPage onAuthenticated={setUser} />;

  const selectedGarage = garages.find(
    (garage) => garage.id === selectedGarageId,
  );
  const logout = async () => {
    await api.logout().catch(() => undefined);
    resetSession();
  };
  const activePage = selectedGarageId || page === "garages" ? page : "garages";

  return (
    <AppShell
      user={user}
      page={activePage}
      garages={garages}
      selectedGarageId={selectedGarageId}
      onPageChange={setPage}
      onGarageChange={setSelectedGarageId}
      onLogout={logout}
      onRefresh={refresh}
    >
      <>
        {error && (
          <div className="global-error">
            {error}
            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {activePage === "overview" && (
          <OverviewPage
            garages={garages}
            selectedGarage={selectedGarage}
            onNavigate={setPage}
          />
        )}
        {activePage === "operations" && (
          <OperationsPage garage={selectedGarage} onRefresh={refresh} />
        )}
        {activePage === "garages" && (
          <GaragesPage garages={garages} onRefresh={refresh} />
        )}
        {activePage === "vehicles" && <VehiclesPage />}
        {activePage === "reports" && <ReportsPage />}
        {activePage === "audit" && <AuditPage />}
      </>
    </AppShell>
  );
}

export default App;
