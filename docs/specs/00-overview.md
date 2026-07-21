# DM Tools — Feature Overview

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| UI Kit | Shadcn UI (base-nova style, lucide icons) |
| State/Data | TanStack React Query 5 |
| Auth/DB | Drizzle ORM + SQLite (`users` table); Firebase 12 only for Firestore |
| Permissions | Hardcoded role-based (5 roles: Admin, Head Ministry, Regional PIC, SPV, Member) in `lib/permissions.ts` |
| Theming | next-themes (class strategy, light default) |
| Package Manager | Bun |

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | Firebase app ID |
| `FIREBASE_AUTH_EMAIL` | Server | Firebase auth email for encrypted credential generation |
| `FIREBASE_AUTH_PASSWORD` | Server | Firebase auth password for encrypted credential generation |
| `NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY` | Client | AES-256-GCM key for decrypting Firebase credentials |
| `SC_BASE_URL` | Server | Base URL for external events API (used by server actions) |
| `NEXT_PUBLIC_SC_BASE_URL` | Client | Same value, used for link generation in event cards |
| `DATABASE_URL` | Server | `libsql://...` (Turso) or `file:./<name>.db` (local SQLite) |
| `DATABASE_AUTH_TOKEN` | Server | Turso auth token; omit for local SQLite |
| `NODE_ENV` | Server | `development` or `production` |

Copy `.env.template` to `.env` and fill in values. `SC_BASE_URL` is missing from `.env.template`; add it manually when using legacy event scraping. `DATABASE_URL` defaults to `db/local.sqlite3` for local development.

## Directory Layout

```
app/
  layout.tsx          Root layout — fonts, ThemeProvider, QueryClientProvider, UserSessionProvider, FirebaseAuthInitializer
  loading.tsx         Global loading spinner
  auth/
    page.tsx          Redirects to /auth/login
    login/page.tsx    Email/password login (local users table) + Firebase Auth sign-in
    forget-password/  Disabled — redirects to /auth/login
  my/                 Protected sidebar area (AuthGuard)
    home/page.tsx     Placeholder home + This Week widget
    dashboard/        Seat Counter trend chart (Admin, Head Ministry, Regional PIC)
    audit-trails/     Paginated audit log
    events/           DB-backed event management (schedule, create, detail with tabs)
    schedules/page.tsx Event assignment browser with swap request & approval
    master/           Master data CRUD pages (regions, teams, event-types, ministries, metrics, tasks, configurations)
    users/            Members (list + detail), roles master, role assignments
  tools/              Protected sidebar area (AuthGuard)
    utilities/        Reports, Assign, Tally
    doa-wilayah/      Monthly prayer schedule
    calendar/         Monthly calendar view (sample data, not connected to live data)
    reports-history/  Firestore report browser
    members/          Firebase members browser
    legacy/events/    External SC events scraper + editor
actions/              Root-level server actions (not under app/)
  auth/
    login.ts          login(), logout()
    session.ts        getUserSession() — session with role, teamId, regionId, Firebase credentials
    current-user.ts   getCurrentUser(), checkAuth()
    firebase-auth.ts  getFirebaseCredentials() — AES-256-GCM encrypted Firebase credentials
  master/             Master data actions (regions, teams, event-types, ministries, metrics, tasks, configurations)
  users/              Member, role CRUD, and role-assignment actions
  events.ts           DB-backed event CRUD actions
  schedules.ts        Schedule browser & swap request actions
  audit-trails.ts     Audit log action
  legacy-web/         External SC API actions (auth, events, users)
components/
  ui/                 Shadcn components (base-nova, @base-ui/react primitives)
  custom/             master-crud-page.tsx, data-table.tsx
  app-sidebar.tsx     Sidebar driven by lib/navigation.ts; filters by role
  auth-guard.tsx      Client-side route guard
  web-auth-guard.tsx  Auth gate for external events API
  providers.tsx       React Query provider (staleTime 5m, gcTime 30m, no refetch on focus)
  theme-provider.tsx  next-themes wrapper
  theme-toggle.tsx    Light/dark theme toggle button
  user-session-provider.tsx  React Context for session and role
  account-info.tsx    User dropdown (local auth)
  logout-button.tsx   Sidebar logout button
  firebase-auth-initializer.tsx  Silently signs in to Firebase Auth using encrypted session credentials
  ministries-dialog.tsx  Editable ministry list dialog
  metrics-dialog.tsx     Metric selection dialog (checkboxes from master data)
  refresh-cache-button.tsx  Service worker + cache clearing button
lib/
  firebase/firebase.ts  Firebase client init (hardcoded config, "use client")
  navigation.ts       Sidebar menu items: groups + root links/dropdowns with optional allowedRoles
  permissions.ts      Role constants + canAccess() guard (shared frontend/backend)
  queries/            React Query keys + Firestore/legacy action wrappers
  parsers/            Cheerio parsers for external events
  crypto/             AES-256-GCM encryption/decryption for Firebase credentials
  dummy-data.ts       Hardcoded sample events for development
  fuzzy-search.ts     Levenshtein-based fuzzy name search
hooks/
  use-mobile.ts       Mobile breakpoint detection (768px)
types/
  event.ts            EventDetail, EventArea, EventBlock, EventUser, EventAssignedUser
  firebase.d.ts       Window.__FIREBASE_APP__ augmentation
proxy.ts              Middleware function (exported but NOT wired to middleware.ts)
```

