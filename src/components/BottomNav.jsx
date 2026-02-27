import { LayoutDashboard, ClipboardList, User, ScrollText, UsersRound, KanbanSquare } from "lucide-react";
import { useTab } from "../App";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

const BASE_TABS = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "me",        label: "Me",        Icon: User },
  { key: "logs",      label: "Logs",      Icon: ScrollText },
];

const PROCTOR_TABS = [
  { key: "dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { key: "tasks",      label: "Tasks",      Icon: KanbanSquare },
  { key: "me",         label: "Me",         Icon: User },
  { key: "logs",       label: "Logs",       Icon: ScrollText },
];

const ADMIN_TABS = [
  { key: "dashboard",  label: "Dashboard", Icon: LayoutDashboard },
  { key: "tasks",      label: "Tasks",     Icon: KanbanSquare },
  { key: "roles",      label: "Roles",     Icon: ClipboardList },
  { key: "users",      label: "Users",     Icon: UsersRound },
  { key: "me",         label: "Me",        Icon: User },
];

export default function BottomNav() {
  const { tab, setTab } = useTab();
  const { profile } = useAuth();
  const role  = profile?.role;
  const tabs  = role === "admin"
    ? ADMIN_TABS
    : ["proctor", "head", "committee-head"].includes(role)
      ? PROCTOR_TABS
      : BASE_TABS;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gc-steel/30 backdrop-blur-xl bg-gc-void/90 safe-bottom">
      {/* Top accent gradient */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gc-crimson/40 to-transparent" />

      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-1">
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200",
                active
                  ? "text-gc-crimson"
                  : "text-gc-mist hover:text-gc-cloud"
              )}
            >
              {/* Active background container */}
              {active && (
                <span className="absolute inset-x-2 inset-y-1.5 rounded bg-gc-crimson/8 border border-gc-crimson/15" />
              )}

              <div className="relative z-10">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
              </div>
              <span
                className={cn(
                  "relative z-10 text-[9px] font-display tracking-[0.15em] uppercase",
                  active ? "font-bold text-gc-crimson" : "font-medium"
                )}
              >
                {label}
              </span>

              {/* Glow indicator bar */}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-10 bg-gc-crimson rounded-full shadow-[0_0_8px_rgba(200,16,46,0.6)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
