import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useTotalHeadcount } from "../../hooks/useTotalHeadcount";
import { AuthProvider, useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { ShieldAlert } from "lucide-react";
import { HeadcountFullSkeleton } from "../Skeleton";

/* ── Eye SVG icon ── */
function EyeIcon({ className }) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M32 4C18 4 6.4 14.4 2 20c4.4 5.6 16 16 30 16s25.6-10.4 30-16C57.6 14.4 46 4 32 4Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="20" r="9" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="20" r="4" fill="currentColor" />
    </svg>
  );
}

/* ── Ripple effect on tap ── */
function CounterRipple({ trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          initial={{ scale: 0.5, opacity: 0.5 }}
          animate={{ scale: 2.5, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 m-auto h-32 w-32 rounded-full border-2 border-gc-crimson pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}

/* ── Back arrow icon ── */
function ArrowLeftIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/* ── Inner view ── */
function HeadcountInner() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isViewer = profile?.role === "viewer";
  const { count, loading, zonesTotal, atStaffFloor, incrementCount, decrementCount } = useTotalHeadcount();
  const [ripple, setRipple] = useState(0);
  const [direction, setDirection] = useState(null); // 'up' | 'down'
  const [staffWarning, setStaffWarning] = useState(false);
  const [shake, setShake] = useState(false);
  const holdRef = useRef(null);
  const repeatRef = useRef(null);
  const warningTimer = useRef(null);
  const { effective: theme } = useTheme();
  const isLight = theme === "light";

  const triggerRipple = useCallback(() => setRipple((r) => r + 1), []);

  /* Show staff floor warning for 3 seconds then auto-dismiss */
  const flashWarning = useCallback(() => {
    setStaffWarning(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setStaffWarning(false), 3000);
  }, []);

  /* Wrapped decrement that checks the return value */
  const safeDecrement = useCallback(async () => {
    const result = await decrementCount();
    if (result === "blocked") {
      flashWarning();
      return;
    }
    setDirection("down");
    triggerRipple();
  }, [decrementCount, flashWarning, triggerRipple]);

  /* Keyboard support */
  useEffect(() => {
    if (isViewer) return;
    function onKey(e) {
      if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
        e.preventDefault();
        incrementCount();
        setDirection("up");
        triggerRipple();
      }
      if (e.key === "-" || e.key === "_" || e.key === "ArrowDown") {
        e.preventDefault();
        safeDecrement();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isViewer, incrementCount, safeDecrement, triggerRipple]);

  /* Hold-to-repeat helpers */
  function startHold(action, dir) {
    if (isViewer) return;
    action();
    if (dir === "up") { setDirection(dir); triggerRipple(); }
    holdRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => {
        action();
        if (dir === "up") triggerRipple();
      }, 120);
    }, 400);
  }

  function stopHold() {
    clearTimeout(holdRef.current);
    clearInterval(repeatRef.current);
  }

  if (loading) {
    return <HeadcountFullSkeleton />;
  }

  /* Format number with locale separator */
  const displayCount = count.toLocaleString();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gc-void select-none overflow-hidden relative">
      {/* Atmospheric background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLight
            ? "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(190,14,42,0.07) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,16,46,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: isLight ? 0.07 : 0.03,
          backgroundImage: isLight
            ? "linear-gradient(rgba(52,47,42,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,47,42,0.4) 1px, transparent 1px)"
            : "linear-gradient(rgba(200,16,46,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,16,46,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Back to dashboard */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        onClick={() => navigate("/")}
        className="absolute top-5 right-5 z-20 flex items-center gap-2 rounded bg-gc-iron border border-gc-steel/60 px-3.5 py-2 text-gc-hint backdrop-blur-sm transition-all hover:border-gc-crimson/40 hover:text-gc-cloud hover:bg-gc-iron/80"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="font-display text-xs tracking-[0.15em] uppercase">Dashboard</span>
      </motion.button>

      {/* Live indicator */}
      <div className="absolute top-5 left-5 flex items-center gap-2.5 z-10">
        <div className="relative flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full bg-gc-crimson" />
          <div className="absolute h-2.5 w-2.5 rounded-full bg-gc-crimson animate-ping" />
        </div>
        <span className="font-display text-lg tracking-[0.25em] uppercase text-gc-crimson/80">
          Live
        </span>
      </div>

      {/* Main counter area */}
      <div className="relative flex flex-col items-center gap-6 z-10">
        {/* Eye icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <EyeIcon className="h-14 w-14 sm:h-20 sm:w-20 text-gc-crimson/70" />
        </motion.div>

        {/* The number */}
        <div className="relative flex items-center justify-center">
          <CounterRipple trigger={ripple} />
          <motion.div
            key={count}
            initial={{
              y: direction === "up" ? 30 : direction === "down" ? -30 : 0,
              opacity: 0.4,
              scale: 0.95,
            }}
            animate={
              shake
                ? { x: [0, -12, 12, -8, 8, -4, 4, 0], y: 0, opacity: 1, scale: 1 }
                : { y: 0, opacity: 1, scale: 1 }
            }
            transition={shake ? { duration: 0.5 } : { type: "spring", stiffness: 400, damping: 25 }}
            className={`font-display text-[8rem] sm:text-[12rem] lg:text-[16rem] leading-none tracking-tight ${atStaffFloor ? "text-gc-warning" : "text-gc-cloud"}`}
            style={{
              textShadow: atStaffFloor
                ? isLight
                  ? "0 0 40px rgba(180,120,4,0.18), 0 2px 8px rgba(0,0,0,0.12)"
                  : "0 0 60px rgba(234,179,8,0.2), 0 4px 12px rgba(0,0,0,0.5)"
                : isLight
                  ? "0 0 40px rgba(190,14,42,0.12), 0 2px 8px rgba(0,0,0,0.10)"
                  : "0 0 60px rgba(200,16,46,0.15), 0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {displayCount}
          </motion.div>
        </div>

        {/* Label — changes when at staff floor */}
        <AnimatePresence mode="wait">
          {atStaffFloor ? (
            <motion.div
              key="staff-floor-label"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 rounded bg-gc-warning/10 border border-gc-warning/30 px-4 py-1.5"
            >
              <ShieldAlert className="h-4 w-4 text-gc-warning shrink-0" />
              <p className="font-mono text-xs sm:text-sm tracking-wide uppercase text-gc-warning">
                Staff Only — {zonesTotal} in zones
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="headcount-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-xs sm:text-sm tracking-[0.3em] uppercase text-gc-faded"
            >
              Headcount
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Staff floor warning toast */}
      <AnimatePresence>
        {staffWarning && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="absolute bottom-32 sm:bottom-36 z-30 mx-4 flex items-center gap-3 rounded bg-gc-warning/15 border border-gc-warning/40 px-5 py-3 backdrop-blur-md shadow-[0_0_30px_rgba(234,179,8,0.15)]"
          >
            <ShieldAlert className="h-5 w-5 text-gc-warning shrink-0" />
            <div>
              <p className="font-display text-sm sm:text-base tracking-wider uppercase text-gc-warning">
                Cannot go lower
              </p>
              <p className="font-body text-[11px] sm:text-xs text-gc-warning/70 mt-0.5">
                Remaining headcount ({count}) accounts for {zonesTotal} staff in zones
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-10 sm:bottom-14 flex items-center gap-6 z-10">
        {/* Minus */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onMouseDown={() => startHold(safeDecrement, "down")}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => startHold(safeDecrement, "down")}
          onTouchEnd={stopHold}
          disabled={isViewer || count <= 0}
          className={`group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-md backdrop-blur-sm transition-all active:bg-gc-crimson/10 ${
            isViewer
              ? "bg-gc-iron/40 border border-gc-steel/30 text-gc-hint cursor-not-allowed opacity-30"
              : atStaffFloor
                ? "bg-gc-warning/10 border border-gc-warning/30 text-gc-warning/60 cursor-not-allowed"
                : "bg-gc-iron/80 border border-gc-steel/60 text-gc-cloud hover:border-gc-crimson/40 hover:bg-gc-steel/60 disabled:opacity-20 disabled:cursor-not-allowed"
          }`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>

        {/* Plus */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onMouseDown={() => startHold(incrementCount, "up")}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => startHold(incrementCount, "up")}
          onTouchEnd={stopHold}
          disabled={isViewer}
          className={`group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-md backdrop-blur-sm transition-all ${
            isViewer
              ? "bg-gc-iron/40 border border-gc-steel/30 text-gc-hint cursor-not-allowed opacity-30"
              : "bg-gc-crimson/15 border border-gc-crimson/40 text-gc-crimson hover:bg-gc-crimson/25 hover:border-gc-crimson active:bg-gc-crimson/30"
          }`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-3 sm:bottom-5 flex items-center gap-2 text-gc-faded text-[10px] font-mono z-10">
        <kbd className="px-1.5 py-0.5 rounded bg-gc-iron/50 border border-gc-steel/30 text-[9px]">↑</kbd>
        <span>/</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gc-iron/50 border border-gc-steel/30 text-[9px]">↓</kbd>
        <span className="ml-1">or hold buttons</span>
      </div>
    </div>
  );
}

/**
 * Full-screen Live Headcount — single counter display.
 * Wraps in AuthProvider so it works as a standalone route.
 */
export default function FullScreenHeadcountView() {
  return (
    <AuthProvider>
      <HeadcountInner />
    </AuthProvider>
  );
}
