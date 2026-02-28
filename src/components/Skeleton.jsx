/**
 * Skeleton loading primitives — dark industrial / crimson shimmer aesthetic.
 *
 * All skeletons share the `gc-skeleton` CSS class (defined in index.css) which
 * provides a crimson-tinted shimmer sweep over a gc-iron base surface. The
 * primitives compose into contextual skeletons for each major view.
 */

import { cn } from "../lib/utils";

/* ═══════════════════════════════════════════════════════════
   BASE PRIMITIVES
   ═══════════════════════════════════════════════════════════ */

/** Generic rectangular skeleton pulse block */
export function SkeletonBlock({ className }) {
  return <div className={cn("gc-skeleton rounded", className)} />;
}

/** Circular skeleton (avatars, icons) */
export function SkeletonCircle({ className, size = "h-8 w-8" }) {
  return <div className={cn("gc-skeleton rounded-full", size, className)} />;
}

/** Text-line skeleton — defaults to a single body-text-height bar */
export function SkeletonLine({ className, width = "w-full" }) {
  return <div className={cn("gc-skeleton h-3 rounded", width, className)} />;
}

/* ═══════════════════════════════════════════════════════════
   APP-LEVEL SKELETON (auth loading / route fallback)
   ═══════════════════════════════════════════════════════════ */

