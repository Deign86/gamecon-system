# Gamecon System (PlayVerse Ops) — Copilot Instructions

This file governs all development in this workspace: frontend design, component authoring, data access, and Cloud Functions. Read it in full before writing any code.

---

## 0 · Auto-Invoked Skills

**Context7 Documentation — ALWAYS AUTO-INVOKE.**
Before writing or modifying ANY code that uses a project dependency, you MUST fetch up-to-date documentation via Context7:

1. **Resolve** the library ID by calling `resolve-library-id` with the package name (e.g., `react`, `motion`, `firebase`, `tailwindcss`).
2. **Fetch** relevant docs by calling `get-library-docs` with the resolved ID and a topic matching your task (e.g., `hooks`, `AnimatePresence`, `firestore queries`).
3. **Apply** the latest API patterns from the returned docs — do not rely on training-data assumptions about library APIs.

This applies to every prompt that touches project dependencies — no exceptions. When a task involves multiple libraries, resolve and fetch docs for each one.

**Frontend Design Skill — ALWAYS AUTO-INVOKE.**
Before writing or modifying ANY UI component, you MUST read and follow the frontend design skill:

1. **Load** `.skills/anthropic-skills/skills/frontend-design/SKILL.md` using `read_file`.
2. **Apply** its Design Thinking process (Purpose → Tone → Differentiation) within this project's established aesthetic (dark industrial / sports-broadcast).
3. **Follow** its typography, color, motion, and spatial composition guidelines — layered on top of this project's design tokens (§4).

This applies to every prompt that touches `.jsx` files, CSS, layout, or any visual output — no exceptions.

---

## 1 · Project Overview

**PlayVerse Ops** is the internal operations dashboard for **IT GameCon 2026** (COED Building — Assembly Hall, March 5–6 2026). It is a mobile-first PWA used by event staff (admins, proctors, committee heads, viewers) to manage headcounts, shifts, volunteer roles, contributions, attendance, tasks, venue status, incidents, and user accounts in real time.

- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS 3 (custom design tokens — see §4) + `src/index.css` component classes
- **Animation**: Framer Motion 11 (`motion`, `AnimatePresence`)
- **Routing**: React Router v7 (single `<Routes>` tree in `src/App.jsx`; navigation is tab-based via `TabCtx`, not URL-based, except for standalone routes)
- **Backend**: Firebase 10 — Firestore, Auth, Cloud Functions (v2), Cloud Messaging (FCM)
- **Deployment**: Vercel (project: `playverse-ops`); Firebase Functions deployed separately via `firebase deploy --only functions`
- **Native wrapper**: Capacitor (Android) + Tauri (desktop) — config in `capacitor.config.json` and `src-tauri/tauri.conf.json`
- **Icons**: `lucide-react`
- **Utilities**: `clsx`, `date-fns`, `xlsx` (role-sheet import)
- **Analytics**: `@vercel/analytics` (imported in `App.jsx`)

---

## 2 · Architecture & Data Flow

### Auth
- `src/hooks/useAuth.jsx` — `AuthProvider` wraps the app; exposes `{ user, profile, loading, setProfile }`.
- `profile` is the Firestore `users/{uid}` document (fields: `name`, `email`, `role`, `committee`, `active`, `createdAt`).
- Roles: `admin > proctor > head > viewer`. Role-gated UI is checked inline against `profile.role`.
- `signIn` / `signOut` are named exports from `useAuth.jsx`.

### Theme System
- `src/hooks/useTheme.jsx` — `ThemeProvider` exposes `{ mode, effective, setTheme }`.
- Supports `"system" | "light" | "dark"` modes; resolves via OS media query.
- Applies class to `<html>` and updates `theme-color` meta tag.
- Persisted to `localStorage` key `gc-theme-pref`.

### Tab System
- `src/App.jsx` exports `TabCtx`; components call `useTab()` to read/set the current tab.
- Tab keys: `dashboard`, `roles`, `users`, `me`, `logs`.
- `contributions` tab has been consolidated into the Dashboard via `ContributionHub`.
- Tab resets to `dashboard` on user change.
- All tab views are **lazy-loaded** via `React.lazy`.

