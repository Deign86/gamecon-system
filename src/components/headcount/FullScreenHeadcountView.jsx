import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTotalHeadcount } from "../../hooks/useTotalHeadcount";
import { AuthProvider } from "../../hooks/useAuth";

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
  const { count, loading, incrementCount, decrementCount } = useTotalHeadcount();
  const [ripple, setRipple] = useState(0);
  const [direction, setDirection] = useState(null); // 'up' | 'down'
  const holdRef = useRef(null);
  const repeatRef = useRef(null);

  const triggerRipple = useCallback(() => setRipple((r) => r + 1), []);

  /* Keyboard support */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
        e.preventDefault();
        incrementCount();
        setDirection("up");
        triggerRipple();
      }
      if (e.key === "-" || e.key === "_" || e.key === "ArrowDown") {
        e.preventDefault();
        decrementCount();
        setDirection("down");
        triggerRipple();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [incrementCount, decrementCount, triggerRipple]);

  /* Hold-to-repeat helpers */
  function startHold(action, dir) {
    action();
    setDirection(dir);
    triggerRipple();
    holdRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => {
        action();
        triggerRipple();
      }, 120);
    }, 400);
  }

  function stopHold() {
    clearTimeout(holdRef.current);
    clearInterval(repeatRef.current);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gc-void">
        <div className="h-12 w-12 rounded-full border-2 border-gc-crimson border-t-transparent animate-spin" />
      </div>
    );
  }

  /* Format number with locale separator */
  const displayCount = count.toLocaleString();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gc-void select-none overflow-hidden relative">
      {/* Atmospheric background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,16,46,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,16,46,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,16,46,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Back to dashboard */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        onClick={() => navigate("/")}
        className="absolute top-5 right-5 z-20 flex items-center gap-2 rounded-xl bg-gc-iron/60 border border-gc-steel/40 px-3.5 py-2 text-gc-mist/60 backdrop-blur-sm transition-all hover:border-gc-crimson/40 hover:text-gc-cloud hover:bg-gc-iron/80"
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
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="font-display text-[8rem] sm:text-[12rem] lg:text-[16rem] leading-none tracking-tight text-gc-cloud"
            style={{
              textShadow:
                "0 0 60px rgba(200,16,46,0.15), 0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {displayCount}
          </motion.div>
        </div>

        {/* Label */}
        <p className="font-mono text-xs sm:text-sm tracking-[0.3em] uppercase text-gc-mist/40">
          Headcount
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 sm:bottom-14 flex items-center gap-6 z-10">
        {/* Minus */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onMouseDown={() => startHold(decrementCount, "down")}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={() => startHold(decrementCount, "down")}
          onTouchEnd={stopHold}
          disabled={count <= 0}
          className="group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gc-iron/80 border border-gc-steel/60 text-gc-cloud backdrop-blur-sm transition-all hover:border-gc-crimson/40 hover:bg-gc-steel/60 disabled:opacity-20 disabled:cursor-not-allowed active:bg-gc-crimson/10"
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
          className="group relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gc-crimson/15 border border-gc-crimson/40 text-gc-crimson backdrop-blur-sm transition-all hover:bg-gc-crimson/25 hover:border-gc-crimson active:bg-gc-crimson/30"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-3 sm:bottom-5 flex items-center gap-2 text-gc-mist/20 text-[10px] font-mono z-10">
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
