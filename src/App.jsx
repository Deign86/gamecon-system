import { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./components/Toast";
import AuthGate from "./components/AuthGate";
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";

/* Lazy‑load heavy tab views */
const Dashboard    = lazy(() => import("./components/Dashboard"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));
const LogsPanel    = lazy(() => import("./components/LogsPanel"));
const RoleTasking  = lazy(() => import("./components/RoleTasking"));
const AdminUsersPage = lazy(() => import("./components/admin/AdminUsersPage"));
const ContributionTabs = lazy(() => import("./components/contributions/ContributionTabs"));
const FullScreenHeadcountView = lazy(() =>
  import("./components/headcount/FullScreenHeadcountView")
);

/* ── Tab context ── */
const TabCtx = createContext();
export const useTab = () => useContext(TabCtx);

function AppShell() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState("dashboard");

  /* Reset tab to dashboard whenever the signed-in user changes
     (prevents a proctor inheriting the admin's "users" tab after sign-out / sign-in) */
  useEffect(() => {
    setTab("dashboard");
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gc-diag-bg gc-noise">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
          <span className="font-display text-2xl tracking-wider text-gc-crimson text-shadow-red">
            LOADING GC26…
          </span>
        </div>
      </div>
    );
  }

  if (!user) return <AuthGate />;

  return (
    <TabCtx.Provider value={{ tab, setTab }}>
      <div className="flex min-h-screen flex-col gc-diag-bg gc-noise">
        <TopNav />
        <main className="flex-1 overflow-y-auto px-3 pb-24 pt-4 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <Suspense fallback={<RouteFallback />}>
                {tab === "dashboard"     && <Dashboard />}
                {tab === "roles"        && <RoleTasking />}
                {tab === "users"        && <AdminUsersPage />}
                {tab === "contributions" && <ContributionTabs />}
                {tab === "me"           && <ProfilePanel />}
                {tab === "logs"         && <LogsPanel />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNav />
      </div>
    </TabCtx.Provider>
  );
}

/* Fallback spinner for lazy routes */
function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gc-void">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
        <span className="font-display text-2xl tracking-wider text-gc-crimson text-shadow-red">
          LOADING…
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ── Full‑screen headcount (standalone, own AuthProvider) ── */}
      <Route
        path="/headcount/fullscreen"
        element={
          <Suspense fallback={<RouteFallback />}>
            <FullScreenHeadcountView />
          </Suspense>
        }
      />

      {/* ── Standalone admin users route ── */}
      <Route
        path="/admin/users"
        element={
          <AuthProvider>
            <div className="min-h-screen gc-diag-bg gc-noise">
              <AdminUsersPage standalone />
            </div>
          </AuthProvider>
        }
      />

      {/* ── Main app shell (default) ── */}
      <Route
        path="*"
        element={
          <AuthProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </AuthProvider>
        }
      />
    </Routes>
  );
}