## Auth Flow

### App Auth (main app)
1. User visits `/` → intended redirect to `/my` via `proxy.ts` (only if middleware.ts is created)
2. `AuthGuard` checks for a valid `authenticated` cookie via `checkAuth()`
3. If no valid session → redirect to `/auth/login`
4. `/auth/login` page: calls `login(email, password)` server action → queries `users` table and verifies bcrypt password
5. On success, server action encrypts Firebase credentials (if `FIREBASE_AUTH_EMAIL`/`FIREBASE_AUTH_PASSWORD` are set) and returns them in the session
6. Client decrypts credentials and signs in to Firebase Auth via `signInWithEmailAndPassword` (for Firestore access)
7. `/auth/forget-password` page: disabled — redirects to `/auth/login`
8. Cookie: `authenticated={userId}`, httpOnly, 7-day expiry

### Web Auth (legacy events page only)
1. `WebAuthGuard` checks localStorage for external API credentials
2. If missing → modal dialog for email + password
3. Server action: GET `/login` → CSRF token → POST `/login` → `sails.sid` cookie
4. Credentials + cookie stored in localStorage

## Data Model

### Local SQLite (Drizzle)

#### Master Tables

**regions**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**teams**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `number` | integer | no | — | unique |
| `region_id` | integer | no | — | FK → regions.id |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**event_types**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**ministries**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**metrics**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | |
| `notes` | text | yes | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**tasks**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**configurations**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | unique |
| `value` | text | no | — | |
| `notes` | text | yes | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

#### Users & Roles

**users**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `full_name` | text | no | — | |
| `nij` | text | no | — | unique |
| `email` | text | no | — | unique |
| `cg_code` | text | yes | — | |
| `password` | text | yes | — | bcrypt hash |
| `source_id` | integer | yes | — | |
| `team_id` | integer | yes | — | FK → teams.id |
| `role_id` | integer | yes | — | FK → roles.id |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**roles**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `name` | text | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

#### Events

**events**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `region_id` | integer | no | — | FK → regions.id |
| `event_type_id` | integer | no | — | FK → event_types.id |
| `date` | timestamp | no | — | |
| `name` | text | no | — | |
| `mode` | text | no | `teams` | enum: teams, members, manual_apply |
| `configuration` | json | no | `[]` | `{ field: string; value: string }[]` |
| `source_id` | integer | yes | — | |
| `status` | text | no | `pending` | enum: pending, incomplete, completed |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

**event_teams**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `event_id` | integer | no | — | FK → events.id (cascade) |
| `team_id` | integer | no | — | FK → teams.id |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

Unique: (event_id, team_id)

**event_assignments**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `event_id` | integer | no | — | FK → events.id (cascade) |
| `user_id` | integer | no | — | FK → users.id |
| `task_id` | integer | yes | — | FK → tasks.id |
| `block_name` | text | yes | — | |
| `rating` | integer | yes | — | |
| `technical_notes` | text | yes | — | |
| `non_technical_notes` | text | yes | — | |
| `rated_by_user_id` | integer | yes | — | FK → users.id |
| `rated_by` | text | yes | — | |
| `rated_at` | timestamp | yes | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

Unique: (user_id, event_id, task_id, block_name)

**event_assignment_change_requests**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `event_id` | integer | no | — | FK → events.id (cascade) |
| `user_from_id` | integer | no | — | FK → users.id |
| `user_to_id` | integer | yes | — | FK → users.id |
| `status` | text | no | `pending` | enum: pending, approved, rejected |
| `approved_by` | integer | yes | — | FK → users.id |
| `approved_at` | timestamp | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

Unique: (event_id, user_from_id, user_to_id)

**event_metrics**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `event_id` | integer | no | — | FK → events.id (cascade) |
| `metric_id` | integer | no | — | FK → metrics.id |
| `count` | integer | no | — | |
| `notes` | text | yes | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

Unique: (event_id, metric_id)

**event_volunteers**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `event_id` | integer | no | — | FK → events.id (cascade) |
| `ministry_id` | integer | no | — | FK → ministries.id |
| `count` | integer | no | — | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

Unique: (event_id, ministry_id)