### Cloud Functions (`functions/index.js`)
All privileged mutations go through callable Cloud Functions that verify the caller has `role === "admin"` in Firestore before proceeding.

| Export | Purpose |
|---|---|
| `createUserAccount` | Creates Firebase Auth user + Firestore doc; returns `{ uid, password }` |
| `updateUserRoleAndCommittee` | Updates role, committee, and/or active status |
| `setUserRole` | Standalone role update (admin-only) |
| `setUserActiveStatus` | Enable/disable a user |
| `resetSystemData` | Wipes all event-data collections + resets headcounts |
| `deleteUser` | Deletes Auth record + Firestore doc |
| `scheduledCleanupOldLogs` | Scheduled (daily 02:00 Asia/Manila) — deletes logs > 7 days old |
| `validateCommitteeShiftLimits` | Firestore trigger on `committeeShifts/{docId}` — enforces max assignees, rolls back violations |
| `onNewIncident` | Firestore trigger on `incidents/{docId}` create — sends FCM push to all registered devices |

Client-side wrappers live in `src/lib/adminApi.js`. `sendPasswordReset` uses the Firebase Auth client SDK directly (no Cloud Function needed).

### Firestore Collections
| Collection | Purpose |
|---|---|
| `users` | Staff profiles (name, email, role, committee, active) |
| `committeeShifts` | Per-committee shift assignments per day-block (replaces old `shifts`) |
| `roleAssignments` | Per-person committee role slots by day |
| `committeeSchedules` | Per-committee schedule metadata |
| `contributions` | Volunteer contribution log entries |
| `expenses` | Budget/expense line items |
| `incidents` | Incident reports (triggers FCM on create) |
| `zones` | Per-zone live headcounts (currentCount, peakCount, lastUpdated) |
| `counters` | Standalone aggregate counters (e.g. `counters/headcount`) |
| `tasks` | Kanban task board items (title, status, assignees, priority, day) |
| `attendanceRecords` | Staff attendance check-in records per block per person |
| `logs` | Client-side audit/activity log (via `auditLog.js`) |
| `auditLogs` | Server-side audit log (written by Cloud Functions) |
| `fcmTokens` | Push notification device tokens |

---

## 3 · Component Map

### Top-level layout (`src/App.jsx`)
- `AuthGate` — login screen (shown when `!user`)
- `TopNav` — app header with logo, user name, sign-out
- `BottomNav` — tab bar (mobile-first); shows role-appropriate tabs
- `ForegroundNotificationHandler` — listens for FCM messages and shows toasts

### Tab views (lazy-loaded)
| Tab | Component | Access |
|---|---|---|
| `dashboard` | `Dashboard.jsx` | All authenticated |
| `roles` | `RoleTasking.jsx` | Admin only |
| `users` | `admin/AdminUsersPage.jsx` | Admin only |
| `me` | `ProfilePanel.jsx` | All authenticated |
| `logs` | `LogsPanel.jsx` | Admin only |

### Standalone routes
| Route | Component | Notes |
|---|---|---|
| `/headcount/fullscreen` | `headcount/FullScreenHeadcountView.jsx` | Full-screen tap counter, standalone |
| `/admin/users` | `admin/AdminUsersPage.jsx` | Standalone admin users page (own `AuthProvider`) |

### Dashboard cards (9 cards, opened via `Modal.jsx`)
| Card Key | Component | ID |
|---|---|---|
| `headcount` | `ZoneCounter` | M-01 |
| `shifts` | `ShiftBoard` | M-02 |
| `attendance` | `AttendancePage` | M-03 |
| `contributions` | `ContributionHub` | M-04 |
| `budget` | `ExpenseTracker` | M-05 |
| `incidents` | `IncidentLog` | M-06 |
| `committees` | `CommitteeCard` | M-07 |
| `venuemap` | `VenueMapWithStatus` | M-08 |
| `tasks` | `TaskBoard` | M-09 |

