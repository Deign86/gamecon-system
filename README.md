# PlayVerse Ops — Gamecon 2026 Operations System

A production-grade internal operations dashboard built for **IT GameCon 2026** (COED Building — Assembly Hall, March 5–6, 2026). The system provides real-time staff coordination including headcount tracking, shift scheduling, role tasking, task management, attendance tracking, venue mapping, incident logging, budget monitoring, and push notifications. Deployed as a PWA via Vercel with native wrappers for Android (Capacitor) and desktop (Tauri).

---

## Overview

PlayVerse Ops is a mobile-first PWA used by event staff (admins, proctors, committee heads, viewers) to manage all operational aspects of the two-day event in real time. All data is synchronized via Firebase Firestore with role-gated access enforced both client-side and server-side.

### Key Features

- **Live Headcount** — Zone-by-zone real-time headcount tracking with a full-screen board view for operations displays
- **Shift Board** — Visual shift scheduling and assignment management with committee groupings and configurable per-committee min/max staff limits (with day-block overrides)
- **Role Tasking** — Assign and track staff roles across committees; supports importing role sheets from Excel spreadsheets
- **Task Board (Kanban)** — Drag-and-drop task management with `todo → in_progress → done` workflow, priority levels, day/zone/committee assignment, and real-time Firestore sync
- **Attendance Tracking** — Per-shift-block staff attendance (present / late / excused / absent) with volunteers sourced dynamically from the Shift Board; includes bulk "mark remaining absent" action
- **Interactive Venue Map** — SVG floor plan of the Assembly Hall (16 m × 21 m) with day-specific zone layouts, per-zone type color coding, clickable overlays, and live aggregation of headcount, open incidents, and staff-on-duty data
- **Incident Log** — Structured incident reporting with resolve/reopen workflow and FCM push notifications to all registered devices on new incidents
- **Contribution Hub** — Consolidated volunteer contribution tracking with three views: My Log, By Person, and By Committee (role-gated)
- **Budget Monitor** — Expense tracking and budget visibility with categorized line items
- **Committee Cards** — Per-committee status and headcount summaries
- **Admin Panel** — User creation, role management, password resets, account enable/disable, and system reset — exclusively for admins
- **Excel Export** — One-click `.xlsx` export for attendance, contributions, shifts, incidents, expenses, and audit logs (multi-sheet workbooks with summaries)
- **Push Notifications** — Cross-platform FCM support (Web, Android via Capacitor, Desktop via Tauri Notification API) with per-device toggle
- **Theme System** — Light / Dark / System auto-detect with live cross-tab sync and OS media query listener
- **Audit Logging** — Structured client-side audit log (fire-and-forget) plus server-side audit logs written by Cloud Functions; admin-only Logs panel with auto-cleanup of entries older than 7 days
- **Native Apps** — Android APK (Capacitor) and Windows desktop installer (Tauri NSIS)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 6 |
| Routing | React Router v7 (tab-based via `TabCtx`) |
| Styling | Tailwind CSS 3 (custom design tokens) |
| Animation | Framer Motion 11 |
| Icons | Lucide React |
| Backend / Database | Firebase 10 — Firestore |
| Authentication | Firebase Auth |
| Cloud Functions | Firebase Cloud Functions v2 (Node.js) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Spreadsheet I/O | xlsx (SheetJS) — import & export |
| Analytics | Vercel Web Analytics |
| Android | Capacitor 8 |
| Desktop | Tauri 2 (Rust) |
| Deployment | Vercel (PWA) / Firebase (Functions) |
| Utilities | `clsx`, `date-fns` |

---

## Project Structure

