# Gamecon 2026 Operations System

A production-grade internal operations platform built for Gamecon 2026 event management. The system provides real-time staff coordination capabilities including headcount tracking, shift scheduling, role tasking, incident logging, and budget monitoring. Built with React, Firebase, and deployed via Vercel.

---

## Overview

This application is an internal tool used by event staff during Gamecon 2026. It is role-gated, meaning different user roles have different levels of access to features and data. All data is stored and synchronized in real-time via Firebase Firestore.

### Key Features

- **Live Headcount** - Zone-by-zone real-time headcount tracking with a full-screen board view for operations displays
- **Shift Board** - Visual shift scheduling and assignment management with committee groupings
- **Role Tasking** - Assign and track staff roles across committees; supports importing role sheets from spreadsheets
- **Incident Log** - Structured incident reporting for event operations
- **Contributions Tracker** - Log and review volunteer contributions
- **Budget Monitor** - Expense tracking and budget visibility for committee heads
- **Committee Cards** - Per-committee status and headcount summaries
- **Admin Panel** - User creation, role management, password resets, and bulk operations exclusively for admins

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 (Vite) |
| Routing | React Router v7 |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend / Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Cloud Functions | Firebase Cloud Functions v2 (Node.js) |
| Spreadsheet Parsing | xlsx (SheetJS) |
| Deployment | Vercel |

---

## Project Structure

```
├── src/
│   ├── App.jsx                  # Root app shell, routing, auth guard
│   ├── firebase.js              # Firebase SDK initialization
│   ├── components/              # All UI components
│   │   ├── admin/               # Admin-only user management UI
│   │   ├── headcount/           # Zone counter and full-screen board
│   │   ├── profile/             # User profile components
│   │   ├── roles/               # Role tasking dialogs and editors
│   │   └── shifts/              # Shift assignment dialogs and rows
│   ├── hooks/                   # Custom React hooks (auth, Firestore, headcount)
│   ├── lib/                     # Business logic utilities (roles, shifts, admin API, logging)
│   └── data/                    # Seed scripts for Firestore data population
├── functions/                   # Firebase Cloud Functions source
│   ├── index.js                 # Admin callable functions (user CRUD, auth claims)
├── firebase.json                # Firebase project configuration
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore composite index definitions
├── vercel.json                  # Vercel deployment configuration (SPA rewrites, security headers)
└── vite.config.js               # Vite build configuration
```

---

## User Roles

| Role | Access Level |
|---|---|
| `admin` | Full access including user management, system reset, all panels |
| `proctor` | Can view all operational panels, log incidents, manage headcount |
| `head` / `committee-head` | Access to shift and role panels for their committee |
| `viewer` | Read-only access to dashboards |

Role enforcement is applied both at the Firestore security rules level and in the application UI.

---

## Prerequisites

- Node.js 18 or later
- A Firebase project with Firestore, Authentication, and Cloud Functions enabled
- Firebase CLI installed globally (`npm install -g firebase-tools`)

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

## Build and Production Deployment

### Build for production

```bash
npm run build
```

The output is written to `dist/`.

### Deploy to Vercel

The project is configured for Vercel deployment via `vercel.json`. All routes are rewritten to `index.html` for SPA behavior. Security headers (CSP, HSTS, X-Frame-Options, etc.) are set at the Vercel edge.

Connect the repository to Vercel and set the same `VITE_` environment variables in the Vercel project settings. Vercel will automatically build and deploy on push to the main branch.

---

## Security Notes

- Never commit `.env` files or service account key files. Both are excluded via `.gitignore`.
- Firebase Auth custom claims are set and validated server-side via Cloud Functions; they cannot be self-elevated by users.
- Firestore security rules enforce role checks server-side independent of the frontend.
- The Content Security Policy in `vercel.json` restricts script sources to `self` only.

---

## License

Internal use only. Not for public distribution.