### Sub-components
- `contributions/` — `ContributionHub`, `PersonContributionView`, `CommitteeContributionView`, `ContributionFormModal`
- `headcount/` — `ZoneCounterCard`
- `roles/` — `PersonRolesEditor`, `CommitteeScheduleEditor`, `AddPersonDialog`
- `shifts/` — `ShiftCommitteeRow`, `AddAssigneeDialog`
- `admin/` — `AdminUsersPage`, `UserManagementTable`, `EditUserDrawer`, `CreateUserForm`, `UserStatusBadge`
- `profile/` — `IncidentNotificationToggle`
- `tasks/` — `TaskBoard`, `TaskCard`, `TaskColumn`, `TaskFormDrawer`
- `venue/` — `VenueMapWithStatus`, `ZoneOverlay`, `ZoneDetailDrawer`
- `attendance/` — `AttendancePage`, `AttendanceList`, `AttendanceSummary`

### Shared primitives
`Modal`, `Toast` (+ `useToast` hook from `Toast.jsx`), `ErrorBoundary`, `GCLogo`, `AdminResetPanel`, `ChangePasswordForm`, `ImportRoleSheet`

---

## 4 · Design System

### Color tokens (`gc-*`)
| Token | Hex | Use |
|---|---|---|
| `gc-crimson` | `#C8102E` | Primary accent, CTAs, active states |
| `gc-scarlet` | `#E31837` | Hover/emphasis on crimson elements |
| `gc-blood` | `#7A0019` | Deep pressed states |
| `gc-ember` | `#FF2D2D` | Danger highlights |
| `gc-void` | `#080808` | Deepest background |
| `gc-night` | `#111111` | Page background |
| `gc-slate` | `#1A1A1A` | Card background |
| `gc-iron` | `#222222` | Elevated surfaces |
| `gc-steel` | `#333333` | Borders, dividers |
| `gc-mist` | `#888888` | Secondary text |
| `gc-cloud` | `#CCCCCC` | Body text |
| `gc-white` | `#FFFFFF` | Primary text |
| `gc-success` | `#22C55E` | Positive states |
| `gc-warning` | `#EAB308` | Caution states |
| `gc-danger` | `#EF4444` | Error states |

### Typography
| Role | Font | Class |
|---|---|---|
| Display / headings | Teko | `font-display` |
| Body / UI text | Lexend | `font-body` |
| Monospace / data | JetBrains Mono | `font-mono` |

### CSS utility classes (defined in `src/index.css`)
- `.gc-diag-bg` — diagonal slash background pattern
- `.gc-noise` — animated SVG noise overlay, `::before` fixed to viewport
- `.gc-slash` — card with diagonal crimson accent stripe
- `.gc-card` — base card: `#1a1a1a` bg, `#2a2a2a` border, crimson glow on hover
- `.gc-card-accent` — card with top gradient bar
- `.gc-counter` — radial-gradient crimson counter badge
- `.gc-chip`, `.gc-chip-green`, `.gc-chip-yellow` — status pill chips
- `.text-shadow-red` — crimson glow text shadow

### Animation keyframes
`fade-up`, `fade-in`, `slide-up`, `pulse-ring`, `glow`, `count-pop`, `diagonal`, `grain`

---

## 5 · Key Library Files