```
├── src/
│   ├── App.jsx                  # Root shell, routing, tab context, auth guard
│   ├── firebase.js              # Firebase SDK initialization
│   ├── index.css                # Tailwind base + custom component classes (gc-*)
│   ├── components/
│   │   ├── admin/               # User management (table, drawer, create form)
│   │   ├── attendance/          # Attendance page, list, summary
│   │   ├── contributions/       # ContributionHub, person/committee views, form
│   │   ├── headcount/           # Zone counter cards, full-screen board
│   │   ├── profile/             # Notification toggle
│   │   ├── roles/               # Person/committee role editors, add dialog
│   │   ├── shifts/              # Shift rows, add assignee dialog
│   │   ├── tasks/               # TaskBoard, TaskCard, TaskColumn, TaskFormDrawer
│   │   └── venue/               # VenueMapWithStatus, ZoneOverlay, ZoneDetailDrawer
│   ├── hooks/
│   │   ├── useAuth.jsx          # AuthProvider — user, profile, loading
│   │   ├── useTheme.jsx         # ThemeProvider — light/dark/system
│   │   ├── useFirestore.js      # Generic real-time collection subscription
│   │   ├── useHeadcount.js      # Per-zone headcount subscription
│   │   ├── useTotalHeadcount.js # Aggregate headcount counter
│   │   └── useVenueStatus.js    # Live venue map status (headcount, incidents, staff)
│   └── lib/
│       ├── adminApi.js          # Client wrappers for admin Cloud Functions
│       ├── assigneePicker.js    # Assignee selector helper (from roleAssignments)
│       ├── attendanceConfig.js  # Session definitions, statuses, metadata
│       ├── attendanceFirestore.js # Attendance CRUD + subscriptions
│       ├── auditLog.js          # Structured audit logging (fire-and-forget)
│       ├── constants.js         # Zones, committees, shift blocks, expense categories
│       ├── contributionsFirestore.js # Contribution CRUD + subscriptions
│       ├── exportExcel.js       # Excel export helpers (6 data types)
│       ├── messaging.js         # FCM token registration (Web / Capacitor / Tauri)
│       ├── roleConfig.js        # COMMITTEE_MAP, DAY_SLOTS, APP_ROLES
│       ├── roleFirestore.js     # Role assignment subscriptions
│       ├── rolesEditor.js       # Role assignment mutation helpers
│       ├── shiftFirestore.js    # Shift CRUD + subscriptions
│       ├── shiftLimitsConfig.js # Per-committee min/max staff + day-block overrides
│       ├── tasksFirestore.js    # Task Board CRUD + real-time subscriptions
│       ├── venueZones.js        # Floor plan zone definitions, booth grid, bounds
│       └── utils.js             # cn() (clsx wrapper), fmtDate, misc helpers
├── functions/
│   ├── index.js                 # Cloud Functions (9 exports)
│   └── shiftLimitsConfig.js     # Server-side shift limit enforcement config
├── scripts/
│   ├── seedFirestore.mjs        # Firestore data seeding
│   ├── seedUsers.mjs            # User account seeding
│   └── updateShiftCounts.mjs    # Shift count migration script
├── src-tauri/                   # Tauri desktop wrapper (Rust)
├── android/                     # Capacitor Android project
├── build.ps1                    # Multi-platform build script (Web + Tauri + Android)
├── firebase.json                # Firebase project configuration
├── firestore.rules              # Firestore security rules (role-based)
├── firestore.indexes.json       # Firestore composite index definitions
├── vercel.json                  # Vercel deployment (SPA rewrites + security headers)
├── capacitor.config.json        # Capacitor Android configuration
└── vite.config.js               # Vite build configuration
```

---

## Dashboard Cards

The main dashboard presents 9 feature cards, each opening as a full-screen modal:

| Card | Component | Description |
|---|---|---|
| Headcount | `ZoneCounter` | Live zone-by-zone headcount with tap counters |
| Shifts | `ShiftBoard` | Committee shift assignments per day-block |
| Attendance | `AttendancePage` | Per-block staff attendance with bulk actions |
| Contributions | `ContributionHub` | Volunteer contribution log (My Log / By Person / By Committee) |
| Budget | `ExpenseTracker` | Categorized expense tracking |
| Incidents | `IncidentLog` | Structured incident reports with resolve/reopen |
| Committees | `CommitteeCard` | Per-committee status summaries |
| Venue Map | `VenueMapWithStatus` | Interactive SVG floor plan with live status |
| Tasks | `TaskBoard` | Kanban board (todo / in progress / done) |

