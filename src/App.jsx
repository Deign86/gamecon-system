import { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthGate from "./components/AuthGate";
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";

/* Lazy‑load heavy tab views */
const Dashboard    = lazy(() => import("./components/Dashboard"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));
const LogsPanel    = lazy(() => import("./components/LogsPanel"));
const RoleTasking  = lazy(() => import("./components/RoleTasking"));
const AdminUsersPage = lazy(() => import("./components/admin/AdminUsersPage"));
/* ContributionTabs removed — consolidated into Dashboard ContributionHub */
const FullScreenHeadcountView = lazy(() =>
  import("./components/headcount/FullScreenHeadcountView")
);

/* ── Tab context ── */
const TabCtx = createContext(undefined);
export const useTab = () => {
  const ctx = useContext(TabCtx);
  if (!ctx) return { tab: "dashboard", setTab: () => {} };
  return ctx;
};

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
        {/* Corner brackets */}
        <div className="fixed top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-gc-crimson/20 pointer-events-none" />
        <div className="fixed bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-gc-crimson/20 pointer-events-none" />
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded border-2 border-gc-crimson border-t-transparent animate-spin" />
            <div className="absolute inset-0 h-12 w-12 rounded border-2 border-transparent border-b-gc-crimson/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <span className="font-display text-xl tracking-[0.2em] text-gc-crimson text-shadow-red">
            INITIALIZING…
          </span>
          <span className="text-[10px] font-mono text-gc-hint tracking-widest uppercase">PlayVerse Ops v2.0</span>
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
          <Suspense fallback={<RouteFallback />}>
            <ErrorBoundary key={tab}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {tab === "dashboard"     && <Dashboard />}
                  {tab === "roles"        && <RoleTasking />}
                  {tab === "users"        && <AdminUsersPage />}
                  {tab === "me"           && <ProfilePanel />}
                  {tab === "logs"         && <LogsPanel />}
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </Suspense>
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
        <div className="relative">
          <div className="h-10 w-10 rounded border-2 border-gc-crimson border-t-transparent animate-spin" />
        </div>
        <span className="font-display text-lg tracking-[0.2em] text-gc-crimson text-shadow-red">
          LOADING…
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
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
      <Analytics />
    </>
  );
}