| File | Purpose |
|---|---|
| `src/lib/roleConfig.js` | `COMMITTEE_MAP`, `COMMITTEE_NAMES`, `DAY_SLOTS`, `APP_ROLES`, `VALID_ROLES` |
| `src/lib/constants.js` | `ZONES`, `COMMITTEES`, `ROLE_COMMITTEES`, `COMMITTEE_REQUIRED_STAFF`, `EXPENSE_CATEGORIES`, `SHIFT_BLOCKS` |
| `src/lib/roleFirestore.js` | `subscribeRoleAssignments`, `subscribeCommitteeSchedules` |
| `src/lib/shiftFirestore.js` | `subscribeShiftsForBlock`, `addAssigneeToShift`, `removeAssigneeFromShift`, `initialiseBlockShifts` |
| `src/lib/shiftLimitsConfig.js` | `DEFAULT_SHIFT_LIMITS`, `DAY_BLOCK_OVERRIDES`, `getShiftLimits`, `limitKeyForCommittee` |
| `src/lib/contributionsFirestore.js` | Contribution CRUD + subscriptions |
| `src/lib/tasksFirestore.js` | Task Board (Kanban) CRUD + `subscribeTasks` real-time subscription |
| `src/lib/attendanceFirestore.js` | Staff attendance check-in — volunteers from `committeeShifts`, records in `attendanceRecords` |
| `src/lib/attendanceConfig.js` | `ATTENDANCE_SESSIONS` (derived from `SHIFT_BLOCKS`), `ATTENDANCE_STATUSES`, `STATUS_META`, `attendanceDocId` |
| `src/lib/venueZones.js` | `VENUE_ZONES`, `HALL_BOUNDS`, `BOOTH_GRID`, `getZonesForDay`, `getZoneTypeLegend`, `ZONE_TYPE_COLORS` — floor plan zone definitions |
| `src/lib/assigneePicker.js` | `getAssignablePeople` — fetches from `roleAssignments` for task assignee selectors |
| `src/lib/adminApi.js` | Client wrappers for all admin Cloud Functions |
| `src/lib/rolesEditor.js` | Mutation helpers for role assignments |
| `src/lib/parseRoleSheet.js` | `xlsx` parser — reads Excel role sheets against `COMMITTEE_MAP` |
| `src/lib/resetSystemData.js` | Client-side admin system reset helper |
| `src/lib/auditLog.js` | `logActivity` — structured audit logging to `logs` collection |
| `src/lib/messaging.js` | FCM token registration helpers |
| `src/lib/logger.js` | Console-level error/info logging utility |
| `src/lib/changePassword.js` | Client-side password change |
| `src/lib/utils.js` | `cn()` (clsx wrapper), `fmtDate`, and misc helpers |

### Hooks
| Hook | Purpose |
|---|---|
| `useAuth` | Auth context — `{ user, profile, loading, setProfile }` |
| `useCollection` | Generic real-time Firestore collection subscription |
| `useHeadcount` | Per-zone headcount subscription |
| `useTotalHeadcount` | Aggregate headcount counter |
| `useTheme` | Theme context — `{ mode, effective, setTheme }` |
| `useVenueStatus` | Real-time venue map status — headcounts, incidents, staff per zone |

---

## 6 · Committees & Event Config

### Committees
Defined in `src/lib/roleConfig.js` (`COMMITTEE_MAP`) and `src/lib/constants.js` (`COMMITTEES`).

Canonical names: `Proctors`, `Marketing`, `Creatives`, `Awards & Prizes`, `Documentation/Photographers`, `Exhibitors`, `Venue Designer & Management`, `Ticketing`, `Voting`, `Guest Relations Officers`, `Technical Committee`, `E-Sport Organizers`, `Esports Technical`, `Shoutcaster`

Seed committee IDs: `proctors`, `marketing`, `creatives`, `awards-prizes`, `documentation`, `exhibitors`, `venue-design`, `ticketing`, `voting`, `guest-relations`, `technical`, `esports`

Special: `crowd-control` (shift-only, excluded from `ROLE_COMMITTEES` picker).

Day slots: `DAY 1`, `DAY 2`, `DAY1/2` (combined)

### Shift Blocks
Defined in `src/lib/constants.js` (`SHIFT_BLOCKS`), also used for attendance sessions:

| ID | Label | Date | Time |
|---|---|---|---|
| `d1-morning` | Day 1 — Morning | 2026-03-05 | 09:00–12:00 |
| `d1-afternoon` | Day 1 — Afternoon | 2026-03-05 | 13:00–17:00 |
| `d2-morning` | Day 2 — Morning | 2026-03-06 | 09:00–12:00 |
| `d2-afternoon` | Day 2 — Afternoon | 2026-03-06 | 13:00–17:00 |

### Venue Zones
Defined in `src/lib/venueZones.js`. The floor plan is the COED Building Assembly Hall (16 m × 21 m). Zones include:
- E-Sport Areas (1–3, Day 2 drops ES-3)
- Exhibitor Area with per-booth grid (Day 1: 4×4, Day 2: 5×3)
- Holding Area, Voting Area, Ticketing (outside hall), Photo Backdrop, TTRPG, Play w/ Prof, RCY, Committee Area
- One-way entry policy: Entrance (bottom-right) → Exit (bottom-left), no re-entry

