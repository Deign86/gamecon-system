import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

/**
 * Minimal zone counter card for fullscreen display.
 * Zone name · big number · −/+ buttons. That's it.
 * Keyboard: focus a card then press − or + on the keyboard.
 */
export default function ZoneCounterCard({
  zone,
  onIncrement,
  onDecrement,
  selected,
  onSelect,
}) {
  const [pulse, setPulse] = useState(false);
  const ref = useRef(null);
  const count = zone.currentCount ?? 0;

  const fire = useCallback(async (action) => {
    setPulse(true);
    await action();
    setTimeout(() => setPulse(false), 300);
  }, []);

  /* Keep DOM focus in sync with selection */
  useEffect(() => {
    if (selected && ref.current) ref.current.focus({ preventScroll: true });
  }, [selected]);

  /* Per-card keyboard handler */
  function onKey(e) {
    if (e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
      e.preventDefault();
      fire(onIncrement);
    } else if (e.key === "-" || e.key === "_" || e.key === "ArrowDown") {
      e.preventDefault();
      if (count > 0) fire(onDecrement);
    }
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="button"
      onClick={() => onSelect?.(zone.id)}
      onKeyDown={onKey}
      className={cn(
        "flex items-center justify-between rounded border px-4 py-3 sm:px-6 sm:py-4 outline-none transition-all duration-200 cursor-pointer",
        "bg-gc-night/80",
        selected
          ? "border-gc-crimson shadow-[0_0_24px_rgba(200,16,46,0.2)]"
          : "border-gc-steel/50 hover:border-gc-mist/40"
      )}
    >
      {/* Zone name */}
      <h2 className="font-display text-lg sm:text-2xl lg:text-3xl uppercase tracking-wide text-gc-cloud min-w-0 flex-1 mr-4">
        {zone.name}
      </h2>

      {/* − count + row */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Minus */}
        <button
          onClick={(e) => { e.stopPropagation(); fire(onDecrement); }}
          disabled={count <= 0}
          aria-label={`Decrease ${zone.name}`}
          className={cn(
            "flex items-center justify-center rounded font-mono font-bold text-2xl sm:text-3xl transition-all duration-150",
            "h-12 w-12 sm:h-14 sm:w-14",
            "bg-gc-iron border border-gc-steel text-gc-cloud",
            "hover:bg-gc-steel hover:border-gc-crimson/50 active:scale-90",
            "disabled:opacity-20 disabled:pointer-events-none"
          )}
        >
          −
        </button>

        {/* Count */}
        <motion.span
          className="font-mono font-black text-gc-white text-center select-none"
          style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", minWidth: "4ch" }}
          animate={pulse ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.25 }}
        >
          {count}
        </motion.span>

        {/* Plus */}
        <button
          onClick={(e) => { e.stopPropagation(); fire(onIncrement); }}
          aria-label={`Increase ${zone.name}`}
          className={cn(
            "flex items-center justify-center rounded font-mono font-bold text-2xl sm:text-3xl transition-all duration-150",
            "h-12 w-12 sm:h-14 sm:w-14",
            "bg-gc-crimson/20 border border-gc-crimson/50 text-gc-crimson",
            "hover:bg-gc-crimson/35 hover:border-gc-crimson active:scale-90"
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}
