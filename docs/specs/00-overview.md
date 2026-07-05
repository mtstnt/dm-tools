# DM Tools — Feature Overview

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| UI Kit | Shadcn UI (base-nova style, 17 components) |
| State/Data | TanStack React Query 5 |
| Auth/DB | Drizzle ORM + SQLite (`users` table); Firebase 12 only for Firestore (reports history) |
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

Copy `.env.template` to `.env` and fill in values. `SC_BASE_URL` is server-only (used in `app/actions.ts`). `NEXT_PUBLIC_SC_BASE_URL` is client-side (used in event card links).

## Directory Layout

```
app/
  layout.tsx          Root layout — fonts, ThemeProvider, QueryClientProvider
  auth/
    login/page.tsx    Login page (users table email/password)
    forget-password/  Disabled — redirects to /auth/login
  (protected)/
    master/           Master data management pages (event-types, metrics, ministries, regions, tasks, teams)
  tools/
    layout.tsx        Sidebar shell — AppSidebar, ThemeToggle, AccountInfo
    page.tsx          Tools dashboard (card grid linking to features)
    reports/          Service report generator
    reports-history/  Browse saved Firestore reports
    assign/           Service assignment tool (SVG-based block allocation)
    events/           External events browser (web auth guard)
    test-firebase/    Firebase debug page
components/
  ui/                 17 Shadcn components (badge, button, calendar, card, etc.)
  app-sidebar.tsx     Navigation sidebar with tool links
  providers.tsx       React Query provider (staleTime 5m, gcTime 30m)
  theme-provider.tsx  next-themes wrapper
  theme-toggle.tsx    Light/dark toggle button
  account-info.tsx    User dropdown with Firebase auth state
  logout-button.tsx   Sidebar logout form action
  web-auth-guard.tsx  Auth gate for external events API (localStorage-based session)
lib/
  firebase.ts         Firebase client init (hardcoded config, "use client")
  queries/
    reports.ts        Firestore fetch + sort for reports collection
    events.ts         Re-exports fetchEvents, fetchEventEditPage + types from app/actions
  parsers/
    events.ts         Cheerio parser for external event HTML
    event-details.ts  Cheerio parser for event edit page HTML → ParsedResult
  utils.ts            cn() — clsx + tailwind-merge
hooks/
  use-mobile.ts       768px breakpoint hook
types/
  firebase.d.ts       Window.__FIREBASE_APP__ augmentation
proxy.ts              Middleware function (exported but NOT wired to middleware.ts)
```

## Auth Flow

Two separate auth systems:

### App Auth (main app)
1. User visits `/` → redirected to `/tools` (via proxy.ts logic, but middleware.ts is missing)
2. `AuthGuard` checks for a valid `authenticated` cookie via `checkAuth()`
3. If no valid session → redirect to `/auth/login`
4. `/auth/login` page: calls `login(email, password)` server action → queries `users` table and verifies bcrypt password
5. `/auth/forget-password` page: disabled — redirects to `/auth/login`
6. Cookie: `authenticated={userId}`, httpOnly, 7-day expiry

### Web Auth (events page only)
1. `WebAuthGuard` checks localStorage for external API credentials
2. If missing → modal dialog for email + password
3. Server action: GET `/login` → CSRF token → POST `/login` → `sails.sid` cookie
4. Credentials + cookie stored in localStorage

## Data Model

### Firestore `reports` collection
- `title`, `type` (AOG_YOUTH, AOG_TEEN, EVENT), `date` (Indonesian format "DD Month YYYY")
- `divisions` — map of ministry names to volunteer counts
- `totalVolunteer`, `jemaat`, `tc`, `guest`, `pastorSpeaker`
- `altarcallText`, `altarcallNumber`, `baptisan`, `whl`, `bersediaJoinCg`
- `prayerStation`, `oneMinutePrayer`, `reportText`, `lastUpdated`

### External events
- Scraped via Cheerio from HTML `.card` elements
- Fields: `id`, `date`, `time`, `eventName`, `location`, `seatCountUrl`, `editUrl`, `locked`

## Features

| Feature | Route | Status |
|---------|-------|--------|
| Authentication | `/auth/login` | Working |
| Forget Password | `/auth/forget-password` | Disabled |
| Reports Generator | `/tools/reports` | Working |
| Reports History | `/tools/reports-history` | Working |
| Events Browser | `/tools/events` | Working |
| Event Edit | `/tools/events/[eventId]/edit` | Working |
| Firebase Debug | `/tools/test-firebase` | Working |
| Service Assignment | `docs/sample/` | Reference only (not integrated) |

## Fonts

- **Display**: Instrument Serif (weight 400)
- **Body**: DM Sans
- **Mono**: IBM Plex Mono (400, 500)

CSS variables: `--font-display`, `--font-sans`, `--font-mono`