### Attendance Statuses
`present`, `late`, `excused`, `absent` — defined in `src/lib/attendanceConfig.js`

### Task Statuses (Kanban)
`todo`, `in_progress`, `done` — tasks belong to a day and optionally a zone/committee

---

## 7 · Frontend Design Principles

### Core Philosophy
Create distinctive, production-grade interfaces that avoid generic AI aesthetics. Implement real working code with exceptional attention to aesthetic detail.

### Design Thinking
Before coding any UI, commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Extreme, intentional. Choose one: brutally minimal, maximalist chaos, retro-futuristic, luxury/refined, brutalist/raw, industrial/utilitarian, etc.
- **Differentiation**: What is the single unforgettable thing?

**This project's established aesthetic**: dark industrial / sports-broadcast — deep blacks, crimson accent, Teko display font, diagonal slash motifs, grain overlay, crimson glow effects. Every new component must feel native to this language.

### Typography rules
- Use `font-display` (Teko) for all headings, labels, and display text
- Use `font-body` (Lexend) for all body/paragraph/form text
- Use `font-mono` (JetBrains Mono) for counts, IDs, timestamps, code
- NEVER use Inter, Roboto, Arial, or system fonts

### Color rules
- Crimson (`gc-crimson`) is the sole primary accent — do not introduce new accent hues without reason
- Backgrounds must use the `gc-void / gc-night / gc-slate / gc-iron` scale
- Text uses `gc-white / gc-cloud / gc-mist` scale
- Green/yellow/red semantic states only via `gc-success / gc-warning / gc-danger`

### Motion rules
- All page/tab transitions use Framer Motion `AnimatePresence` + `motion.div` with `opacity + y` variants
- Stagger children with `staggerChildren: 0.04–0.07s` on list/card entrances
- Spring physics: `damping 22–26, stiffness 260–300`
- Never add gratuitous animation — one orchestrated entrance per view + hover states only

### Layout rules
- Mobile-first; max content width `max-w-5xl` (dashboard), `max-w-3xl` (forms/lists)
- Cards use `.gc-card` or `.gc-card-accent`; apply `.gc-slash` for accent stripe variant
- Modals use the shared `Modal.jsx` component — never create ad-hoc overlay divs

### Anti-Patterns (NEVER)
- Purple gradients, generic blue CTAs, white backgrounds
- Inter / Roboto / Space Grotesk
- Flat, unanimated list renders
- Inline `style={{}}` for colors that have a design token equivalent
- Bypassing `adminApi.js` for privileged mutations (always use Cloud Function wrappers)
- Storing sensitive data (passwords, tokens) in component state beyond the immediate operation

---

## 8 · Conventions

- All components are `.jsx`; all non-component modules are `.js` or `.mjs`
- Use named exports for hooks and utilities; default export for components
- Firestore subscriptions return an unsubscribe function — always clean up in `useEffect` return
- Toast notifications use `useToast()` from `src/components/Toast.jsx`
- Auth-gated sections check `profile?.role === "admin"` (or relevant role) — never trust client-side role alone for mutations (Cloud Functions re-verify)
- `cn()` from `src/lib/utils.js` is the standard class merging utility (wraps `clsx`)
- Audit logging uses `logActivity()` from `src/lib/auditLog.js` — fire-and-forget, does not throw on failure
- Data seeding scripts live in `scripts/` (`seedFirestore.mjs`, `seedUsers.mjs`, `updateShiftCounts.mjs`)

---

## 9 · Anthropic Agent Skills

This workspace has 16 Anthropic Agent Skills installed at `.skills/anthropic-skills/skills/`.
The full registry and trigger descriptions are in `.github/skills-instructions.md`.

**How to use:** When a task matches a skill's description (frontend design, PDF/DOCX/XLSX/PPTX manipulation, webapp testing, MCP server building, etc.), read the relevant `SKILL.md` and follow its workflow before writing code. Skills provide battle-tested templates, scripts, and step-by-step processes.

To update skills: `cd .skills/anthropic-skills && git pull`