export function AppSkeleton() {
  return (
    <div className="flex h-screen flex-col gc-diag-bg gc-noise">
      {/* Corner brackets */}
      <div className="fixed top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-gc-crimson/20 pointer-events-none" />
      <div className="fixed bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-gc-crimson/20 pointer-events-none" />

      {/* Top nav skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gc-steel/20">
        <SkeletonBlock className="h-8 w-28" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-6 w-20" />
          <SkeletonCircle size="h-8 w-8" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-4 pt-6 space-y-5 max-w-5xl mx-auto w-full">
        {/* Title bar */}
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-7 w-48" />
        </div>

        {/* Card grid skeleton (dashboard cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="gc-skeleton rounded-md h-24 opacity-0 animate-fade-in"
              style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
            />
          ))}
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <div className="fixed bottom-0 inset-x-0 border-t border-gc-steel/20 bg-gc-void/90 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SkeletonBlock className="h-5 w-5 rounded" />
              <SkeletonBlock className="h-2 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Route-level fallback — lighter than AppSkeleton */
export function RouteFallbackSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      {/* Title bar */}
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-7 w-44" />
        <SkeletonBlock className="h-7 w-24 ml-auto" />
      </div>
      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="h-16 rounded-md opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTEXTUAL SKELETONS — one per major view
   ═══════════════════════════════════════════════════════════ */

/** Zone Counter / headcount grid skeleton */
export function ZoneCounterSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-8 w-20 rounded" />
      </div>
      {/* Zone cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="gc-card p-4 space-y-3 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
          >
            <SkeletonLine width="w-3/4" />
            <SkeletonBlock className="h-10 w-16 rounded mx-auto" />
            <div className="flex justify-center gap-2">
              <SkeletonBlock className="h-8 w-8 rounded" />
              <SkeletonBlock className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shift Board skeleton */
export function ShiftBoardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="gc-card p-4 space-y-3 opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.06}s`, animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-4 w-12 rounded" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 3 }).map((_, j) => (
              <SkeletonBlock key={j} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Task Board kanban skeleton */
export function TaskBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, col) => (
        <div
          key={col}
          className="space-y-3 opacity-0 animate-fade-in"
          style={{ animationDelay: `${col * 0.07}s`, animationFillMode: "forwards" }}
        >
          {/* Column header */}
          <SkeletonBlock className="h-6 w-24 rounded" />
          {/* Task cards */}
          {Array.from({ length: col === 0 ? 3 : 2 }).map((_, j) => (
            <div key={j} className="gc-card p-3 space-y-2">
              <SkeletonLine width="w-4/5" />
              <SkeletonLine width="w-2/3" className="h-2" />
              <div className="flex items-center gap-2 pt-1">
                <SkeletonCircle size="h-5 w-5" />
                <SkeletonLine width="w-16" className="h-2" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Role Tasking skeleton */
export function RoleTaskingSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="h-8 w-28 rounded" />
      </div>
      {/* Toolbar */}
      <div className="flex gap-2">
        <SkeletonBlock className="h-9 w-32 rounded" />
        <SkeletonBlock className="h-9 w-32 rounded" />
        <SkeletonBlock className="h-9 w-24 rounded ml-auto" />
      </div>
      {/* Person rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="gc-card p-4 flex items-center gap-4 opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
        >
          <SkeletonCircle size="h-9 w-9" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="w-1/3" />
            <SkeletonLine width="w-1/2" className="h-2" />
          </div>
          <SkeletonBlock className="h-6 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Logs Panel skeleton */
export function LogsPanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="gc-card p-3 flex items-start gap-3 opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
        >
          <SkeletonCircle size="h-7 w-7" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="w-2/3" />
            <SkeletonLine width="w-full" className="h-2" />
            <SkeletonLine width="w-1/4" className="h-2" />
          </div>
          <SkeletonBlock className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Venue Map skeleton */
export function VenueMapSkeleton() {
  return (
    <div className="space-y-4 py-2">
      {/* Day toggle + stats bar */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-9 w-48 rounded" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 w-16 rounded" />
          <SkeletonBlock className="h-6 w-16 rounded" />
        </div>
      </div>
      {/* Map placeholder */}
      <SkeletonBlock className="h-64 sm:h-80 rounded-md w-full" />
      {/* Legend */}
      <div className="flex gap-3 justify-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4 w-16 rounded" />
        ))}
      </div>
    </div>
  );
}

/** User Management Table skeleton */
export function UserTableSkeleton() {
  return (
    <div className="overflow-hidden rounded border border-gc-steel/40 bg-gc-slate/60">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gc-steel/30">
        {["w-1/4", "w-16", "w-24", "w-16", "w-20", "w-16"].map((w, i) => (
          <SkeletonBlock key={i} className={cn("h-3", w)} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-gc-steel/15 last:border-0 opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.03}s`, animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-3 w-1/4">
            <SkeletonCircle size="h-8 w-8" />
            <div className="space-y-1.5 flex-1">
              <SkeletonLine width="w-24" />
              <SkeletonLine width="w-32" className="h-2" />
            </div>
          </div>
          <SkeletonBlock className="h-5 w-16 rounded" />
          <SkeletonLine width="w-24" className="hidden md:block" />
          <SkeletonBlock className="h-5 w-14 rounded" />
          <SkeletonLine width="w-20 hidden lg:block" />
          <div className="flex gap-1.5 ml-auto">
            <SkeletonBlock className="h-7 w-7 rounded" />
            <SkeletonBlock className="h-7 w-7 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full-screen headcount skeleton */
export function HeadcountFullSkeleton() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gc-void">
      <SkeletonBlock className="h-32 w-48 rounded-md mb-6" />
      <SkeletonBlock className="h-5 w-32 mb-2" />
      <div className="flex gap-6 mt-8">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <SkeletonBlock className="h-16 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Attendance page skeleton */
export function AttendanceSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="gc-card p-3 flex items-center gap-3 opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
        >
          <SkeletonCircle size="h-8 w-8" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="w-1/3" />
            <SkeletonLine width="w-1/4" className="h-2" />
          </div>
          <SkeletonBlock className="h-7 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Contribution person list skeleton */
export function ContributionListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
        >
          <SkeletonCircle size="h-7 w-7" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="w-1/2" />
            <SkeletonLine width="w-1/3" className="h-2" />
          </div>
          <SkeletonBlock className="h-5 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

export default SkeletonBlock;
