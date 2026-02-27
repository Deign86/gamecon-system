import { useState, useEffect } from "react";
import { Clock, LogOut } from "lucide-react";
import { useAuth, signOut } from "../hooks/useAuth";
import { cn } from "../lib/utils";
import GCLogo from "./GCLogo";

export default function TopNav() {
  const { profile } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const timeStr = time.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <header className="sticky top-0 z-40 gc-slash border-b border-gc-steel/50 backdrop-blur-xl bg-gc-void/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <GCLogo size={36} />
          <div className="leading-none">
            <h1 className="font-display text-xl font-bold tracking-wide text-gc-white">
              PLV <span className="text-gc-crimson">GAMECON</span>
            </h1>
            <span className="block text-[10px] font-body font-medium tracking-widest text-gc-mist uppercase">
              2026 OPS
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Live clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-gc-mist">
            <Clock className="h-3.5 w-3.5" />
            {timeStr}
          </div>

          {/* Sign out */}
          {profile && (
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gc-crimson/15 border border-gc-crimson/30 px-3 py-1.5 text-xs font-bold font-display leading-none tracking-wide text-gc-crimson hover:bg-gc-crimson hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="translate-y-[2px]">SIGN OUT</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
