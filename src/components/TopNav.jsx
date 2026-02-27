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
    <header className="sticky top-0 z-40 border-b border-gc-steel/40 backdrop-blur-xl bg-gc-void/90">
      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gc-crimson/60 to-transparent" />

      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <GCLogo size={34} />
          <div className="leading-none">
            <h1 className="font-display text-xl font-bold tracking-wider text-gc-white">
              PLV <span className="text-gc-crimson">GAMECON</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-medium tracking-[0.2em] text-gc-mist uppercase">
                OPS PANEL
              </span>
              <span className="text-gc-steel text-[8px]">│</span>
              <span className="text-[8px] font-mono text-gc-hint tracking-wider">v2.0</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-gc-mist border border-gc-steel/30 rounded px-2 py-1 bg-gc-void/50">
            <Clock className="h-3 w-3 text-gc-crimson/70" />
            {timeStr}
          </div>

          {/* Dot separator */}
          <span className="hidden sm:block h-1 w-1 rounded-full bg-gc-steel" />

          {/* Sign out */}
          {profile && (
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-gc-crimson/10 border border-gc-crimson/25 px-2.5 py-1.5 text-[10px] font-bold font-display leading-none tracking-[0.15em] uppercase text-gc-crimson hover:bg-gc-crimson hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3 w-3" />
              EXIT
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