**event_altar_calls**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `event_id` | integer | no | — | FK → events.id (cascade) |
| `description` | text | no | — | |
| `count` | integer | no | — | |
| `sequence` | integer | no | `0` | |
| `created_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `updated_at` | timestamp | no | `CURRENT_TIMESTAMP` | |
| `created_by` | text | no | — | |
| `updated_by` | text | no | — | |

Unique: (event_id, sequence)

#### Audit

**audit_trails**
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | no | auto | PK |
| `resource` | text | no | — | |
| `record_id` | integer | no | — | |
| `action` | text | no | — | |
| `user_id` | integer | yes | — | FK → users.id |
| `user_name` | text | no | — | |
| `old_data` | text | no | — | |
| `new_data` | text | no | — | |
| `changed_at` | timestamp | no | — | |

#### Relationships

- regions → teams (one to many)
- teams → region (many to one), users (one to many)
- users → team (many to one), role (many to one), event_assignments (one to many), event_assignment_change_requests (one to many)
- roles → users (one to many)
- event_types → events (one to many)
- ministries → event_volunteers (one to many)
- metrics → event_metrics (one to many)
- tasks → event_assignments (one to many)
- events → region (many to one), event_type (many to one), teams (many to many via event_teams), assignments (one to many), change_requests (one to many), metrics (many to many via event_metrics), volunteers (many to many via event_volunteers), altar_calls (one to many)
- event_teams → event (many to one), team (many to one)
- event_assignments → event (many to one), user (many to one), task (many to one), rated_by_user (many to one)
- event_assignment_change_requests → event (many to one), user_from (many to one), user_to (many to one), approver (many to one)
- event_metrics → event (many to one), metric (many to one)
- event_volunteers → event (many to one), ministry (many to one)
- event_altar_calls → event (many to one)
- audit_trails → user (many to one)

### Firestore `reports` collection
- `title`, `type` (AOG_YOUTH, AOG_TEEN, EVENT), `date` (Indonesian format "DD Month YYYY")
- `divisions` — map of ministry names to volunteer counts
- `totalVolunteer`, `jemaat`, `tc`, `guest`, `pastorSpeaker`
- `altarcallText`, `altarcallNumber`, `baptisan`, `whl`, `bersediaJoinCg`
- `prayerStation`, `oneMinutePrayer`, `reportText`, `lastUpdated`

### Firestore `members` collection
- `name`, `nickname`, `team`, `role` (Member/SPV/PIC), `email`
- Used by Doa Wilayah person picker

### Firestore `tallySession` collection
- `serviceType`, `date`, `altarCallCount`, `kind` (`altarcall` | `tc`)
- `counts` — map of label → running total
- Created from Reports page or Doa Wilayah "Buka TC"

### Firestore `doaWilayah/{year}/bulan/{month}` documents
- `pic`, `tc1`, `tc2` — `{ id, name }`
- `date` (YYYY-MM-DD), `notes`, `tallySessionId`
- One document per month; each month can open exactly one linked TC tally session

### External events
- Scraped via Cheerio from HTML `.card` elements
- Fields: `eventId`, `name`, `date`, `time`, `location`, `showUrl`, `editUrl`, `locked`

## Features

| Feature | Route | Status |
|---------|-------|--------|
| Authentication | `/auth/login` | Working |
| Forget Password | `/auth/forget-password` | Disabled |
| Reports Generator | `/tools/utilities/reports` | Working |
| Reports History | `/tools/reports-history` | Working (requires Firebase) |
| Service Assignment | `/tools/utilities/assign` | Working |
| Tally Counter | `/tools/utilities/tally` | Working (requires Firebase) |
| Doa Wilayah | `/tools/doa-wilayah` | Working (requires Firebase) |
| Calendar | `/tools/calendar` | Sample data only (not connected to live data) |
| Dashboard | `/my/dashboard` | Working (Admin, Head Ministry, Regional PIC) |
| Events Browser | `/tools/legacy/events` | Working (requires SC_BASE_URL) |
| Event Edit | `/tools/legacy/events/[eventId]/edit` | Working |
| Event Schedule | `/my/events` | Working (DB-backed) |
| Event Create | `/my/events/new` | Working (DB-backed) |
| Event Detail | `/my/events/[id]` | Working (DB-backed, 4 tabs: Configuration, Assignment, Seating, Reporting) |
| Members | `/my/users/members` | Working (role badges per user) |
| Member Detail | `/my/users/members/[id]` | Working (role shown inline) |
| Roles | `/my/users/roles` | Working (Admin-only, hardcoded warning) |
| Role Assignments | `/my/users/role-assignments` | Working (inline role dropdown, search, filter, sorted by role/team/name) |
| Master Data | `/my/master/*` | Working (regions, teams, event-types, ministries, metrics, tasks, configurations) |
| Audit Trails | `/my/audit-trails` | Working |
| Firebase Members | `/tools/members` | Working (requires Firebase) |
| Schedules | `/my/schedules` | Working (event assignments browser, swap requests, SPV/Admin approvals) |

## Fonts

- **Display**: Instrument Serif (weight 400)
- **Body**: DM Sans
- **Mono**: IBM Plex Mono (400, 500)

CSS variables: `--font-display`, `--font-sans`, `--font-mono`
