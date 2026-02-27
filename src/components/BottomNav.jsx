import { LayoutDashboard, ClipboardList, User, ScrollText, UsersRound, BookUser } from "lucide-react";
import { useTab } from "../App";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

const BASE_TABS = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "me",        label: "Me",        Icon: User },
  { key: "logs",      label: "Logs",      Icon: ScrollText },
];

const PROCTOR_TABS = [
  { key: "dashboard",     label: "Dashboard",  Icon: LayoutDashboard },
  { key: "contributions", label: "Contribs",   Icon: BookUser },
  { key: "me",            label: "Me",         Icon: User },
  { key: "logs",          label: "Logs",       Icon: ScrollText },
];

const ADMIN_TABS = [
  { key: "dashboard",     label: "Dashboard", Icon: LayoutDashboard },
  { key: "roles",         label: "Roles",     Icon: ClipboardList },
  { key: "contributions", label: "Contribs",  Icon: BookUser },
  { key: "users",         label: "Users",     Icon: UsersRound },
  { key: "me",            label: "Me",        Icon: User },
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
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gc-steel/40 backdrop-blur-xl bg-gc-void/85 safe-bottom">
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around">
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200",
                active
                  ? "text-gc-crimson"
                  : "text-gc-mist hover:text-gc-cloud"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
                {active && (
                  <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-gc-crimson animate-pulse" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide",
                  active ? "font-bold" : ""
                )}
              >
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gc-crimson" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
