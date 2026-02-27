import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
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

          {/* User chip */}
          {profile && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg bg-gc-iron/60 px-3 py-1.5 text-xs font-medium text-gc-cloud hover:bg-gc-steel/60 transition-colors"
              title="Sign out"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #C8102E, #E31837)" }}
              >
                {(profile.name || "U")[0].toUpperCase()}
              </span>
              <span className="hidden sm:inline max-w-[100px] truncate">
                {profile.name || profile.email}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
