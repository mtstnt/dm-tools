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
| `SC_BASE_URL` | Server | Base URL for external events API (used by server actions) |
| `NEXT_PUBLIC_SC_BASE_URL` | Client | Same value, used for link generation in event cards |
| `DATABASE_URL` | Server | `libsql://...` (Turso) or `file:./<name>.db` (local SQLite) |
| `DATABASE_AUTH_TOKEN` | Server | Turso auth token; omit for local SQLite |

Copy `.env.template` to `.env` and fill in values. `SC_BASE_URL` is missing from `.env.template`; add it manually when using legacy event scraping. `DATABASE_URL` defaults to `db/local.sqlite3` for local development.

## Directory Layout

```
app/
  layout.tsx          Root layout — fonts, ThemeProvider, QueryClientProvider
  auth/
    login/page.tsx    Email/password login (local users table)
    forget-password/  Disabled — redirects to /auth/login
  my/                 Protected sidebar area (AuthGuard)
    home/page.tsx     Placeholder home
    audit-trails/     Paginated audit log
    events/page.tsx   Placeholder
    schedules/page.tsx Placeholder
    master/           Master data CRUD pages
    users/            Members, permissions, roles
  tools/              Protected sidebar area (AuthGuard)
    utilities/        Reports, Assign, Tally
    doa-wilayah/      Monthly prayer schedule
    reports-history/  Firestore report browser
    members/          Firebase members browser
    legacy/events/    External SC events scraper + editor
actions/              Root-level server actions (not under app/)
  auth/login.ts       Local auth actions
  master/             Master data actions
  users/              Member/role/permission actions
  audit-trails.ts     Audit log action
  legacy-web/         External SC API actions
components/
  ui/                 Shadcn components
  custom/             master-crud-page.tsx, data-table.tsx
  app-sidebar.tsx     Sidebar driven by lib/navigation.ts
  auth-guard.tsx      Client-side route guard
  web-auth-guard.tsx  Auth gate for external events API
  providers.tsx       React Query provider
  theme-provider.tsx  next-themes wrapper
  account-info.tsx    User dropdown (local auth)
lib/
  firebase.ts         Firebase client init (hardcoded config, "use client")
  navigation.ts       Sidebar menu groups and route links
  queries/            React Query keys + Firestore/legacy action wrappers
  parsers/            Cheerio parsers for external events
proxy.ts              Middleware function (exported but NOT wired to middleware.ts)
```

## Auth Flow

### App Auth (main app)
1. User visits `/` → intended redirect to `/my` via `proxy.ts` (only if middleware.ts is created)
2. `AuthGuard` checks for a valid `authenticated` cookie via `checkAuth()`
3. If no valid session → redirect to `/auth/login`
4. `/auth/login` page: calls `login(email, password)` server action → queries `users` table and verifies bcrypt password
5. `/auth/forget-password` page: disabled — redirects to `/auth/login`
6. Cookie: `authenticated={userId}`, httpOnly, 7-day expiry

### Web Auth (legacy events page only)
1. `WebAuthGuard` checks localStorage for external API credentials
2. If missing → modal dialog for email + password
3. Server action: GET `/login` → CSRF token → POST `/login` → `sails.sid` cookie
4. Credentials + cookie stored in localStorage

## Data Model

### Local SQLite (Drizzle)
- **Master**: regions, teams, event_types, ministries, metrics, tasks
- **Users & permissions**: users, roles, permissions, user_roles, role_permissions, user_permissions
- **Events**: events, event_teams, event_assignments, event_metrics, event_volunteers, event_altar_calls, event_assignment_change_requests
- **Audit**: audit_trails

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
| Events Browser | `/tools/legacy/events` | Working (requires SC_BASE_URL) |
| Event Edit | `/tools/legacy/events/[eventId]/edit` | Working |
| Members | `/my/users/members` | Working |
| Permissions | `/my/users/permissions` | Working |
| Roles | `/my/users/roles` | Working |
| Master Data | `/my/master/*` | Working |
| Audit Trails | `/my/audit-trails` | Working |
| Firebase Members | `/tools/members` | Working (requires Firebase) |

## Fonts

- **Display**: Instrument Serif (weight 400)
- **Body**: DM Sans
- **Mono**: IBM Plex Mono (400, 500)

CSS variables: `--font-display`, `--font-sans`, `--font-mono`
