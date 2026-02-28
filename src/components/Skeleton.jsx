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
   DASHBOARD HERO BANNER SKELETON (shared by App & Route)
   ═══════════════════════════════════════════════════════════ */

function HeroBannerSkeleton() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-md border border-gc-steel/30 bg-gc-slate p-5 sm:p-7">
      {/* Corner brackets */}
      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-gc-crimson/20 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-gc-crimson/20 pointer-events-none" />
      {/* Status line */}
      <SkeletonLine width="w-40" className="h-2 mb-3" />
      {/* PLAY VERSE heading */}
      <SkeletonBlock className="h-9 w-56 sm:w-64 mb-2" />
      {/* Subtitle */}
      <SkeletonLine width="w-52" className="h-3 mb-3" />
      {/* Info chips */}
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-6 w-40 rounded" />
        <SkeletonBlock className="h-6 w-28 rounded" />
        <SkeletonBlock className="h-6 w-32 rounded" />
      </div>
    </div>
  );
}

/** Dashboard card placeholder — icon circle + label + dot */
function DashboardCardSkeleton({ delay = 0 }) {
  return (
    <div
      className="gc-card flex flex-col items-center gap-3 p-5 sm:p-6 text-center opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}s`, animationFillMode: "forwards" }}
    >
      {/* Module ID tag */}
      <div className="absolute top-2 right-2">
        <SkeletonLine width="w-6" className="h-1.5" />
      </div>
      {/* Icon */}
      <SkeletonBlock className="h-12 w-12 rounded" />
      {/* Label */}
      <SkeletonLine width="w-24" className="h-4" />
      {/* Dot indicator */}
      <SkeletonCircle size="h-1 w-1" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP-LEVEL SKELETON (auth loading / route fallback)
   ═══════════════════════════════════════════════════════════ */

export function AppSkeleton() {
  return (
    <div className="flex h-screen flex-col gc-diag-bg gc-noise">
      {/* Top nav skeleton — matches TopNav: logo + title | clock + exit btn */}
      <header className="sticky top-0 z-40 border-b border-gc-steel/40 backdrop-blur-xl bg-gc-void/90">
        <div className="h-0.5 bg-gradient-to-r from-transparent via-gc-crimson/20 to-transparent" />
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-9 w-9 rounded" />
            <div className="space-y-1">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonLine width="w-20" className="h-2" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-6 w-20 rounded hidden sm:block" />
            <SkeletonBlock className="h-8 w-16 rounded" />
          </div>
        </div>
      </header>

      {/* Content area — matches Dashboard: hero banner + 3×3 card grid */}
      <main className="flex-1 overflow-y-auto px-3 pb-24 pt-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <HeroBannerSkeleton />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <DashboardCardSkeleton key={i} delay={i * 0.04} />
            ))}
          </div>
        </div>
      </main>

      {/* Bottom nav skeleton — matches BottomNav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gc-steel/30 backdrop-blur-xl bg-gc-void/90">
        <div className="h-px bg-gradient-to-r from-transparent via-gc-crimson/40 to-transparent" />
        <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-center gap-0.5">
              <SkeletonBlock className="h-5 w-5 rounded" />
              <SkeletonLine width="w-10" className="h-2" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Route-level fallback — mirrors Dashboard layout (hero + card grid) */
export function RouteFallbackSkeleton() {
  return (
    <div className="mx-auto max-w-5xl">
      <HeroBannerSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <DashboardCardSkeleton key={i} delay={i * 0.04} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTEXTUAL SKELETONS — one per major view
   ═══════════════════════════════════════════════════════════ */

/** Zone Counter / headcount — total banner + 2-col zone card grid */
export function ZoneCounterSkeleton() {
  return (
    <div className="space-y-5">
      {/* Total banner */}
      <div className="flex items-center justify-between rounded bg-gc-crimson/10 border border-gc-crimson/25 px-4 py-3">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-5 rounded" />
          <SkeletonLine width="w-20" className="h-3" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-7 w-14 rounded" />
          <SkeletonBlock className="h-8 w-8 rounded" />
        </div>
      </div>
      {/* Zone cards grid — 2 columns on sm+ */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="gc-card flex items-center gap-3 p-3 sm:p-4 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
          >
            {/* Icon box */}
            <SkeletonBlock className="h-9 w-9 rounded shrink-0" />
            {/* Zone name */}
            <SkeletonLine width="w-24" className="h-3 flex-1" />
            {/* Counter controls: - / count / + */}
            <div className="flex items-center gap-2 ml-auto">
              <SkeletonBlock className="h-9 w-9 rounded shrink-0" />
              <SkeletonBlock className="h-8 w-12 rounded" />
              <SkeletonBlock className="h-9 w-9 rounded shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shift Board — block tabs + summary bar + committee rows */
export function ShiftBoardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Committee rows (collapsed) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded border border-gc-steel/40 overflow-hidden opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
        >
          {/* Row header: dot + name + count + status chip + chevron */}
          <div className="flex items-center gap-3 px-4 py-3">
            <SkeletonCircle size="h-2.5 w-2.5" />
            <SkeletonLine width="w-36" className="h-4" />
            <SkeletonLine width="w-10" className="h-3 ml-1" />
            <SkeletonBlock className="h-5 w-16 rounded ml-auto" />
            <SkeletonBlock className="h-4 w-4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Task Board kanban — day tabs + summary + 3-column grid */
export function TaskBoardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {["todo", "in_progress", "done"].map((col, colIdx) => (
          <div
            key={col}
            className="flex flex-col min-w-0 opacity-0 animate-fade-in"
            style={{ animationDelay: `${colIdx * 0.06}s`, animationFillMode: "forwards" }}
          >
            {/* Column header: dot + title + count */}
            <div className="flex items-center gap-2 mb-3">
              <SkeletonCircle size="h-2.5 w-2.5" />
              <SkeletonBlock className="h-5 w-20 rounded" />
              <SkeletonBlock className="h-4 w-6 rounded" />
            </div>
            {/* Task cards */}
            <div className="flex-1 space-y-2.5">
              {Array.from({ length: colIdx === 0 ? 3 : 2 }).map((_, j) => (
                <div key={j} className="gc-card gc-slash p-3 space-y-2">
                  {/* Title */}
                  <SkeletonLine width="w-4/5" className="h-3.5" />
                  {/* Description */}
                  <SkeletonLine width="w-2/3" className="h-2.5" />
                  {/* Badge row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <SkeletonBlock className="h-5 w-12 rounded-full" />
                    <SkeletonBlock className="h-5 w-16 rounded-full" />
                  </div>
                  {/* Footer: assignee avatars + time */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex -space-x-1.5">
                      {Array.from({ length: 2 }).map((_, k) => (
                        <SkeletonCircle key={k} size="h-5 w-5" />
                      ))}
                    </div>
                    <SkeletonLine width="w-10" className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Role Tasking — header + tab pills + search + person rows */
export function RoleTaskingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Header row: title+subtitle | action buttons ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-8 w-52" />
          <SkeletonLine width="w-40" className="h-2.5" />
        </div>
        <div className="flex gap-2 self-start">
          <SkeletonBlock className="h-8 w-28 rounded" />
          <SkeletonBlock className="h-8 w-32 rounded" />
        </div>
      </div>

      {/* ── Tab pills: standalone, no container border ── */}
      <div className="mb-4 flex gap-1.5">
        <SkeletonBlock className="h-9 w-28 rounded" />
        <SkeletonBlock className="h-9 w-32 rounded" />
      </div>

      <div className="space-y-3">
        {/* Search input */}
        <SkeletonBlock className="h-10 w-full rounded" />

        {/* Result count */}
        <SkeletonLine width="w-28" className="h-2.5" />

        {/* Person cards */}
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="gc-card overflow-hidden opacity-0 animate-fade-in"
              style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
            >
              <div className="flex w-full items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <SkeletonCircle size="h-9 w-9" />
                {/* Name + assignment count */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <SkeletonLine width="w-1/3" className="h-3.5" />
                  <SkeletonLine width="w-16" className="h-2" />
                </div>
                {/* Edit button */}
                <SkeletonBlock className="h-7 w-7 rounded shrink-0" />
                {/* Chevron */}
                <SkeletonBlock className="h-4 w-4 rounded shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Logs Panel — header block + filter pills + log entries */
export function LogsPanelSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header block */}
      <div className="space-y-2">
        <SkeletonLine width="w-36" className="h-2" />
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonLine width="w-60" className="h-2.5" />
      </div>
      {/* Category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-7 w-16 rounded-full shrink-0" />
        ))}
      </div>
      {/* Log entries */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="gc-card flex items-center gap-3 p-3 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
          >
            {/* Category icon box */}
            <SkeletonBlock className="h-9 w-9 rounded shrink-0" />
            {/* Text lines */}
            <div className="flex-1 space-y-1.5">
              <SkeletonLine width="w-3/4" className="h-3" />
              <SkeletonLine width="w-1/2" className="h-2" />
            </div>
            {/* Category badge */}
            <SkeletonBlock className="h-5 w-14 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Venue Map — day toggle + map title + map container + legend */
export function VenueMapSkeleton() {
  return (
    <div className="space-y-4 py-2">
      {/* Day toggle + badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex rounded border border-gc-steel/40 bg-gc-iron/50 p-1 gap-1">
          <SkeletonBlock className="h-8 w-28 rounded" />
          <SkeletonBlock className="h-8 w-28 rounded" />
        </div>
        <SkeletonBlock className="h-6 w-20 rounded" />
      </div>
      {/* Map title */}
      <SkeletonLine width="w-56 mx-auto" className="h-3" />
      {/* Map container */}
      <div className="relative rounded-md border border-gc-steel/40 bg-gc-slate overflow-hidden">
        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-gc-crimson/15 pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-gc-crimson/15 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-gc-crimson/15 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-gc-crimson/15 pointer-events-none" />
        <SkeletonBlock className="h-64 sm:h-80 w-full rounded-none" />
      </div>
    </div>
  );
}

/** User Management Table — header + data rows */
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

/** Full-screen headcount skeleton — standalone page with atmospheric details */
export function HeadcountFullSkeleton() {
  return (
    <div className="relative flex h-screen flex-col items-center justify-center bg-gc-void select-none overflow-hidden gc-diag-bg">
      {/* Live indicator — top left */}
      <div className="absolute top-5 left-5 flex items-center gap-2">
        <SkeletonCircle size="h-2 w-2" />
        <SkeletonBlock className="h-3 w-8 rounded" />
      </div>
      {/* Back button — top right */}
      <div className="absolute top-5 right-5">
        <SkeletonBlock className="h-9 w-28 rounded border border-gc-steel/40" />
      </div>
      {/* Eye icon */}
      <SkeletonBlock className="h-14 w-14 sm:h-20 sm:w-20 rounded mb-4" />
      {/* Giant counter */}
      <SkeletonBlock className="h-32 w-48 sm:h-48 sm:w-64 rounded-md mb-2" />
      {/* Label */}
      <SkeletonBlock className="h-3 w-24 rounded" />
      {/* +/− control buttons — bottom */}
      <div className="absolute bottom-10 sm:bottom-14 flex gap-6">
        <SkeletonBlock className="h-16 w-16 sm:h-20 sm:w-20 rounded-md" />
        <SkeletonBlock className="h-16 w-16 sm:h-20 sm:w-20 rounded-md" />
      </div>
      {/* Keyboard hint */}
      <div className="absolute bottom-3 sm:bottom-5 flex items-center gap-2">
        <SkeletonBlock className="h-5 w-6 rounded" />
        <SkeletonBlock className="h-3 w-16 rounded" />
        <SkeletonBlock className="h-5 w-6 rounded" />
      </div>
    </div>
  );
}

/** Attendance page — volunteer list (block tabs & sub-tabs render above) */
export function AttendanceSkeleton() {
  return (
    <div className="space-y-3">
      {/* Volunteer rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="gc-card p-3 flex items-center gap-3 opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
        >
          <SkeletonCircle size="h-8 w-8" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="w-1/3" className="h-3" />
            <SkeletonLine width="w-1/4" className="h-2" />
          </div>
          <SkeletonBlock className="h-7 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Contribution hub — tab bar + content form/list */
export function ContributionListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded border border-gc-steel/20 bg-gc-iron/30 p-1">
        <SkeletonBlock className="h-8 flex-1 rounded" />
        <SkeletonBlock className="h-8 flex-1 rounded" />
        <SkeletonBlock className="h-8 flex-1 rounded" />
      </div>
      {/* Form area */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonBlock className="h-10 w-full rounded" />
          <SkeletonBlock className="h-10 w-full rounded" />
        </div>
        <SkeletonBlock className="h-20 w-full rounded" />
        <SkeletonBlock className="h-9 w-36 rounded" />
      </div>
      {/* Recent heading */}
      <SkeletonBlock className="h-5 w-28" />
      {/* Contribution items */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded bg-gc-iron border border-gc-steel/50 px-3 py-2.5 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
          >
            <SkeletonCircle size="h-2 w-2" className="mt-1.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonLine width="w-1/2" className="h-3" />
              <SkeletonLine width="w-3/4" className="h-2.5" />
              <SkeletonLine width="w-1/3" className="h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Expense tracker — summary banner + expense list */
export function ExpenseTrackerSkeleton() {
  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="flex items-center justify-between rounded bg-gc-warning/8 border border-gc-warning/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-5 rounded" />
          <SkeletonLine width="w-20" className="h-3" />
        </div>
        <SkeletonBlock className="h-7 w-20 rounded" />
      </div>
      {/* Add button */}
      <SkeletonBlock className="h-9 w-full rounded" />
      {/* Expense rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded bg-gc-iron border border-gc-steel/50 px-3 py-2.5 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
          >
            <SkeletonCircle size="h-2 w-2" className="shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonLine width="w-1/3" className="h-3" />
              <SkeletonLine width="w-1/2" className="h-2" />
            </div>
            <SkeletonBlock className="h-5 w-16 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Incident log — report form + incident list */
export function IncidentLogSkeleton() {
  return (
    <div className="space-y-5">
      {/* Quick report form */}
      <div className="space-y-3 rounded bg-gc-danger/5 border border-gc-danger/15 p-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-5 rounded" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <SkeletonBlock className="h-10 w-full rounded" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-10 w-full rounded" />
          <SkeletonBlock className="h-10 w-full rounded" />
        </div>
        <SkeletonBlock className="h-20 w-full rounded" />
        <SkeletonBlock className="h-9 w-32 rounded" />
      </div>
      {/* Recent heading + export */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-7 w-20 rounded" />
      </div>
      {/* Incident cards */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="gc-card p-3 space-y-2 opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "forwards" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1.5">
                <SkeletonLine width="w-2/3" className="h-3.5" />
                <SkeletonLine width="w-full" className="h-2.5" />
                <SkeletonLine width="w-1/2" className="h-2" />
              </div>
              <SkeletonBlock className="h-5 w-14 rounded shrink-0 ml-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Committee Card — list of committee cards with member tags */
export function CommitteeCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="gc-card overflow-hidden opacity-0 animate-fade-in"
          style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "forwards" }}
        >
          {/* Color accent bar */}
          <div className="h-1 gc-skeleton" />
          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Header: icon + name + count */}
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-8 w-8 rounded shrink-0" />
              <SkeletonLine width="w-40" className="h-4" />
              <SkeletonBlock className="h-4 w-8 rounded ml-auto" />
            </div>
            {/* Member tags */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-1.5">
                  <SkeletonCircle size="h-4 w-4" />
                  <SkeletonLine width="w-14" className="h-2.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonBlock;