# Gamecon System (PlayVerse Ops) — Copilot Instructions

This file governs all development in this workspace: frontend design, component authoring, data access, and Cloud Functions. Read it in full before writing any code.

---

## 1 · Project Overview

**PlayVerse Ops** is the internal operations dashboard for **IT GameCon 2026** (COED Building — Assembly Hall, March 5–6 2026). It is a mobile-first PWA used by event staff (admins, proctors, committee heads, viewers) to manage headcounts, shifts, volunteer roles, contributions, incidents, and user accounts in real time.

- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS 3 (custom design tokens — see §4) + `src/index.css` component classes
- **Animation**: Framer Motion 11 (`motion`, `AnimatePresence`)
- **Routing**: React Router v7 (single `<Routes>` tree in `src/App.jsx`; navigation is tab-based via `TabCtx`, not URL-based, except for the `/headcount` full-screen standalone route)
- **Backend**: Firebase 10 — Firestore, Auth, Cloud Functions (v2), Cloud Messaging (FCM)
- **Deployment**: Vercel (project: `playverse-ops`); Firebase Functions deployed separately via `firebase deploy --only functions`
- **Icons**: `lucide-react`
- **Utilities**: `clsx`, `date-fns`, `xlsx` (role-sheet import)

---

## 2 · Architecture & Data Flow

### Auth
- `src/hooks/useAuth.jsx` — `AuthProvider` wraps the app; exposes `{ user, profile, loading, setProfile }`.
- `profile` is the Firestore `users/{uid}` document (fields: `name`, `email`, `role`, `committee`, `active`, `createdAt`).
- Roles: `admin > proctor > head > viewer`. Role-gated UI is checked inline against `profile.role`.
- `signIn` / `signOut` are named exports from `useAuth.jsx`.

### Tab System
- `src/App.jsx` exports `TabCtx`; components call `useTab()` to read/set the current tab.
- Tab keys: `dashboard`, `roles`, `users`, `contributions`, `me`, `logs`.
- Tab resets to `dashboard` on user change.
- All tab views are **lazy-loaded** via `React.lazy`.

### Cloud Functions (`functions/index.js`)
All privileged mutations go through callable Cloud Functions that verify the caller has `role === "admin"` in Firestore before proceeding.

| Export | Purpose |
|---|---|
| `createUserAccount` | Creates Firebase Auth user + Firestore doc; returns `{ uid, password }` |
| `updateUserRoleAndCommittee` | Updates role, committee, and/or active status |
| `setUserActiveStatus` | Enable/disable a user |
| `deleteUser` | Deletes Auth record + Firestore doc |
| `onNewIncident` (Firestore trigger) | Fires `sendIncidentNotifications` when an incident document is created |

Client-side wrappers live in `src/lib/adminApi.js`. `sendPasswordReset` uses the Firebase Auth client SDK directly (no Cloud Function needed).

### Firestore Collections
| Collection | Purpose |
|---|---|
| `users` | Staff profiles (name, email, role, committee, active) |
| `shifts` | Shift block assignments per committee |
| `roleAssignments` | Per-person committee role slots by day |
| `committeeSchedules` | Per-committee schedule metadata |
| `contributions` | Volunteer contribution log entries |
| `expenses` | Budget/expense line items |
| `incidents` | Incident reports (triggers FCM on create) |
| `headcount` | Per-zone live counters |
| `logs` | Admin audit/activity log |

---

## 3 · Component Map

### Top-level layout (`src/App.jsx`)
- `AuthGate` — login screen (shown when `!user`)
- `TopNav` — app header with logo, user name, sign-out
- `BottomNav` — tab bar (mobile-first)
- `ForegroundNotificationHandler` — listens for FCM messages and shows toasts

### Tab views (lazy-loaded)
| Tab | Component | Access |
|---|---|---|
| `dashboard` | `Dashboard.jsx` | All authenticated |
| `roles` | `RoleTasking.jsx` | Admin only |
| `users` | `admin/AdminUsersPage.jsx` | Admin only |
| `contributions` | `contributions/ContributionTabs.jsx` | All authenticated |
| `me` | `ProfilePanel.jsx` | All authenticated |
| `logs` | `LogsPanel.jsx` | Admin/proctor |

### Dashboard cards (via `Modal.jsx`)
`ZoneCounter`, `ShiftBoard`, `ContributionForm`, `ExpenseTracker`, `IncidentLog`, `CommitteeCard`

### Standalone route
`/headcount` → `headcount/FullScreenHeadcountView.jsx` — full-screen tap counter with its own `AuthProvider`; uses `useTotalHeadcount` hook.

### Sub-components
- `contributions/` — `PersonContributionView`, `CommitteeContributionView`, `ContributionFormModal`
- `headcount/` — `ZoneCounterCard`
- `roles/` — `PersonRolesEditor`, `CommitteeScheduleEditor`, `AddPersonDialog`
- `shifts/` — `ShiftCommitteeRow`, `AddAssigneeDialog`
- `admin/` — `UserManagementTable`, `EditUserDrawer`, `CreateUserForm`, `UserStatusBadge`
- `profile/` — `IncidentNotificationToggle`

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
| `src/lib/roleFirestore.js` | `subscribeRoleAssignments`, `subscribeCommitteeSchedules` |
| `src/lib/shiftFirestore.js` | `subscribeShiftsForBlock`, `addAssigneeToShift`, `removeAssigneeFromShift`, `initialiseBlockShifts` |
| `src/lib/contributionsFirestore.js` | Contribution CRUD + subscriptions |
| `src/lib/adminApi.js` | Client wrappers for all admin Cloud Functions |
| `src/lib/rolesEditor.js` | Mutation helpers for role assignments |
| `src/lib/parseRoleSheet.js` | `xlsx` parser — reads Excel role sheets against `COMMITTEE_MAP` |
| `src/lib/resetSystemData.js` | Admin system reset (wipes shifts/roles/contributions) |
| `src/lib/messaging.js` | FCM token registration helpers |
| `src/lib/logger.js` | Firestore activity logger |
| `src/lib/changePassword.js` | Client-side password change |
| `src/lib/utils.js` | `cn()` (clsx wrapper) and misc helpers |

---

## 6 · Committees

Defined in `src/lib/roleConfig.js` (`COMMITTEE_MAP`). Committee names used throughout the app:

`Proctors`, `Marketing`, `Creatives`, `Awards & Prizes`, `Documentation/Photographers`, `Exhibitors`, `Venue Designer & Management`, `Ticketing`, `Voting`, `Guest Relations Officers`, `Technical Committee`, `E-Sport Organizers`

Day slots: `DAY 1`, `DAY 2`, `DAY1/2` (combined)

Seed committee IDs (used in `ShiftBoard`): `proctors`, `marketing`, `creatives`, `awards-prizes`, `documentation`, `exhibitors`, `venue-design`, `ticketing`, `voting`, `guest-relations`, `technical`, `esports`

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
- Data seeding scripts live in `src/data/` and are run with `npm run seed` (`seedFirestore.mjs`)