---

## Cloud Functions

All admin mutations are routed through callable Cloud Functions that verify `role === "admin"` server-side before executing.

| Function | Type | Purpose |
|---|---|---|
| `createUserAccount` | Callable | Creates Auth user + Firestore doc with generated password; normalizes committee names |
| `updateUserRoleAndCommittee` | Callable | Updates role, committee(s), and/or active status (with self-downgrade prevention) |
| `setUserRole` | Callable | Standalone role update (legacy compat) |
| `setUserActiveStatus` | Callable | Enables/disables a user account in Auth + Firestore |
| `deleteUser` | Callable | Deletes Auth record + Firestore doc (cannot delete self) |
| `resetSystemData` | Callable | Wipes all event-data collections and resets headcounts to zero |
| `scheduledCleanupOldLogs` | Scheduled | Runs daily at 02:00 Asia/Manila — deletes logs older than 7 days |
| `validateCommitteeShiftLimits` | Firestore trigger | Enforces max assignee limits on `committeeShifts` writes; rolls back or trims violations |
| `onNewIncident` | Firestore trigger | Sends FCM push to all registered devices on new incident creation; cleans up invalid tokens |

---

## User Roles

| Role | Access Level |
|---|---|
| `admin` | Full access — user management, system reset, all panels, all exports, audit logs |
| `proctor` | All operational panels, incident logging, headcount, task creation |
| `head` | Shift and role panels for their committee, contribution views |
| `viewer` | Read-only access to dashboards |

Role enforcement is applied at three levels: UI rendering, Firestore security rules, and Cloud Function authorization checks.

---

## Event Configuration

**Committees (13):** Proctors, Marketing, Creatives, Awards & Prizes, Documentation/Photographers, Exhibitors, Venue Designer & Management, Ticketing, Voting, Guest Relations Officers, Technical Committee, E-Sport Organizers, Esports Technical, Shoutcaster. *Crowd Control* is shift-only (excluded from the role assignment picker).

**Shift Blocks (4):**

| Block | Date | Time |
|---|---|---|
| Day 1 — Morning | March 5, 2026 | 09:00–12:00 |
| Day 1 — Afternoon | March 5, 2026 | 13:00–17:00 |
| Day 2 — Morning | March 6, 2026 | 09:00–12:00 |
| Day 2 — Afternoon | March 6, 2026 | 13:00–17:00 |

**Venue Zones (12):** E-Sport Areas 1–3 (Day 2 drops ES-3), Exhibitor Area (Day 1: 4×4 booth grid, Day 2: 5×3), Holding Area, Voting Area, Ticketing (outside hall), Photo Backdrop, TTRPG, Play w/ Prof, RCY, Committee Area. One-way entry policy: Entrance (bottom-right) → Exit (bottom-left), no re-entry.

---

## Excel Exports

Six export functions are available via the UI, producing multi-sheet `.xlsx` workbooks with auto-sized columns:

| Export | Sheets |
|---|---|
| Attendance | Records + Summary (present/late/excused/absent/unmarked) |
| Contributions | All Entries + By Committee + By Person |
| Shifts | Assignee Details + Coverage Summary (filled vs. required) |
| Incidents | Full Details + Summary (severity & status breakdown) |
| Expenses | All Expenses (₱) + By Category + By Committee |
| Audit Logs | Action, category, details, user, timestamp |

---

## Prerequisites

- Node.js 18 or later
- A Firebase project with Firestore, Authentication, Cloud Functions, and Cloud Messaging enabled
- Firebase CLI installed globally (`npm install -g firebase-tools`)
- *(Optional)* Rust toolchain for Tauri desktop builds
- *(Optional)* Android SDK + JDK 17 for Capacitor Android builds

---

