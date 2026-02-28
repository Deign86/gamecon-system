import { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./components/Toast";
import { OnlineStatusProvider } from "./hooks/useOnlineStatus";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineGuard from "./components/OfflineGuard";
import AuthGate from "./components/AuthGate";
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import ForegroundNotificationHandler from "./components/ForegroundNotificationHandler";
import { AppSkeleton, RouteFallbackSkeleton } from "./components/Skeleton";

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
    return <AppSkeleton />;
  }

  if (!user) return <AuthGate />;

  return (
    <TabCtx.Provider value={{ tab, setTab }}>
      <div className="flex min-h-screen flex-col gc-diag-bg gc-noise">
        <TopNav />
        <OfflineBanner />
        <ForegroundNotificationHandler />
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
                  {tab === "users"        && (
                    <OfflineGuard requires="network" label="User Management" variant="modal">
                      <AdminUsersPage />
                    </OfflineGuard>
                  )}
                  {tab === "me"           && <ProfilePanel />}
                  {tab === "logs" && profile?.role === "admin" && <LogsPanel />}
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

/* Fallback skeleton for lazy routes */
function RouteFallback() {
  return <RouteFallbackSkeleton />;
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
              <OnlineStatusProvider>
                <ToastProvider>
                  <AppShell />
                </ToastProvider>
              </OnlineStatusProvider>
            </AuthProvider>
          }
        />
      </Routes>
      <Analytics />
    </>
  );
}