## Local Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Deign86/gamecon-system.git
   cd gamecon-system
   ```

2. **Install frontend dependencies**

   ```bash
   npm install
   ```

3. **Install Cloud Functions dependencies**

   ```bash
   cd functions && npm install && cd ..
   ```

4. **Configure environment variables**

   Create a `.env` file in the project root with your Firebase project credentials:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_VAPID_KEY=your_vapid_key
   ```

   These values are available in your Firebase project console under Project Settings.

5. **Start the development server**

   ```bash
   npm run dev
   ```

---

## Firebase Setup

### Firestore Rules

Deploy the included security rules:

```bash
firebase deploy --only firestore:rules
```

### Firestore Indexes

Deploy composite indexes:

```bash
firebase deploy --only firestore:indexes
```

### Cloud Functions

Deploy all cloud functions:

```bash
firebase deploy --only functions
```

### Seed Data (Optional)

To populate initial Firestore data for development:

```bash
npm run seed
```

---

## Build & Deployment

### Web (PWA)

```bash
npm run build
```

Output is written to `dist/`. The project is configured for Vercel deployment via `vercel.json` with SPA rewrites and security headers (CSP, HSTS with preload, X-Frame-Options DENY, XSS protection, restrictive Permissions-Policy).

### Multi-Platform Build Script

The included `build.ps1` PowerShell script builds all three targets with selective flags:

```powershell
.\build.ps1              # Build all (Web + Tauri + Android)
.\build.ps1 -Web         # Web only
.\build.ps1 -Tauri       # Desktop installer only
.\build.ps1 -Android     # Android APK only
.\build.ps1 -Web -Android # Web + Android
```

Outputs are timestamped and copied to your Downloads folder.

### Deploy to Vercel

Connect the repository to Vercel and set the `VITE_` environment variables in project settings. Vercel will automatically build and deploy on push to `main`.

### Deploy Cloud Functions

```bash
firebase deploy --only functions
```

---

## Design System

The UI follows a **dark industrial / sports-broadcast** aesthetic with crimson accents, diagonal slash motifs, grain overlays, and crimson glow effects.

| Token | Use |
|---|---|
| `gc-crimson` (#C8102E) | Primary accent, CTAs, active states |
| `gc-void` / `gc-night` / `gc-slate` / `gc-iron` | Background scale (darkest → elevated) |
| `gc-white` / `gc-cloud` / `gc-mist` | Text scale (primary → secondary) |
| `gc-success` / `gc-warning` / `gc-danger` | Semantic states |

**Typography:** Teko (display/headings), Lexend (body/UI), JetBrains Mono (data/counts).

**CSS utilities:** `.gc-card`, `.gc-card-accent`, `.gc-slash`, `.gc-diag-bg`, `.gc-noise`, `.gc-chip`, `.gc-counter`, `.text-shadow-red`

---

## Security Notes

- Never commit `.env` files or service account key files. Both are excluded via `.gitignore`.
- All admin mutations go through Cloud Functions that re-verify the caller's role server-side.
- Firestore security rules enforce role-based access with helper functions (`isAdmin()`, `isAdminOrHead()`, `callerRole()`).
- Self-downgrade prevention: admin users cannot lower their own role rank via Cloud Functions.
- CSP in `vercel.json` restricts script sources to `self` only.
- FCM tokens are stored in the `fcmTokens` collection with automatic invalid token cleanup.

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | Staff profiles (name, email, role, committee, active) |
| `committeeShifts` | Per-committee shift assignments per day-block |
| `roleAssignments` | Per-person committee role slots by day |
| `committeeSchedules` | Per-committee schedule metadata |
| `contributions` | Volunteer contribution log entries |
| `expenses` | Budget/expense line items |
| `incidents` | Incident reports (triggers FCM on create) |
| `zones` | Per-zone live headcounts (currentCount, peakCount, lastUpdated) |
| `counters` | Aggregate counters (e.g., `counters/headcount`) |
| `tasks` | Kanban task board items |
| `attendanceRecords` | Staff attendance per block per person |
| `logs` | Client-side audit log |
| `auditLogs` | Server-side audit log (written by Cloud Functions) |
| `fcmTokens` | Push notification device tokens |

---

## License

Internal use only. Not for public distribution.
